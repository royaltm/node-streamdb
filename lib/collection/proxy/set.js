"use strict";

const util = require('util');

const { iter } = require('../../iter');

const id$         = Symbol.for("id")
    , collection$ = Symbol.for("collection")
    , item$       = Symbol.for("item");

const add$        = Symbol("add")
    , delete$     = Symbol("delete");

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
        var data;
        switch(name) {
          case 'entries':
          case 'values':
          case 'keys':
          case Symbol.iterator:
            return () => set[name]();
          case 'toArray':
            return () => Array.from(set);
          case 'toJSON':
            return () => set.toJSON();
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
            if (numberRegexp.test(name)) {
              return Array.from(set)[name];
            }
            else return set[name];
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
