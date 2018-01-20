"use strict";

const { inspect } = require('util');

const { idSym:   id$
      , thisSym: this$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({id$, this$}, 'symbol');

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
    var proxy = this[foreignItems$].get(id.toString());
    if (proxy !== undefined) {
      proxy[this$][this[foreignProperty$]] = this[id$]; /* may throw from composite index */
      return proxy;
    }
  }

  delete(id) {
    var proxy = this[foreignItems$].get(id.toString());
    if (proxy !== undefined && this.has(proxy)) {
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

  [inspect.custom](depth, opts) {
    return tag + (opts.colors ? `{ \u001b[90m(${this.size})\u001b[39m }` : `{ (${this.size}) }`);
  }

}

mixinSliceSet(ManyToOneSet.prototype);
mixin(ManyToOneSet.prototype);

module.exports = ManyToOneSet;
