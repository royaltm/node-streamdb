"use strict";

const proxy$  = Symbol.for("proxy");

module.exports = exports = function indexPropertyDescriptor(descr) {
  const property = descr.readPropertySymbol
      , index = descr.index;

  return {
    get() {
      return this[property];
    },
    set(value) {
      const current = this[property]
          , proxy = this[proxy$];

      this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      if (current !== undefined) index.delete(current, proxy);
      if (value !== undefined) {
        index.add(value, proxy);
      }
    },
    enumerable: true,
    configurable: false
  };
};
