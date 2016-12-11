"use strict";

const { assertConstantsDefined
      , isFunction, isString, isObject, isArray } = require('../../util');

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

const { thisSym: this$ } = require('../symbols');

assertConstantsDefined({this$}, 'symbol');

const extend$           = Symbol.for("extend")
    , itemKlass$        = Symbol.for("itemKlass")
    , name$             = Symbol.for("name")
    , schema$           = Symbol.for("schema")
    , validate$         = Symbol.for("validate")
    , validateElement$  = Symbol.for("validateElement");

const descriptors$      = Symbol("descriptors")
    , indexDescriptors$ = Symbol("indexDescriptors");

const { COLLECTION_NAME_MATCH
      , reservedPropertySet
      , coerceSchemaType
      , isIndexableType
      , validateDefault
      , validate, validateElement, validateObject } = require('./validate');

exports.COLLECTION_NAME_MATCH = COLLECTION_NAME_MATCH;

exports.createSchema = createSchema;

function createSchemaDescriptor(properties, validator) {
  const proto = {
    isIndexable() {
      return isIndexableType(this.type)
             && (this.readPropertySymbol === undefined || 'symbol' === typeof this.writePropertySymbol);
    },
    clone() {
      return assign(create(proto), this);
    }
  };

  if (validator !== undefined) {
    proto[validate$] = function(value) {
      return validate.call(this, validator.call(this, value));
    };
    proto[validateElement$] = function(value, operator) {
      return validateElement.call(this, validator.call(this, value, operator));
    };
  }
  else {
    proto[validate$] = validate;
    proto[validateElement$] = validateElement;
  }
  return assign(create(proto), properties);
}

const schemaProto = freeze({
  [validate$]: validateObject,
  [validateElement$](value) {
    throw new TypeError(`${this[name$]}: unimplemented namespace element operation`);
  },
  get [Symbol.for("indexDescriptors")]() {
    return this[indexDescriptors$].slice();
  },
  /*
    recursively create all possible combinations of nested property descriptors
    'foo.bar.baz': [descr]
    'foo': {
      'bar.baz': [descr]
      'bar': {baz: [descr]}
    }
    'foo.bar': {baz: [descr]}
  */
  [extend$](collection, descr, prefix) {
    var name = descr.name;
    if ('symbol' === typeof name) {
      if (name in this) throw new SchemaSyntaxError(`schema property already exists: ${collection._name}:${name.toString()}`);
      this[name] = descr;
    }
    else {
      defineProperty(descr, name$, {
        value: collection._name + '[].' + name, enumerable: false, configurable: false, writable: false});
      prefix || (prefix = 0);
      name = name.substr(prefix);

      if (reservedPropertySet.has(name)) throw new SchemaSyntaxError(`reserved collection property name: ${collection._name}:${descr.name}`);
      if (name.startsWith('__')) throw new SchemaSyntaxError(`collection property name must not start with "__": ${collection._name}:${descr.name}`);
      if (name.length === 0) {
        if (prefix === 0) {
          throw new SchemaSyntaxError(`property name must not be empty in ${collection._name}:${descr.name}`);
        }
        else {
          throw new SchemaSyntaxError(`property name must not end with a "." in ${collection._name}:${descr.name}`);
        }
      }
      if (name in this) throw new SchemaSyntaxError(`schema property already exists: ${collection._name}:${descr.name}`);

      this[name] = descr;
      descr.prop = name;
      this[descriptors$].push(descr);

      for(let offset = name.indexOf('.'); offset > -1; offset = name.indexOf('.', offset)) {
        if (offset === 0) throw new SchemaSyntaxError(`invalid "." separator placement in schema property ${collection._name}:${descr.name}`);
        let ns = name.substr(0, offset);
        let schema = this[ns] || (this[ns] = createSchema(collection._name + '[].' + ns));
        offset += 1;
        schema[extend$](collection, descr.clone(), prefix + offset);
      }
    }
  },

  [Symbol.iterator]() {
    return this[descriptors$][Symbol.iterator]();
  }
});

function createSchema(name) {
  return create(schemaProto, {
    [name$]: {value: name},
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
  if (reservedPropertySet.has(indexName)) throw new SchemaSyntaxError(`reserved composite index name: ${this._name}:${indexName}`);
  if (indexName.startsWith('__')) throw new SchemaSyntaxError(`composite index name must not start with "__": ${this._name}:${indexName}`);
  if (indexName.length === 0) throw new SchemaSyntaxError(`composite index name must not be empty in ${this._name}:${indexName}`);
  if (indexName.includes('.')) throw new SchemaSyntaxError(`composite index name must not include "." in ${this._name}:${indexName}`);

  const schema = this[schema$]
      , itemProto = this[itemKlass$].prototype;

  var indexCfg = schemaCfg[indexName];

  if (isArray(indexCfg)) {
    indexCfg = {unique: false, components: Array.from(new Set(indexCfg))};
  }
  else if (!isArray(indexCfg.components)) {
    throw new SchemaSyntaxError(`composite index components must be an array: ${this._name}:${indexName}`);
  }
  else {
    indexCfg = {unique: !!indexCfg.unique, components: Array.from(new Set(indexCfg.components))};
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
      descr = createSchemaDescriptor({
        name: property,
        required: false,
        type: new Primitive()
      });
      schema[extend$](this, descr);
    }
    else if (!descr.isIndexable()) {
      throw new SchemaSyntaxError(`non-indexable property: ${this._name}:${property}`);
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
      descr = createSchemaDescriptor({
        name: name,
        readPropertySymbol: descr.readPropertySymbol,
        writePropertySymbol: descr.readPropertySymbol
      });
      schema[extend$](this, descr);
    }

    descr.indexName = indexName;
    descr.indexComponentName = property;
    descr.compositePropertySymbol = compositePropertySymbol;
    descr.indexComponentIdx = idx;
    descr.indexComponentCount = indexCfg.components.length;

    if (indexCfg.unique) {
      descr.compositeUnique = index;
      defineProperty(itemProto, descr.name, compositeUniquePropertyDescriptor(descr, this._name));
    }
    else {
      descr.compositeIndex = index;
      defineProperty(itemProto, descr.name, compositeIndexPropertyDescriptor(descr));
    }

    indexComponentDescriptors.push(descr);

    addItemProtoPropertyDesctructor(itemProto, property);
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
exports.addSchemaDescriptor = function(property, schemaCfg, validators) {
  if (property in this[schema$]) throw new SchemaSyntaxError(`schema property already exists: ${this._name}:${property}`);
  var schema = schemaCfg[property];
  const validator = validators && validators[property];
  const itemProto = this[itemKlass$].prototype;

  if (isString(schema) || isFunction(schema)) {
    schemaCfg[property] = schema = assign(create(null), {type: schema});
  }
  else {
    schemaCfg[property] = schema = assign(create(null), schema);
  }

  if (validator !== undefined && !isFunction(validator)) {
    throw new SchemaSyntaxError(`validator is not a function for ${this._name}:${property}`);
  }

  const descr = createSchemaDescriptor({name: property, required: !!schema.required}, validator);

  descr.type = coerceSchemaType(schema, validator, property, this._db.types);
  if (descr.type === undefined) {
    throw new SchemaSyntaxError(`invalid schema type, hasMany or hasOne for ${this._name}:${property}`);
  }

  if (schema.default !== undefined) {
    if (schema.hasOne !== undefined || schema.hasMany !== undefined) {
      throw new SchemaSyntaxError(`property default value is not allowed for a relation in ${this._name}:${property}`);
    }
    descr.default = validateDefault(schema.default);
    if (descr.default === undefined) {
      throw new SchemaSyntaxError(`property default value must be a function or a scalar in ${this._name}:${property}`);
    }
  }
  else delete schema.default;

  if (schema.hasMany !== undefined || schema.hasOne !== undefined) {
    if (descr.required) throw new SchemaSyntaxError(`required is not supported with relations in for ${this._name}:${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: relation on deep property in ${this._name}:${property}`);

    let { collection, hasOne, hasMany } = schema.hasMany || schema.hasOne;
    /* foreign collection */
    descr.collection = collection = this._db.collection(collection)[this$];
    /* foreign item klass */
    descr.klass = collection[itemKlass$];

    let foreign;

    if (schema.hasMany !== undefined) {
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

      let foreignDescr = createSchemaDescriptor({
        name: foreign,
        required: false,
        type: this._name,
        collection: this,
        klass: this[itemKlass$],
        hasMany: hasMany,
        readPropertySymbol: Symbol(foreign)
      }, validator);
      if (schema.hasMany !== undefined) {
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
    if (schema.hasMany !== undefined) {
      defineProperty(itemProto, property, hasManyPropertyDescriptor(descr));
    }
    else {
      defineProperty(itemProto, property, hasOnePropertyDescriptor(descr, this._name));
    }
  }
  else if (schema.unique) {
    if (!isIndexableType(descr.type)) throw new SchemaSyntaxError(`unimplemented: unique index on ${descr.type.name} type property in ${this._name}:${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`unimplemented schema: unique index on deep property in ${this._name}:${property}`);
    let unique = descr.unique = new UniqueIndex();
    descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
    defineProperty(itemProto, property, uniquePropertyDescriptor(descr, this._name));
    installIndex(this, property, unique);
  }
  else if (schema.index) {
    if (!isIndexableType(descr.type)) throw new SchemaSyntaxError(`unimplemented: index on ${descr.type.name} type property in ${this._name}:${property}`);
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

  if (descr.unique || descr.index || descr.hasMany !== undefined || descr.hasOne !== undefined) {
    addItemProtoPropertyDesctructor(itemProto, property);
  }

  this[schema$][extend$](this, descr);
};

/* install index for user to acces it on collection.by */
function installIndex(collection, property, index) {
  defineProperty(collection.by, property, {
    value: createIndexWrap(index), enumerable: true, configurable: false, writable: false});
}
