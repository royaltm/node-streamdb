"use strict";

const $this = Symbol.for("this");
const $proxy = Symbol.for("proxy");
const $destroy = Symbol.for("destroy");
const $items = Symbol.for("items");

const $itemKlass = require('./schema').itemKlassSym;
const { revokeSym: $revoke, itemProxyHandler } = require('./item');

const setter = require('./setter');

const assign = Object.assign;

// call on collection
module.exports = {
  ['='](id, property, data) {
    // console.log('=== %j', [id, property, data, property.length])
    var items = this[$items];
    var item = items.get(id);
    if (data === undefined) {
      if (property.length !== 0) {
        if (item) {
          setter(item[$this], property);
          return item;
        }
      }
      else {
        if (item) item[$this][$destroy]();
        return items.delete(id);
      }
    }
    else {
      if (property.length !== 0) {
        if (item) {
          setter(item[$this], property, data);
          return item;
        }
      }
      else {
        if (item) {
          assign(item[$this], data);
        }
        else {
          item = new this[$itemKlass](id);
          let { proxy, revoke } = Proxy.revocable(item, itemProxyHandler); // first create proxy so indexes are properly assigned
          item[$proxy] = proxy;
          item[$revoke] = revoke;
          assign(item, data);
          items.set(id, proxy);
          return proxy;
        }
        return item;
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
