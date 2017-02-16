"use strict";

const util = require('util');

const { iter } = require('../../iter');

const { idSym:         id$
      , collectionSym: collection$
      , itemSym:       item$ } = require('../symbols');

require('../../util').assertConstantsDefined({id$, collection$, item$}, 'symbol');

const add$        = Symbol("add")
    , delete$     = Symbol("delete")
    , has$        = Symbol("has")
    , toArray$    = Symbol("toArray");

const numberRegexp = /^\d+$/;

function unmodifiable() {
  throw new Error("can't modify collection item's value set in this way");
}

const handlers = new Map();

module.exports = exports = function setProxyHandler(property) {
  var handler = handlers.get(property);
  if (handler === undefined) {
    handlers.set(property, handler = {
      get(set, name) {
        var data, value;
        switch(name) {
          case 'has':
            return set[has$] || (set[has$] = (key) => set.has(key));
          case 'toArray':
            return set[toArray$] || (set[toArray$] = () => Array.from(set));
          case 'add':
            return set[add$] ||
            (data = set[item$], set[add$] = (value) => data[collection$]._addElement(data[id$], property, value));
          case 'delete':
            return set[delete$] ||
            (data = set[item$], set[delete$] = (value) => data[collection$]._pullElement(data[id$], property, value));
          case 'ary':
            return Array.from(set);
          case 'iter':
            return iter(set);
          case 'clear':
            return unmodifiable;
          default:
            if ('string' === typeof name && numberRegexp.test(name)) {
              return Array.from(set)[name];
            }
            else {
              value = set[name];
              if ('function' === typeof value) {
                return function() { return value.apply(set, arguments); };
              }
              else return value;
            }
        }
      },

      set(set, name, value) {
        throw new Error("can't modify collection item's value set in this way");
      },

      deleteProperty(set, name) {
        throw new Error("can't modify collection item's value set in this way");
      }
    });
  }

  return handler;
};
