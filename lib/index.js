"use strict";

const assert = require('assert');
const EventEmitter = require('events');
const { assertConstantsDefined
      , isString, isObject, isArray } = require('./util');

const version = require('./version');

const assign = Object.assign
    , freeze = Object.freeze
    , create = Object.create
    , defineProperty = Object.defineProperty;

const Type = require('./collection/schema/types/base.js');
const { Item } = require('./collection/item');
const DBStream = require('./stream');
const { SchemaSyntaxError, UniqueConstraintViolationError, VersionError } = require('./errors');
const { genIdent, Ident } = require('./id');
const { Collection } = require('./collection');

const updaters = require('./collection/updaters');

const { parseTypes, parseModels, parseValidators } = require('./dboptions');

const { exportSym: export$
      , thisSym:   this$ } = require('./collection/symbols');

assertConstantsDefined({export$, this$}, 'symbol');

const update$      = Symbol.for("update")
    , applySchema$ = Symbol.for("applySchema");

const collections$ = Symbol("collections");

const INTERNAL_OPERATOR    = '_'
    , SINGLE_OPERATORS     = '+-=^'
    , FILTER_OPERATORS     = 'mUR'
    , COLLECTION_OPERATORS = '!'
    , ERROR_OPERATOR       = 'T';

function createDbCollectionsHandler(db) {
  return {
    get(collections, name) {
      if (isString(name) && name !== 'inspect' && name !== 'valueOf' && name !== 'toString') {
        return db.collection(name);
      }
    },

    set(collections, name, value) {
      throw new Error("can't assign anything to DB collections");
    },

    deleteProperty(collections, name) {
      db.collection(name).deleteAll();
      return true;
    }

  };
}

function readOnlyPush() {
  throw new Error("DB: no updates are allowed: database is in read-only mode");
}

class DB extends EventEmitter {
  /**
   * Creates database
   *
   * `options`: 
   *
   *  - `schema` {Object} collection names as keys and schema for collections as values
   *  - `autosave` {boolean} intialized database `autosave` property
   *  - `readonly` {boolean} set to `true` to make this database read-only
   *  - `types` {Array} an array of custom item type classes
   *  - `models` {Object} a mapping of collection names to custom models, a model may be:
   *             a class extending DB.Item or a prototype object with custom methods
   *  - `validators` {Object} a mapping of collection names to custom validators,
   *             a validator is an Object with properties defined as function(value, operator)
   *             it should return a value (perhaps modified) or throw a TypeError
   *             operator is undefined for assignment, '+' for add or push
   *             and '-' for subtract or pull
   *  - `root` {Object} a root object to search for types, models or validators
   *             by default it's `global`
   *  - `typesRoot` {Object} a root object to search for types only if type is specified
   *             as a dot separated namespace, overrides `root`
   *  - `modelsRoot` {Object} a root object to search for models only if model is specified
   *             as a dot separated namespace, overrides `root`
   *  - `validatorsRoot` {Object} a root object to search for validators only if validator
   *             is specified as a dot separated namespace, overrides `root`
   * 
   * @param {Object} options
   * @return {DB}
  **/
  constructor(options) {
    super();
    this.options = options = assign({}, options);

    var collections = this[collections$] = create(null);

    var schemaCfg = this.schema = assign({}, options.schema);
    delete options.schema;

    var schemaVersion = schemaCfg._version;
    delete schemaCfg._version;

    if (schemaVersion === undefined) schemaVersion = '1.0.0';

    schemaVersion = version.parse(schemaVersion);
    if (!schemaVersion) throw new VersionError(`Could not read schema version: "${String(schemaVersion)}"`);
    this.schemaVersion = freeze(schemaVersion);

    this.autosave = options.autosave !== false;

    if (options.readonly) this.makeReadonly();

    this._lastIdent = undefined;
    this._spool = undefined;
    this._flusher = undefined;
    this._deferrables = new Map();

    defineEnumerableConstant(this, 'types', parseTypes(options));
    defineEnumerableConstant(this, 'models', parseModels(options, schemaCfg));
    defineEnumerableConstant(this, 'validators', parseValidators(options, this.models, schemaCfg));
    defineEnumerableConstant(this, 'collections', new Proxy(collections, createDbCollectionsHandler(this)));

    for(let name of Object.getOwnPropertyNames(schemaCfg)) {
      collections[name] = new Collection(this, name);
      schemaCfg[name] = assign(create(null), schemaCfg[name]);
    }

    for(let name of Object.getOwnPropertyNames(schemaCfg)) {
      collections[name][this$][applySchema$](schemaCfg[name], this.validators[name]);
    }
    freeze(schemaCfg);
  }

  /**
   * @property {boolean} readonly
  **/
  get readonly() {
    return this._push === readOnlyPush;
  }

  /**
   * makes read-only database
   *
   * any attempt to update database content will be met with an error thrown
   * 
   * @return {boolean}
  **/
  makeReadonly() {
    if (!this.readonly) {
      defineNonEnumerableConstant(this, '_push', readOnlyPush);
      return true;
    }
    return false;
  }

  /**
   * @property {DBStream} stream
  **/
  get stream() {
    var stream = new DBStream(this, this.options.stream);
    defineEnumerableConstant(this, 'stream', stream);
    return stream;
  }

  /**
   * @property {boolean} autosave
  **/

  /**
   * flushes pending autosave updates and stops autosave
  **/
  begin() {
    if (this.autosave) {
      this._flush();
      this.autosave = false;
    }
  }

  /**
   * retrieves or creates a collection with the given name
   * 
   * @return {Collection}
  **/
  collection(name) {
    var collections = this[collections$];
    return collections[name] || (collections[name] =
        new Collection(this, name)[this$][applySchema$](this.schema[name], this.validators[name]));
  }

  /** 
   * flushes pending updates and resolves when applied
   *
   * when no pending updates, resolves when the last sent (before calling save) update is applied
   *
   * Returned promise resolves or rejects when the update is applied to the database
   *
   * @return {Promise}
  **/
  save() {
    var ident;
    const spool = this._spool;
    if (spool === undefined) {
      /* no pending updates */
      ident = this._lastIdent;
      if (ident === undefined) {
        /* all own updates are applied */
        return Promise.resolve();
      }
    }
    else {
      /* there are pending updates */
      ident = spool[0] || (spool[0] = genIdent());
    }

    const deferrables = this._deferrables;
    var defer = deferrables.get(ident);
    if (defer) return defer.promise;

    deferrables.set(ident, defer = {});
    var promise = defer.promise = new Promise((resolve, reject) => {
      defer.resolve = resolve;
      defer.reject = reject;
    });
    this._flush();
    return promise;
  }

  /**
   * @property {Promise} resolves when db.stream has a consumer
  **/
  get writable() {
    var promise = new Promise((resolve, reject) => {
      if (this.stream.isReadableStreaming) {
        resolve(this);
      } else {
        super.once('writable', () => resolve(this));
      }
    });
    defineEnumerableConstant(this, 'writable', promise);
    return promise;
  }

  /**
   * Pushes schema version mark out
   *
   * @return {Object} parsed schema version;
   **/
  pushVersionMark() {
    const schemaVersion = this.schemaVersion;
    this._push('_version', INTERNAL_OPERATOR, schemaVersion.version, null, null);
    return schemaVersion;
  }

  /**
   * Pushes schema version mark out
   *
   * @param {Error|string} error
   * @param {string} [collection]
   * @param {string} [filter]
   * @param {Object} [options]
   **/
  pushErrorThrow(error, collection=null, filter=null, options=null) {
    this._push(collection, ERROR_OPERATOR, filter, options, error);
  }

  /**
   * Pushes updates to pending
   *
   * @param {string} collection
   * @param {string} operator
   * @param {string|Object} filter
   * @param {string|Object} options
   * @param {Object|undefined} data
   **/
  _push(collection, operator, filter, options, data) {
    assert(isString(operator));
    if (operator.length === 1) {
      if (SINGLE_OPERATORS.includes(operator)) {
        assert(isString(collection) && filter instanceof Ident && isString(options)
           && data !== undefined
           , 'DB._push: invalid single operator arguments');
      }
      else if (FILTER_OPERATORS.includes(operator)) {
        assert(isString(collection) && isObject(filter)
           && options !== undefined && data !== undefined
           , 'DB._push: invalid filter operator arguments');
      }
      else if (COLLECTION_OPERATORS.includes(operator)) {
        assert(isString(collection)
           && ((filter === null && options !== undefined) ||
               (filter instanceof Ident && isString(options)))
           && data !== undefined
           , 'DB._push: invalid collection operator arguments');
      }
      else if (operator === INTERNAL_OPERATOR) {
        assert(isString(collection) && isString(filter)
           && options !== undefined && data !== undefined
           , 'DB._push: invalid internal operator arguments');
      }
      else if (operator === ERROR_OPERATOR) {
        assert((data instanceof Error || isString(data))
           && collection !== undefined && filter !== undefined
           && options !== undefined
           , 'DB._push: invalid error operator arguments');
      }
      else {
        throw new Error(`DB._push: unknown reserved operator: "${operator}"`);
      }
    }
    else {
      assert(collection !== undefined && filter !== undefined
         && options !== undefined && data !== undefined
         , 'DB._push: all arguments must be defined');
    }

    var spool = this._spool;
    /* insert null request id, save() or flush() may add the real one later */
    if (spool === undefined) spool = this._spool = [null];
    spool.push(collection, operator, filter, options, data);
    if (this._flusher === undefined && this.autosave) {
      this._flusher = setImmediate(() => flush.call(this));
    }
  }

  /**
   * flushes pending updates (INTERNAL)
  **/
  _flush() {
    if (this._flusher !== undefined) clearImmediate(this._flusher);
    flush.call(this);
  }

  [update$](args) {
    var idx, result, error;

    assert(isArray(args), "DB[Symbol('update')]: argument is not an array");

    /* allow custom args processing */
    this.emit('update', args);

    const len = args.length;
    assert(len % 5 === 1, "DB[Symbol('update')]: argument length is not a multiple of 5");

    const ident = args[0];

    for(idx = 1; idx < len; idx += 5) {
      let collection = args[idx]
        , operator   = args[idx + 1]
        , filter     = args[idx + 2]
        , options    = args[idx + 3]
        , data       = args[idx + 4];

      if (operator.length === 1) {
        try {
          if (filter instanceof Ident) filter = filter.toString();
          if (SINGLE_OPERATORS.includes(operator)) {
            assert(isString(collection) && isString(filter) && filter.length === 24 && isString(options));
          }
          else if (FILTER_OPERATORS.includes(operator)) {
            assert(isString(collection) && isObject(filter));
          }
          else if (COLLECTION_OPERATORS.includes(operator)) {
            assert(isString(collection)
               && (filter === null || (isString(filter) && filter.length === 24 && isString(options))));
          }
          else if (operator === ERROR_OPERATOR) {
            if (data instanceof Error) throw data;
            let err = new Error(String(data || 'database update error'));
            err.collection = collection;
            err.filter = filter;
            if (isObject(options)) assign(err, options);
            throw err;
          }
          else {
            if (operator === INTERNAL_OPERATOR) {
              assert(collection === '_version');
              onReadVersion.call(this, filter);
            }

            continue;
          }

          result = updaters[operator].call(this.collection(collection)[this$], filter, options, data);

          this.emit('result', result, args, idx);

        } catch(e) {
          error = e;
          break;
        };
      }
    }

    if (ident === this._lastIdent) this._lastIdent = undefined;

    const deferrables = this._deferrables
        , defer = deferrables.get(ident);
    if (defer !== undefined) {
      deferrables.delete(ident);
      if (error !== undefined) defer.reject(error);
      else defer.resolve(result);
    }
    else if (error !== undefined) {
      this.emit('updateRejection', error, args, idx);
    }
  }

};

DB.prototype.createDataExporter = function* () {
  yield ['_version', INTERNAL_OPERATOR, this.schemaVersion.version, null, null];
  var collections = this[collections$];
  for(var name in collections) {
    yield *collections[name][this$][export$]()
  }
};

function flush() {
  var ident, data = this._spool;
  this._flusher = undefined;
  if (data !== undefined) {
    this._spool = undefined;
    ident = data[0];
    /* generate ident late */
    if (ident === null) {
      data[0] = ident = genIdent();
    }
    this._lastIdent = ident;
    this.stream.push(data);
  }
}

function onReadVersion(ver) {
  const readVersion = version.parse(ver);
  try {
    if (!readVersion) throw new VersionError(`Could not parse version read from stream: "${String(ver)}"`);

    const schemaVersion = this.schemaVersion;
    if (schemaVersion.major !== readVersion.major) {
      throw new VersionError(`Version read from stream has different major: ${readVersion.version} !^ ${schemaVersion.version}`);
    }
    if (schemaVersion.minor < readVersion.minor) {
      throw new VersionError(`Version read from stream has greater minor: ${readVersion.version} > ${schemaVersion.version}`);
    }
  } catch(err) {
    this.emit('error', err);
    return;
  }
  this.emit('version', readVersion);
}

function defineEnumerableConstant(target, name, value) {
  return defineProperty(target, name, {
    value: value, enumerable: true, configurable: false, writable: false
  });
}

function defineNonEnumerableConstant(target, name, value) {
  return defineProperty(target, name, {
    value: value, enumerable: false, configurable: false, writable: false
  });
}

DB.Item = Item;
DB.Type = Type;
DB.itertools = require('./iter');
DB.VersionError = VersionError;
DB.SchemaSyntaxError = SchemaSyntaxError;
DB.UniqueConstraintViolationError = UniqueConstraintViolationError;
DB.Ident = Ident;
DB.uniqueId = genIdent;

module.exports = DB;
