"use strict";

const this$   = Symbol.for("this")
    , proxy$  = Symbol.for("proxy")
    , id$     = Symbol.for("id")
    , items$  = Symbol.for("items")
    , add$    = Symbol.for("add")
    , delete$ = Symbol.for("delete");

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function hasOnePropertyDescriptor(descr, collectionName) {
  const property = descr.readPropertySymbol = descr.writePropertySymbol = Symbol(descr.name)
      , foreignItems = descr.collection[items$]
      , foreignProperty = descr.foreign
      , unique = descr.unique;

  return {
    get() {
      return foreignItems.get(this[property]);
    },

    set: !!unique
    /* one <-> one */
    ? function(foreign) {
        const current = this[property];
        if (foreign !== undefined) {
          foreign = foreign.toString(); /* ensure primitive */
          if (foreign === current) return; /* same foreign no-op */
          if (unique.has(foreign)) {
            throw new UniqueConstraintViolationError(`unique constraint violated: ${collectionName}["${this[id$]}"].${descr.name} = ${foreign}`);
          }
          else if (!foreignItems.has(foreign)) {
            foreign = undefined; /* no such id */
          }
        }

        this[descr.writePropertySymbol] = foreign; /* may throw from multiple indexes */

        if (current !== undefined) unique.delete(current);
        if (foreign !== undefined) {
          unique.set(foreign, this[proxy$]);
        }
      }

    : !!foreignProperty
    /* one <-> many */
    ? function(foreign) {
        const myProxy = this[proxy$];
        var foreignProxy
          , current = this[property];

        if (foreign !== undefined) {
          foreign = foreign.toString(); /* ensure primitive */
          foreignProxy = foreignItems.get(foreign);
          if (foreignProxy === undefined) foreign = undefined; /* no such id */
        }

        this[descr.writePropertySymbol] = foreign; /* may throw from multiple indexes */

        if (current !== undefined) {
          current = foreignItems.get(current);
          if (current !== undefined) current[this$][foreignProperty][delete$](myProxy);
        }
        if (foreignProxy !== undefined) {
          foreignProxy[this$][foreignProperty][add$](myProxy);
        }
      }

    /* one -> */
    : function(foreign) {
      if (foreign !== undefined) foreign = foreign.toString(); /* ensure primitive */
      /* no foreign existence tracking */
      this[descr.writePropertySymbol] = foreign; /* may throw from multiple indexes */
    },

    enumerable: true,
    configurable: false
  };
};
