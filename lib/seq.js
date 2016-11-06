"use strict";

const { iter } = require('./iter');

module.exports = exports = function seq(iterable) {
  var seq = Array.from(iterable);
  seq.iter = () => iter(seq);
  return Object.freeze(seq);
};
