"use strict";

const { inspect } = require('util');

const { thisSym: this$ } = require('../symbols');

require('../../util').assertConstantsDefined({this$}, 'symbol');

const foreignItems$    = Symbol("foreignItems");
const foreignProperty$ = Symbol("foreignProperty");
const item$            = Symbol("item");

const { mixin } = require('../../iter');

const tag = 'ManyToManySet ';

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
    if (proxy !== undefined) {
      super.delete(proxy); /* re-arrange */
      super.add(proxy);
      super.add.call(proxy[this$][this[foreignProperty$]], this[item$]);
    }
    return this;
  }

  delete(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy !== undefined && super.delete(proxy)) {
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

  get length() {
    return this.size;
  }

  slice(start, end) {
    return Array.from(this).slice(start, end);
  }

  [inspect.custom](depth, opts) {
    return tag + (opts.colors ? `{ \u001b[90m(${this.size})\u001b[39m }` : `{ (${this.size}) }`);
  }

}

mixin(ManyToManySet.prototype);

module.exports = ManyToManySet;
