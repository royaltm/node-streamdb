"use strict";

const hasOwnProperty = Object.prototype.hasOwnProperty
    , assign = Object.assign;

const { assertConstantsDefined, isObject, isArray, isDate } = require('../util');

const { idSym:      id$
      , destroySym: destroy$
      , proxySym:   proxy$
      , revokeSym:  revoke$
      , thisSym:    this$ } = require('./symbols');

assertConstantsDefined({id$, destroy$, proxy$, revoke$, this$}, 'symbol');

const items$     = Symbol.for("items")
    , itemKlass$ = Symbol.for("itemKlass");

const { itemProxyHandler } = require('./proxy');

const getter = require('./accessor')
    , eraser = require('./eraser')
    , setter = require('./setter');

// call on collection
module.exports = {
  ['!'](id, property) {
    var items = this[items$];
    if (id === null) {
      /* delete all collection items */
      var size = items.size;
      for(var proxy of items.values()) {
        proxy[this$][destroy$]();
      }
      items.clear();
      return size !== 0;
    }
    else {
      var proxy = items.get(id);

      if (property.length !== 0) {
        /* delete single property */
        if (proxy) {
          eraser(proxy[this$], property);
          return proxy;
        }
      }
      else {
        /* delete item */
        if (proxy) proxy[this$][destroy$]();
        return items.delete(id);
      }
    }
  },

  ['^'](id, mode, data) {
    var items = this[items$]
      , proxy = items.get(id)
      , item;

    if (proxy) {
      /* replace whole item */
      item = proxy[this$];
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
    }
    else {
      /* create new item */
      item = new this[itemKlass$]();
      let revocable = Proxy.revocable(item, itemProxyHandler); // first create proxy so indexes are properly assigned
      proxy = revocable.proxy;
      item[id$] = id;
      item[proxy$] = proxy;
      item[revoke$] = revocable.revoke;
      items.set(id, proxy);
    }

    try {

      assign(item, data);

    } catch(err) {
      item[destroy$]();
      items.delete(id);
      /* or replace conflicting one */
      if (err.isUniqueConstraintViolation) {

        if (mode === 'I') return; /* mode = ignore */

        proxy = err.constraintIndex.get(err.conflictKey);
        item = proxy[this$];

        if (mode !== 'M') { /* mode # merge */
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
        }

        assign(item, data);
      }
      else throw err;
    }
    return proxy;
  },

  ['='](id, property, data) {
    // console.log('=== ', [id, property, data, property.length])
    var items = this[items$];
    var proxy = items.get(id);
    if (data === undefined) {
      if (property.length !== 0) {
        /* delete single property */
        if (proxy) {
          eraser(proxy[this$], property);
          return proxy;
        }
      }
      else {
        /* delete item */
        if (proxy) proxy[this$][destroy$]();
        return items.delete(id);
      }
    }
    else if (data === null && property.length === 0) {
      /* delete item */
      if (proxy) proxy[this$][destroy$]();
      return items.delete(id);
    }
    else {
      if (property.length !== 0) {
        /* replace single property */
        if (proxy) {
          setter(proxy[this$], property, data);
          return proxy;
        }
      }
      else {
        if (proxy) {
          /* replace whole item */
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
          /* create new item */
          let item = new this[itemKlass$]();
          let { proxy, revoke } = Proxy.revocable(item, itemProxyHandler); // first create proxy so indexes are properly assigned
          item[id$] = id;
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

  ['+'](id, property, data) {
    var items = this[items$];
    var proxy = items.get(id);

    if (proxy && property.length !== 0 && data !== undefined) {
      var value = getter(proxy[this$], property);

      if (isDate(value)) {
        setter(proxy[this$], property, +value + data);
      }
      else if (isObject(value)) {
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
      else if (value == null) {
        setter(proxy[this$], property, data);
      }
      else if ('string' === typeof value || 'number' === typeof value) {
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

      if (isDate(value)) {
        setter(proxy[this$], property, +value - data);
      }
      else if (isObject(value)) {
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
      else if (value == null && 'number' === typeof data) {
        setter(proxy[this$], property, -data);
      }
      else if ('number' === typeof value) {
        setter(proxy[this$], property, value - data);
      }
      else if ('string' === typeof value) {
        setter(proxy[this$], property, value.replace(data, ''));
      }
    }
    return proxy;
  },


  ['m'](filter, options, data) {
  },
  ['U'](filter, options, data) {
  },
  ['R'](filter, options, data) {
  }
};
