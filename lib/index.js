"use strict";

const assert = require('assert');
const EventEmitter = require('events');
const { isString, isObject, isArray } = require('./util');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;

const { genIdent } = require('./id');
const DBStream = require('./stream');
const { Collection } = require('./collection');
const updaters = require('./collection/updaters');

const $this = Symbol.for("this");
const $update = Symbol.for("update");
const $applySchema = Symbol.for("applySchema");
const $export = Symbol.for("export");
const $collections = Symbol("collections");

const SINGLE_OPERATORS = '+=';
const FILTER_OPERATORS = 'mUR';
const COLLECTION_OPERATORS = '!';

function createDbCollectionsHandler(db) {
  return {
    get(collections, name) {
      return (isString(name)) ? db.collection(name) : undefined;
    },

    set(collections, name, value) {
      throw new Error("can't assign anything to DB collections");
    },
  };
}

class DB extends EventEmitter {
  constructor(options) {
    super();
    this.options = options = assign({}, options || {});
    var collections = this[$collections] = create(null);
    var schemaCfg = this.schema = assign({}, options.schema || {});
    delete options.schema;
    this._spool = [genIdent()];
    this._deferrables = new Map();
    defineProperty(this, 'collections', {value: new Proxy(collections, createDbCollectionsHandler(this))});
    for(let name in schemaCfg) {
      collections[name] = new Collection(this, name);
      schemaCfg[name] = assign(create(null), schemaCfg[name]);
    }
    for(let name in schemaCfg) collections[name][$this][$applySchema](schemaCfg[name]);
    freeze(schemaCfg);
  }

  get stream() {
    var stream = new DBStream(this, this.options.stream);
    defineProperty(this, 'stream', {value: stream});
    return stream;
  }

  collection(name) {
    var collections = this[$collections];
    return collections[name] || (collections[name] = new Collection(this, name)[$this][$applySchema](this.schema[name]));
  }

  save(callback, context, ...args) {
    if (callback) callback.call(context, ...args);
    const spool = this._spool;
    const ident = spool[0];
    const deferrables = this._deferrables;
    var defer = deferrables.get(ident);
    if (defer) return defer.promise;

    if (spool.length > 1) {
      deferrables.set(ident, defer = {});
      let promise = defer.promise = new Promise((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
      });
      this._flush();
      return promise;
    }
    else
      return Promise.resolve();
  }

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
      assert(isString(collection));
      assert(isString(filter) && filter.length === 24);
      assert(isString(options));
    } else if (FILTER_OPERATORS.includes(operator)) {
      assert(isString(collection));
      assert(isObject(filter));
    }
    this._spool.push(...[collection, operator, filter, options, data]);
    this._flusher || (this._flusher = setImmediate(() => flush.call(this)));
  }

  _flush() {
    clearImmediate(this._flusher);
    flush.call(this);
  }

  [$update](ident, ...args) {
    // console.log('update: ' + ident);
    assert.strictEqual(args.length % 5, 0);
    var result, error;
    for(let i = 0, len = args.length; i < len; i+= 5) {
      let [collection, operator, filter, options, data] = args.slice(i, i + 5);
      if (operator.length === 1) {
        try {
          if (SINGLE_OPERATORS.includes(operator)) {
            assert(isString(collection) && isString(filter) && filter.length === 24 && isString(options));
          } else if (FILTER_OPERATORS.includes(operator)) {
            assert(isString(collection) && isObject(filter));
          } else if (COLLECTION_OPERATORS.includes(operator)) {
            assert(isString(collection)
               && (filter === '' || (isString(filter) && filter.length === 24))
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
  this._spool = [genIdent()];
  this.stream.push(data);
}

module.exports = DB;
