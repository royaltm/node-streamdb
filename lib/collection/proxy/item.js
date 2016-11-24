"use strict";

const toString = {}.toString;

const subitemHandlers = new Map();

const this$       = Symbol.for("this")
    , proxy$      = Symbol.for("proxy")
    , id$         = Symbol.for("id")
    , collection$ = Symbol.for("collection")
    , item$       = Symbol.for("item");

const accessor = require('../accessor');

const { Item } = require('../item');

const arrayProxyHandler = require('./array')
    , setProxyHandler   = require('./set')
    , mapProxyHandler   = require('./map');

module.exports = exports = {
  get(data, name, receiver) {
    var subitem, proxy;
    switch(name) {
      case this$: return data;
      case 'toJSON': return () => data.toJSON();
    }
    if ('string' === typeof name) {
      subitem = accessor(data, name);
      if (subitem !== null && 'object' === typeof subitem) {
        proxy = subitem[proxy$];
        if (proxy !== undefined) {
          return proxy;
        }
        else if (!(subitem instanceof Item)) {
          switch(toString.call(subitem)) {
            case '[object Object]':
              subitem[item$] = receiver;
              return subitem[proxy$] = new Proxy(subitem, subItemProxyHandler(name));
            case '[object Array]':
              subitem[item$] = receiver;
              return subitem[proxy$] = new Proxy(subitem, arrayProxyHandler(name));
            case '[object Set]':
              subitem[item$] = receiver;
              return subitem[proxy$] = new Proxy(subitem, setProxyHandler(name));
            case '[object Map]':
              subitem[item$] = receiver;
              return subitem[proxy$] = new Proxy(subitem, mapProxyHandler(name));
          }
        }
      }
    }
    else subitem = data[name];
    return subitem;
  },

  set(data, name, value) {
    if (name.length === 0) return;
    data[collection$]._replace(data[id$], name, value);
    return true;
  },

  deleteProperty(data, name) {
    if (name.length === 0) return;
    data[collection$]._replace(data[id$], name);
    return true;
  }

};

function subItemProxyHandler(property) {
  var handler = subitemHandlers.get(property);
  if (handler === undefined) {
    subitemHandlers.set(property, handler = {
      get(data, name) {
        var subitem, proxy;
        if ('string' === typeof name) {
          subitem = accessor(data, name);
          if (subitem !== null && 'object' === typeof subitem) {
            proxy = subitem[proxy$];
            if (proxy !== undefined) {
              return proxy;
            }
            else {
              switch(toString.call(subitem)) {
                case '[object Object]':
                  subitem[item$] = data[item$];
                  return subitem[proxy$] = new Proxy(subitem, subItemProxyHandler(`${property}.${name}`));
                case '[object Array]':
                  subitem[item$] = data[item$];
                  return subitem[proxy$] = new Proxy(subitem, arrayProxyHandler(`${property}.${name}`));
                case '[object Set]':
                  subitem[item$] = data[item$];
                  return subitem[proxy$] = new Proxy(subitem, setProxyHandler(`${property}.${name}`));
                case '[object Map]':
                  subitem[item$] = data[item$];
                  return subitem[proxy$] = new Proxy(subitem, mapProxyHandler(`${property}.${name}`));
              }
            }
          }
        }
        else subitem = data[name];
        return subitem;
      },

      set(data, name, value) {
        data = data[item$];
        data[collection$]._replace(data[id$], `${property}.${name}`, value);
        return true;
      },

      deleteProperty(data, name) {
        data = data[item$];
        data[collection$]._replace(data[id$], `${property}.${name}`);
        return true;
      }
    });
  }

  return handler;
}
