"use strict";

const { mixin, iter } = require('../../iter');

class UniqueIndex extends Map {

  get iter() {
    return iter(this.values());
  }

  clear() {
    throw new Error("unimplemented: can't clear unique index");
  }

}

mixin(UniqueIndex.prototype);

module.exports = exports = UniqueIndex;
