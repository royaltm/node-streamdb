"use strict";

const { isArray  } = require('../../util');

const { Ident, genIdent } = require('../../id');

const { idSym: id$, proxySym:  proxy$ } = require('../symbols');

const schema$ = Symbol.for('schema');

const hasOneDescriptorsIterate$  = Symbol.for("hasOneDescriptorsIterate")
    , hasManyDescriptorsIterate$ = Symbol.for("hasManyDescriptorsIterate")

/* exports item as object with references as instances of Ident and without "_id" property
   suitable for update values */
exports.exportSchemaItem = function exportSchemaItem(res, schema, item) {
  for(let name in item) {
    let value = item[name]
      , descr = schema[name]
      , collection = descr && descr.collection;

    if (collection !== undefined) {
      if (descr.hasMany) {
        let ary = res[name] = [];
        value.forEach(item => ary.push(new Ident(item[id$])));
      }
      else if (value !== undefined) {
        res[name] = new Ident(value[id$]);
      }
    }
    else if (value !== undefined) {
      res[name] = value;
    }
  }

  return res;
};

/* exports object with references as nested objects up to maxlevel or as referenced id strings
   retains "_id" properties */
exports.toSchemaObject = function toSchemaObject(schema, item, maxlevel, cache) {
  var res = {_id: item[id$]};

  --maxlevel;

  if (maxlevel >= 0) cache.add(item);

  for(let name in item) {
    let value = item[name]
      , descr = schema[name]
      , collection = descr && descr.collection;

    if (collection !== undefined) {
      if (descr.hasMany) {
        let ary = res[name] = [];
        if (maxlevel < 0) {
          value.forEach(item => ary.push(item[id$]));
        }
        else {
          let schema = collection[schema$];
          value.forEach(item => ary.push(cache.has(item) ? item[id$]
                                                         : toSchemaObject(schema, item, maxlevel, cache)));
        }
      }
      else if (value !== undefined) {
        res[name] = (maxlevel < 0 || cache.has(value)) ? value[id$]
                                                       : toSchemaObject(collection[schema$], value, maxlevel, cache);
      }
    }
    else if (value !== undefined) {
      res[name] = value;
    }
  }

  if (maxlevel >= 0) cache.delete(item);

  return res;
};

/* unwrap references provided as objects */
exports.unwrapSchemaObjects = function unwrapSchemaObjects(collection, object, result) {
  if (object !== null && 'object' === typeof object && !isArray(object)) {
    let schema = collection[schema$]
      , id = object._id || genIdent();

    object._id = id;

    for(let {name, collection} of schema[hasOneDescriptorsIterate$]()) {
      let value = object[name];
      if (value !== undefined) object[name] = unwrapSchemaObjects(collection, value, result);
    }

    for(let {name, collection} of schema[hasManyDescriptorsIterate$]()) {
      let ary = object[name];
      if (isArray(ary)) {
        for(let i = 0, len = ary.length; i < len; ++i) {
          ary[i] = unwrapSchemaObjects(collection, ary[i], result);
        }
      }
    }

    result.push([collection[proxy$], object]);

    return id;
  }

  return object;
};
