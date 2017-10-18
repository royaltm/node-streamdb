"use strict";

const { idSym:    id$
      , proxySym: proxy$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({id$, proxy$}, 'symbol');

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function uniquePropertyDescriptor(descr, collectionName) {
  const property = descr.readPropertySymbol
      , unique = descr.unique
      , descriptor = {};

  if ('string' === typeof descr.name) {
    /* only for string property (not a layer) */
    descriptor.get = function() {
      return this[property];
    };
  }

  return Object.assign(descriptor, {

    set(value) {
      var current = this[property]
        , indexable = value !== null && 'object' === typeof value ? value.valueOf() : value;

      if (current !== null && 'object' === typeof current) current = current.valueOf();

      if (indexable === current) return; /* same value no-op */

      if (indexable !== undefined && unique.has(indexable)) {
        throw new UniqueConstraintViolationError(
          `unique constraint violated: ${collectionName}["${this[id$]}"].${descr.indexName} = ${String(indexable)}`
          , indexable, unique);
      }

      this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      if (current !== undefined) unique.delete(current);
      if (indexable !== undefined) {
        unique.set(indexable, this[proxy$]);
      }
    },
    enumerable: true,
    configurable: false
  });
};
