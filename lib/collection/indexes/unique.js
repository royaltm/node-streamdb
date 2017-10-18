"use strict";

const { mixin, iter } = require('../../iter');

class UniqueIndex extends Map {

  get(key) {
    if (key !== null && 'object' === typeof key) key = key.valueOf();
    return super.get(key);
  }

  has(key) {
    if (key !== null && 'object' === typeof key) key = key.valueOf();
    return super.has(key);
  }

  get iter() {
    return iter(this.values());
  }

  clear() {
    throw new Error("unimplemented: can't clear unique index");
  }

}

mixin(UniqueIndex.prototype);

module.exports = exports = UniqueIndex;
