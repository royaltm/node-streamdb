"use strict";

const { isString, isObject, isPrimitive } = require('../util');

const assign = Object.assign;
// const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;
// const keys           = Object.keys;
// const getPrototypeOf = Object.getPrototypeOf;

const { SchemaSyntaxError } = require('../errors');

const $itemKlass = require('./schema').itemKlassSym;

const createInspect = require('./inspect');

const $this = Symbol.for("this");
const $proxy = Symbol.for("proxy");
const $id = Symbol.for("id");
const $export = Symbol.for("export");
const $items = Symbol.for("items");
const $schema = Symbol.for("schema");
const $extend = Symbol.for("extend");
const $applySchema = Symbol.for("applySchema");

const { genIdent, isIdent, Ident } = require('../id');
const { isPlainObject } = require('../util');

const { createCollectionItemKlass, Item } = require('./item');
const { COLLECTION_NAME_MATCH, createSchema, createSchemaDescriptor } = require('./schema');

const { iter, mixin } = require('../iter');

const collectionProxyHandler = {
  get(collection, name) {
    if (name === $this) return collection;
    var value = collection[name];
    if (undefined === value) {
      if (isIdent(name)) return collection[$items].get(name);
      if (isString(name) && isFinite(+name)) return Array.from(collection[$items].values())[name];
    }
    return value;
  },

  has(collection, id) {
    return collection[$items].has(id);
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
    if (!isString(name) || !COLLECTION_NAME_MATCH.test(name))
      throw new SchemaSyntaxError(`illegal collection name: "${name.toString()}"`);
    this._db = db;
    this._name = name;
    this[$items] = new Map();
    defineProperty(this, 'by', {value: create(null)});

    this[$itemKlass] = createCollectionItemKlass(this);
    this[$schema] = createSchema();
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
    return this[$proxy] = new Proxy(this, collectionProxyHandler);
  }

  [$applySchema](schemaCfg) {
    var schema = this[$schema];
    if (schemaCfg) {
      for(let property in schemaCfg) {
        schema[$extend](this, createSchemaDescriptor.call(this, property, schemaCfg));
      }
    }
    createInspect(this._name, schema, this[$itemKlass]);
    return this[$proxy];
  }

  save() {
    return this._db.save();
  }

  add(id, property, value) {
    this._addElement(id, property, value);
    return this;
  }

  addAndSave(id, property, value) {
    this._addElement(id, property, value);
    return this._db.save();
  }

  create(value) {
    if (value !== undefined) {
      if (!isPlainObject(value)) throw new Error("create: argument if supplied must be an object");
    }
    var id = genIdent();
    this._replace(id, '', value || {});
    return id;
  }

  createAndSave(value) {
    this.create(value);
    return this._db.save();
  }

  delete(id) {
    this._replace(id, '');
    return this;
  }

  deleteAndSave(id) {
    this._replace(id, '');
    return this._db.save();
  }

  pull(id, property, value) {
    this._pullElement(id, property, value);
    return this;
  }

  pullAndSave(id, property, value) {
    this._pullElement(id, property, value);
    return this._db.save();
  }

  replace(id, value) {
    this._replace(id, '', value);
    return this;
  }

  replaceAndSave(id, value) {
    this._replace(id, '', value);
    return this._db.save();
  }

  subtract(id, property, value) {
    this._pullElement(id, property, value);
    return this;
  }

  subtractAndSave(id, property, value) {
    this._pullElement(id, property, value);
    return this._db.save();
  }

  deleteAll() {
    this._db._push(this._name, '!', null, null, null);
    return this;
  }

  deleteAllAndSave() {
    this.deleteAll();
    return this._db.save();
  }

  _addElement(id, property, value) {
    if (id instanceof this[$itemKlass]) {
      id = id[$id];
    }

    id = new Ident(id);

    if (!isString(property) || property.length === 0)
      throw new TypeError("add: property must be a non empty string");

    let descr = this[$schema][property];
    if (descr) value = descr.validateElement(value);

    if (value === undefined || !(value instanceof Ident || isPrimitive(value)))
      throw new TypeError("add: value must be defined and must be a primitive");

    this._db._push(this._name, '+', id, property, value);
  }

  _pullElement(id, property, value) {
    if (id instanceof this[$itemKlass]) {
      id = id[$id];
    }

    id = new Ident(id);

    if (!isString(property) || property.length === 0)
      throw new TypeError("pull: property must be a non empty string");

    let descr = this[$schema][property];
    if (descr) value = descr.validateElement(value);

    if (value === undefined || !(value instanceof Ident || isPrimitive(value)))
      throw new TypeError("pull: value must be defined and must be a primitive");

    this._db._push(this._name, '-', id, property, value);
  }

  _replace(id, property, value) {
    // console.log("_replace: %s %s %j", id, property, value);
    if (id instanceof this[$itemKlass]) {
      id = id[$id];
    }

    id = new Ident(id);

    if (!isString(property))
      throw new TypeError("replace: property must be a string");

    if (property.length === 0) {
      if (value !== undefined) { // yes we can delete an item regardless of schema
        if (value instanceof Item) {
          value = value[$export]();
        }
        value = this[$schema].validate(value);
      }
    } else {
      let descr = this[$schema][property];
      if (descr) value = descr.validate(value);
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
  //   } else if (id instanceof this[$itemKlass]) {
  //     id = id[$id];
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
  get iter() {
    return iter(this[$items].values());
  }

  [Symbol.iterator]() {
    return this[$items][Symbol.iterator]();
  }

  keys() {
    return this[$items].keys();
  }

  values() {
    return this[$items].values();
  }

  entries() {
    return this[$items].entries();
  }

  get size() {
    return this[$items].size;
  }

}

Collection.prototype[$export] = function* () {
  const name = this._name;
  yield [name, '!', null, null, null];
  for(let proxy of this[$items].values()) {
    let item = proxy[$this];
    try {
      yield [name, '=', new Ident(item[$id]), '', item[$export]()];
    } catch(e) {
      // ignore revoke errors
    }
  }
};

mixin(Collection.prototype);

exports.Collection = Collection;
