"use strict";

const assert = require('assert');

const stringify = JSON.stringify;

const cache = new Map();

function accessor(input, field) {
  if (field.includes('.')) {
    var fn = cache.get(field);
    fn || (cache.set(field, fn = compile(field)));
    return fn(input);
  }
  else return input[field];
}

function compile(field) {
  assert('string' === typeof field);
  field = field.split('.');
  var accessor = field.map(stringify).join('][');

  return new Function('input', `"use strict";
  var result;
  try { result = input[${accessor}]; } catch(e) {};
  return result;`);
}

accessor.compile = compile;

accessor.get = function(field) {
  var fn = cache.get(field);
  fn || (cache.set(field, fn = compile(field)));
  return fn;
};

accessor.clearCache = function() {
  cache.clear();
};

module.exports = accessor;
