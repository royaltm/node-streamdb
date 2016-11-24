"use strict";

const this$   = Symbol.for("this")
    , proxy$  = Symbol.for("proxy")
    , id$     = Symbol.for("id")
    , items$  = Symbol.for("items")
    , add$    = Symbol.for("add")
    , delete$ = Symbol.for("delete");

const { UniqueConstraintViolationError } = require('../../../errors');

module.exports = exports = function hasOnePropertyDescriptor(descr, collectionName) {
  const property = Symbol(descr.name)
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
          if (foreignItems.has(foreign)) {
            unique.set(foreign, this[proxy$]);
          }
          else foreign = undefined; /* no such id */
        }
        if (current !== undefined) unique.delete(current);
        this[property] = foreign;
      }
    /* one <-> many */
    : !!foreignProperty
    ? function(foreign) {
        const myProxy = this[proxy$];
        var current = this[property];

        if (current !== undefined) {
          current = foreignItems.get(current);
          if (current !== undefined) current[this$][foreignProperty][delete$](myProxy);
        }
        if (foreign !== undefined) {
          foreign = foreign.toString(); /* ensure primitive */
          let foreignProxy = foreignItems.get(foreign);
          if (foreignProxy !== undefined) {
            foreignProxy[this$][foreignProperty][add$](myProxy);
          }
          else foreign = undefined; /* no such id */
        }
        this[property] = foreign;
      }
    /* one -> */
    : function(foreign) {
      if (foreign !== undefined) foreign = foreign.toString(); /* ensure primitive */
      this[property] = foreign; /* no foreign existence tracking */
    },

    enumerable: true,
    configurable: false
  };
};
