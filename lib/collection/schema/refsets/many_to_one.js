"use strict";

const { inspect } = require('util');

const { idSym:   id$
      , thisSym: this$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({id$, this$}, 'symbol');

const add$             = Symbol.for("add")
    , delete$          = Symbol.for("delete")

const foreignItems$    = Symbol("foreignItems")
    , foreignProperty$ = Symbol("foreignProperty");

const { mixin } = require('../../../iter');

const mixinSliceSet = require('./sliceset');

const tag = 'ManyToOneSet ';

class ManyToOneSet extends Set {

  constructor(itemProxy, foreignItems, foreignProperty) {
    super();
    this[id$] = itemProxy[id$];
    this[foreignItems$] = foreignItems;
    this[foreignProperty$] = foreignProperty;
  }

  add(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy !== undefined) {
      proxy[this$][this[foreignProperty$]] = this[id$]; /* may throw from composite index */
      return true;
    }
    return false;
  }

  delete(id) {
    const foreignItems = this[foreignItems$];
    var proxy = foreignItems.get(id.toString());
    if (proxy !== undefined && this.has(proxy)) {
      proxy[this$][this[foreignProperty$]] = undefined;
      return true;
    }
    return false;
  }

  clear(top) {
    if (top === undefined) top = this.size;
    const foreignProperty = this[foreignProperty$];
    for(var proxy of this.values()) {
      if (top-- <= 0) break;
      proxy[this$][foreignProperty] = undefined;
    }
  }

  [inspect.custom](depth, opts) {
    return tag + (opts.colors ? `{ \u001b[90m(${this.size})\u001b[39m }` : `{ (${this.size}) }`);
  }

}

/* one side access through */
ManyToOneSet.prototype[add$] = Set.prototype.add;
ManyToOneSet.prototype[delete$] = Set.prototype.delete;

mixinSliceSet(ManyToOneSet.prototype);
mixin(ManyToOneSet.prototype);

module.exports = ManyToOneSet;
