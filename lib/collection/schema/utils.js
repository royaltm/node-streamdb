"use strict";

const { Ident } = require('../../id');

const { idSym: id$ } = require('../symbols');

const schema$ = Symbol.for('schema');

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
        res[name] = maxlevel < 0 || cache.has(value) ? value[id$]
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
