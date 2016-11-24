"use strict";

const { isFunction, isString, isObject } = require('../../util');

const seq = require('../../seq');

const { SchemaSyntaxError, UniqueConstraintViolationError } = require('../../errors');

const datePropertyDescriptor    = require('./descriptors/date_descriptor');
const uniquePropertyDescriptor  = require('./descriptors/unique_descriptor');
const indexPropertyDescriptor   = require('./descriptors/index_descriptor');
const hasOnePropertyDescriptor  = require('./descriptors/has_one_descriptor');
const hasManyPropertyDescriptor = require('./descriptors/has_many_descriptor');
const foreignPropertyDescriptor = require('./descriptors/foreign_descriptor');

const { addItemProtoPropertyDesctructor } = require('../item');
const Multi = require('../multi');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;
// const keys           = Object.keys;
// const getPrototypeOf = Object.getPrototypeOf;

const $this   = Symbol.for("this");
const $proxy  = Symbol.for("proxy");
const $id     = Symbol.for("id");
const $items  = Symbol.for("items");
const $schema = Symbol.for("schema");
const $extend = Symbol.for("extend");

const $descriptors = Symbol("descriptors");

const { COLLECTION_NAME_MATCH
      , coerceSchemaType
      , validate, validateElement, validateObject } = require('./validate');

const defaultFunctions = {
  'Date.now': Date.now
};

exports.COLLECTION_NAME_MATCH = COLLECTION_NAME_MATCH;

const $itemKlass = exports.itemKlassSym = Symbol("itemKlass");

exports.createSchema = createSchema;

const descriptorPrototype = freeze({validate: validate, validateElement: validateElement});

const schemaProto = freeze({
  validate: validateObject,
  /* spread nested property names */
  [$extend](descr, prefix) {
    prefix || (prefix = 0);
    let name = descr.name.substr(prefix);
    if (name in this) throw new SchemaSyntaxError(`schema: name: "${name}" already declared in schema`);
    this[name] = descr;
    descr.prop = name;
    this[$descriptors].push(descr);
    for(let offset = name.indexOf('.'); offset > -1; offset = name.indexOf('.', offset)) {
      if (offset === 0) throw new SchemaSyntaxError(`consecutive "." separator in schema property`);
      let ns = name.substr(0, offset);
      let schema = this[ns] || (this[ns] = createSchema());
      offset += 1;
      schema[$extend](assign(create(descriptorPrototype), descr), prefix + offset);
    }
  },

  [Symbol.iterator]() {
    return this[$descriptors][Symbol.iterator]();
  }
});

function createSchema() {
  return create(schemaProto, {[$descriptors]: {value: []}});
}

function createIndexWrap(index) {
  return {
    get(value) {
      return seq(index.get(value));
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

function createUniqueWrap(unique) {
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
      return unique.size;
    }
  };
}

/*
  {property: {type: Type}}
  {property: {[type: Type, ]unique: true}}
  {property: {[type: Type, ]index: true}}
  {property: {hasOne: {collection: "foreign_name"}}}
  {property: {hasOne: {collection: "foreign_name", hasOne: "foreign_property"}}}
  {property: {hasOne: {collection: "foreign_name", hasMany: "foreign_property"}}}
  {property: {hasMany: {collection: "foreign_name", hasMany: "foreign_property"}}}
*/
exports.createSchemaDescriptor = function(property, schemaCfg) {
  var schema = schemaCfg[property];
  const db = this._db
  const itemProto = this[$itemKlass].prototype;
  const descr = create(descriptorPrototype);
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
    throw new SchemaSyntaxError(`invalid shema type or hasOne for ${this._name}:${property}`);
  }

  if (schema.hasMany || schema.hasOne) {
    if (descr.required) throw new SchemaSyntaxError(`required is not supported with relations in for ${this._name}:${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: relation on deep property in ${this._name}:${property}`);
    let { collection, hasOne, hasMany } = schema.hasMany || schema.hasOne;
    /* foreign collection */
    descr.collection = collection = db.collection(collection)[$this];
    /* foreign item klass */
    descr.klass = collection[$itemKlass];
    let foreign;
    if (schema.hasMany) {
      if (schema.hasOne !== undefined) throw new SchemaSyntaxError(`only one of "hasMany" or "hasOne" relation type may be defined in ${this._name}:${property}`);
      if (hasMany === undefined) throw new SchemaSyntaxError(`hasMany relation requires hasMany foreign property in ${this._name}:${property}`);
      if (!isString(hasMany) || hasMany.length === 0) throw new SchemaSyntaxError(`hasMany foreign property name must be a non empty string in ${this._name}:${property}`);
      descr.foreign = foreign = hasMany;
      descr.hasMany = hasMany = true;
    }
    else { /* schema.hasOne */
      if (hasMany !== undefined) {
        if (!isString(hasMany) || hasMany.length === 0) throw new SchemaSyntaxError(`hasMany foreign property name must be a non empty string in ${this._name}:${property}`);
        descr.foreign = foreign = hasMany;
        hasMany = true;
      }
      else if (hasOne !== undefined) {
        if (!isString(hasOne) || hasOne.length === 0) throw new SchemaSyntaxError(`hasOne foreign property name must be a non empty string in ${this._name}:${property}`);
        descr.unique = new Map();
        descr.foreign = foreign = hasOne;
        hasMany = false;
      }
      descr.hasOne = true;
    }

    if (foreign) {
      let foreignSchema = collection[$schema]
        , foreignProto = descr.klass.prototype;

      if (foreign in foreignSchema) {
        throw new SchemaSyntaxError(`can't assign foreign schema to ${collection._name}:${foreign} from ${this._name}:${property}`);
      }

      let foreignDescrProperties = {
        type: this._name,
        name: foreign,
        collection: this,
        klass: this[$itemKlass],
        hasMany: hasMany
      };
      if (schema.hasMany) {
        foreignDescrProperties.foreign = property;
      }
      else {
        foreignDescrProperties.primary = property;
      }
      foreignSchema[$extend](assign(create(descriptorPrototype), foreignDescrProperties));
      if (hasMany) {
        /* X <-> many */
        defineProperty(foreignProto, foreign, hasManyPropertyDescriptor(foreignDescrProperties));
      }
      else {
        /* one <-> one */
        defineProperty(foreignProto, foreign, foreignPropertyDescriptor(foreignDescrProperties, descr.unique));
      }
      addItemProtoPropertyDesctructor(foreignProto, foreign);
    }
    if (schema.hasMany) {
      defineProperty(itemProto, property, hasManyPropertyDescriptor(descr));
    }
    else {
      defineProperty(itemProto, property, hasOnePropertyDescriptor(descr, this._name));
    }
  }
  else if (schema.unique) {
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: unique index on deep property in ${this._name}:${property}`);
    let unique = descr.unique = new Map();
    defineProperty(itemProto, property, uniquePropertyDescriptor(descr, this._name));
    installIndex(this, property, createUniqueWrap(unique));
  }
  else if (schema.index) {
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: index on deep property in ${this._name}:${property}`);
    let index = descr.index = new Multi();
    defineProperty(itemProto, property, indexPropertyDescriptor(descr));
    installIndex(this, property, createIndexWrap(index));
  }
  else if (descr.type === Date) {
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: Date on deep property in ${this._name}:${property}`);
    defineProperty(itemProto, property, datePropertyDescriptor(descr));
  }

  if (descr.unique || descr.index || descr.hasMany || descr.hasOne) {
    addItemProtoPropertyDesctructor(itemProto, property);
  }

  return descr;
};

function installIndex(collection, property, index) {
  defineProperty(collection.by, property, {value: index, enumerable: true});
}
