"use strict";

const emptyResult = Object.freeze({done: true});
const emptyIterator = Object.freeze({
  next() { return emptyResult; },
  [Symbol.iterator]() { return emptyIterator; }
});
var emptySet;
class EmptySet extends Set {
  constructor() { if (emptySet) return emptySet; super(); emptySet = this; }
  get() {}
  set() { throw new Error("this set is frozen") }
  has() { return false; }
  get size() { return 0; }
  [Symbol.iterator]() { return emptyIterator; }
  entries() { return emptyIterator; }
  keys() { return emptyIterator; }
  values() { return emptyIterator; }
}
new EmptySet();

class Multi extends Map {
  constructor() {
    super();
  }

  get(value) {
    return super.get(value) || emptySet;
  }

  add(value, object) {
    var refs = super.get(value);
    if (!refs) {
      super.set(value, refs = new Set());
    }
    refs.add(object);
    return this;
  }

  delete(value, object) {
    var result, refs = super.get(value);
    if (refs) {
      result = refs.delete(object);
      if (refs.size === 0) super.delete(value);
    }
    else result = false;
    return result;
  }
}

module.exports = Multi;
