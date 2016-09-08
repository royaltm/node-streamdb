"use strict";

const { isArray, isFunction, isNumber, isString, isObject, isBoolean, isPlainObject } = require('../util');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;
// const keys           = Object.keys;
// const getPrototypeOf = Object.getPrototypeOf;

const $this = Symbol.for("this");
const $proxy = Symbol.for("proxy");
const $id = Symbol.for("id");
const $items = Symbol.for("items");
const $schema = Symbol.for("schema");
const $extend = Symbol.for("extend");

const $descriptors = Symbol("descriptors");

const types = require('./types');
const Primitive = types["primitive"];
const { isIdent } = require('../id');
const { addItemProtoPropertyDesctructor } = require('./item');
const Multi = require('./multi');
const accessor = require('./accessor');
const digger = require('./digger');

const defaultFunctions = {
  'Date.now': Date.now
};

const COLLECTION_NAME_MATCH = exports.COLLECTION_NAME_MATCH = /^[$a-zA-Z][$0-9a-zA-Z_-]*$/;

const $itemKlass = exports.itemKlassSym = Symbol("itemKlass");

exports.createSchema = createSchema;

const descrProto = freeze({validate: validate});

const schemaProto = freeze({
  validate: validateObject,
  [$extend](descr, prefix) {
    prefix || (prefix = 0);
    let name = descr.name.substr(prefix);
    if (name in this) throw new Error(`schema: name: "${name}" already declared in schema`);
    this[name] = descr;
    descr.prop = name;
    this[$descriptors].push(descr);
    for(let offset = name.indexOf('.'); offset > -1; offset = name.indexOf('.', offset)) {
      if (offset === 0) throw new Error(`consecutive "." separator in schema property`);
      let ns = name.substr(0, offset);
      let schema = this[ns] || (this[ns] = createSchema());
      offset += 1;
      schema[$extend](assign(create(descrProto), descr), prefix + offset);
    }
  },
  [Symbol.iterator]() {
    return this[$descriptors][Symbol.iterator]();
  }
});

function createSchema() {
  return create(schemaProto, {[$descriptors]: {value: []}});
}

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
    let type = schema.type;
    switch(type) {
      case "string": case String: return String;
      case "number": case Number: return Number;
      case "date": case Date: return (schema.unique || schema.index) ? undefined : Date;
      case "boolean": case Boolean: return Boolean;
      default:
        if (isFunction(type = types[type])) {
          return new type(schema);
        }
        else if (schema.type === undefined && (schema.unique || schema.index))
          return new Primitive(schema);
    }
  }
}

function validateObject(value) {
  if (value === undefined) {
    for(let descr of this) {
      let item = descr.validate();
      if (item) {
        value || (value = create(null));
        digger(value, descr.prop, item);
      }
    }
  }
  else if (isPlainObject(value)) {
    for(let descr of this) {
      let prop = descr.prop;
      digger(value, prop, descr.validate(accessor(value, prop)));
    }
  }
  else throw new TypeError(`${this.name}: property must be an object`);

  return value;
}

function validate(value) {
  if (value === undefined) {
    value = this.default;
    if (isFunction(value)) value = value();
  }
  if (value === undefined) {
    if (this.required) throw new TypeError(`${this.name}: property is required`);
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
          if (isString(value)) value = Date.parse(value);
          if (value instanceof Date || (isObject(value) && isFunction(value.getTime))) value = value.getTime();
          if (!isNumber(value) || !isFinite(value)) {
            throw new TypeError(`${this.name}: property needs to be a date or a primitive convertible to a date`);
          }
          break;
        default:
          value = type.validate(value, this);
      }
    }

  }
  return value;
}

/*
  {property: {type: Type}}
  {property: {[type: Type, ]unique: true}}
  {property: {[type: Type, ]index: true}}
  {property: {hasOne: {collection: "foreign_name"}}}
  {property: {hasOne: {collection: "foreign_name", hasOne: "foreign_property"}}}
  {property: {hasOne: {collection: "foreign_name", hasMany: "foreign_property"}}}
*/
exports.createSchemaDescriptor = function(property, schemaCfg) {
  var schema = schemaCfg[property];
  const db = this._db
  const itemProto = this[$itemKlass].prototype;
  const descr = create(descrProto);
  descr.name = property;
  if (isString(schema) || isFunction(schema)) {
    schemaCfg[property] = schema = assign(create(null), {type: schema});
  }
  else {
    schemaCfg[property] = schema = assign(create(null), schema);
  }
  if (schema.default !== undefined && !schema.hasOne) {
    if (isObject(schema.default) && isString(schema.default.function)) {
      descr.default = defaultFunctions[schema.default.function];
    }
    else descr.default = schema.default;
  }
  else delete schema.default;
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
    addItemProtoPropertyDesctructor(itemProto, property);
  }

  return descr;
};

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
