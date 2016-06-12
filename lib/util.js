"use strict";

const toString = Object.prototype.toString;

exports.isArray = Array.isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg === null || arg === undefined;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === undefined;
}
exports.isUndefined = isUndefined;

// function isRegExp(re) {
//   return binding.isRegExp(re);
// }
// exports.isRegExp = isRegExp;

function isObject(arg) {
  return arg !== null && typeof arg === 'object';
}
exports.isObject = isObject;

// function isDate(d) {
//   return binding.isDate(d);
// }
// exports.isDate = isDate;

function isError(e) {
  return toString(e) === '[object Error]' || e instanceof Error;
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg !== 'object' && typeof arg !== 'function';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function isPlainObject(value) {
  return toString.call(value) === '[object Object]';
}
exports.isPlainObject = isPlainObject;
