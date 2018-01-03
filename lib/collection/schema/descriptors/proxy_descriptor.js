"use strict";

/* this should be used on a detached item prototype
   instead of an actual index descriptor */
module.exports = exports = function proxyPropertyDescriptor(descr) {
  var descriptor = {
    set(value) {
      this[descr.writePropertySymbol] = value;
    },
    enumerable: true,
    configurable: false
  };

  if ('string' === typeof descr.name) {
    /* only for string property (not a layer) */
    const property = descr.readPropertySymbol;
    descriptor.get = function() {
      return this[property];
    };
  }

  return descriptor;
};
