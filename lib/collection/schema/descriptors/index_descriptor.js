"use strict";

const proxy$  = Symbol.for("proxy");

module.exports = exports = function indexPropertyDescriptor(descr) {
  const property = Symbol(descr.name)
      , index = descr.index;

  return {
    get() {
      return this[property];
    },
    set(value) {
      const current = this[property]
          , proxy = this[proxy$];
      if (current !== undefined) index.delete(current, proxy);
      this[property] = value;
      if (value !== undefined) {
        index.add(value, proxy);
      }
    },
    enumerable: true,
    configurable: false
  };
};
