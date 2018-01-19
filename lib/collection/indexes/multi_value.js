"use strict";

const { mixin, iter } = require('../../iter');

const setadd = Set.prototype.add
    , setdel = Set.prototype.delete;

class MultiValueSet extends Set {
  add()    { throw new Error("this is a read only set"); }
  delete() { throw new Error("this is a read only set"); }
  clear()  { throw new Error("this is a read only set"); }

  get iter() {
    return iter(this);
  }
}

const emptySet = Object.freeze(new MultiValueSet());

class MultiValueIndex extends Map {

  get(key) {
    if (key !== null && 'object' === typeof key) key = key.valueOf();
    return super.get(key) || emptySet;
  }

  has(key) {
    if (key !== null && 'object' === typeof key) key = key.valueOf();
    return super.has(key);
  }

  add(key, value) {
    var refs = super.get(key);
    if (refs === undefined) {
      super.set(key, refs = new MultiValueSet());
    }
    else {
      setdel.call(refs, value); /* re-arrange */
    }
    setadd.call(refs, value);
    return this;
  }

  set() {
    throw new Error("forbidden: this is a multi-value index");
  }

  delete(key, value) {
    var result, refs = super.get(key);
    if (refs !== undefined) {
      result = setdel.call(refs, value);
      if (refs.size === 0) super.delete(key);
    }
    else result = false;
    return result;
  }

  get iter() {
    return iter(iterateAll(this));
  }

  clear() {
    throw new Error("unimplemented: can't clear multi-value index");
  }

}

function* iterateAll(index) {
  for(var value of index.values()) {
    yield* value.values();
  }
}

mixin(MultiValueIndex.prototype);
mixin(MultiValueSet.prototype);

MultiValueIndex.MultiValueSet = MultiValueSet;
MultiValueIndex.emptySet = emptySet;

module.exports = exports = MultiValueIndex;
