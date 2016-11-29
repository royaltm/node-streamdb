"use strict";

const { isFunction, isString, isObject, isArray } = require('../../util');

const { SchemaSyntaxError, UniqueConstraintViolationError } = require('../../errors');

const Primitive = require('./types').primitive;

const { datePropertyDescriptor
      , uniquePropertyDescriptor
      , indexPropertyDescriptor
      , hasOnePropertyDescriptor
      , hasManyPropertyDescriptor
      , foreignPropertyDescriptor
      , compositeUniquePropertyDescriptor
      , compositeIndexPropertyDescriptor } = require('./descriptors');

const { addItemProtoPropertyDesctructor } = require('../item');
const { UniqueIndex, MultiValueIndex, CompositeUniqueIndex, CompositeMultiValueIndex, createIndexWrap } = require('../indexes');

const assign = Object.assign;
const freeze = Object.freeze;
const create = Object.create;
const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;
// const keys           = Object.keys;
// const getPrototypeOf = Object.getPrototypeOf;

const this$   = Symbol.for("this")
    , schema$ = Symbol.for("schema")
    , extend$ = Symbol.for("extend");

const descriptors$ = Symbol("descriptors")
    , indexDescriptors$ = Symbol("indexDescriptors");

const itemKlass$ = exports.itemKlassSym = Symbol("itemKlass");

const { COLLECTION_NAME_MATCH
      , reservedPropertySet
      , coerceSchemaType
      , validate, validateElement, validateObject } = require('./validate');

const defaultFunctions = {
  'Date.now': Date.now
};

exports.COLLECTION_NAME_MATCH = COLLECTION_NAME_MATCH;

exports.createSchema = createSchema;

const descriptorPrototype = freeze({
  validate: validate,
  validateElement: validateElement,
  isIndexable() {
    return this.readPropertySymbol === undefined || 'symbol' === typeof this.writePropertySymbol;
  }
});

const schemaProto = freeze({
  validate: validateObject,
  /* spread nested property names */
  [extend$](collection, descr, prefix) {
    var name = descr.name;
    if ('symbol' === typeof name) {
      if (name in this) throw new SchemaSyntaxError(`schema property already exists: ${collection._name}:${name.toString()}`);
      this[name] = descr;
    }
    else {
      prefix || (prefix = 0);
      name = name.substr(prefix);
      if (reservedPropertySet.has(name)) throw new SchemaSyntaxError(`reserved collection property name: ${collection._name}:${descr.name}`);
      if (name.startsWith('__')) throw new SchemaSyntaxError(`collection property name must not start with "__": ${collection._name}:${descr.name}`);
      if (name.length === 0) throw new SchemaSyntaxError(`schema: property name must not end with a "." in ${collection._name}:${descr.name}`);
      if (name in this) throw new SchemaSyntaxError(`schema property already exists: ${collection._name}:${descr.name}`);
      this[name] = descr;
      descr.prop = name;
      this[descriptors$].push(descr);
      for(let offset = name.indexOf('.'); offset > -1; offset = name.indexOf('.', offset)) {
        if (offset === 0) throw new SchemaSyntaxError(`invalid "." separator placement in schema property ${collection._name}:${descr.name}`);
        let ns = name.substr(0, offset);
        let schema = this[ns] || (this[ns] = createSchema());
        offset += 1;
        schema[extend$](collection, assign(create(descriptorPrototype), descr), prefix + offset);
      }
    }
  },

  [Symbol.iterator]() {
    return this[descriptors$][Symbol.iterator]();
  }
});

function createSchema() {
  return create(schemaProto, {
    [descriptors$]: {value: []},
    [indexDescriptors$]: {value: []},
  });
}

/*
  index1: {unique: true, components: ['foo', 'bar']}
  index2: {unique: false, components: ['foo', 'bar']}
  index2: ['foo', 'bar']
*/
exports.isSchemaCompositeIndex = function(propSchema) {
  return (isArray(propSchema) || isObject(propSchema) && isArray(propSchema.components));
};

exports.addSchemaCompositeIndex = function(indexName, schemaCfg) {
  const schema = this[schema$]
      , itemProto = this[itemKlass$].prototype;

  var indexCfg = schemaCfg[indexName];

  if (isArray(indexCfg)) {
    indexCfg = {unique: false, components: indexCfg.slice()};
  }
  else if (!isArray(indexCfg.components)) {
    throw new SchemaSyntaxError(`composite index components must be an array: ${this._name}:${indexName}`);
  }
  else {
    indexCfg = {unique: !!indexCfg.unique, components: indexCfg.components.slice()};
  }
  if (!indexCfg.components.every(isString)) {
    throw new SchemaSyntaxError(`composite index components must be an array of property names: ${this._name}:${indexName}`);
  }
  if (indexCfg.components.length < 2) {
    throw new SchemaSyntaxError(`composite index requires at least 2 components in ${this._name}:${indexName}`);
  }
  if (indexCfg.components.length > 99) {
    throw new SchemaSyntaxError(`too many composite index components in ${this._name}:${indexName}`);
  }

  if (!indexCfg.unique) {
    throw new SchemaSyntaxError(`unimplemented: composite non-unique index in ${this._name}:${indexName}`);
  }

  schemaCfg[indexName] = indexCfg;

  const compositePropertySymbol = Symbol(indexName)
      , indexComponentDescriptors = []
      , index = (indexCfg.unique) ? new CompositeUniqueIndex(indexCfg.components.length)
                                  : new CompositeMultiValueIndex(indexCfg.components.length)

  for(var [idx, property] of indexCfg.components.entries()) {
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented composite index on deep property in ${this._name}:${property}`);
    let descr = schema[property];

    if (descr === undefined) {
      /* no descriptor yet, create scalar type */
      descr = create(descriptorPrototype);
      descr.name = property;
      descr.type = new Primitive();
      schema[extend$](this, descr);
    }
    else if (!descr.isIndexable()) {
      throw new SchemaSyntaxError(`non-indexable property ${this._name}:${property}`);
    }

    if (descr.readPropertySymbol === undefined) {
      /* index descriptor directly on property descriptor */
      descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
    }
    else {
      let name = Symbol(`${indexName}.${property}`);
      while (descr.writePropertySymbol !== descr.readPropertySymbol) {
        /* find last layered descriptor */
        descr = schema[descr.writePropertySymbol];
      }
      /* re-target original writer */
      descr.writePropertySymbol = name;
      /* layer index descriptor */
      descr = assign(create(descriptorPrototype), {
        name: name,
        readPropertySymbol: descr.readPropertySymbol,
        writePropertySymbol: descr.readPropertySymbol
      });
      schema[extend$](this, descr);
    }

    descr.indexName = indexName;
    descr.compositePropertySymbol = compositePropertySymbol;
    descr.indexComponentIdx = idx;
    descr.indexComponentCount = indexCfg.components.length;

    if (indexCfg.unique) {
      descr.unique = index;
      defineProperty(itemProto, descr.name, compositeUniquePropertyDescriptor(descr, this._name));
    }
    else {
      descr.index = index;
      defineProperty(itemProto, descr.name, compositeIndexPropertyDescriptor(descr));
    }

    indexComponentDescriptors.push(descr);
  }

  /* install index for user to acces it on collection.by */
  installIndex(this, indexName, index);

  /* for reflection */
  schema[indexDescriptors$].push({
    name: indexName,
    propertySymbol: compositePropertySymbol,
    componentNames: indexCfg.components.slice(),
    componentDescriptors: indexComponentDescriptors,
    isUnique: indexCfg.unique,
    index: index
  });
};

/*
  property: {type: Type}}
  property: {[type: Type, ]unique: true}
  property: {[type: Type, ]index: true}
  property: {hasOne: {collection: "foreign_name"}}
  property: {hasOne: {collection: "foreign_name", hasOne: "foreign_property"}}
  property: {hasOne: {collection: "foreign_name", hasMany: "foreign_property"}}
  property: {hasMany: {collection: "foreign_name", hasMany: "foreign_property"}}
*/
exports.addSchemaDescriptor = function(property, schemaCfg) {
  if (property in this[schema$]) throw new SchemaSyntaxError(`schema property already exists: ${this._name}:${property}`);
  var schema = schemaCfg[property];
  const itemProto = this[itemKlass$].prototype;
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
    throw new SchemaSyntaxError(`invalid schema type, hasMany or hasOne for ${this._name}:${property}`);
  }

  if (schema.hasMany || schema.hasOne) {
    if (descr.required) throw new SchemaSyntaxError(`required is not supported with relations in for ${this._name}:${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: relation on deep property in ${this._name}:${property}`);
    let { collection, hasOne, hasMany } = schema.hasMany || schema.hasOne;
    /* foreign collection */
    descr.collection = collection = this._db.collection(collection)[this$];
    /* foreign item klass */
    descr.klass = collection[itemKlass$];
    let foreign;
    if (schema.hasMany) {
      if (schema.hasOne !== undefined) throw new SchemaSyntaxError(`only one of "hasMany" or "hasOne" relation type may be defined in ${this._name}:${property}`);
      if (hasOne !== undefined) throw new SchemaSyntaxError(`hasMany relation forbids hasOne foreign property in ${this._name}:${property}`);
      if (hasMany === undefined) throw new SchemaSyntaxError(`hasMany relation requires hasMany foreign property in ${this._name}:${property}`);
      if (!isString(hasMany) || hasMany.length === 0) throw new SchemaSyntaxError(`hasMany foreign property name must be a non empty string in ${this._name}:${property}`);
      descr.foreign = foreign = hasMany;
      descr.hasMany = hasMany = true;
      descr.readPropertySymbol = Symbol(property);
    }
    else if (hasOne !== undefined && hasMany !== undefined) {
      throw new SchemaSyntaxError(`hasOne relation requires only one of "hasMany" or "hasOne" foreign property in ${this._name}:${property}`);
    }
    else { /* schema.hasOne */
      if (hasMany !== undefined) {
        if (!isString(hasMany) || hasMany.length === 0) throw new SchemaSyntaxError(`hasMany foreign property name must be a non empty string in ${this._name}:${property}`);
        descr.foreign = foreign = hasMany;
        hasMany = true;
      }
      else if (hasOne !== undefined) {
        if (!isString(hasOne) || hasOne.length === 0) throw new SchemaSyntaxError(`hasOne foreign property name must be a non empty string in ${this._name}:${property}`);
        descr.unique = new UniqueIndex();
        descr.foreign = foreign = hasOne;
        hasMany = false;
      }
      descr.hasOne = true;
      descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
    }

    if (foreign) {
      let foreignSchema = collection[schema$]
        , foreignProto = descr.klass.prototype;

      if (foreign in foreignSchema) {
        throw new SchemaSyntaxError(`can't assign foreign schema to ${collection._name}:${foreign} from ${this._name}:${property}`);
      }

      let foreignDescr = assign(create(descriptorPrototype), {
        type: this._name,
        name: foreign,
        collection: this,
        klass: this[itemKlass$],
        hasMany: hasMany,
        readPropertySymbol: Symbol(foreign)
      });
      if (schema.hasMany) {
        foreignDescr.foreign = property;
      }
      else {
        foreignDescr.primary = property;
      }
      foreignSchema[extend$](collection, foreignDescr);
      if (hasMany) {
        /* X <-> many */
        defineProperty(foreignProto, foreign, hasManyPropertyDescriptor(foreignDescr));
      }
      else {
        /* one <-> one */
        defineProperty(foreignProto, foreign, foreignPropertyDescriptor(foreignDescr, descr.unique));
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
    if (descr.type === Date) throw new SchemaSyntaxError(`unimplemented: unique index on Date type property in ${this._name}:${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: unique index on deep property in ${this._name}:${property}`);
    let unique = descr.unique = new UniqueIndex();
    descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
    defineProperty(itemProto, property, uniquePropertyDescriptor(descr, this._name));
    installIndex(this, property, unique);
  }
  else if (schema.index) {
    if (descr.type === Date) throw new SchemaSyntaxError(`unimplemented: index on Date type property in ${this._name}:${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: index on deep property in ${this._name}:${property}`);
    let index = descr.index = new MultiValueIndex();
    descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
    defineProperty(itemProto, property, indexPropertyDescriptor(descr));
    installIndex(this, property, index);
  }
  else if (descr.type === Date) {
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: Date on deep property in ${this._name}:${property}`);
    descr.readPropertySymbol = Symbol(property);
    defineProperty(itemProto, property, datePropertyDescriptor(descr));
  }

  if (descr.unique || descr.index || descr.hasMany || descr.hasOne) {
    addItemProtoPropertyDesctructor(itemProto, property);
  }

  this[schema$][extend$](this, descr);
};

/* install index for user to acces it on collection.by */
function installIndex(collection, property, index) {
  defineProperty(collection.by, property, {value: createIndexWrap(index), enumerable: true});
}
