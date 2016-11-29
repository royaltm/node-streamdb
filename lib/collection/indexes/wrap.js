"use strict";

const { mixin, iter } = require('../../iter');

module.exports = exports = function createIndexWrap(index) {

  return mixin({

    get() {
      return index.get.apply(index, arguments);
    },

    has() {
      return index.has.apply(index, arguments);
    },

    get iter() {
      return index.iter;
    },

    [Symbol.iterator]() {
      return index[Symbol.iterator]();
    },

    keys() {
      return index.keys();
    },

    values() {
      return index.values();
    },

    entries() {
      return index.entries();
    },

    get size() {
      return index.size;
    }

  });
};
