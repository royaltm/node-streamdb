"use strict";

const { assertConstantsDefined, isArray  } = require('../util');

const create = Object.create;

const { idSym:         id$
      , collectionSym: collection$
      , destroySym:    destroy$
      , exportSym:     export$
      , revokeSym:     revoke$ } = require('./symbols');

assertConstantsDefined({id$, collection$, destroy$, export$, revoke$}, 'symbol');

const destroySet$ = Symbol("destroySet");

const { Ident } = require('../id');

class Item {
  [destroy$]() {
    // delete this[id$];
    this[revoke$]();
  }

  get _id() {
    return this[id$];
  }

  [export$]() {
    var res = create(null);
    for(let name in this) {
      let value = this[name];
      if (value instanceof Item) {
        res[name] = new Ident(value[id$]);
      }
      else if (isArray(value)) {
        res[name] = value.map(item => (item instanceof Item ? new Ident(item[id$]) : item));
      }
      else if (value instanceof Set) {
        let ary = res[name] = [];
        value.forEach(item => ary.push(item instanceof Item ? new Ident(item[id$]) : item));
      }
      else if (value instanceof Map) {
        let ary = res[name] = [];
        value.forEach((key, item) => ary.push([key, item instanceof Item ? new Ident(item[id$]) : item]));
      }
      else if (value !== undefined) {
        res[name] = value;
      }
    }
    return res;
  }

  toJSON() {
    var res = this[export$]();
    res._id = this[id$];
    return res;
  }
}

exports.Item = Item;

exports.createCollectionItemKlass = function(collection, klass) {
  const tag = `Item_${collection._name}`;

  class CollectionItem extends klass {
    get [Symbol.toStringTag]() {
      return tag;
    }
  }

  Object.defineProperty(CollectionItem.prototype, collection$, {
    value: collection,
    writable: false,
    enumerable: false,
    configurable: false
  });

  return CollectionItem;
};

exports.addItemProtoPropertyDesctructor = function(itemProto, property) {
  var destroySet = itemProto[destroySet$];
  if (!destroySet) {
    itemProto[destroySet$] = destroySet = new Set();
    itemProto[destroy$] = destoryCollectionItem;
  }
  destroySet.add(property);
};

function destoryCollectionItem() {
  for(var name of this[destroySet$]) {
    this[name] = undefined;
  }
  this[revoke$]();
}
