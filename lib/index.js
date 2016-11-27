"use strict";

const assert = require('assert');
const EventEmitter = require('events');
const { isString, isObject, isArray } = require('./util');
const version = require('./version');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;

const DBStream = require('./stream');
const { SchemaSyntaxError, UniqueConstraintViolationError, VersionError } = require('./errors');
const { genIdent, Ident } = require('./id');
const { Collection } = require('./collection');
const updaters = require('./collection/updaters');

const $this        = Symbol.for("this");
const $update      = Symbol.for("update");
const $applySchema = Symbol.for("applySchema");
const $export      = Symbol.for("export");
const $collections = Symbol("collections");

const INTERNAL_OPERATOR = '_';
const SINGLE_OPERATORS = '+-=';
const FILTER_OPERATORS = 'mUR';
const COLLECTION_OPERATORS = '!';

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
   * 
   * @param {Object} options
   * @return {DB}
  **/
  constructor(options) {
    super();
    this.options = options = assign({}, options);

    var collections = this[$collections] = create(null);

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

    defineProperty(this, 'collections', {value: new Proxy(collections, createDbCollectionsHandler(this))});
    for(let name in schemaCfg) {
      collections[name] = new Collection(this, name);
      schemaCfg[name] = assign(create(null), schemaCfg[name]);
    }

    for(let name in schemaCfg) collections[name][$this][$applySchema](schemaCfg[name]);
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
      defineProperty(this, '_push', {
        value: readOnlyPush, enumerable: false, configurable: false, writable: false
      });
      return true;
    }
    return false;
  }

  /**
   * @property {DBStream} stream
  **/
  get stream() {
    var stream = new DBStream(this, this.options.stream);
    defineProperty(this, 'stream', {value: stream});
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
    var collections = this[$collections];
    return collections[name] || (collections[name] = new Collection(this, name)[$this][$applySchema](this.schema[name]));
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
    defineProperty(this, 'writable', {
      value: promise
    });
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
   *  @param {string} collection
   *  @param {string} operator
   *  @param {string|Object} filter
   *  @param {string|Object} options
   *  @param {Object|undefined} data
   **/
  _push(collection, operator, filter, options, data) {
    assert.strictEqual(operator.length, 1);
    if (SINGLE_OPERATORS.includes(operator)) {
      assert(isString(collection) && filter instanceof Ident && isString(options));
    }
    else if (FILTER_OPERATORS.includes(operator)) {
      assert(isString(collection) && isObject(filter));
    }
    else if (COLLECTION_OPERATORS.includes(operator)) {
      assert(isString(collection)
         && (filter === null ||
            (filter instanceof Ident && isString(options))));
    }
    else if (INTERNAL_OPERATOR === operator) {
      assert(isString(collection) && isString(filter));
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

  [$update](args) {
    const len = args.length;
    assert(isArray(args) && len !== 0, "DB[Symbol('update')]: argument is not an array or is empty");
    const ident = args[0];
    assert(len % 5 === 1, "DB[Symbol('update')]: argument length is not a multiple of 5");

    var idx, result, error;

    this.emit('update', args);

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
          } else if (FILTER_OPERATORS.includes(operator)) {
            assert(isString(collection) && isObject(filter));
          } else if (COLLECTION_OPERATORS.includes(operator)) {
            assert(isString(collection)
               && (filter === null || (isString(filter) && filter.length === 24 && isString(options))));
          }
          else {
            if (INTERNAL_OPERATOR === operator) {
              assert(collection === '_version');
              onReadVersion.call(this, filter);
            }

            continue;
          }

          result = updaters[operator].call(this.collection(collection)[$this], filter, options, data);
        } catch(e) {
          error = e;
          break;
        };
      }
    }

    if (ident === this._lastIdent) this._lastIdent = undefined;

    const deferrables = this._deferrables;
    var defer = deferrables.get(ident);
    if (defer !== undefined) {
      deferrables.delete(ident);
      if (error) defer.reject(error);
      else defer.resolve(result);
    }
    else if (error) {
      this.emit('updateRejection', error, args, idx);
    }
  }

};

DB.prototype.createDataExporter = function* () {
  yield ['_version', INTERNAL_OPERATOR, this.schemaVersion.version, null, null];
  var collections = this[$collections];
  for(var name in collections) {
    yield *collections[name][$this][$export]()
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

DB.itertools = require('./iter');
DB.VersionError = VersionError;
DB.SchemaSyntaxError = SchemaSyntaxError;
DB.UniqueConstraintViolationError = UniqueConstraintViolationError;

module.exports = DB;
