"use strict";

const { proxySym: proxy$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({proxy$}, 'symbol');

const ManyToOneSet  = require('../refsets/many_to_one')
    , ManyToManySet = require('../refsets/many_to_many');

const items$  = Symbol.for("items");

module.exports = exports = function hasManyPropertyDescriptor(descr) {
  const property = descr.readPropertySymbol
      , foreignItems = descr.collection[items$]
      , foreignProperty = descr.foreign || descr.primary
      , manySetKlass = descr.primary ? ManyToOneSet : ManyToManySet;

  return {
    get() {
      return this[property] || (this[property] = new manySetKlass(this[proxy$], foreignItems, foreignProperty));
    },
    /* @param {Array|undefined} value */
    set(value) {
      var count = 0
        , members = this[property];

      if (value !== undefined) {
        if (members === undefined) {
          members = this[property] = new manySetKlass(this[proxy$], foreignItems, foreignProperty);
        }

        for(var i = 0, len = value.length; i < len; ++i) {
          if (members.add(value[i])) ++count; /* added to bottom */
        }
      }

      if (members !== undefined) members.clear(members.size - count); /* clear from top */
    },

    enumerable: true,
    configurable: false
  };

};
