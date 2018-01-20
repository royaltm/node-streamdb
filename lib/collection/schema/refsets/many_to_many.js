"use strict";

const setadd = Set.prototype.add
    , setdel = Set.prototype.delete;

const { inspect } = require('util');

const { thisSym: this$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({this$}, 'symbol');

const foreignItems$    = Symbol("foreignItems");
const foreignProperty$ = Symbol("foreignProperty");
const item$            = Symbol("item");

const { mixin } = require('../../../iter');

const mixinSliceSet = require('./sliceset');

const tag = 'ManyToManySet ';

class ManyToManySet extends Set {

  constructor(itemProxy, foreignItems, foreignProperty) {
    super();
    this[item$] = itemProxy;
    this[foreignItems$] = foreignItems;
    this[foreignProperty$] = foreignProperty;
  }

  add(id) {
    var proxy = this[foreignItems$].get(id.toString());
    if (proxy !== undefined) {
      super.delete(proxy); /* re-arrange */
      super.add(proxy);
      setadd.call(proxy[this$][this[foreignProperty$]], this[item$]);
      return proxy;
    }
  }

  delete(id) {
    var proxy = this[foreignItems$].get(id.toString());
    if (proxy !== undefined && super.delete(proxy)) {
      setdel.call(proxy[this$][this[foreignProperty$]], this[item$]);
      return true;
    }
    return false;
  }

  clear() {
    const itemProxy = this[item$]
        , foreignProperty = this[foreignProperty$];
    for(var proxy of this.values()) {
      setdel.call(proxy[this$][foreignProperty], itemProxy);
    }
    super.clear();
  }

  [inspect.custom](depth, opts) {
    return tag + (opts.colors ? `{ \u001b[90m(${this.size})\u001b[39m }` : `{ (${this.size}) }`);
  }

}

mixinSliceSet(ManyToManySet.prototype);
mixin(ManyToManySet.prototype);

module.exports = ManyToManySet;

/* one side access through */
ManyToManySet.deleteSingleSide = function deleteSingleSide(id) {
  var proxy = this[foreignItems$].get(id.toString());
  if (proxy !== undefined) {
    return setdel.call(this, proxy);
  }
};
