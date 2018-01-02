"use strict";

const assert = require('assert');

const { isString, isObject, isPrimitive } = require('../util');

const assign = Object.assign
    , create = Object.create
    , defineProperty = Object.defineProperty
    , hasOwnProperty = Object.prototype.hasOwnProperty;

const { SchemaSyntaxError } = require('../errors');

const createInspect = require('./inspect');

const { genIdent, isIdent, Ident } = require('../id');
const { assertConstantsDefined, isPlainObject, getNth } = require('../util');

const { iter, mixin } = require('../iter');

const { createDetachedItemKlass, createCollectionItemKlass, Item } = require('./item');
const { COLLECTION_NAME_MATCH
      , createSchema
      , isSchemaCompositeIndex
      , addSchemaDescriptor
      , addSchemaCompositeIndex
      , validatePropertyName } = require('./schema');

const { idSym:     id$
      , proxySym:  proxy$
      , exportSym: export$
      , thisSym:   this$ } = require('./symbols');

assertConstantsDefined({id$, proxy$, export$, this$}, 'symbol');

const items$             = Symbol.for("items")
    , schema$            = Symbol.for("schema")
    , applySchema$       = Symbol.for("applySchema")
    , itemKlass$         = Symbol.for("itemKlass")
    , detachedItemKlass$ = Symbol.for("detachedItemKlass")
    , validate$          = Symbol.for("validate")
    , validateElement$   = Symbol.for("validateElement")
    , replace$           = Symbol.for("replace")

const upsertModes = Object.freeze({
  'replace': '',
  [replace$]: '',
  'merge': 'M',
  [Symbol.for('merge')]: 'M',
  'ignore': 'I',
  [Symbol.for('ignore')]: 'I'
});

const collectionProxyHandler = {
  get(collection, name) {
    if (name === this$) return collection;
    var value = collection[name];
    if (undefined === value && 'string' === typeof name) {
      if (name.length === 24) return collection[items$].get(name);
      if (isFinite(name)) return getNth(collection[items$].values(), name);
    }
    return value;
  },

  has(collection, id) {
    return collection[items$].has(id);
  },

  set(collection, id, value) {
    collection._replace(id, '', value);
    return true;
  },

  deleteProperty(collection, id) {
    collection._replace(id, '');
    return true;
  }
};

class Collection {
  constructor(db, name) {
    if (!isString(name))
      throw new SchemaSyntaxError("collection name must be a string");
    if (!COLLECTION_NAME_MATCH.test(name))
      throw new SchemaSyntaxError(`illegal collection name: "${name}"`);

    this._db = db;
    this._name = name;
    this[items$] = new Map();

    const proxy = this[proxy$] = new Proxy(this, collectionProxyHandler);

    defineProperty(this, 'by', {value: create(null), enumerable: true, configurable: false, writable: false});

    const Model = db.models[name] || Item;
    const DetachedItem = this[detachedItemKlass$] = createDetachedItemKlass(this, Model);
    this[itemKlass$] = createCollectionItemKlass(this, DetachedItem);
    this[schema$] = createSchema(name);
    /*
      type: Collection(), String, Number, Date (type checking)
      name: property name
      unique: unique index (use only one index)
      index: multi index  (use only one index)
      collection: foreign/primary collection
      klass: foreign/primary itemKlass
      primary: primary relation property name (set on foreign, must be set if any index and Collection())
      foreign: foreign relation property name (set on primary, must be set if any index and Collection())
    */
    return proxy;
  }

  get db() {
    return this._db;
  }

  get name() {
    return this._name;
  }

  [applySchema$](schemaCfg, validators) {
    const schema = this[schema$];

    if (schemaCfg) {
      const indexes = [];
      for(let property in schemaCfg) {
        if (isSchemaCompositeIndex(schemaCfg[property])) {
          indexes.push(property);
        }
        else addSchemaDescriptor.call(this, property, schemaCfg, validators);
      }
      for(let name of indexes) {
        addSchemaCompositeIndex.call(this, name, schemaCfg);
      }
    }
    createInspect(this._name, schema, this[detachedItemKlass$]);
    return this[proxy$];
  }

  save() {
    return this._db.save();
  }

  makeDetachedItem(properties) {
    if (properties !== undefined) {
      if (!isPlainObject(properties)) throw new TypeError("makeDetachedItem: argument if supplied must be an object");
    }
    else properties = {};
    properties = this[schema$][validate$](properties);
    var item = new this[detachedItemKlass$]();
    item[id$] = genIdent();
    assign(item, properties);
    return item;
  }

  validate(properties) {
    if (properties instanceof Item) {
      properties = properties[export$]();
    }
    else if ('object' === typeof properties) {
      properties = assign({}, properties);
    }
    else {
      properties = {};
    }
    return this[schema$][validate$](properties);
  }

  add(id, property, value) {
    this._addElement(id, property, value);
    return this;
  }

  addAndSave(id, property, value) {
    try {
      this._addElement(id, property, value);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  create(value) {
    if (value !== undefined) {
      if (!isPlainObject(value)) throw new TypeError("create: argument if supplied must be an object");
    }
    else value = {};

    var id = value._id || genIdent();
    delete value._id;

    this._replace(id, '', value);
    return id;
  }

  createAndSave(value) {
    try {
      this.create(value);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  createAndSaveOrGetIfConflict(value) {
    return this.createAndSave(value).catch(err => {
      if (err != null && err.isUniqueConstraintViolation) {
        return err.constraintIndex.get(err.conflictKey);
      }
      else throw err;
    });
  }

  delete(id, property) {
    if (property === undefined) {
      property = '';
    }
    else if (property === '') {
      throw new TypeError(`${this._name}: property name must not be empty`);
    }
    this._replace(id, property);
    return this;
  }

  deleteAndSave(id, property) {
    try {
      this.delete(id, property);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  deleteAll() {
    this._db._push(this._name, '!', null, null, null);
    return this;
  }

  deleteAllAndSave() {
    try {
      this.deleteAll();
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  pull(id, property, value) {
    this._pullElement(id, property, value);
    return this;
  }

  pullAndSave(id, property, value) {
    try {
      this._pullElement(id, property, value);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  replace(id, value) {
    this._replace(id, '', value);
    return this;
  }

  replaceAndSave(id, value) {
    try {
      this._replace(id, '', value);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  subtract(id, property, value) {
    this._pullElement(id, property, value);
    return this;
  }

  subtractAndSave(id, property, value) {
    try {
      this._pullElement(id, property, value);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  update(id, value) {
    if (!isPlainObject(value)) throw new TypeError("update: value must be a plain object");
    if (id instanceof this[itemKlass$]) {
      id = id[id$];
    }
    id = new Ident(id);
    for(var name in value) {
      if (hasOwnProperty.call(value, name)) {
        if (name.length === 0) throw new TypeError(`${this._name}: property name must not be empty`);
        this._replace(id, name, value[name]);
      }
    }
    return this;
  }

  updateAndSave(id, value) {
    try {
      this.update(id, value);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  /*
  mode: 
    - replace
    - merge
    - ignore
  */
  upsert(value, mode = replace$) {
    if (!isPlainObject(value)) throw new TypeError("upsert: value must be a plain object");

    mode = upsertModes[mode];

    if (mode === undefined) throw new TypeError('upsert: mode must be one of: "replace", "merge" or "ignore"');

    var id = value._id || genIdent();
    delete value._id;

    var schema = this[schema$];
    value = schema[validate$](value); // TODO: handle default values (they will add themselves now)

    this._db._push(this._name, '^', new Ident(id), mode, value);

    return id;
  }

  upsertAndSave(value, mode) {
    try {
      this.upsert(value, mode);
    } catch(err) { return Promise.reject(err); }
    return this._db.save();
  }

  _addElement(id, property, value) {
    if (id instanceof this[itemKlass$]) {
      id = id[id$];
    }

    id = new Ident(id);

    if (!isString(property))
      throw new TypeError("add: property must be a string");

    var schema = this[schema$]
      , descr = schema[property];

    if (descr === undefined) {
      validatePropertyName(property, schema);
    }
    else {
      value = descr[validateElement$](value, '+');
    }

    if (value === undefined || !(value instanceof Ident || isPrimitive(value))) {
      throw new TypeError("add: value must be defined and must be a primitive");
    }

    this._db._push(this._name, '+', id, property, value);
  }

  _pullElement(id, property, value) {
    if (id instanceof this[itemKlass$]) {
      id = id[id$];
    }

    id = new Ident(id);

    if (!isString(property))
      throw new TypeError("pull: property must be a string");

    var schema = this[schema$]
      , descr = schema[property];

    if (descr === undefined) {
      validatePropertyName(property, schema);
    }
    else {
      value = descr[validateElement$](value, '-');
    }

    if (value === undefined || !(value instanceof Ident || isPrimitive(value))) {
      throw new TypeError("pull: value must be defined and must be a primitive");
    }

    this._db._push(this._name, '-', id, property, value);
  }

  _replace(id, property, value) {
    // console.log("_replace: %s %s %j", id, property, value);
    if (id instanceof this[itemKlass$]) {
      id = id[id$];
    }

    id = new Ident(id);

    if (!isString(property))
      throw new TypeError("replace: property must be a string");

    var schema = this[schema$];

    if (property.length === 0) {
      /* replace whole item */
      if (value !== undefined) {
        if (value instanceof Item) {
          value = value[export$]();
        }
        value = schema[validate$](value);
      }
      /* yes we can delete an item regardless of its schema */
    } else {
      /* replace property */
      const descr = schema[property];
      if (descr === undefined) {
        validatePropertyName(property, schema);
      }
      else {
        value = descr[validate$](value);
      }
    }

    if (value === undefined) {
      this._db._push(this._name, '!', id, property, null);
    }
    else {
      this._db._push(this._name, '=', id, property, value);
    }
  }

  // _update(id, property, value) {
  //   if (isIdent(id)) {
  //   } else if (id instanceof this[itemKlass$]) {
  //     id = id[id$];
  //   } else throw new TypeError("replace: item must be a Collection item or id string");
  //   if (!isString(property)) throw new TypeError("property must be a string");
  //   if (!isObject(value)) throw new Error("value must be an object");
  //   // TODO: throw new Error("required property missing");
  //   this._db._push(this._name, '+', id, property, value);
  // }
/* TODO
  findOneAndReplace(filter, value, options) {
    if (!isObject(filter)) throw new Error("filter must be an object");
    if (!isObject(value)) throw new Error("update must be an object");
    if (options === undefined) {
      options = {};
    }
    else if (!isObject(options)) throw new Error("options must be an object");
    // TODO: throw new Error("required property missing");
    var db = this._db;
    db._push(this.name, 'R', filter, options, value);
    return db.when();
  }

  findOneAndDelete(filter, options) {
    if (!isObject(filter)) throw new Error("filter must be an object");
    if (options === undefined) {
      options = {};
    }
    else if (!isObject(options)) throw new Error("options must be an object");
    // TODO: throw new Error("required property missing");
    var db = this._db;
    db._push(this.name, 'R', filter, options);
    return db.when();
  }

  findOneAndUpdate(filter, update, options) {
    if (!isObject(filter)) throw new Error("filter must be an object");
    if (!isObject(update)) throw new Error("update must be an object");
    if (options === undefined) {
      options = {};
    }
    else if (!isObject(options)) throw new Error("options must be an object");
    // TODO: throw new Error("required property missing");
    var db = this._db;
    db._push(this.name, 'U', filter, options);
    return db.when();
  }

  updateMany(filter, update, options) {
    if (!isObject(filter)) throw new Error("filter must be an object");
    if (!isObject(update)) throw new Error("update must be an object");
    if (options === undefined) {
      options = {};
    }
    else if (!isObject(options)) throw new Error("options must be an object");
    // TODO: throw new Error("required property missing");
    var db = this._db;
    db._push(this.name, 'm', filter, options);
    return db.when();
  }
*/

  get(id) {
    return this[items$].get(id);
  }

  has(id) {
    return this[items$].has(id);
  }

  set(id, value) {
    this._replace(id, '', value);
    return this;
  }

  get iter() {
    return iter(this[items$].values());
  }

  [Symbol.iterator]() {
    return this[items$][Symbol.iterator]();
  }

  keys() {
    return this[items$].keys();
  }

  values() {
    return this[items$].values();
  }

  entries() {
    return this[items$].entries();
  }

  get size() {
    return this[items$].size;
  }

  get model() {
    return this[itemKlass$];
  }
}

Collection.prototype[export$] = function* () {
  const name = this._name;
  yield [name, '!', null, null, null];
  for(let proxy of this[items$].values()) {
    let item = proxy[this$];
    try {
      yield [name, '=', new Ident(item[id$]), '', item[export$]()];
    } catch(e) {
      // ignore revoke errors
    }
  }
};

mixin(Collection.prototype);

exports.Collection = Collection;
