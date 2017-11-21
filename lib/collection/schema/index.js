"use strict";

const assign = Object.assign
    , freeze = Object.freeze
    , create = Object.create
    , defineProperty = Object.defineProperty
    , isPrototypeOf = Object.prototype.isPrototypeOf;

const { assertConstantsDefined
      , copyOwnProperties
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
const { UniqueIndex, MultiValueIndex, CompositeUniqueIndex, CompositeMultiValueIndex
      , createIndexWrap } = require('../indexes');

const { COLLECTION_NAME_MATCH
      , reservedPropertySet
      , coerceSchemaType
      , isIndexableType
      , validateDefault
      , validatePropertyName
      , validate, validateElement, validateObject } = require('./validate');

const { thisSym: this$ } = require('../symbols');

assertConstantsDefined({this$}, 'symbol');

const extend$            = Symbol.for("extend")
    , itemKlass$         = Symbol.for("itemKlass")
    , detachedItemKlass$ = Symbol.for("detachedItemKlass")
    , name$              = Symbol.for("name")
    , schema$            = Symbol.for("schema")
    , validate$          = Symbol.for("validate")
    , validateElement$   = Symbol.for("validateElement");

const descriptors$        = Symbol("descriptors")
    , indexDescriptors$   = Symbol("indexDescriptors")
    , hasManyDescriptors$ = Symbol("hasManyDescriptors")
    , hasOneDescriptors$  = Symbol("hasOneDescriptors");

exports.COLLECTION_NAME_MATCH = COLLECTION_NAME_MATCH;
exports.validatePropertyName = validatePropertyName;
exports.createSchema = createSchema;

function createSchema(name) {
  return create(schemaProto, {
    [name$]:               {value: name, enumerable: false, configurable: false, writable: false},
    [descriptors$]:        {value: [],   enumerable: false, configurable: false, writable: false},
    [indexDescriptors$]:   {value: [],   enumerable: false, configurable: false, writable: false},
    [hasManyDescriptors$]: {value: [],   enumerable: false, configurable: false, writable: false},
    [hasOneDescriptors$]:  {value: [],   enumerable: false, configurable: false, writable: false}
  });
}

const schemaProto = freeze(copyOwnProperties(create(null), {
  [validate$]: validateObject,
  [validateElement$](value) {
    throw new TypeError(`${this[name$]}: unimplemented namespace element operation`);
  },
  get [Symbol.for("indexDescriptors")]() {
    return this[indexDescriptors$].slice();
  },
  get [Symbol.for("hasManyDescriptors")]() {
    return this[hasManyDescriptors$].slice();
  },
  get [Symbol.for("hasOneDescriptors")]() {
    return this[hasOneDescriptors$].slice();
  },
  [Symbol.for("indexDescriptorsIterate")]() {
    return this[indexDescriptors$][Symbol.iterator]();
  },
  [Symbol.for("hasManyDescriptorsIterate")]() {
    return this[hasManyDescriptors$][Symbol.iterator]();
  },
  [Symbol.for("hasOneDescriptorsIterate")]() {
    return this[hasOneDescriptors$][Symbol.iterator]();
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
      if (name in this) throw new SchemaSyntaxError(`${collection._name}: schema property already exists: ${name.toString()}`);
      this[name] = descr;
    }
    else {
      defineProperty(descr, name$, {
        value: collection._name + '[].' + name, enumerable: false, configurable: false, writable: false});

      prefix || (prefix = 0);
      name = name.substr(prefix);

      if (prefix !== 0 && name.length === 0) {
        throw new SchemaSyntaxError(`${collection._name}: property name must not end with a "." in ${descr.name}`);
      }
      try {
        validatePropertyName(name, this);
      } catch(err) {
        throw new SchemaSyntaxError(err.message);
      }

      if (name in this) throw new SchemaSyntaxError(`${collection._name}: schema property already exists: ${descr.name}`);
      descr.prop = name;

      for(let offset = name.indexOf('.'); offset > -1; offset = name.indexOf('.', offset)) {
        if (offset === 0) {
          throw new SchemaSyntaxError(`${collection._name}: invalid "." separator placement in schema property ${descr.name}`);
        }
        let ns = name.substr(0, offset);
        let schema = this[ns] || (this[ns] = createSchema(collection._name + '[].' + ns));
        if (!isPrototypeOf.call(schemaProto, schema)) {
          throw new SchemaSyntaxError(`${collection._name}: deep property: ${descr.name} collides with another property: ${schema.name}`);
        }
        offset += 1;
        schema[extend$](collection, descr.clone(), prefix + offset);
      }

      this[name] = descr;
      this[descriptors$].push(descr);
      if (descr.collection) {
        if (descr.hasMany) {
          this[hasManyDescriptors$].push(descr);
        }
        else {
          this[hasOneDescriptors$].push(descr);
        }
      }
    }
  },

  [Symbol.iterator]() {
    return this[descriptors$][Symbol.iterator]();
  }
}));

/*
  index1: {unique: true, components: ['foo', 'bar']}
  index2: {unique: false, components: ['foo', 'bar']}
  index2: ['foo', 'bar']
*/
exports.isSchemaCompositeIndex = function(propSchema) {
  return (isArray(propSchema) || isObject(propSchema) && isArray(propSchema.components));
};

exports.addSchemaCompositeIndex = function(indexName, schemaCfg) {
  if (indexName.length === 0) throw new SchemaSyntaxError(`${this._name}: composite index name must not be empty in ${indexName}`);
  if (indexName.startsWith('__')) throw new SchemaSyntaxError(`${this._name}: composite index name must not start with a "__": ${indexName}`);
  if (reservedPropertySet.has(indexName)) throw new SchemaSyntaxError(`${this._name}: reserved composite index name: ${indexName}`);
  if (indexName.includes('.')) throw new SchemaSyntaxError(`${this._name}: composite index name must not include "." in ${indexName}`);

  const schema = this[schema$]
      , itemProto = this[itemKlass$].prototype;

  var indexCfg = schemaCfg[indexName];

  if (isArray(indexCfg)) {
    indexCfg = {unique: false, components: indexCfg.slice(0)};
  }
  else if (!isArray(indexCfg.components)) {
    throw new SchemaSyntaxError(`${this._name}: composite index components must be an array: ${indexName}`);
  }
  else {
    indexCfg = {unique: !!indexCfg.unique, components: indexCfg.components.slice(0)};
  }
  if (!indexCfg.components.every(isString)) {
    throw new SchemaSyntaxError(`${this._name}: composite index components must be an array of property names: ${indexName}`);
  }
  if (indexCfg.components.length < 2) {
    throw new SchemaSyntaxError(`${this._name}: composite index requires at least 2 components in ${indexName}`);
  }
  if (indexCfg.components.length > 99) {
    throw new SchemaSyntaxError(`${this._name}: too many composite index components in ${indexName}`);
  }
  if (new Set(indexCfg.components).size !== indexCfg.components.length) {
    throw new SchemaSyntaxError(`${this._name}: index components must be unique in ${indexName}`);
  }

  schemaCfg[indexName] = indexCfg;

  const compositePropertySymbol = Symbol(indexName)
      , indexComponentDescriptors = []
      , index = (indexCfg.unique) ? new CompositeUniqueIndex(indexCfg.components.length)
                                  : new CompositeMultiValueIndex(indexCfg.components.length)

  for(var [idx, property] of indexCfg.components.entries()) {
    if (property.includes('.')) throw new SchemaSyntaxError(`${this._name}: unimplemented composite index on deep property in ${property}`);
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
      throw new SchemaSyntaxError(`${this._name}: non-indexable schema property: ${property}`);
    }

    descr = prepareLayeredIndexDescriptor(schema, descr, property, indexName + '.');

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
  if (property in this[schema$]) throw new SchemaSyntaxError(`${this._name}: schema property already exists: ${property}`);

  const validator = validators && validators[property]
      , detachedItemProto = this[detachedItemKlass$].prototype
      , itemProto = this[itemKlass$].prototype;

  var schema = schemaCfg[property];

  if (isString(schema) || isFunction(schema)) {
    schemaCfg[property] = schema = assign(create(null), {type: schema});
  }
  else {
    schemaCfg[property] = schema = assign(create(null), schema);
  }

  if (validator !== undefined && !isFunction(validator)) {
    throw new SchemaSyntaxError(`${this._name}: validator is not a function for ${property}`);
  }

  const descr = createSchemaDescriptor({name: property, required: !!schema.required}, validator);

  descr.type = coerceSchemaType(schema, validator, this._name, property, this._db.types);
  if (descr.type === undefined) {
    throw new SchemaSyntaxError(`${this._name}: invalid schema type, hasMany or hasOne for ${property}`);
  }

  if (schema.default !== undefined) {
    if (schema.hasOne !== undefined || schema.hasMany !== undefined) {
      throw new SchemaSyntaxError(`${this._name}: property default value is not allowed for a relation in ${property}`);
    }
    descr.default = validateDefault(schema.default);
    if (descr.default === undefined) {
      throw new SchemaSyntaxError(`${this._name}: property default value must be a function or a scalar in ${property}`);
    }
  }
  else delete schema.default;

  if (schema.hasMany !== undefined || schema.hasOne !== undefined) {
    if (descr.required) throw new SchemaSyntaxError(`${this._name}: required is not supported with relations in for ${property}`);
    if (property.includes('.')) throw new SchemaSyntaxError(`${this._name}: unimplemented schema: relation on deep property in ${property}`);

    let { collection, hasOne, hasMany } = schema.hasMany || schema.hasOne;
    /* foreign collection */
    descr.collection = collection = this._db.collection(collection)[this$];
    /* foreign item klass */
    descr.klass = collection[itemKlass$];

    let foreign;

    if (schema.hasMany !== undefined) { /* many -> many */
      if (schema.hasOne !== undefined) throw new SchemaSyntaxError(`${this._name}: only one of "hasMany" or "hasOne" relation type may be defined in ${property}`);
      if (hasOne !== undefined) throw new SchemaSyntaxError(`${this._name}: hasMany relation forbids hasOne foreign property in ${property}`);
      if (hasMany === undefined) throw new SchemaSyntaxError(`${this._name}: hasMany relation requires hasMany foreign property in ${property}`);
      if (!isString(hasMany) || hasMany.length === 0) throw new SchemaSyntaxError(`${this._name}: hasMany foreign property name must be a non empty string in ${property}`);
      descr.foreign = foreign = hasMany;
      descr.hasMany = hasMany = true;
      descr.readPropertySymbol = Symbol(property);
    }
    else if (hasOne !== undefined && hasMany !== undefined) {
      throw new SchemaSyntaxError(`${this._name}: hasOne relation requires only one of "hasMany" or "hasOne" foreign property in ${property}`);
    }
    else { /* schema.hasOne */
      if (hasMany !== undefined) { /* one -> many */
        if (!isString(hasMany) || hasMany.length === 0) throw new SchemaSyntaxError(`${this._name}: hasMany foreign property name must be a non empty string in ${property}`);
        descr.foreign = foreign = hasMany;
        hasMany = true;
      }
      else if (hasOne !== undefined) { /* one -> one */
        if (!isString(hasOne) || hasOne.length === 0) throw new SchemaSyntaxError(`${this._name}: hasOne foreign property name must be a non empty string in ${property}`);
        descr.unique = new UniqueIndex();
        descr.foreign = foreign = hasOne;
        hasMany = false;
      }
      descr.hasOne = true;
      /* allow composite-indexes over primary property */
      descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
    }

    if (foreign !== undefined) {
      let foreignSchema = collection[schema$]
        , foreignProto = descr.klass.prototype;

      if (foreign in foreignSchema) {
        throw new SchemaSyntaxError(`${this._name}: can't assign foreign schema to ${collection._name}[].${foreign} from ${property}`);
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
  else { /* not a reference */
    if (descr.type === Date) {
      if (property.includes('.')) throw new SchemaSyntaxError(`${this._name}: unimplemented schema: Date on deep property in ${property}`);
      descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
      defineProperty(detachedItemProto, property, datePropertyDescriptor(descr));
    }

    if (schema.unique) {
      if (!isIndexableType(descr.type)) throw new SchemaSyntaxError(`${this._name}: unimplemented: unique index on ${descr.type.name} type property in ${property}`);
      if (property.includes('.')) throw new SchemaSyntaxError(`${this._name}: unimplemented schema: unique index on deep property in ${property}`);
      let unique = new UniqueIndex()
        , idescr = prepareLayeredIndexDescriptor(this[schema$], descr, property, '');
      idescr.indexName = property;
      idescr.unique = unique;
      if (descr !== idescr) descr.unique = unique; /* for reflection and destructor */
      defineProperty(itemProto, idescr.name, uniquePropertyDescriptor(idescr, this._name));
      installIndex(this, property, unique);
    }
    else if (schema.index) {
      if (!isIndexableType(descr.type)) throw new SchemaSyntaxError(`${this._name}: unimplemented: index on ${descr.type.name} type property in ${property}`);
      if (property.includes('.')) throw new SchemaSyntaxError(`${this._name}: unimplemented schema: index on deep property in ${property}`);
      let index = new MultiValueIndex()
        , idescr = prepareLayeredIndexDescriptor(this[schema$], descr, property, '');
      idescr.indexName = property;
      idescr.index = index;
      if (descr !== idescr) descr.index = index; /* for reflection and destructor */
      defineProperty(itemProto, idescr.name, indexPropertyDescriptor(idescr));
      installIndex(this, property, index);
    }
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

function prepareLayeredIndexDescriptor(schema, descr, property, prefixName) {
  if (descr.readPropertySymbol === undefined) {
    /* index descriptor directly on property descriptor */
    descr.readPropertySymbol = descr.writePropertySymbol = Symbol(property);
  }
  else {
    let name = Symbol(prefixName + property);
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

  return descr;
}
