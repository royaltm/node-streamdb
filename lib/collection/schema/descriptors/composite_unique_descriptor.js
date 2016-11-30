"use strict";

const id$    = Symbol.for("id")
    , proxy$ = Symbol.for("proxy");

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function compositeUniquePropertyDescriptor(descr, collectionName) {
  const descriptor = {}
      , { indexComponentIdx, indexComponentCount, compositePropertySymbol, unique } = descr;

  if ('string' === typeof descr.name) {
    /* only for string property (not a layer) */
    const property = descr.readPropertySymbol;
    descriptor.get = function() {
      return this[property];
    };
  }

  Object.assign(descriptor, {
    set(value) {
      const keys = this[compositePropertySymbol] || (this[compositePropertySymbol] = new Array(indexComponentCount));
      const current = keys[indexComponentIdx];

      if (value === current) return; /* same value no-op */

      try {
        keys[indexComponentIdx] = value; /* begin */

        if (value !== undefined && unique.has(keys)) {
          throw new UniqueConstraintViolationError(`unique constraint violated: (${descr.indexName}) ${collectionName}["${this[id$]}"].${descr.indexComponentName} = ${String(value)}`);
        }

        this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      } catch(err) {
        keys[indexComponentIdx] = current; /* rollback */
        throw err;
      }

      if (keys[0] !== undefined) {
        unique.set(keys, this[proxy$]);
      }

      if (indexComponentIdx === 0) {
        if (current !== undefined) {
          keys[indexComponentIdx] = current;
          unique.delete(keys, this[proxy$]);
          keys[indexComponentIdx] = value;
        }
      }
      else if (keys[0] !== undefined) {
        keys[indexComponentIdx] = current;
        unique.delete(keys, this[proxy$]);
        keys[indexComponentIdx] = value;
      }

    },
    enumerable: true,
    configurable: false
  });

  return descriptor;
};

