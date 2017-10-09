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

defineProperty(Item, 'toObject', {
  value: toObject,
  writable: false,
  enumerable: false,
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

/**
 * converts item and related items from item properties to plain objects
 *
 * item's properties which are not defined in item's collection schema as
 * relations are returned unchanged (no deep cloning of arrays, objects, etc.)
 *
 * if maxlevel < 0 returns item id as string
 * if maxlevel > 0 any related items are converted to objects up to maxlevel
 * otherwise they are converted to their id strings
 *
 * to prevent circular references related circular items are converted to their id strings
 *
 * @param {Item} item
 * @param {number} [maxlevel=0]
 * @return {Object|string}
**/
function toObject(item, maxlevel) {
  maxlevel = parseInt(maxlevel) || 0;
  if (maxlevel < 0) return item[id$];

  return toSchemaObject(item[collection$][schema$], item, maxlevel, maxlevel > 0 && new Set());
}
