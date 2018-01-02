"use strict";

const { copyOwnProperties } = require('../../../util');

const methods = {
  toJSON() {
    return Array.from(this);
  },

  get length() {
    return this.size;
  },

  slice(start, end) {
    var size = this.size;
    start = parseInt(start === undefined ? 0 : start) || 0;
    end = parseInt(end === undefined ? size : end) || 0;
    if (start < 0) start += size;
    if (end < 0) end += size;
    if (start < end && start < size && end > 0) {
      var iter = this.iter;
      if (start > 0) iter = iter.drop(start);
      if (end === size) return Array.from(iter);
      else return iter.top(end - start);
    }
    else return [];
  }
};

module.exports = function mixin(target) {
  return copyOwnProperties(target, methods);
};
