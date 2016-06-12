"use strict";

const stringify = JSON.stringify;

const cache = new Map();

function setter(input, field, value) {
  if (field.includes('.')) {
    var fn = cache.get(field);
    fn || (cache.set(field, fn = compile(field)));
    fn(input, value);
  }
  else input[field] = value;
}

function compile(field) {
  field = field.split('.');
  var setter = field.map(stringify).join('][');

  return new Function('input', 'value', `"use strict";
  try { input[${setter}]=value; } catch(e) {};`);
}

setter.compile = compile;

setter.clearCache = function() {
  cache.clear();
};

module.exports = setter;
