"use strict";

const { isString, isArray, isPlainObject } = require('../util');

// const assign = Object.assign;
// const freeze = Object.freeze;
const create = Object.create;
// const defineProperty = Object.defineProperty;
// const hasOwnProperty = Object.hasOwnProperty;
// const keys           = Object.keys;
// const getPrototypeOf = Object.getPrototypeOf;

const subitemHandlers = new Map();

const $this    = Symbol.for("this");
const $proxy   = Symbol.for("proxy");
const $destroy = Symbol.for("destroy");
const $id      = Symbol.for("id");
const $export  = Symbol.for("export");

const $revoke = exports.revokeSym = Symbol("revoke");
const $destroySet = Symbol("destroySet");
const $collection = Symbol("collection");
const $data       = Symbol("data");

const accessor = require('./accessor');

class Item {
  constructor(id) {
    this[$id] = id;
  }
  [$destroy]() {
    // delete this[$id];
    this[$revoke]();
  }
  get _id() { return this[$id]; }
  [$export]() {
    var res = create(null);
    for(let name in this) {
      let value = this[name];
      if (value instanceof Item) {
        res[name] = value[$id];
      }
      else if (isArray(value)) {
        res[name] = value.map(item => (item instanceof Item ? item[$id] : item));
      }
      else if (value !== undefined) {
        res[name] = value;
      }
    }
    return res;
  }
  toJSON() {
    var res = this[$export]();
    res._id = this[$id];
    return res;
  }
}

exports.Item = Item;

exports.createCollectionItemKlass = function(collection) {
  var tag = 'Item_' + collection._name;
  class CollectionItem extends Item {
    constructor(id) {
      super(id);
      this[$collection] = collection;
    }
    get [Symbol.toStringTag]() {
      return tag;
    }
  }
  return CollectionItem;
}

exports.itemProxyHandler = {
  get(data, name) {
    var subitem;
    switch(name) {
      case $this: return data;
      case 'toJSON': return () => data.toJSON();
    }
    if (isString(name)) {
      subitem = accessor(data, name);
      if (subitem && !(subitem instanceof Item) && isPlainObject(subitem)) {
        return subitem[$proxy] || (subitem[$data] = data, subitem[$proxy] = new Proxy(subitem, subItemProxyHandler(name)));
      }
    }
    else subitem = data[name];
    return subitem;
  },

  set(data, name, value) {
    if (name.length === 0) return;
    data[$collection]._replace(data[$id], name, value);
    return true;
  },

  deleteProperty(data, name) {
    if (name.length === 0) return;
    data[$collection]._replace(data[$id], name);
    return true;
  }

};

function subItemProxyHandler(property) {
  var handler = subitemHandlers.get(property);
  if (handler) return handler;
  subitemHandlers.set(property, handler = {
    get(data, name) {
      var subitem;
      if (isString(name)) {
        subitem = accessor(data, name);
        if (isPlainObject(subitem)) {
          return subitem[$proxy] || (subitem[$data] = data[$data], subitem[$proxy] = new Proxy(subitem, subItemProxyHandler(`${property}.${name}`)));
        } // TODO support arrays
      }
      else subitem = data[name];
      return subitem;
    },

    set(data, name, value) {
      data = data[$data];
      data[$collection]._replace(data[$id], `${property}.${name}`, value);
      return true;
    },

    deleteProperty(data, name) {
      data = data[$data];
      data[$collection]._replace(data[$id], `${property}.${name}`);
      return true;
    }
  });

  return handler;
}

exports.addItemProtoPropertyDesctructor = function(itemProto, property) {
  var destroySet = itemProto[$destroySet];
  if (!destroySet) {
    itemProto[$destroySet] = destroySet = new Set();
    itemProto[$destroy] = destoryCollectionItem;
  }
  destroySet.add(property);
};

function destoryCollectionItem() {
  this[$revoke]();
  for(let name of this[$destroySet]) {
    this[name] = undefined;
  }
}
