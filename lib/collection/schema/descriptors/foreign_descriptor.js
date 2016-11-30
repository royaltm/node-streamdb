"use strict";

const this$   = Symbol.for("this")
    , id$     = Symbol.for("id")
    , items$  = Symbol.for("items");

module.exports = exports = function foreignPropertyDescriptor(descr, unique) {
  const primaryItems = descr.collection[items$]
      , primaryProperty = descr.primary;

  return {
    get() {
      return unique.get(this[id$]);
    },

    set(primary) {
      const id = this[id$];
      var current = unique.get(id)
        , proxy;

      if (primary !== undefined) {
        proxy = primaryItems.get(primary.toString());
      }

      if (current === proxy) return; /* same primary no-op */

      if (current !== undefined) {
        current = current[this$];
        current[primaryProperty] = undefined;
      }

      if (proxy !== undefined) {
        /* silently ignore non existing primary item */
        try {
          proxy[this$][primaryProperty] = id; /* may throw from composite index */
        } catch(err) {
          if (current !== undefined) current[primaryProperty] = id; /* roll-back */
          throw err;
        }
      }

    },

    enumerable: true,
    configurable: false
  };
};
