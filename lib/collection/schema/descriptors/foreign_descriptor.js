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
      const id = this[id$]
          , current = unique.get(id);
      var proxy;
      if (primary !== undefined) {
        proxy = primaryItems.get(primary.toString());
      }
      if (current !== undefined) {
        if (current === proxy) return; /* same primary no-op */
        current[this$][primaryProperty] = undefined;
      }
      if (proxy !== undefined) {
        /* silently ignore non existing primary item */
        proxy[this$][primaryProperty] = id;
      }
    },

    enumerable: true,
    configurable: false
  };
};
