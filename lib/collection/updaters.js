"use strict";

const this$    = Symbol.for("this");
const proxy$   = Symbol.for("proxy");
const destroy$ = Symbol.for("destroy");
const items$   = Symbol.for("items");

const hasOwnProperty = Object.prototype.hasOwnProperty;

const { isObject, isArray, isDate } = require('../util');

const itemKlass$ = require('./schema').itemKlassSym;
const { revokeSym: revoke$ } = require('./item');
const { itemProxyHandler } = require('./proxy');

const getter = require('./accessor');
const eraser = require('./eraser');
const setter = require('./setter');

const assign = Object.assign;

// call on collection
module.exports = {
  ['+'](id, property, data) {
    var items = this[items$];
    var proxy = items.get(id);

    if (proxy && property.length !== 0 && data !== undefined) {
      var value = getter(proxy[this$], property);
      if (isObject(value)) {
        if ('function' === typeof value.add) {
          value.add(data);
        }
        else if ('function' === typeof value.push) {
          value.push(data);
        }
        else if (isArray(data) && 'function' === typeof value.set) {
          value.set(data[0], data[1]);
        }
      }
      else if ('string' === typeof value || 'number' === typeof value || isDate(value)) {
        setter(proxy[this$], property, value + data);
      }
    }
    return proxy;
  },

  ['-'](id, property, data) {
    var items = this[items$];
    var proxy = items.get(id);

    if (proxy && property.length !== 0 && data !== undefined) {
      var value = getter(proxy[this$], property);
      if (isObject(value)) {
        if ('function' === typeof value.delete) {
          value.delete(data);
        }
        else if ('function' === typeof value.splice && 'function' === typeof value.indexOf) {
          for(;;) {
            let index = value.indexOf(data);
            if (index === -1) break;
            value.splice(index, 1);
          }
        }
      }
      else if ('number' === typeof value || isDate(value)) {
        setter(proxy[this$], property, value - data);
      }
      else if ('string' === typeof value) {
        setter(proxy[this$], property, value.replace(data, ''));
      }
    }
    return proxy;
  },

  ['!'](id, property) {
    var items = this[items$];
    if (id.length !== 0) {
      var proxy = items.get(id);

      if (property.length !== 0) {
        if (proxy) {
          eraser(proxy[this$], property);
          return proxy;
        }
      }
      else {
        if (proxy) proxy[this$][destroy$]();
        return items.delete(id);
      }
    }
    else {
      var size = items.size;
      for(var proxy of items.values()) {
        proxy[this$][destroy$]();
      }
      items.clear();
      return size !== 0;
    }
  },

  ['='](id, property, data) {
    // console.log('=== ', [id, property, data, property.length])
    var items = this[items$];
    var proxy = items.get(id);
    if (data === undefined) {
      if (property.length !== 0) {
        if (proxy) {
          eraser(proxy[this$], property);
          return proxy;
        }
      }
      else {
        if (proxy) proxy[this$][destroy$]();
        return items.delete(id);
      }
    }
    else if (data === null && property.length === 0) {
      if (proxy) proxy[this$][destroy$]();
      return items.delete(id);
    }
    else {
      if (property.length !== 0) {
        if (proxy) {
          setter(proxy[this$], property, data);
          return proxy;
        }
      }
      else {
        if (proxy) {
          let item = proxy[this$];
          for(let prop in item) {
            if (!hasOwnProperty.call(data, prop)) {
              if (hasOwnProperty.call(item, prop)) {
                delete item[prop]; /* delete simple property */
              }
              else {
                item[prop] = undefined; /* clear descriptor property */
              }
            }
          }
          assign(item, data);
        }
        else {
          let item = new this[itemKlass$](id);
          let { proxy, revoke } = Proxy.revocable(item, itemProxyHandler); // first create proxy so indexes are properly assigned
          item[proxy$] = proxy;
          item[revoke$] = revoke;
          items.set(id, proxy);
          try {
            assign(item, data);
          } catch(err) {
            item[destroy$]();
            items.delete(id);
            throw err;
          }
          return proxy; /* scope proxy */
        }

        return proxy;
      }
    }
  },
  ['m'](filter, options, data) {
  },
  ['U'](filter, options, data) {
  },
  ['R'](filter, options, data) {
  }
};
