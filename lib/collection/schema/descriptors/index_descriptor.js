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
      const current = this[property];

      if (current === undefined && value === undefined) return; /* speed up destructing */

      this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      const proxy = this[proxy$];

      if (current !== undefined) index.delete(current, proxy);
      if (value !== undefined) {
        index.add(value, proxy);
      }
    },

    enumerable: true,
    configurable: false
  };
};
