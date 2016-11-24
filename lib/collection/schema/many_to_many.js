"use strict";

const this$            = Symbol.for("this");

const foreignItems$    = Symbol("foreignItems");
const foreignProperty$ = Symbol("foreignProperty");
const item$            = Symbol("item");

class ManyToManySet extends Set {

  constructor(itemProxy, foreignItems, foreignProperty) {
    super();
    this[item$] = itemProxy;
    this[foreignItems$] = foreignItems;
    this[foreignProperty$] = foreignProperty;
  }

  add(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy) {
      super.delete(proxy); /* re-arrange */
      super.add(proxy);
      super.add.call(proxy[this$][this[foreignProperty$]], this[item$]);
    }
    return this;
  }

  delete(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy && super.delete(proxy)) {
      super.delete.call(proxy[this$][this[foreignProperty$]], this[item$]);
      return true;
    }
    return false;
  }

  clear() {
    const itemProxy = this[item$]
        , foreignProperty = this[foreignProperty$];
    for(var proxy of this.values()) {
      super.delete.call(proxy[this$][foreignProperty], itemProxy);
    }
    super.clear();
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

module.exports = ManyToManySet;