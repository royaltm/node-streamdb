"use strict";

const { isArray  } = require('../../util');

const emptyObject = Object.freeze({});

const { Ident, genIdent } = require('../../id');

const { idSym: id$, proxySym:  proxy$ } = require('../symbols');

const schema$ = Symbol.for('schema');

const hasOneDescriptorsIterate$  = Symbol.for("hasOneDescriptorsIterate")
    , hasManyDescriptorsIterate$ = Symbol.for("hasManyDescriptorsIterate")

/* exports item as object with references as instances of Ident and without "_id" property
   suitable for update values */
exports.exportSchemaItem = function exportSchemaItem(res, schema, item) {
  for(const name in item) {
    const value = item[name]
      , descr = schema[name]
      , collection = descr && descr.collection;

    if (collection !== undefined) {
      if (descr.hasMany) {
        const ary = res[name] = [];
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
   retains "_id" properties

  optional hiddenProperties={[property]: false}
*/
exports.toSchemaObject = function toSchemaObject(schema, item, maxlevel, cache, hiddenProperties=emptyObject) {
  var res = {_id: item[id$]};

  --maxlevel;

  if (maxlevel >= 0) cache.add(item);

  for(const name in item) {
    if (hiddenProperties[name] === false) continue;
    const value = item[name]
      , descr = schema[name]
      , collection = descr && descr.collection;

    if (collection !== undefined) {
      if (descr.hasMany) {
        const ary = res[name] = [];
        if (maxlevel < 0) {
          value.forEach(item => ary.push(item[id$]));
        }
        else {
          const schema = collection[schema$];
          value.forEach(item => ary.push(cache.has(item) ? item[id$]
                                                         : toSchemaObject(schema, item, maxlevel, cache, hiddenProperties)));
        }
      }
      else if (value !== undefined) {
        res[name] = (maxlevel < 0 || cache.has(value)) ? value[id$]
                                                       : toSchemaObject(collection[schema$], value, maxlevel, cache, hiddenProperties);
      }
    }
    else if (value !== undefined) {
      const type = descr && descr.type;
      res[name] = type && 'function' === typeof type.toObject ? type.toObject(value)
                                                              : value;
    }
  }

  if (maxlevel >= 0) cache.delete(item);

  return res;
};

/* unwrap references provided as objects */
exports.unwrapSchemaObjects = function *unwrapSchemaObjects(collection, object) {
  const schema = collection[schema$];

  for(const {name, collection} of schema[hasOneDescriptorsIterate$]()) {
    const value = object[name];
    if (value !== undefined) {
      if ('string' === typeof value) {
        yield [collection[proxy$], value];
      }
      else if (value !== null && 'object' === typeof value && !isArray(value)) {
        object[name] = value._id || (value._id = genIdent());
        yield *unwrapSchemaObjects(collection, value);
      }
    }
  }

  for(const {name, collection} of schema[hasManyDescriptorsIterate$]()) {
    const ary = object[name];
    if (isArray(ary)) {
      const proxy = collection[proxy$];
      for(let i = 0, len = ary.length; i < len; ++i) {
        const value = ary[i];
        if ('string' === typeof value) {
          yield [proxy, value];
        }
        else if (value !== null && 'object' === typeof value && !isArray(value)) {
          ary[i] = value._id || (value._id = genIdent());
          yield *unwrapSchemaObjects(collection, value);
        }
      }
    }
  }

  yield [collection[proxy$], object];
};

function *iterateHasOneReferences(collection, object) {
  const schema = collection[schema$];
  for(const {name, collection} of schema[hasOneDescriptorsIterate$]()) {
    const value = object[name];
    if (value !== undefined) {
      yield [collection[proxy$], value];
    }
  }
};

function *iterateHasManyReferences(collection, object) {
  const schema = collection[schema$];
  for(const {name, collection} of schema[hasManyDescriptorsIterate$]()) {
    const ary = object[name];
    if (isArray(ary)) {
      const proxy = collection[proxy$];
      for(let i = 0, len = ary.length; i < len; ++i) {
        const value = ary[i];
        if (value !== undefined) yield [proxy, value];
      }
    }
  }
};

exports.iterateHasOneReferences = iterateHasOneReferences;
exports.iterateHasManyReferences = iterateHasManyReferences;
exports.iterateReferences = function *iterateReferences(collection, object) {
  yield *iterateHasOneReferences(collection, object);
  yield *iterateHasManyReferences(collection, object);
};

exports.getReferencedCollection = function(collection, property) {
  const descr = collection[schema$][property];
  if (descr !== undefined) {
    const collection = descr.collection;
    if (collection !== undefined) {
      return collection[proxy$];
    }
  }
};
