"use strict";

const { iter } = require('../../iter');

const { idSym:         id$
      , collectionSym: collection$
      , itemSym:       item$ } = require('../symbols');

require('../../util').assertConstantsDefined({id$, collection$, item$}, 'symbol');

const set$        = Symbol("set")
    , delete$     = Symbol("delete")
    , has$        = Symbol("has")
    , get$        = Symbol("get")
    , toArray$    = Symbol("toArray");

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
        var data, value;
        switch(name) {
          case 'size':
            return map.size;
          case 'has':
            return map[has$] || (map[has$] = (key) => map.has(key));
          case 'get':
            return map[get$] || (map[get$] = (key) => map.get(key));
          case 'toArray':
            return map[toArray$] || (map[toArray$] = () => Array.from(map));
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
            else {
              value = map[name];
              if ('function' === typeof value) {
                return function() { return value.apply(map, arguments); };
              }
              else return value;
            }
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
