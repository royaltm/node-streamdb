"use strict";

const stringify = JSON.stringify

const hasOwnProperty = {}.hasOwnProperty;

const { isRegExp, isScalar, isArray } = require('../util');

const yesFn = () => true;

/* creates filter function from descriptor */
module.exports = function createFilterFn(filters) {
  var condition;

  filters = [].concat(filters);

  /* hot path */
  switch(filters.length) {
    case 0: return yesFn;
    case 1:
      condition = filters[0];
      if ('function' === typeof condition) {
        return condition;
      }
      else if (isRegExp(condition)) {
        return (item) => condition.test(item);
      }
      else if (isScalar(condition)) {
        return (item) => (item === condition);
      }
      else if (condition instanceof Set) {
        return (item) => condition.has(item);
      }
  }

  /* compile own function */

  const args = []
      , subitems = {max: 0};
  
  condition = createConditionBody(args, 'item', 0, subitems, filters) || 'true';

  return new Function('args', `"use strict";
    return (item) => {
      ${subitemsBody(subitems.max)}
      return ${condition};
    }`)(args);

};

function subitemsBody(max) {
  var code;
  if (max > 0) {
    code = 'var item0';
    for(var i = 1; i < max; ++i) {
      code += ', item' + i;
    }
  }
  else code = '';
  return code;
}

function createConditionBody(args, item, depth, subitems, condition) {
  var index, code;

  if (isArray(condition)) {
    condition.forEach(filter => {
      var body = createConditionBody(args, item, depth, subitems, filter);
      if (code === undefined) code = body;
      else code += ' || ' + body;
    });

    if (code !== undefined) return '(' + code + ')';
  }
  else if ('function' === typeof condition) {
    index = args.push(condition) - 1;
    return `args[${index}](${item})`;
  }
  else if (isRegExp(condition)) {
    index = args.push(condition) - 1;
    return `args[${index}].test(${item})`;
  }
  else if (isScalar(condition)) {
    index = args.push(condition) - 1;
    return `args[${index}] === ${item}`;
  }
  else if (condition instanceof Set) {
    index = args.push(condition) - 1;
    return `args[${index}].has(${item})`;
  }
  else {
    code = `${item} !== null && 'object' === typeof ${item}`;

    let subitemUsed, subitem = 'item' + depth;

    ++depth;

    for(let field in condition) {
      if (!hasOwnProperty.call(condition, field)) continue;

      let body = createConditionBody(args, subitem, depth, subitems, condition[field]);

      if (body === undefined) {
        code += ` && ${stringify(field)} in ${item}`;
      }
      else {
        subitemUsed = true;
        code += ` && (${subitem} = ${item}[${stringify(field)}],true) && ` + body;
      }
    }

    if (subitemUsed === true && subitems.max < depth) subitems.max = depth;

    return code;
  }
}
