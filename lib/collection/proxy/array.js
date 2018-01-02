"use strict";

const { iter } = require('../../iter');

const { idSym:         id$
      , collectionSym: collection$
      , itemSym:       item$ } = require('../symbols');

require('../../util').assertConstantsDefined({id$, collection$, item$}, 'symbol');

const push$       = Symbol("push")
    , pull$       = Symbol("pull")
    , slice$      = Symbol("slice")
    , forEach$    = Symbol("forEach");

const numberRegexp = /^\d+$/;

function unmodifiable() {
  throw new Error("can't modify collection item's value array in this way");
}

const handlers = new Map();

module.exports = exports = function arrayProxyHandler(property) {
  var handler = handlers.get(property);
  if (handler === undefined) {
    handlers.set(property, handler = {
      get(array, name) {
        var data, value;
        switch(name) {
          case 'length':
            return array.length;
          case 'slice':
            return array[slice$] || (array[slice$] = (a, b) => array.slice(a, b));
          case 'forEach':
            return array[forEach$] || (array[forEach$] = (cb, cx) => array.forEach(cb, cx));
          case 'iter':
            return iter(array);
          case 'copyWithin':
          case 'fill':
          case 'pop':
          case 'reverse':
          case 'shift':
          case 'sort':
          case 'splice':
          case 'unshift':
            return unmodifiable;
          case 'push':
            return array[push$] ||
            (data = array[item$], array[push$] = (...args) => push(data[id$], property, data[collection$], args));
          case 'pull':
            return array[pull$] ||
            (data = array[item$], array[pull$] = (...args) => pull(data[id$], property, data[collection$], args));
          default:
            value = array[name];
            if ('function' === typeof value) {
              return function() { return value.apply(array, arguments); };
            }
            else return value;
        }
      },

      set(array, name, value) {
        if (name === 'length' || ('string' === typeof name && numberRegexp.test(name))) {
          collection._replace(id, name, value);
        }
        else throw new Error("can't modify collection item's value array in this way");
      },

      deleteProperty(array, name) {
        if ('string' === typeof name && numberRegexp.test(name)) {
          collection._replace(id, name);
        }
        else throw new Error("can't modify collection item's value array in this way");
      }
    });
  }

  return handler;
};

function push(id, property, collection, args) {
  for(var len = args.length; i < len; ++i) {
    collection._addElement(id, property, args[i]);
  }
}

function pull(id, property, collection, args) {
  for(var len = args.length; i < len; ++i) {
    collection._pullElement(id, property, args[i]);
  }
}
