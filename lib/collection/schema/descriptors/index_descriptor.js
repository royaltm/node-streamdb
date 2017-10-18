"use strict";

const { proxySym: proxy$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({proxy$}, 'symbol');

module.exports = exports = function indexPropertyDescriptor(descr) {
  const property = descr.readPropertySymbol
      , index = descr.index
      , descriptor = {};

  if ('string' === typeof descr.name) {
    /* only for string property (not a layer) */
    descriptor.get = function() {
      return this[property];
    };
  }

  return Object.assign(descriptor, {

    set(value) {
      var current = this[property];

      if (current === undefined && value === undefined) return; /* speed up destructing */

      this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      /* make sure current and value are indexable */
      if (current !== null && 'object' === typeof current) current = current.valueOf();
      if (value !== null && 'object' === typeof value) value = value.valueOf();

      const proxy = this[proxy$];

      if (value !== undefined) {
        index.add(value, proxy); /* 1st add then delete to re-arrange without intermediate clean up */
      }
      if (current !== undefined && current !== value) {
        index.delete(current, proxy);
      }
    },

    enumerable: true,
    configurable: false
  });
};
