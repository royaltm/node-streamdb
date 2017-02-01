"use strict";

const { idSym:    id$
      , proxySym: proxy$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({id$, proxy$}, 'symbol');

module.exports = exports = function compositeIndexPropertyDescriptor(descr) {
  const descriptor = {}
      , { indexComponentIdx, indexComponentCount, compositePropertySymbol, compositeIndex } = descr;

  if ('string' === typeof descr.name) {
    /* only for string property (not a layer) */
    const property = descr.readPropertySymbol;
    descriptor.get = function() {
      return this[property];
    };
  }

  Object.assign(descriptor, {

    set(value) {
      var keys = this[compositePropertySymbol];
      const current = keys && keys[indexComponentIdx];

      if (current === undefined && value === undefined) return; /* speed up destructing */

      if (keys === undefined) {
        this[compositePropertySymbol] = keys = new Array(indexComponentCount);
      }

      this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      const proxy = this[proxy$];

      keys[indexComponentIdx] = value;

      var numKeys = compositeIndex.add(keys, proxy); /* 1st add then delete without intermediate clean up */

      if (numKeys >= indexComponentIdx && current !== value) { /* all keys before this are now defined */
        keys[indexComponentIdx] = current;
        compositeIndex.delete(keys, proxy);
        keys[indexComponentIdx] = value;
      }
    },
    enumerable: true,
    configurable: false
  });

  return descriptor;
};

