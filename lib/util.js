"use strict";

const assert = require('assert');
const proto = Object.prototype
    , toString = proto.toString
    , getPrototypeOf = Object.getPrototypeOf;

/**
 * undefined type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isUndefined(arg) {
  return arg === undefined;
}

/**
 * null type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isNull(arg) {
  return arg === null;
}

/**
 * null or undefined type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isNullOrUndefined(arg) {
  return arg === null || arg === undefined;
}

/**
 * Boolean type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isBoolean(arg) {
  return typeof arg === 'boolean';
}

/**
 * Number type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isNumber(arg) {
  return typeof arg === 'number';
}

/**
 * String type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isString(arg) {
  return typeof arg === 'string';
}

/**
 * Symbol type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isSymbol(arg) {
  return typeof arg === 'symbol';
}

/**
 * Object type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isObject(arg) {
  return arg !== null && typeof arg === 'object';
}

/**
 * Strict object type check. Only returns `true`
 * for plain JavaScript objects derived from Object.prototype or null in its prototype chain.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isPlainObject(value) {
  return toString.call(value) === '[object Object]';
  // return value != null && ((value = getPrototypeOf(value)) === proto || value === null);
}


/**
 * Map type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isMap(value) {
  return toString.call(value) === '[object Map]';
}

/**
 * Set type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isSet(value) {
  return toString.call(value) === '[object Set]';
}

/**
 * Error type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isError(e) {
  return toString(e) === '[object Error]' || e instanceof Error;
}

/**
 * Array type check.
 *
 * @param  mixed   data The value to check.
 * @return Boolean
 */
function isTypedArray(value) {
  return !!(value && value.constructor && value.constructor.BYTES_PER_ELEMENT > 0);
}

/**
 * Date type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isDate(value) {
  return toString.call(value) === "[object Date]";
};
// function isDate(d) {
//   return binding.isDate(d);
// }


/**
 * RegExp type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isRegExp(value) {
  return toString.call(value) === "[object RegExp]";
};
// function isRegExp(re) {
//   return binding.isRegExp(re);
// }

/**
 * RegExp type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isFunction(arg) {
  return typeof arg === 'function';
}

/**
 * Primitive type check.
 *
 * @param  mixed   value The value to check.
 * @return Boolean
 */
function isPrimitive(arg) {
  return arg === null ||
         typeof arg !== 'object' && typeof arg !== 'function';
}

/**
 * Validates if all own property keys of the provided `constants` object have defined
 * value and are of type `type`.
 *
 * @param {Object} constants
 * @param {string} type
 * @param {bool} [checkNonFalsy]
 * @return {Object} constants for passing through
**/
function assertConstantsDefined(constants, type, checkNonFalsy) {
  for(var name in constants) {
    if (constants.hasOwnProperty(name)) {
      assert(constants[name] !== undefined, "missing constant: " + name);
      assert(type === typeof constants[name], "bad constant type: " + name + " - " + typeof constants[name]);
      if (checkNonFalsy) {
        assert(!!constants[name], "falsy constant: " + name);
      }
    }
  }
  return constants;
}

/**
 * Copies own string and symbol properties from source object onto target.
 *
 * @param {Object} target
 * @param {Object} source
 * @return {Object} target
**/
function copyOwnProperties(target, source) {
  if (!isObject(target)) {
    throw new TypeError('Cannot copy properties to a target that is not an object');
  }

  Object.getOwnPropertyNames(source)
  .concat(Object.getOwnPropertySymbols(source))
  .forEach(prop => {
    Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(source, prop))
  });

  return target;
}

/**
 * Returns n-th (0 based) item yielded by the iterator.
 *
 * @param {Object} iterator
 * @param {number|string} index
 * @return {*} item
**/
function getNth(iterator, index) {
  index |= 0;
  if (index >= 0) {
    for(var item of iterator) {
      if (index-- === 0) return item;
    }
  }
}

module.exports = {
  assertConstantsDefined: assertConstantsDefined,
  copyOwnProperties: copyOwnProperties,
  getNth:            getNth,
  isArray:           Array.isArray,
  isBoolean:         isBoolean,
  isBuffer:          Buffer.isBuffer,
  isDate:            isDate,
  isError:           isError,
  isFunction:        isFunction,
  isNull:            isNull,
  isNullOrUndefined: isNullOrUndefined,
  isNumber:          isNumber,
  isMap:             isMap,
  isObject:          isObject,
  isPlainObject:     isPlainObject,
  isPrimitive:       isPrimitive,
  isRegExp:          isRegExp,
  isSet:             isSet,
  isScalar:          isPrimitive,
  isString:          isString,
  isSymbol:          isSymbol,
  isTypedArray:      isTypedArray,
  isUndefined:       isUndefined
};
