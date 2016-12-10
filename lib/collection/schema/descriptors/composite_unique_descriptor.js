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
      const keys = this[compositePropertySymbol] || (this[compositePropertySymbol] = new Array(indexComponentCount))
          , current = keys[indexComponentIdx];

      if (value === current) return; /* same value no-op */

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

      if (keys[0] !== undefined) {
        compositeUnique.set(keys, proxy);
      }

      if (indexComponentIdx === 0) {
        if (current !== undefined) {
          keys[indexComponentIdx] = current;
          compositeUnique.delete(keys, proxy);
          keys[indexComponentIdx] = value;
        }
      }
      else if (keys[0] !== undefined) {
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

