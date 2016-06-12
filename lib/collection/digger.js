"use strict";

const stringify = JSON.stringify;

const cache = new Map();

function digger(input, field, value) {
  if (field.includes('.')) {
    var fn = cache.get(field);
    fn || (cache.set(field, fn = compile(field)));
    fn(input, value);
  }
  else input[field] = value;
}

function compile(field) {
  field = field.split('.').map(stringify);
  var setter = field.join('][');

  var retries = []

  for(let i = field.length;--i > 0;) {
    retries.push(`try {input[${setter}]=value;return;} catch(e) {};`);
    setter = field.slice(0, i).join('][');
    retries.push(`value={[${field[i]}]:value};`)
  }
  retries.push(`input[${setter}]=value;`);

  return new Function('input', 'value', `"use strict";
    ${retries.join('')}`);
}

digger.compile = compile;

digger.clearCache = function() {
  cache.clear();
};

module.exports = digger;
