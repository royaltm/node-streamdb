"use strict";

const { isSet } = require('../util');

const create = Object.create;

const { inspect } = require('util')
    , custom = inspect.custom;

const { Item } = require('./item');

const { idSym: id$ } = require('./symbols');

require('../util').assertConstantsDefined({id$}, 'symbol');

// [Item organizations 123456789012345678901234] { name: 'asdasd', foo: -, stars: (3) }

const Undefined = {
  [inspect.custom]() { return '\u001b[90m-\u001b[39m'; }
};

module.exports = exports = function createInspect(name, schema, itemKlass) {
  const tag = '\u001b[90mItem(' + name + ')\u001b[39m \u001b[36m';

  itemKlass.prototype[custom] = function(depth, opts) {
    var obj = create(null);

    if (depth !== 0) {
      for(let name in this) {
        let value = this[name];
        if (isSet(value)) {
          let descr = schema[name];
          if (descr && descr.hasMany) {
            value = `\u001b[90m(${value.size})\u001b[39m`;
            obj[name] = {[custom]() { return value; }};
          }
          else obj[name] = value;
        }
        else if (value instanceof Item) {
          obj[name] = {[custom]() { return value[custom](0); }};
        }
        else if (value !== undefined) {
          obj[name] = value;
        }
        else {
          obj[name] = Undefined;
        }
      }
      return tag + this[id$] + '\u001b[39m ' + inspect(obj, opts);
    }
    else {
      return tag + this[id$] + '\u001b[39m';
    }
  };
};
