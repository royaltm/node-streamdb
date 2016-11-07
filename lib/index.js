"use strict";

const assert = require('assert');
const EventEmitter = require('events');
const { isString, isObject, isArray } = require('./util');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;

const DBStream = require('./stream');
const { SchemaSyntaxError, UniqueConstraintViolationError } = require('./errors');
const { genIdent, Ident } = require('./id');
const { Collection } = require('./collection');
const updaters = require('./collection/updaters');

const $this        = Symbol.for("this");
const $update      = Symbol.for("update");
const $applySchema = Symbol.for("applySchema");
const $export      = Symbol.for("export");
const $collections = Symbol("collections");

const SINGLE_OPERATORS = '+=';
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
  };
}

function readOnlyPush() {
  throw new Error("DB: no updates are allowed: database is in read-only mode");
}

class DB extends EventEmitter {

  constructor(options) {
    super();
    this.options = options = assign({}, options || {});

    var collections = this[$collections] = create(null);

    var schemaCfg = this.schema = assign({}, options.schema || {});
    delete options.schema;

    this.autosave = options.autosave !== false;

    if (options.readonly) this.makeReadonly();

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
   * @property {bool} readonly
  **/
  get readonly() {
    return this._push === readOnlyPush;
  }

  /**
   * makes read-only database
   *
   * any attempt to update database content will be met with an error thrown
   * 
   * @return {bool}
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
   * Returned promise resolves or rejects when the update is applied to the database
   *
   * @return {Promise}
  **/
  save() {
    const spool = this._spool;
    if (spool === undefined) return Promise.resolve();

    const ident = spool[0] || (spool[0] = genIdent());
    const deferrables = this._deferrables;
    var defer = deferrables.get(ident);
    if (defer) return defer.promise;

    deferrables.set(ident, defer = {});
    let promise = defer.promise = new Promise((resolve, reject) => {
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
   *  @param collection{String}
   *  @param operator{String}
   *  @param filter{String|Object}
   *  @param options{String|Object}
   *  @param data{Object|undefined}
   **/
  _push(collection, operator, filter, options, data) {
    assert.strictEqual(operator.length, 1);
    if (SINGLE_OPERATORS.includes(operator)) {
      assert(isString(collection) && filter instanceof Ident && isString(options));
    } else if (FILTER_OPERATORS.includes(operator)) {
      assert(isString(collection) && isObject(filter));
    } else if (COLLECTION_OPERATORS.includes(operator)) {
      assert(isString(collection)
         && (filter === null ||
            (filter instanceof Ident && isString(options))));
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
   * flushes pending updates
  **/
  _flush() {
    if (this._flusher !== undefined) clearImmediate(this._flusher);
    flush.call(this);
  }

  [$update](args) {
    const len = args.length;
    assert(isArray(args) && len !== 0, "DB[$update]: argument is not an array or is empty");
    const ident = args[0];
    // console.log('update: ' + ident);
    assert(len % 5 === 1, "DB[$update]: argument length is not a multiple of 5");
    var result, error;
    this.emit('update', args);
    for(let i = 1; i < len; i+= 5) {
      let collection = args[i]
        , operator   = args[i + 1]
        , filter     = args[i + 2]
        , options    = args[i + 3]
        , data       = args[i + 4];

      if (operator.length === 1) {
        try {
          if (filter instanceof Ident) filter = filter.toString();
          if (SINGLE_OPERATORS.includes(operator)) {
            assert(isString(collection) && isString(filter) && filter.length === 24 && isString(options));
          } else if (FILTER_OPERATORS.includes(operator)) {
            assert(isString(collection) && isObject(filter));
          } else if (COLLECTION_OPERATORS.includes(operator)) {
            assert(isString(collection)
               && (filter === null || (isString(filter) && filter.length === 24))
               && isString(options));
          }
          else continue;

          result = updaters[operator].call(this.collection(collection)[$this], filter, options, data);
        } catch(e) {
          // console.log('ERROR: ' + e + '\n' + e.stack);
          error = e;
          break;
        };
      }
    }
    const deferrables = this._deferrables;
    var defer = deferrables.get(ident);
    if (defer) {
      deferrables.delete(ident);
      if (error) defer.reject(error);
      else defer.resolve(result);
    }
  }

};

DB.prototype.createDataExporter = function* () {
  var collections = this[$collections];
  for(var name in collections) {
    yield *collections[name][$this][$export]()
  }
};

function flush() {
  var data = this._spool;
  this._flusher = undefined;
  if (data !== undefined) {
    this._spool = undefined;
    /* generate ident late */
    if (data[0] === null) data[0] = genIdent();
    this.stream.push(data);
  }
}

DB.itertools = require('./iter');
DB.SchemaSyntaxError = SchemaSyntaxError;
DB.UniqueConstraintViolationError = UniqueConstraintViolationError;

module.exports = DB;
