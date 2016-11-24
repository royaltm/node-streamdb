"use strict";

const { iter } = require('../../iter');

const id$         = Symbol.for("id")
    , collection$ = Symbol.for("collection")
    , item$       = Symbol.for("item");

const set$        = Symbol("set")
    , delete$     = Symbol("delete");

const numberRegexp = /^\d+$/;

function unmodifiable() {
  throw new Error("can't modify collection item's value set in this way");
}

const handlers = new Map();

module.exports = exports = function mapProxyHandler(property) {
  var handler = handlers.get(property);
  if (handler === undefined) {
    handlers.map(property, handler = {
      get(map, name) {
        var data;
        switch(name) {
          case 'entries':
          case 'values':
          case 'keys':
          case Symbol.iterator:
            return () => map[name]();
          case 'toArray':
            return () => Array.from(map);
          case 'toJSON':
            return () => map.toJSON();
          case 'set':
            return map[set$] ||
            (data = map[item$], map[set$] = (key, value) => data[collection$]._addElement(data[id$], property, [key, value]));
          case 'delete':
            return map[delete$] ||
            (data = map[item$], map[delete$] = (key) => data[collection$]._pullElement(data[id$], property, key));
          case 'ary':
            return Array.from(map);
          case 'iter':
            return iter(map);
          case 'clear':
            return unmodifiable;
          default:
            if ('string' === typeof name && numberRegexp.test(name)) {
              return Array.from(map)[name];
            }
            else return map[name];
        }
      },

      set(map, name, value) {
        throw new Error("can't modify collection item's value map in this way");
      },

      deleteProperty(map, name) {
        throw new Error("can't modify collection item's value map in this way");
      }
    });
  }

  return handler;
};
