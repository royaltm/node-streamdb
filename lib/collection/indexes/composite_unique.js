"use strict";

const isArray = Array.isArray;

const { mixin, iter } = require('../../iter');

class CompositeUniqueIndex extends Map {

  constructor(componentCount) {
    super();

    Object.defineProperty(this, 'componentCount', {
      value: componentCount,
      enumerable: true,
      writable: false,
      configurable: false
    });
  }

  has(keys/*|...keys*/) {
    const get = super.get;
    if (!isArray(keys)) keys = arguments;
    var index = this
      , len = this.componentCount
      , key;

    if (len > keys.length) len = keys.length;
    for(var i = 0, len = len - 1; i < len; ++i) {
      key = keys[i];
      if (key === undefined) return false;
      index = get.call(index, key);
      if (index === undefined) return false;
    }
    key = keys[i];
    if (key === undefined) return false;
    return super.has.call(index, key);
  }

  get(keys/*|...keys*/) {
    const get = super.get;
    if (!isArray(keys)) keys = arguments;
    var index = this
      , len = this.componentCount
      , empty
      , key

    if (len > keys.length) {
      empty = emptySub;
      len = keys.length;
    }
    for(var i = 0; i < len; ++i) {
      key = keys[i];
      if (key === undefined) return empty;
      index = get.call(index, key);
      if (index === undefined) return empty;
    }
    return index;
  }

  set(keys, value) {
    if (!isArray(keys)) throw new TypeError("CompositeUniqueIndex: 'keys` argument must be an Array");
    const len = this.componentCount - 1
        , get = super.get
        , set = super.set;

    var index = this
      , key
      , subindex;

    for(var i = 0; i < len; ++i) {
      key = keys[i];
      if (key === undefined) break;
      subindex = get.call(index, key);
      if (subindex === undefined) {
        set.call(index, key, subindex = new SubCompositeUniqueIndex(len - i));
        subindex._prev = index;
      }
      index = subindex;
    }

    key = keys[i];
    if (key === undefined) {
      /* never set first component as undefined */
      if (i === 0) return this;
      subindex = index._undefined || (index._undefined = new Set());
      subindex.add(value);
    }
    else set.call(index, key, value);
    return this;
  }

  delete(keys, value) {
    if (!isArray(keys)) throw new TypeError("CompositeUniqueIndex: 'keys` argument must be an Array");
    const len = this.componentCount - 1
        , get = super.get
        , del = super.delete;

    var index = this
      , result
      , key;

    for(var i = 0; i < len; ++i) {
      key = keys[i];
      if (key === undefined) break;
      index = get.call(index, key);
      if (index === undefined) return false;
    }
    key = keys[i];
    if (key === undefined) {
      if (i === 0) return false;
      result = index._undefined !== undefined && index._undefined.delete(value);
    } else {
      result = del.call(index, key);
    }
    /* clean up */
    while (i !== 0 && index.size === 0 && (index._undefined === undefined || index._undefined.size === 0)) {
      index = index._prev;
      del.call(index, keys[--i]);
    }
    return result;
  }

  get iter() {
    return iter(iterateAll(this, this.componentCount));
  }

  clear() {
    throw new Error("unimplemented: can't clear composite unique index");
  }

}

class SubCompositeUniqueIndex extends CompositeUniqueIndex {
  set()    { throw new Error("this is a read only composite-index"); }
  delete() { throw new Error("this is a read only composite-index"); }
  clear()  { throw new Error("this is a read only composite-index"); }
}

const emptySub = Object.freeze(new SubCompositeUniqueIndex(1));

function* iterateAll(index, level) {
  const uset = index._undefined;
  if (uset !== undefined && uset.size !== 0) {
    yield *uset.values();
  }

  if (level === 1) {
    yield *index.values();
  }
  else {
    --level;
    for(var value of index.values()) {
      yield* iterateAll(value, level);
    }
  }
}

mixin(CompositeUniqueIndex.prototype);

module.exports = exports = CompositeUniqueIndex;
