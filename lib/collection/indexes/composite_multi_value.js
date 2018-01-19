"use strict";

const isArray = Array.isArray;

const setadd = Set.prototype.add
    , setdel = Set.prototype.delete
    , mapget = Map.prototype.get
    , maphas = Map.prototype.has
    , mapset = Map.prototype.set
    , mapdel = Map.prototype.delete;

const { Item } = require('../item');

const { idSym: id$ } = require('../symbols');

require('../../util').assertConstantsDefined({id$}, 'symbol');

const { mixin, iter } = require('../../iter');

const { MultiValueSet, emptySet } = require('./multi_value');

const emptySubs = [null];

class CompositeMultiValueIndex extends Map {

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
    if (!isArray(keys)) keys = arguments;
    var index = this
      , componentCount = this.componentCount
      , len = keys.length
      , key;

    if (len > componentCount) len = componentCount;

    for(var i = 0; i < len - 1; ++i) {
      key = keys[i];
      if (key === undefined) return false;
      if (key !== null && 'object' === typeof key) key = key.valueOf();
      index = mapget.call(index, key);
      if (index === undefined) return false;
    }

    key = keys[i];
    if (key === undefined) return false;
    if (key !== null && 'object' === typeof key) key = key.valueOf();

    return maphas.call(index, key);
  }

  get(keys/*|...keys*/) {
    if (!isArray(keys)) keys = arguments;
    var index = this
      , componentCount = this.componentCount
      , len = keys.length
      , key

    if (len > componentCount) len = componentCount;

    for(var i = 0; i < len; ++i) {
      key = keys[i];
      if (key === undefined) {
        return (i = componentCount - len) === 0 ? emptySet
                                                : (emptySubs[i]
                                                  || (emptySubs[i] = Object.freeze(new SubCompositeMultiValueIndex(i))));
      }
      if (key !== null && 'object' === typeof key) key = key.valueOf();
      index = mapget.call(index, key);
      if (index === undefined) {
        return (i = componentCount - len) === 0 ? emptySet
                                                : (emptySubs[i]
                                                  || (emptySubs[i] = Object.freeze(new SubCompositeMultiValueIndex(i))));
      };
    }

    return index;
  }

  // returns number of consecutive non-undefined keys components
  add(keys, value) {
    if (!isArray(keys)) throw new TypeError("CompositeMultiValueIndex: 'keys` argument must be an Array");
    const len = this.componentCount - 1;

    var index = this
      , key
      , subindex;

    for(var i = 0; i < len; ++i) {
      key = keys[i];
      if (key === undefined) break;
      subindex = mapget.call(index, key);
      if (subindex === undefined) {
        mapset.call(index, key, subindex = new SubCompositeMultiValueIndex(len - i));
        subindex._prev = index;
      }
      index = subindex;
    }

    key = keys[i];
    if (key === undefined) {
      /* never set first component as undefined */
      if (i === 0) return 0;
      subindex = index._undefined || (index._undefined = new Set());
      subindex.add(value);

      return i;
    }
    else {
      subindex = mapget.call(index, key);
      if (subindex === undefined) {
        mapset.call(index, key, subindex = new MultiValueSet());
      }
      else {
        setdel.call(subindex, value); /* re-arrange */
      }
      setadd.call(subindex, value);

      return i + 1;
    }
  }

  set() {
    throw new Error("forbidden: this is a composite multi-value index");
  }

  delete(keys, value) {
    if (!isArray(keys)) throw new TypeError("CompositeMultiValueIndex: 'keys` argument must be an Array");
    const len = this.componentCount - 1;

    var index = this
      , subindex
      , result
      , key;

    for(var i = 0; i < len; ++i) {
      key = keys[i];
      if (key === undefined) break;
      index = mapget.call(index, key);
      if (index === undefined) return false;
    }
    key = keys[i];
    if (key === undefined) {
      if (i === 0) return false;
      result = index._undefined !== undefined && index._undefined.delete(value);
    } else {
      subindex = mapget.call(index, key);
      if (subindex !== undefined) {
        result = setdel.call(subindex, value);
        if (subindex.size === 0) mapdel.call(index, key);
      }
      else result = false;
    }
    /* clean up */
    while (i !== 0 && index.size === 0 && (index._undefined === undefined || index._undefined.size === 0)) {
      index = index._prev;
      mapdel.call(index, keys[--i]);
    }
    return result;
  }

  get iter() {
    return iter(iterateAll(this, this.componentCount));
  }

  clear() {
    throw new Error("unimplemented: can't clear composite multi-value index");
  }

}

class SubCompositeMultiValueIndex extends CompositeMultiValueIndex {
  add()    { throw new Error("this is a read only composite index"); }
  delete() { throw new Error("this is a read only composite index"); }
  clear()  { throw new Error("this is a read only composite index"); }
}

function* iterateAll(index, level) {
  var value;
  const uset = index._undefined;
  if (uset !== undefined && uset.size !== 0) {
    yield *uset.values();
  }

  if (level === 1) {
    for(value of index.values()) {
      yield *value.values();
    }
  }
  else {
    --level;
    for(value of index.values()) {
      yield* iterateAll(value, level);
    }
  }
}

mixin(CompositeMultiValueIndex.prototype);

CompositeMultiValueIndex.MultiValueSet = MultiValueSet;
CompositeMultiValueIndex.emptySet = emptySet;

module.exports = exports = CompositeMultiValueIndex;
