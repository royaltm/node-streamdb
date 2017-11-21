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

const { exportSchemaItem, toSchemaObject, unwrapSchemaObjects } = require('./schema/utils');

const schema$ = Symbol.for('schema');

assertConstantsDefined({id$, collection$, destroy$, export$, revoke$, this$}, 'symbol');

const destroySet$ = Symbol("destroySet");

const trunc = ('function' === typeof Math.trunc) ? Math.trunc
                                                 : (x => (x < 0 ? Math.ceil(x) : Math.floor(x)));

class Item {
  [destroy$]() {
    // delete this[id$];
    this[revoke$]();
  }

  get _id() {
    return this[id$];
  }

  valueOf() {
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

defineProperty(Item, 'unwrap', {
  value: unwrap,
  writable: false,
  enumerable: false,
  configurable: false
});

exports.Item = Item;

exports.createDetachedItemKlass = function(collection, klass) {
  const tag = `DetachedItem_${collection._name}`;

  class DetachedItem extends klass {
    get [Symbol.toStringTag]() {
      return tag;
    }

    toJSON() {
      return toSchemaObject(collection[schema$], this, 0);
    }
  }

  return DetachedItem;
};

exports.createCollectionItemKlass = function(collection, klass) {
  const tag = `Item_${collection._name}`;

  class CollectionItem extends klass {
    get [Symbol.toStringTag]() {
      return tag;
    }

    [export$]() {
      return exportSchemaItem(create(null), collection[schema$], this);
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
 * converts item and referenced items to plain objects recursively
 *
 * item's properties which are not defined in item's collection schema
 * are returned unchanged (no deep cloning of arrays, objects, etc.)
 *
 * if maxlevel < 0 returns item id as string
 * if maxlevel > 0 referenced items are converted to objects up to maxlevel
 * otherwise they are converted to their id strings
 *
 * circular references items are converted to their id strings
 *
 * if item is not an instance of Item returns item argument without modification
 *
 * @param {Item} item
 * @param {number} [maxlevel=0]
 * @return {Object|string}
**/
function toObject(item, maxlevel) {
  maxlevel = trunc(maxlevel) || 0;
  if (maxlevel < 0) return item[id$];

  return (item instanceof Item) ? toSchemaObject(item[collection$][schema$], item, maxlevel, maxlevel > 0 && new Set())
                                : item;
}

/**
 * interprets objects according to collection schema and unwraps them
 *
 * references provided as objects are replaced with id strings
 * and the body of the referenced items are appended to the result
 *
 * returns an array of tuples: [collection, body]
 *
 * for each item object an "_id" property is created with item id if it wasn't already provided
 *
 * modifies objects in place
 *
 * example:
 *
 *     Item.unwrap(collection, input).forEach(([coll, obj]) => { coll.create(obj) });
 *
 * @param {Collection} collection
 * @param {Object} input
 * @param {Array} [result]
 * @return {Array}
**/
function unwrap(collection, input, result) {
  result || (result = []);

  if (!isArray(result)) throw TypeError("result argument must be an array");

  unwrapSchemaObjects(collection, input, result);

  return result;
}
