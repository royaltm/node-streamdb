"use strict";

const { Iterator } = require('./iter');

exports.range = function(start, end, step, offset) {
  return new Iterator(range(start, end, step, offset));
};

exports.times = function(n) {
  return new Iterator(times(n));
};

/* lazy generators */

function* range(start, end, step, offset) {
  offset || (offset = 0);
  step || (step = 1);
  var len = 1 + ((Math.abs(end - start) + (offset * 2)) / step|0);
  for(var i = 0; i < len; ++i) {
    yield start < end ?
                      i * step + start - offset
                      :
                      (start - (i * step)) + offset;
  }
}

function *times(n) {
  for(var i = 0; i < n; ++i) yield i;
}

