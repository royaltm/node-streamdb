"use strict";

const accessor = require('../collection/accessor');

const descPattern = /desc/i;

module.exports = exports = function orderBy(field, direction) {
  if (isArray(field))
    return orderByMulti(field, direction);

  var getter = accessor.get(field);
  return (direction < 0 || descPattern.test(direction))
          ? (b,a) => (a=getter(a)) < (b=getter(b)) ? -1 : a > b ? 1 : 0
          : (a,b) => (a=getter(a)) < (b=getter(b)) ? -1 : a > b ? 1 : 0;
};

function orderByMulti(fields, defaultDirection) {
  const getters = [], body = [], scope = [];
  var field;

  for(var index = fields.length; index-- !== 0;) {
    var direction, item = fields[index];
    if (isArray(item)) {
      field = item[0];
      direction = item[1];
    } else {
      field = item;
      direction = defaultDirection;
    }
    getters[index] = accessor.get(field);
    scope.push(`n${index}=g[${index}]`);
    body.unshift((direction < 0 || descPattern.test(direction))
            ? `(av=n${index}(a))>(bv=n${index}(b))?-1:av<bv?1:`
            : `(av=n${index}(a))<(bv=n${index}(b))?-1:av>bv?1:`);
  }

  return new Function('g', `"use strict";
      var ${scope.join(',')};
      return (a,b) => {var av,bv;return${body.join('')}0;}`
    )(getters);
}
