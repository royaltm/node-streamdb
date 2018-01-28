"use strict";

const { assertConstantsDefined, isArray  } = require('../util');

const create         = Object.create
    , defineProperty = Object.defineProperty
    , iterator       = Symbol.iterator;

const { idSym:         id$
      , collectionSym: collection$
      , destroySym:    destroy$
      , exportSym:     export$
      , proxySym:      proxy$
      , revokeSym:     revoke$
      , thisSym:       this$ } = require('./symbols');

const { exportSchemaItem, toSchemaObject, unwrapSchemaObjects } = require('./schema/utils');

const { genIdent } = require('../id');

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

defineProperty(Item, 'collection', {
  value: collection$,
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

    static get collection() {
      return collection[proxy$];
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
 * properties allow fine control over which property should be hidden or have different depth level:
 *
 *     {[property]: false} // hide property
 *     {[property]: {"": level, ...}}  // deep property max level control
 *     {["*"]: {...}} // wildcard property
 *
 *
 * example:
 *
 *     var defaults = Object.create(null);
 *     defaults["*"] = defaults;
 *     var properties = Object.create(defaults);
 *     // hide "foo" on all levels
 *     defaults["foo"] = false;
 *     // limit "bar" on all levels to -1 depth
 *     (defaults["bar"] = Object.create(defaults))[""] = -1;
 *     // limit "baz" on 1 level to 0 depth
 *     properties["baz"] = Object.create(defaults))[""] = 0;
 *     // extend "fee" on 2 level under "baz" relation to 2 depth
 *     properties["baz"]["fee"] = Object.create(defaults))[""] = 2;
 *
 * @param {Item} item
 * @param {number} [maxlevel=0]
 * @param {Object} [properties]
 * @return {Object|string}
**/
function toObject(item, maxlevel, properties) {
  maxlevel = trunc(maxlevel) || 0;

  if (item instanceof Item) {
    const cache = (maxlevel > 0 || properties) ? new Set()
                                               : undefined;
    if (maxlevel < 0) return item[id$];
    return toSchemaObject(item[collection$][schema$], item, maxlevel, cache, properties);
  }
  else if (item !== null && 'object' === typeof item && 'function' === typeof item[iterator]) {
    const res = [];
    for(const elm of item) {
      res.push(toObject(elm, maxlevel, properties));
    }
    return res;
  }
  else {
    return item;
  }
}

/**
 * interprets objects according to collection schema and unwraps them
 *
 * references provided as objects are replaced with id strings
 * and the body of the referenced items are being yielded starting
 * from the most nested ones
 *
 * for each referenced object including input object
 * yields an array of tuples: [collection, object or id string]
 *
 * for each item object an "_id" property is created with item id if it wasn't already provided
 *
 * __IMPORTANT: modifies input__
 *
 * example:
 *
 *     for(let [coll, obj] of Item.unwrap(collection, input) {
 *       if ('string' !== typeof obj) coll.create(obj)
 *     };
 *
 * @param {Collection} collection
 * @param {Object} input
 * @return {iterator} yields Array<Collection, Object|String>
**/
function *unwrap(collection, input) {
  if (isArray(input)) {
    for(let value of input) {
      yield *unwrap(collection, value);
    }
  }
  else if (input !== null && 'object' === typeof input) {
    input._id || (input._id = genIdent());
    yield *unwrapSchemaObjects(collection[this$], input);
  }
}
