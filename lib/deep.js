"use strict";

const { isString, isObject, isArray, isFunction, isPlainObject } = require('./util');

const toString = Object.prototype.toString;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const create = Object.create;

function deepAssign(target, name, value) {
  if (isString(name)) {
    let path = name.split('.');
    let len = path.length - 1;
    for(let i = 0; i < len; ++i) {
      let current = target[name = path[i]];
      if (isPlainObject(current)) {
        target = current;
      } else {
        target = target[name] = create(null);
      }
    }

    name = path[len];
  }

  target[name] = value;
}

function deepDelete(target, name) {
  if (isString(name)) {
    let path = name.split('.');
    let len = path.length - 1;
    for(let i = 0; i < len; ++i) {
      let current = target[name = path[i]];
      if (isPlainObject(current)) {
        target = current;
      }
      else return;
    }

    name = path[len];
  }
  delete target[name];
}

function deepMerge(target, name, value) {
  var current;
  if (isString(name)) {
    let path = name.split('.');
    let len = path.length - 1;
    for(let i = 0; i < len; ++i) {
      current = target[name = path[i]];
      if (isPlainObject(current)) {
        target = current;
      } else {
        target = target[name] = create(null);
      }
    }

    name = path[len];
  }

  if (isArray(value)) {
    deepExtendArray(target[name] = [], value);
  } else if (isPlainObject(value)) {
    if (isPlainObject(current = target[name])) {
      deepExtend(current, value, deepMerge);
    } else {
      deepExtend(target[name] = create(null), value, deepMerge);
    }
  } else if (isObject(value)) {
    if (isFunction(value.toJSON)) {
      deepMerge(target, name, value.toJSON());
    }
  } else {
    target[name] = value;
  }
}

function deepExtendArray(target, array) {
  var i = target.length = array.length;
  while(i-- > 0) {
    if (i in array) {
      target[i] = array[i];
    }
  }
  return target;
}

function deepExtend(target, source, assign) {
  for(var name in source) {
    if (hasOwnProperty.call(source, name)) {
      assign(target, name, source[name]);
    }
  }
  return target;
}


exports.deepAssign = deepAssign;
exports.deepDelete = deepDelete;
exports.deepMerge = deepMerge;
exports.deepExtend = (target, source) => deepExtend(target, source, deepMerge);
exports.deepCopy = (source) => deepExtend(create(null), source, deepMerge);
