"use strict";

const hasOwnProperty = Object.prototype.hasOwnProperty;
const create = Object.create;
const { copyOwnProperties
      , isFunction, isPlainObject, isObject, isString } = require('./util');
const accessor = require('./collection/accessor');
const Type = require('./collection/schema/types/base.js');
const { Item } = require('./collection/item');

function getRoot(options, rootType) {
  var root = options[rootType] || options.root || global;
  if (!isObject(root)) throw new TypeError(`${rootType} option must be an object`);
  return root;
}

function findValue(options, rootType, value) {
  if (isString(value)) {
    value = accessor(getRoot(options, rootType), value);
  }

  return value;
}

exports.parseTypes = function(options) {
  const types = {};

  if (options.types != null) {
    if (!Array.isArray(options.types)) {
      throw new TypeError("options.types: must be an array");
    }
    for(let type of options.types) {
      type = findValue(options, "typesRoot", type);
      if (!isFunction(type) || !(type.prototype instanceof Type)) {
        throw new TypeError(`options.types: type must be a class that extends DB.Type`);
      }
      if (!isString(type.typeName) || type.typeName !== type.typeName.toLowerCase()) {
        throw new TypeError(`options.types: type.typeName must be a lower-case name`);
      }
      if (type.typeName in types) {
        throw new TypeError(`options.types: type.typeName: "${name}" already defined`);
      }
      types[type.typeName] = type;
    }
  }

  return Object.freeze(types);
};

exports.parseModels = function(options, schemaCfg) {
  const models = {};

  if (options.models != null) {
    if (!isPlainObject(options.models)) {
      throw new TypeError("options.models: must be a dictionary");
    }

    for(let name in options.models) {
      if (!hasOwnProperty.call(options.models, name)) continue;

      let model = findValue(options, "modelsRoot", options.models[name]);

      if (!isFunction(model)) {
        if (!isPlainObject(model)) {
          throw new TypeError(`options.models.${name}: must be a class that extends DB.Item or a prototype object`);
        }

        function Mixin() {}
        Mixin.prototype = copyOwnProperties(create(Item.prototype), model);
        Object.defineProperty(Mixin.prototype, 'constructor', {value: Mixin,
          writable: true,
          enumerable: false,
          configurable: true
        });
        model = Mixin;
      }

      if (!(model.prototype instanceof Item)) {
        throw new TypeError(`options.models.${name}: must be a class that extends DB.Item`);
      }

      if (model.schema !== undefined) {
        if (!isPlainObject(model.schema)) {
          throw new TypeError(`options.models.${name}.schema: must be a schema descriptor`);
        }
        if (hasOwnProperty.call(schemaCfg, name)) {
          schemaCfg[name] = Object.assign(create(null), model.schema, schemaCfg[name]);
        }
        else {
          schemaCfg[name] = model.schema;
        }
      }

      models[name] = model;
    }
  }

  return Object.freeze(models);
};

exports.parseValidators = function(options, models, schemaCfg) {
  const validators = {};

  if (options.validators != null) {
    if (!isPlainObject(options.validators)) {
      throw new TypeError("options.validators: must be a dictionary");
    }

    for(let name in options.validators) {
      if (!hasOwnProperty.call(options.validators, name)) continue;

      let validator = findValue(options, "validatorsRoot", options.validators[name]);
      validators[name] = addValidator(name, validator, schemaCfg);
    }
  }

  for(let name in models) {
    if (!hasOwnProperty.call(models, name)) continue;

    let validator = models[name].validator;
    if (validator !== undefined && !hasOwnProperty.call(validators, name)) {
      validators[name] = addValidator(name, validator, schemaCfg);
    }
  }

  return Object.freeze(validators);
};

function addValidator(name, validator, schemaCfg) {
  if (!isObject(validator)) {
    throw new TypeError(`options.validators.${name}: must be an object with own property methods as property validators`);
  }
  if (!hasOwnProperty.call(schemaCfg, name)) schemaCfg[name] = create(null);
  var collectionValidator = create(null);
  var collectionSchemaCfg = schemaCfg[name];
  for(let prop in validator) {
    if (!hasOwnProperty.call(validator, prop)) continue;

    if (isFunction(validator[prop])) {
      collectionValidator[prop] = validator[prop];
      if (!hasOwnProperty.call(collectionSchemaCfg, prop)) collectionSchemaCfg[prop] = '*';
    }
  }
  return Object.freeze(collectionValidator);
}
