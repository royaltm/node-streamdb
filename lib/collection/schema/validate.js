"use strict";

const create = Object.create
    , hasOwnProperty = Object.prototype.hasOwnProperty;

const {
    assertConstantsDefined
  , isArray, isFunction, isNumber, isString, isObject, isBoolean, isPlainObject, isPrimitive
  } = require('../../util');

const vm = require('vm');

const { idSym: id$ } = require('../symbols');

assertConstantsDefined({id$}, 'symbol');

const name$ = Symbol.for("name"),
      validate$ = Symbol.for("validate");

const defaultTypes = require('./types')
    , Primitive    = defaultTypes["primitive"]
    , { Ident }    = require('../../id')
    , accessor     = require('../accessor')
    , digger       = require('../digger')
    , eraser       = require('../eraser');

const COLLECTION_NAME_MATCH = exports.COLLECTION_NAME_MATCH = /^[$a-zA-Z][$0-9a-zA-Z_-]*$/;

const defaultFunctions = {
  'Date.now': Date.now
};

const reservedPropertySet = exports.reservedPropertySet = new Set([
  '_id',
  'inspect',
  'toJSON'
]);

exports.validateDefault = function(value) {
  if (isObject(value) && isString(value.function)) {
    return defaultFunctions[value.function] || vm.runInThisContext('() => ' + value.function);
  }
  else if (isFunction(value) || isPrimitive(value)) {
    return value;
  }
};

exports.isIndexableType = function(type) {
  if (isString(type)) return true; // a relation

  switch(type) {
    case null:
      return false;
    case String:
    case Number:
    case Boolean:
      return true;
    default:
      if (!isFunction(type)) return type.isPrimitive;
  }

  return false;
};

exports.coerceSchemaType = function(schema, validator, property, dbtypes) {
  if (schema.hasMany !== undefined) {
    let collection;
    if (isPlainObject(schema.hasMany)) {
      collection = schema.hasMany.collection;
    }
    if (isString(collection) && COLLECTION_NAME_MATCH.test(collection)) {
      return collection;
    }
  }
  else if (schema.hasOne !== undefined) {
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
  }
  else {
    let type = schema.type;
    if (isString(type)) type = type.toLowerCase();
    switch(type) {
      case "*": case null: return null;
      case "string": case String: return String;
      case "number": case Number: return Number;
      case "date": case Date: return Date;
      case "boolean": case Boolean: return Boolean;
      default:
        type = dbtypes[type] || defaultTypes[type];
        if (isFunction(type)) {
          return new type(schema, property);
        }
        else if (schema.type === undefined) {
          if (schema.unique || schema.index) {
            return new Primitive();
          }
          else if (validator !== undefined) {
            return null;
          }
        }
    }
  }
};

exports.validateObject = function(value) {
  var descr, item, val, prop;
  if (value === undefined) {
    for(descr of this) {
      item = descr[validate$]();
      if (item !== undefined) {
        value || (value = create(null));
        digger(value, descr.prop, item);
      }
    }
  }
  else if (isPlainObject(value)) {
    for(descr of this) {
      prop = descr.prop;
      val = accessor(value, prop);
      item = descr[validate$](val);
      if (item !== undefined) {
        if (item !== val) digger(value, prop, item);
      }
      else eraser(value, prop);
    }

    for(var prop in value) {
      if (hasOwnProperty.call(value, prop)) {
        if (prop.length === 0) throw new TypeError(`${this[name$]}: property name must not be empty`);
        if (reservedPropertySet.has(prop)) throw new TypeError(`${this[name$]}: reserved property name: ${prop}`);
        if (prop.startsWith('__')) throw new TypeError(`${this[name$]}: property name must not start with "__": ${prop}`);
      }
    }
  }
  else throw new TypeError(`${this[name$]}: property must be an object`);

  return value;
};

exports.validateElement = function(value) {
  if (value !== undefined) {
    let type = this.type;
    if (isString(type)) { /* relation */
      if (this.hasMany) { /* has many */
        if (value instanceof this.klass) value = value[id$];
        if (value !== undefined) value = new Ident(value);
      }
      else throw new TypeError(`${this[name$]}: hasOne relation forbids element operation`);
    }
    else {
      switch(type) {
        case null:
          // pass anything
          break;
        case Boolean:
          throw new TypeError(`${this[name$]}: boolean forbids element operation`);
          break;
        case String:
          if (!isString(value)) throw new TypeError(`${this[name$]}: property needs to be a string`);
          break;
        case Number:
          if (!isNumber(value)) throw new TypeError(`${this[name$]}: property needs to be a number`);
          break;
        case Date:
          if (isString(value)) value = Date.parse(value);
          if (value instanceof Date || (isObject(value) && isFunction(value.getTime))) value = value.getTime();
          if (!isNumber(value) || !isFinite(value)) {
            throw new TypeError(`${this[name$]}: property needs to be a date or a primitive convertible to a date`);
          }
          break;
        default:
          value = type.validateElement(value, this);
      }
    }

  }

  return value;
};

exports.validate = function(value) {
  if (value === undefined) {
    value = this.default;
    if (isFunction(value)) value = value();
  }

  if (value === undefined) {
    if (this.required) throw new TypeError(`${this[name$]}: property is required`);
  }
  else {
    let type = this.type;
    if (isString(type)) { /* relation */
      if (isArray(value) && this.hasMany) { /* has many */
        var idents = [], klass = this.klass;
        for(let val of value) {
          if (val instanceof klass) {
            val = val[id$];
            if (val === undefined) continue;
          }
          idents.push(new Ident(val));
        }
        value = idents.length === 0 ? undefined : idents;
      }
      else { /* other relation */
        if (value instanceof this.klass) {
          value = value[id$];
          // if (value === undefined && this.required) {
          //   throw new TypeError(`${this[name$]}: property is required`);
          // }
        }
        if (value !== undefined) {
          value = new Ident(value);
          if (this.hasMany) value = [value];
        }
      }
    }
    else {
      switch(type) {
        case null:
          // pass anything
          break;
        case Boolean:
          if (!isBoolean(value)) throw new TypeError(`${this[name$]}: property needs to be a boolean`);
          break;
        case String:
          if (!isString(value)) throw new TypeError(`${this[name$]}: property needs to be a string`);
          break;
        case Number:
          if (!isNumber(value)) throw new TypeError(`${this[name$]}: property needs to be a number`);
          break;
        case Date:
          if (isString(value)) value = Date.parse(value);
          if (value instanceof Date || (isObject(value) && isFunction(value.getTime))) value = value.getTime();
          if (!isNumber(value) || !isFinite(value)) {
            throw new TypeError(`${this[name$]}: property needs to be a date or a primitive convertible to a date`);
          }
          break;
        default:
          value = type.validate(value, this);
      }
    }
  }
  return value;
};
