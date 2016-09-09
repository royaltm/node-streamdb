"use strict";

const hasOwnProperty = Object.prototype.hasOwnProperty;
const stringify = JSON.stringify;
const cache = new Map();

function eraser(input, field) {
  if (field.includes('.')) {
    var fn = cache.get(field);
    fn || (cache.set(field, fn = compile(field)));
    fn(input);
  }
  else {
    if (hasOwnProperty.call(input, field)) {
      delete input[field]; /* delete simple property */
    }
    else {
      input[field] = undefined; /* clear descriptor property */
    }
  }
}

function compile(field) {
  field = field.split('.');
  var access = field.map(stringify).join('][');

  return new Function('input', `"use strict";
  try { delete input[${access}]; } catch(e) {};`);
}

eraser.compile = compile;

eraser.clearCache = function() {
  cache.clear();
};

module.exports = eraser;
