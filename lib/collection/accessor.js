"use strict";

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
  field = field.split('.');
  var accessor = field.map(stringify).join('][');

  return new Function('input', `"use strict";
  var result;
  try { result = input[${accessor}]; } catch(e) {};
  return result;`);
}

accessor.compile = compile;

accessor.clearCache = function() {
  cache.clear();
};

module.exports = accessor;
