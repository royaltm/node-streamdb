"use strict";

const id$    = Symbol.for("id")
    , proxy$ = Symbol.for("proxy");

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function uniquePropertyDescriptor(descr, collectionName) {
  const property = descr.readPropertySymbol
      , unique = descr.unique;

  return {
    get() {
      return this[property];
    },
    set(value) {
      var current = this[property];

      if (value === current) return; /* same value no-op */

      if (value !== undefined && unique.has(value)) {
        throw new UniqueConstraintViolationError(`unique constraint violated: ${collectionName}["${this[id$]}"].${descr.name} = ${String(value)}`);
      }

      this[descr.writePropertySymbol] = value; /* may throw from multiple indexes */

      if (current !== undefined) unique.delete(current);
      if (value !== undefined) {
        unique.set(value, this[proxy$]);
      }
    },
    enumerable: true,
    configurable: false
  };
};
