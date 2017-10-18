"use strict";

module.exports = exports = function datePropertyDescriptor(descr) {
  const property = descr.readPropertySymbol;

  return {
    get() {
      return this[property];
    },
    set(value) {
      this[descr.writePropertySymbol] = (value !== undefined ? new Date(value) : undefined);
    },
    enumerable: true,
    configurable: false
  };
};
