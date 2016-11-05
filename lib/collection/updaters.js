"use strict";

const $this = Symbol.for("this");
const $proxy = Symbol.for("proxy");
const $destroy = Symbol.for("destroy");
const $items = Symbol.for("items");

const hasOwnProperty = Object.prototype.hasOwnProperty;

const $itemKlass = require('./schema').itemKlassSym;
const { revokeSym: $revoke, itemProxyHandler } = require('./item');

const setter = require('./setter');
const eraser = require('./eraser');

const assign = Object.assign;

// call on collection
module.exports = {
  ['!'](id, property) {
    var items = this[$items];
    if (id.length !== 0) {
      var proxy = items.get(id);

      if (property.length !== 0) {
        if (proxy) {
          eraser(proxy[$this], property);
          return proxy;
        }
      }
      else {
        if (proxy) proxy[$this][$destroy]();
        return items.delete(id);
      }
    }
    else {
      var size = items.size;
      for(var proxy of items.values()) {
        proxy[$this][$destroy]();
      }
      items.clear();
      return size !== 0;
    }
  },
  ['='](id, property, data) {
    // console.log('=== ', [id, property, data, property.length])
    var items = this[$items];
    var proxy = items.get(id);
    if (data === undefined) {
      if (property.length !== 0) {
        if (proxy) {
          eraser(proxy[$this], property);
          return proxy;
        }
      }
      else {
        if (proxy) proxy[$this][$destroy]();
        return items.delete(id);
      }
    }
    else if (data === null && property.length === 0) {
      if (proxy) proxy[$this][$destroy]();
      return items.delete(id);
    }
    else {
      if (property.length !== 0) {
        if (proxy) {
          setter(proxy[$this], property, data);
          return proxy;
        }
      }
      else {
        if (proxy) {
          let item = proxy[$this];
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
          let item = new this[$itemKlass](id);
          let { proxy, revoke } = Proxy.revocable(item, itemProxyHandler); // first create proxy so indexes are properly assigned
          item[$proxy] = proxy;
          item[$revoke] = revoke;
          assign(item, data);
          items.set(id, proxy);
          return proxy;
        }
        return proxy;
      }
    }
  },
  ['+'](id, property, data) {
    // var items = this[$items];
    // if (data !== undefined) {
    //   let item = items.get(id);
    //   if (item) {
    //     if (property.length) {
    //       deepMerge(item[$this], property, data);
    //     }
    //     else {
    //       deepExtend(item[$this], data);
    //     }
    //     return item;
    //   }
    // }
  },
  ['m'](filter, options, data) {
  },
  ['U'](filter, options, data) {
  },
  ['R'](filter, options, data) {
  }
};
