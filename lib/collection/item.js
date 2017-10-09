"use strict";

const { assertConstantsDefined, isArray  } = require('../util');

const create         = Object.create
    , defineProperty = Object.defineProperty;

const { idSym:         id$
      , collectionSym: collection$
      , destroySym:    destroy$
      , exportSym:     export$
      , revokeSym:     revoke$
      , thisSym:       this$ } = require('./symbols');

const { exportSchemaItem, toSchemaObject } = require('./schema/utils');

const schema$ = Symbol.for('schema');

assertConstantsDefined({id$, collection$, destroy$, export$, revoke$, this$}, 'symbol');

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
}

defineProperty(Item, 'this', {
  value: this$,
  writable: false,
  enumerable: true,
  configurable: false
});

exports.Item = Item;

exports.createCollectionItemKlass = function(collection, klass) {
  const tag = `Item_${collection._name}`;

  class CollectionItem extends klass {
    get [Symbol.toStringTag]() {
      return tag;
    }

    [export$]() {
      return exportSchemaItem(create(null), collection[schema$], this);
    }

    toJSON() {
      return toSchemaObject(collection[schema$], this, 0);
    }
  }

  defineProperty(CollectionItem.prototype, collection$, {
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
