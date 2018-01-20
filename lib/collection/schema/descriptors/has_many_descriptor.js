"use strict";

const { proxySym: proxy$ } = require('../../symbols');

require('../../../util').assertConstantsDefined({proxy$}, 'symbol');

const ManyToOneSet  = require('../refsets/many_to_one')
    , ManyToManySet = require('../refsets/many_to_many')
    , { deleteSingleSide } = ManyToManySet;

const items$  = Symbol.for("items");

module.exports = exports = function hasManyPropertyDescriptor(descr) {
  const property = descr.readPropertySymbol
      , foreignItems = descr.collection[items$]
      , foreignProperty = descr.foreign || descr.primary
      , manySetKlass = descr.primary ? ManyToOneSet : ManyToManySet
      , descriptor = {

    get() {
      return this[property] || (this[property] = new manySetKlass(this[proxy$], foreignItems, foreignProperty));
    },

    enumerable: true,
    configurable: false

  };

  return Object.assign(descriptor, descr.primary ? {
    /* many -> one */
    /* @param {Array|undefined} value */
    set(value) {
      var members = this[property];

      if (members !== undefined) members.clear();

      if (value !== undefined) {
        const len = value.length;
        if (len !== 0) {
          if (members === undefined) {
            members = this[property] = new ManyToOneSet(this[proxy$], foreignItems, foreignProperty);
          }

          for(let i = 0; i < len; ++i) {
            members.add(value[i]); /* may throw from multiple indexes */
          }
        }
      }
    }
  }
  :
  { /* many -> many */
    /* @param {Array|undefined} value */
    set(value) {
      var members = this[property];

      if (value !== undefined) {
        const len = value.length;
        if (len !== 0) {
          if (members === undefined) {
            members = this[property] = new ManyToManySet(this[proxy$], foreignItems, foreignProperty);
          }

          /* take care not to re-arrange items on the other side by deleting everything first */
          for(let i = 0; i < len; ++i) {
            if (members.size === 0) break;
            /* delete only one sided, we will re-add them below */
            deleteSingleSide.call(members, value[i]);
          }

          /* remove properly all remaining items not found in value */
          members.clear();

          /* add all items properly */
          for(let i = 0; i < len; ++i) {
            members.add(value[i]);
          }

          return;
        }
      }

      if (members !== undefined) members.clear();
    }
  });
};
