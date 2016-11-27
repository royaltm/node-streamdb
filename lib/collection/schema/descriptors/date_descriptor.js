"use strict";

module.exports = exports = function datePropertyDescriptor(descr) {
  const property = descr.readPropertySymbol = descr.writePropertySymbol = Symbol(descr.name);

  return {
    get() {
      return this[property];
    },
    set(value) {
      if (value === undefined) {
        this[property] = undefined;
      }
      else {
        this[property] = new Date(value);
      }
    },
    enumerable: true,
    configurable: false
  };
};
