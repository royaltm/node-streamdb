"use strict";

const { idSym:    id$
      , proxySym: proxy$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({id$, proxy$}, 'symbol');

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function compositeUniquePropertyDescriptor(descr, collectionName) {
  const descriptor = {}
      , { indexComponentIdx, indexComponentCount, compositePropertySymbol, compositeUnique } = descr;

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

      if (value === current) return; /* same value no-op */

      if (keys === undefined) {
        this[compositePropertySymbol] = keys = new Array(indexComponentCount);
      }

      try {
        keys[indexComponentIdx] = value; /* begin */

        if (value !== undefined && compositeUnique.has(keys)) {
          let conflictKey = keys.slice();
          throw new UniqueConstraintViolationError(
            `unique constraint violated: ${descr.indexName}(${keys.map(String).join(',')}) ${collectionName}["${this[id$]}"].${descr.indexComponentName} = ${String(value)}`
            , conflictKey, compositeUnique);
        }

        this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      } catch(err) {
        keys[indexComponentIdx] = current; /* rollback */
        throw err;
      }

      const proxy = this[proxy$];

      var numKeys = compositeUnique.set(keys, proxy); /* 1st add then delete without intermediate clean up */

      if (numKeys >= indexComponentIdx) { /* all keys before this are now defined */
        keys[indexComponentIdx] = current;
        compositeUnique.delete(keys, proxy);
        keys[indexComponentIdx] = value;
      }

    },
    enumerable: true,
    configurable: false
  });

  return descriptor;
};

