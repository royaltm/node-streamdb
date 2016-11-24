"use strict";

const { iter } = require('../../iter');

const id$         = Symbol.for("id")
    , collection$ = Symbol.for("collection")
    , item$       = Symbol.for("item");

const push$       = Symbol("push")
    , pull$       = Symbol("pull");

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
        var data;
        switch(name) {
          case 'entries':
          case 'values':
          case 'keys':
          case Symbol.iterator:
            return () => array[name]();
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
            return array[name];
        }
      },

      set(array, name, value) {
        if (name === 'length' || numberRegexp.test(name)) {
          collection._replace(id, name, value);
        }
        else throw new Error("can't modify collection item's value array in this way");
      },

      deleteProperty(array, name) {
        if (numberRegexp.test(name)) {
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
