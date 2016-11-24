"use strict";

const this$            = Symbol.for("this")
    , add$             = Symbol.for("add")
    , delete$          = Symbol.for("delete")
    , id$              = Symbol.for("id");

const foreignItems$    = Symbol("foreignItems")
    , foreignProperty$ = Symbol("foreignProperty");

class ManyToOneSet extends Set {

  constructor(itemProxy, foreignItems, foreignProperty) {
    super();
    this[id$] = itemProxy[id$];
    this[foreignItems$] = foreignItems;
    this[foreignProperty$] = foreignProperty;
  }

  /* one side access through */
  [add$](proxy) {
    super.add(proxy);
  }

  /* one side access through */
  [delete$](proxy) {
    super.delete(proxy);
  }

  add(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy) {
      super.delete(proxy); /* re-arrange */
      proxy[this$][this[foreignProperty$]] = this[id$];
    }
    return this;
  }

  delete(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy && this.has(proxy)) {
      proxy[this$][this[foreignProperty$]] = undefined;
      return true;
    }
    return false;
  }

  clear() {
    const foreignProperty = this[foreignProperty$];
    for(var proxy of this.values()) {
      proxy[this$][foreignProperty] = undefined;
    }
  }

  toJSON() {
    return Array.from(this);
  }

  toArray() {
    return Array.from(this);
  }

  get length() {
    return this.size;
  }

  slice(start, end) {
    return Array.from(this).slice(start, end);
  }

  /* iters */
}

module.exports = ManyToOneSet;
