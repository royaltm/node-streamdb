"use strict";

const { isArray, isFunction, isPrimitive, isNumber, isString, isObject, isBoolean, isDate } = require('util');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
const hasOwnProperty = Object.hasOwnProperty;
const keys           = Object.keys;
const getPrototypeOf = Object.getPrototypeOf;

const Primitive = freeze(create(null));

const { genIdent, isIdent } = require('./id');
const Multi = require('./multi');
const { isPlainObject } = require('./deep');

const accessor = require('./accessor');
const setter = require('./setter');

const $this = Symbol.for("this");
const $id = Symbol.for("id");
const $items = Symbol.for("items");
const $schema = Symbol.for("schema");
const $applySchema = Symbol.for("applySchema");
const $extend = Symbol.for("extend");
const $descriptors = Symbol("descriptors");
const $destroy = Symbol("destroy");
const $destroySet = Symbol("destroySet");
const $itemKlass = Symbol("itemKlass")
const $collection = Symbol("collection")
const $data = Symbol("data")
const $revoke = Symbol("revoke");
const $proxy = Symbol("proxy");

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

  // ownKeys(collection) {
  //   return collection[$items].keys();
  // },

  set(collection, id, value) {
    collection._replace(id, '', value);
    return true;
  },

  deleteProperty(collection, id) {
    collection._replace(id, '');
    return true;
  }
};

function indexProxy(index) {
  return {
    get(value) {
      return Array.from(index.get(value));
    },
    has(value) {
      return index.has(value);
    },
    [Symbol.iterator]() { //TODO: map with Array.from
      return index[Symbol.iterator]();
    },
    keys() {
      return index.keys();
    },
    values() {
      return index.values();
    },
    entries() {
      return index.entries();
    },
    get size() {
      return index.size;
    }
  };
}

function uniqueProxy(unique) {
  return {
    get(value) {
      return unique.get(value);
    },
    has(value) {
      return unique.has(value);
    },
    [Symbol.iterator]() {
      return unique[Symbol.iterator]();
    },
    keys() {
      return unique.keys();
    },
    values() {
      return unique.values();
    },
    entries() {
      return unique.entries();
    },
    get size() {
      return index.size;
    }
  };
}

const subitemHandlers = new Map();

function subItemProxyHandler(property) {
  var handler = subitemHandlers.get(property);
  if (handler) return handler;
  subitemHandlers.set(property, handler = {
    get(data, name) {
      var subitem;
      if (isString(name)) {
        subitem = accessor(data, name);
      }
      else subitem = data[name];
      if (isPlainObject(subitem)) {
        return subitem[$proxy] || (subitem[$data] = data[$data], subitem[$proxy] = new Proxy(subitem, subItemProxyHandler(name)));
      } // TODO support arrays
      return subitem;
    },

    set(data, name, value) {
      data = data[$data];
      data[$collection]._replace(data[$id], `${property}.${name}`, value);
      return true;
    },

    deleteProperty(data, name) {
      data = data[$data];
      data[$collection]._replace(data[$id], `${property}.${name}`);
      return true;
    }
  });

  return handler;
}

const itemProxyHandler = {
  get(data, name) {
    var subitem;
    console.log("get %s", name);
    switch(name) {
      case $this: return data;
      case 'toJSON': return () => data.toJSON();
    }
    if (isString(name)) {
      subitem = accessor(data, name);
    }
    else subitem = data[name];
    var subitem = data[name];
    if (subitem && !(subitem instanceof Item) && isPlainObject(subitem)) {
      return subitem[$proxy] || (subitem[$data] = data, subitem[$proxy] = new Proxy(subitem, subItemProxyHandler(name)));
    }
    return subitem;
  },

  // ownKeys(data) {
  //   console.log('ownKeys')
  //   return keys(data).concat(keys(getPrototypeOf(data)));
  // },

  // getOwnPropertyDescriptor(target, prop) {
  //   console.log("getOwnPropertyDescriptor: %s", prop);
  //   return Object.getOwnPropertyDescriptor(target, prop) || Object.getOwnPropertyDescriptor(getPrototypeOf(target), prop);
  // },

  set(data, name, value) {
    if (name.length === 0) return;
    data[$collection]._replace(data[$id], name, value);
    return true;
  },

  deleteProperty(data, name) {
    if (name.length === 0) return;
    data[$collection]._replace(data[$id], name);
    return true;
  }

}

const COLLECTION_NAME_MATCH = /^[$a-zA-Z][$0-9a-zA-Z_-]*$/;

class Item {
  constructor(id) {
    this[$id] = id;
  }
  [$destroy]() {
    // delete this[$id];
    console.log('revoking: %s', this[$id]);
    this[$revoke]();
  }
  get _id() { return this[$id]; }
  toJSON() {
    var res = create(null);
    for(let name in this) {
      let value = this[name];
      if (value instanceof Item) value = value[$id];
      // TODO: deep serialization Array and Objects
      res[name] = value;
    }
    return res;
  }
}

function destoryCollectionItem() {
  console.log('destroying: %s', this[$id]);
  this[$revoke]();
  for(let name of this[$destroySet]) {
    console.log('destory property: %s', name);
    this[name] = undefined;
  }
}

function createCollectionItemKlass(collection) {
  var tag = 'Item_' + collection._name;
  class CollectionItem extends Item {
    constructor(id) {
      super(id);
      this[$collection] = collection;
    }
    get [Symbol.toStringTag]() {
      return tag;
    }
  }
  return CollectionItem;
}

const schemaProto = freeze({
  validate: validateObject,
  [$extend](descr, offset) {
    offset || (offset = 0);
    let name = descr.name.substr(offset);
    descr.prop = name;
    if (name in this) throw new Error(`schema: name: "${name}" already declared in schema`);
    this[name] = descr;
    this[$descriptors].push(descr);
    for(offset = name.indexOf('.'); offset > -1; offset = name.indexOf('.', offset)) {
      if (offset === 0) throw new Error(`consecutive "." separator in schema property`);
      let ns = name.substr(0, offset);
      let schema = this[ns] || (this[ns] = createSchema());
      schema[$extend](assign(create(descrProto), descr), offset += 1);
    }
  },
  [Symbol.iterator]() {
    return this[$descriptors][Symbol.iterator]();
  }
});

function createSchema() {
  return create(schemaProto, {[$descriptors]: {value: []}});
}

class Collection {
  constructor(db, name) {
    if (!isString(name) || !COLLECTION_NAME_MATCH.test(name))
      throw new TypeError(`illegal collection name: ${name.toString()}`);
    this._db = db;
    this._name = name;
    this[$items] = new Map();

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
        if (property in this) throw new Error(`reserved schema property: ${this._name}:${property}`);
        if (property in schema) throw new Error(`schema property descriptor already exists: ${this._name}:${property}`);
        schema[$extend](createSchemaDescriptor.call(this, property, schemaCfg));
      }
    }
    return this[$proxy];
  }

  save(...args) {
    return this._db.save(...args);
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

  _replace(id, property, value) {
    console.log("_replace: %s %s %j", id, property, value);
    if (isIdent(id)) {
    } else if (id instanceof this[$itemKlass]) {
      id = id[$id];
    } else
      throw new TypeError("replace: item must be a Collection item or id string");
    if (!isString(property))
      throw new TypeError("replace: property must be a string");

    if (property.length === 0) {
      if (value !== undefined) { // yes we can delete an item regardless of schema
        if (value instanceof Item) {
          value = assign(create(null), value[$this]);
        }
        value = this[$schema].validate(value);
      }
    } else {
      let descr = this[$schema][property];
      if (descr) value = descr.validate(value);
    }
    this._db._push(this._name, '=', id, property, value);
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

function coerceSchemaType(schema) {
  if (schema.hasOne) {
    let collection;
    if (isString(schema.hasOne)) {
      collection = schema.hasOne;
      schema.hasOne = {collection: collection};
    }
    else if (isPlainObject(schema.hasOne)) {
      collection = schema.hasOne.collection;
    }
    if (isString(collection) && COLLECTION_NAME_MATCH.test(collection)) {
      return collection;
    }
  } else {
    switch(schema.type) {
      case "string": case String: return String;
      case "number": case Number: return Number;
      case "date": case Date: return (schema.unique || schema.index) ? undefined : Date;
      case "boolean": case Boolean: return Boolean;
      case "primitive": return Primitive;
      default:
        if (schema.type === undefined && (schema.unique || schema.index))
          return Primitive;
    }
  }
}

function validateObject(value) {
  console.log('validateObject %j', value);
  if (value === undefined) {
    for(let descr of this) {
      let item = descr.validate();
      if (item) {
        value || (value = create(null));
        setter(value, descr.prop, item);
      }
    }
  }
  else if (isPlainObject(value)) {
    let result = create(null);
    for(let descr of this) {
      let prop = descr.prop;
      setter(result, prop, descr.validate(accessor(value, prop)));
    }
    value = result;
  }
  else throw new TypeError(`${this.name}: property must be an object`);

  return value;
}

function validate(value) {
  if (value === undefined) {
    if (this.required) {
      value = this.default;
      if (isFunction(value)) value = value();
      if (value === undefined) throw new TypeError(`${this.name}: property is required`);
    }
  }
  else {
    let type = this.type;
    if (isString(type)) {
      if (isArray(value) && this.hasMany) {
        var idents = [], klass = this.klass;
        for(let val of value) {
          if (val instanceof klass) {
            val = val[$id];
            if (val === undefined) continue;
          }
          else if (!isIdent(val)) {
            throw new TypeError(`${this.name}: property needs to be an item or id`);
          }
          idents.push(val);
        }
        value = idents.length === 0 ? undefined : idents;
      }
      else {
        if (value instanceof this.klass) {
          value = value[$id];
          if (value === undefined && this.required) {
            throw new TypeError(`${this.name}: property is required`);
          }
        }
        else if (value !== undefined && !isIdent(value)) {
          throw new TypeError(`${this.name}: property needs to be an item or id`);
        }
        if (value !== undefined && this.hasMany) value = [value];
      }
    }
    else {
      switch(type) {
        case Boolean:
          if (!isBoolean(value)) throw new TypeError(`${this.name}: property needs to be a boolean`);
          break;
        case String:
          if (!isString(value)) throw new TypeError(`${this.name}: property needs to be a string`);
          break;
        case Number:
          if (!isNumber(value)) throw new TypeError(`${this.name}: property needs to be a number`);
          break;
        case Date:
          if (isDate(value)) value = value.getTime();
          if (isString(value)) value = Date.parse(value);
          if (!isNumber(value) || !isFinite(value)) {
            throw new TypeError(`${this.name}: property needs to be a date or a primitive convertible to a date`);
          }
        default:
          if (!isPrimitive(value)) throw new TypeError(`${this.name}: indexed property needs to be a primitive`);
      }
    }

  }
  return value;
}

const descrProto = freeze({validate: validate});

/*
  {property: {type: Type}}
  {property: {[type: Type, ]unique: true}}
  {property: {[type: Type, ]index: true}}
  {property: {hasOne: {collection: "foreign_name"}}}
  {property: {hasOne: {collection: "foreign_name", hasOne: "foreign_property"}}}
  {property: {hasOne: {collection: "foreign_name", hasMany: "foreign_property"}}}
*/
function createSchemaDescriptor(property, schemaCfg) {
  var schema = schemaCfg[property];
  const db = this._db
  const itemProto = this[$itemKlass].prototype;
  const descr = create(descrProto);
  descr.name = property;
  if (isString(schema) || isFunction(schema)) {
    schemaCfg[property] = schema = {type: schema};
  }
  else if (schema.default !== undefined && !schema.hasOne) {
    descr.default = schema.default; // TODO: make sure default matches schema type
  }
  descr.required = !!schema.required;
  if (!(descr.type = coerceSchemaType(schema))) {
    throw new TypeError(`invalid shema type or hasOne for ${this._name}:${property}`);
  }

  if (schema.hasOne) {
    if (property.includes('.')) throw new Error("unimplemented schema nested relation");
    let { collection, hasOne, hasMany } = schema.hasOne;
    descr.collection = collection = db.collection(collection)[$this];
    descr.klass = collection[$itemKlass];
    let foreign;
    if (isString(hasOne) && hasOne.length > 0) {
      descr.unique = new Map();
      descr.foreign = foreign = hasOne;
      hasMany = false;
    }
    else if (isString(hasMany) && hasMany.length > 0) {
      descr.index = new Multi();
      descr.foreign = foreign = hasMany;
      hasMany = true;
    }
    if (foreign) {
      let foreignSchema = collection[$schema];
      if (foreign in foreignSchema) {
        throw new TypeError(`can't assign foreign schema to ${collection._name}:${foreign} from ${this._name}:${property}`);
      }
      foreignSchema[$extend](assign(create(descrProto), {
        type: this._name,
        name: foreign,
        collection: this,
        klass: this[$itemKlass],
        primary: property,
        hasMany: hasMany
      }));
      defineProperty(descr.klass.prototype, foreign, foreignPropertyDescriptor(descr, this[$items]));
    }
    defineProperty(itemProto, property, hasOnePropertyDescriptor(descr, this._name));
  }
  else if (schema.unique) {
    if (property.includes('.')) throw new Error("unimplemented schema nested unique index");
    let unique = descr.unique = new Map();
    defineProperty(itemProto, property, uniquePropertyDescriptor(descr, this._name));
    this[property] = uniqueProxy(unique);
  }
  else if (schema.index) {
    if (property.includes('.')) throw new Error("unimplemented schema nested index");
    let index = descr.index = new Multi();
    defineProperty(itemProto, property, indexPropertyDescriptor(descr));
    this[property] = indexProxy(index);
  }
  else if (descr.type === Date) {
    if (property.includes('.')) throw new Error("unimplemented schema nested Date");
    defineProperty(itemProto, property, datePropertyDescriptor(descr));
  }

  if (descr.unique || descr.index) {
    let destorySet = itemProto[$destroySet];
    if (!destorySet) {
      itemProto[$destroySet] = destorySet = new Set();
      itemProto[$destroy] = destoryCollectionItem;
    }
    destorySet.add(property);
  }

  return descr;
}

function datePropertyDescriptor(descr) {
  var property = Symbol(descr.name);
  return {
    get() {
      return this[property];
    },
    set(value) {
      if (value === undefined) {
        this[property] = undefined;
      }
      else {
        this[property] = new Date(value);
      }
    },
    enumerable: true,
    configurable: false
  };
}

function uniquePropertyDescriptor(descr, collectionName) {
  var property = Symbol(descr.name);
  var unique = descr.unique;
  return {
    get() {
      return this[property];
    },
    set(value) {
      if (value !== undefined && unique.has(value)) {
        throw new Error(`unique constraint violated: ${collectionName}["${this[$id]}"].${descr.name} = ${value}`);
      }
      var current = this[property];
      if (current !== undefined) unique.delete(current);
      this[property] = value;
      if (value !== undefined) {
        console.log('set: %s, %j', value, this[$proxy]);
        unique.set(value, this[$proxy]);
      }
    },
    enumerable: true,
    configurable: false
  };
}

function indexPropertyDescriptor(descr) {
  var property = Symbol(descr.name);
  var index = descr.index;
  return {
    get() {
      return this[property];
    },
    set(value) {
      var current = this[property];
      var proxy = this[$proxy];
      if (current !== undefined) index.delete(current, proxy);
      this[property] = value;
      if (value !== undefined) {
        index.add(value, proxy);
      }
    },
    enumerable: true,
    configurable: false
  };
}

function hasOnePropertyDescriptor(descr, collectionName) {
  var property = Symbol(descr.name);
  var items = descr.collection[$items];
  var index = descr.unique || descr.index;
  return {
    get() {
      return items.get(this[property]);
    },
    set: !!descr.unique
    ? function(value) {
        if (value !== undefined && index.has(value)) {
          throw new Error(`unique constraint violated: ${collectionName}["${this[$id]}"].${descr.name} = ${value}`);
        }
        var current = this[property];
        if (current !== undefined) index.delete(current);
        this[property] = value;
        if (value !== undefined) {
          index.set(value, this[$proxy]);
        }
      }
    : !!index
    ? function(value) {
        var current = this[property];
        var proxy = this[$proxy];
        if (current !== undefined) index.delete(current, proxy);
        this[property] = value;
        if (value !== undefined) {
          index.add(value, proxy);
        }
      }
    : function(value) {
      this[property] = value;
    },
    enumerable: true,
    configurable: false
  };
}

function foreignPropertyDescriptor(descr, items) {
  var index = descr.unique || descr.index;
  var name = descr.name;
  return {
    get: !!descr.unique
    ? function() {
      return index.get(this[$id]);
    }
    : function() {
      return Array.from(index.get(this[$id]));
    },
    set: !!descr.unique
    ? function(value) {
      var item = index.get(this[$id]);
      if (item) item[$this][name] = undefined;
      if (value !== undefined && (item = items.get(value))) {
        item[$this][name] = this[$id];
      }
    }
    : function(values) {
      for(var item of index.get(this[$id])) {
        item[$this][name] = undefined;
      }
      if (values !== undefined) {
        let id = this[$id];
        for(let item of values) {
          if ((item = items.get(item)))
            item[$this][name] = id;
        }
      }
    },
    enumerable: true,
    configurable: false
  };
}

// bind to collection

exports.updaters = {
  ['='](id, property, data) {
    console.log('=== %j', [id, property, data, property.length])
    var items = this[$items];
    var item = items.get(id);
    if (data === undefined) {
      if (property.length !== 0) {
        if (item) {
          setter(item[$this], property);
          return item;
        }
      }
      else {
        if (item) item[$this][$destroy]();
        return items.delete(id);
      }
    }
    else {
      if (property.length !== 0) {
        if (item) {
          setter(item[$this], property, data);
          return item;
        }
      }
      else {
        if (item) {
          assign(item[$this], data);
        }
        else {
          item = new this[$itemKlass](id);
          let { proxy, revoke } = Proxy.revocable(item, itemProxyHandler); // first create proxy so indexes are properly assigned
          item[$proxy] = proxy;
          item[$revoke] = revoke;
          assign(item, data);
          items.set(id, proxy);
          return proxy;
        }
        return item;
      }
    }
  },
  ['+'](id, property, data) {
    // var items = this[$items];
    // if (data !== undefined) {
    //   let item = items.get(id);
    //   if (item) {
    //     if (property.length) {
    //       deepMerge(item[$this], property, data);
    //     }
    //     else {
    //       deepExtend(item[$this], data);
    //     }
    //     return item;
    //   }
    // }
  },
  ['m'](filter, options, data) {
  },
  ['U'](filter, options, data) {
  },
  ['R'](filter, options, data) {
  }
};

exports.Collection = Collection;
