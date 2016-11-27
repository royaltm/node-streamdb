"use strict";

const id$    = Symbol.for("id")
    , proxy$ = Symbol.for("proxy");

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function uniquePropertyDescriptor(descr, collectionName) {
  const property = descr.readPropertySymbol = descr.writePropertySymbol = Symbol(descr.name)
      , unique = descr.unique;

  return {
    get() {
      return this[property];
    },
    set(value) {
      var current = this[property];
      if (value !== undefined && unique.has(value)) {
        if (value === current) return; /* same value no-op */
        throw new UniqueConstraintViolationError(`unique constraint violated: ${collectionName}["${this[id$]}"].${descr.name} = ${value}`);
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
