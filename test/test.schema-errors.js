"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;
const { SchemaSyntaxError } = require('../lib/errors');

test("schema errors", suite => {

  suite.test('collection name error', t => {
    t.throws(() => new DB({schema: {'': {}}}), new SchemaSyntaxError('illegal collection name: ""'));
    t.throws(() => new DB({schema: {'_': {}}}), new SchemaSyntaxError('illegal collection name: "_"'));
    t.throws(() => new DB({schema: {'0': {}}}), new SchemaSyntaxError('illegal collection name: "0"'));
    t.throws(() => new DB({schema: {'1': {}}}), new SchemaSyntaxError('illegal collection name: "1"'));
    t.throws(() => new DB({schema: {' ': {}}}), new SchemaSyntaxError('illegal collection name: " "'));
    t.throws(() => new DB({schema: {' xxx': {}}}), new SchemaSyntaxError('illegal collection name: " xxx"'));
    t.throws(() => new DB({schema: {'xxx ': {}}}), new SchemaSyntaxError('illegal collection name: "xxx "'));
    t.throws(() => new DB({schema: {'x x': {}}}), new SchemaSyntaxError('illegal collection name: "x x"'));
    t.end();
  });

  suite.test('property name error', t => {
    t.throws(() => new DB({schema: {'foos': {_id: String}}}),                  new SchemaSyntaxError('reserved collection property name: foos:_id'));
    t.throws(() => new DB({schema: {'foos': {inspect: String}}}),              new SchemaSyntaxError('reserved collection property name: foos:inspect'));
    t.throws(() => new DB({schema: {'foos': {toJSON: String}}}),               new SchemaSyntaxError('reserved collection property name: foos:toJSON'));
    t.throws(() => new DB({schema: {'foos': {constructor: String}}}),          new SchemaSyntaxError('schema property already exists: foos:constructor'));
    t.throws(() => new DB({schema: {'foos': {hasOwnProperty: String}}}),       new SchemaSyntaxError('schema property already exists: foos:hasOwnProperty'));
    t.throws(() => new DB({schema: {'foos': {isPrototypeOf: String}}}),        new SchemaSyntaxError('schema property already exists: foos:isPrototypeOf'));
    t.throws(() => new DB({schema: {'foos': {propertyIsEnumerable: String}}}), new SchemaSyntaxError('schema property already exists: foos:propertyIsEnumerable'));
    t.throws(() => new DB({schema: {'foos': {toLocaleString: String}}}),       new SchemaSyntaxError('schema property already exists: foos:toLocaleString'));
    t.throws(() => new DB({schema: {'foos': {toString: String}}}),             new SchemaSyntaxError('schema property already exists: foos:toString'));
    t.throws(() => new DB({schema: {'foos': {valueOf: String}}}),              new SchemaSyntaxError('schema property already exists: foos:valueOf'));
    t.throws(() => new DB({schema: {'foos': {__: String}}}),                   new SchemaSyntaxError('collection property name must not start with "__": foos:__'));
    t.throws(() => new DB({schema: {'foos': {___: String}}}),                  new SchemaSyntaxError('collection property name must not start with "__": foos:___'));
    t.throws(() => new DB({schema: {'foos': {'foo._id': String}}}),                  new SchemaSyntaxError('reserved collection property name: foos:foo._id'));
    t.throws(() => new DB({schema: {'foos': {'foo.inspect': String}}}),              new SchemaSyntaxError('reserved collection property name: foos:foo.inspect'));
    t.throws(() => new DB({schema: {'foos': {'foo.toJSON': String}}}),               new SchemaSyntaxError('reserved collection property name: foos:foo.toJSON'));
    t.throws(() => new DB({schema: {'foos': {'foo.constructor': String}}}),          new SchemaSyntaxError('schema property already exists: foos:foo.constructor'));
    t.throws(() => new DB({schema: {'foos': {'foo.hasOwnProperty': String}}}),       new SchemaSyntaxError('schema property already exists: foos:foo.hasOwnProperty'));
    t.throws(() => new DB({schema: {'foos': {'foo.isPrototypeOf': String}}}),        new SchemaSyntaxError('schema property already exists: foos:foo.isPrototypeOf'));
    t.throws(() => new DB({schema: {'foos': {'foo.propertyIsEnumerable': String}}}), new SchemaSyntaxError('schema property already exists: foos:foo.propertyIsEnumerable'));
    t.throws(() => new DB({schema: {'foos': {'foo.toLocaleString': String}}}),       new SchemaSyntaxError('schema property already exists: foos:foo.toLocaleString'));
    t.throws(() => new DB({schema: {'foos': {'foo.toString': String}}}),             new SchemaSyntaxError('schema property already exists: foos:foo.toString'));
    t.throws(() => new DB({schema: {'foos': {'foo.valueOf': String}}}),              new SchemaSyntaxError('schema property already exists: foos:foo.valueOf'));
    t.throws(() => new DB({schema: {'foos': {__: String}}}),                   new SchemaSyntaxError('collection property name must not start with "__": foos:__'));
    t.throws(() => new DB({schema: {'foos': {___: String}}}),                  new SchemaSyntaxError('collection property name must not start with "__": foos:___'));
    t.throws(() => new DB({schema: {'foos': {'.': String}}}),                  new SchemaSyntaxError('invalid "." separator placement in schema property foos:.'));
    t.throws(() => new DB({schema: {'foos': {'.bar': String}}}),               new SchemaSyntaxError('invalid "." separator placement in schema property foos:.bar'));
    t.throws(() => new DB({schema: {'foos': {'aaa..': String}}}),              new SchemaSyntaxError('invalid "." separator placement in schema property foos:aaa..'));
    t.throws(() => new DB({schema: {'foos': {'xxx..bbb': String}}}),           new SchemaSyntaxError('invalid "." separator placement in schema property foos:xxx..bbb'));
    t.throws(() => new DB({schema: {'foos': {'xxx.': String}}}),               new SchemaSyntaxError('property name must not end with a "." in foos:xxx.'));
    t.throws(() => new DB({schema: {'foos': {'xxx.yyy.': String}}}),           new SchemaSyntaxError('property name must not end with a "." in foos:xxx.yyy.'));
    t.throws(() => new DB({schema: {'foos': {'': String}}}),                   new SchemaSyntaxError('property name must not be empty in foos:'));
    t.end();
  });

  suite.test('property type error', t => {
    t.throws(() => new DB({schema: {foo: {bar: Object}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: 0}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: null}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: undefined}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: true}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: false}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: 'xxx'}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: Object}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: []}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 0}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: null}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: undefined}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: true}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: false}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'xxx'}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: ''}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: Object}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: []}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: 0}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: null}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: undefined}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: true}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: false}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'xxx', hasMany:'foos', hasOne: 'foo'}}}}}), new SchemaSyntaxError('hasOne relation requires only one of "hasMany" or "hasOne" foreign property in foo:bar'));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'xxx', hasOne: ''}}}}}), new SchemaSyntaxError('hasOne foreign property name must be a non empty string in foo:bar'));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'xxx', hasOne: null}}}}}), new SchemaSyntaxError('hasOne foreign property name must be a non empty string in foo:bar'));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'xxx', hasMany:''}}}}}), new SchemaSyntaxError('hasMany foreign property name must be a non empty string in foo:bar'));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'xxx', hasMany:null}}}}}), new SchemaSyntaxError('hasMany foreign property name must be a non empty string in foo:bar'));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: Object}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: []}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: 0}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: null}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: undefined}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: true}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: false}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: 'xxx'}}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: 'xxx'}}}}}), new SchemaSyntaxError("hasMany relation requires hasMany foreign property in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: 'xxx', hasOne: 'foo'}}}}}), new SchemaSyntaxError("hasMany relation forbids hasOne foreign property in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: 'xxx', hasMany:'foos', hasOne: 'foo'}}}}}), new SchemaSyntaxError("hasMany relation forbids hasOne foreign property in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: 'xxx', hasMany:''}}}}}), new SchemaSyntaxError("hasMany foreign property name must be a non empty string in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: 'xxx', hasMany:null}}}}}), new SchemaSyntaxError("hasMany foreign property name must be a non empty string in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bar: 'enum'}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'Enum'}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'enum', enum: ""}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'enum', enum: {}}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'enum', enum: []}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'enum', enum: [0]}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'enum', enum: [undefined]}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'enum', enum: [null]}}}}), new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'blob', encoding: null}}}}), new SchemaSyntaxError("Blob datatype encoding parameter needs to be a proper encoding name"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'blob', encoding: "foo"}}}}), new SchemaSyntaxError("Blob datatype encoding parameter needs to be a proper encoding name"));
    t.end();
  });

  suite.test('property default value errors', t => {
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: 'bar', default: null}}}}), new SchemaSyntaxError("property default value is not allowed for a relation in foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'bars', hasOne: 'foo'}, default: null}}}}), new SchemaSyntaxError("property default value is not allowed for a relation in foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: 'bars', hasMany: 'foos'}, default: null}}}}), new SchemaSyntaxError("property default value is not allowed for a relation in foo:bar"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: 'bars', hasMany: 'foos'}, default: null}}}}), new SchemaSyntaxError("property default value is not allowed for a relation in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {default: {} }}}}), new SchemaSyntaxError("property default value must be a function or a scalar in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {default: [] }}}}), new SchemaSyntaxError("property default value must be a function or a scalar in foo:bars"));
    t.throws(() => new DB({schema: {foo: {bars: {default: new Date() }}}}), new SchemaSyntaxError("property default value must be a function or a scalar in foo:bars"));
    t.end();
  });

  suite.test('forbidden indexed types', t => {
    t.throws(() => new DB({schema: {foo: {bar: {type: 'Date', unique: true}}}}), new SchemaSyntaxError("unimplemented: unique index on Date type property in foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'Date', index: true}}}}), new SchemaSyntaxError("unimplemented: index on Date type property in foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'Blob', unique: true}}}}), new SchemaSyntaxError("unimplemented: unique index on Blob type property in foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {type: 'Blob', index: true}}}}), new SchemaSyntaxError("unimplemented: index on Blob type property in foo:bar"));
    t.end();
  });

  suite.test('composite index errors', t => {
    t.throws(() => new DB({schema: {foos: {bar: [{}]}}}), new SchemaSyntaxError("composite index components must be an array of property names: foos:bar"));
    t.throws(() => new DB({schema: {foos: {bar: {components: [{}]}}}}), new SchemaSyntaxError("composite index components must be an array of property names: foos:bar"));
    t.throws(() => new DB({schema: {foos: {bar: []}}}), new SchemaSyntaxError("composite index requires at least 2 components in foos:bar"));
    t.throws(() => new DB({schema: {foos: {bar: ['rab']}}}), new SchemaSyntaxError("composite index requires at least 2 components in foos:bar"));
    t.throws(() => new DB({schema: {foos: {bar: ['x','y']}}}), new SchemaSyntaxError("unimplemented: composite non-unique index in foos:bar"));
    t.throws(() => new DB({schema: {foos: {bar: {components: ['x','y']}}}}), new SchemaSyntaxError("unimplemented: composite non-unique index in foos:bar"));
    t.throws(() => new DB({schema: {foos: {'b.ar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError('composite index name must not include "." in foos:b.ar'));
    t.throws(() => new DB({schema: {foos: {'toJSON': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("reserved composite index name: foos:toJSON"));
    t.throws(() => new DB({schema: {foos: {'__bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError('composite index name must not start with "__": foos:__bar'));
    t.throws(() => new DB({schema: {foos: {'': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError('composite index name must not be empty in foos:'));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['x.x','y']}}}}), new SchemaSyntaxError("unimplemented composite index on deep property in foos:x.x"));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['','y']}}}}), new SchemaSyntaxError("property name must not be empty in foos:"));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['__','y']}}}}), new SchemaSyntaxError('collection property name must not start with "__": foos:__'));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['___','y']}}}}), new SchemaSyntaxError('collection property name must not start with "__": foos:___'));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['toJSON','y']}}}}), new SchemaSyntaxError("reserved collection property name: foos:toJSON"));
    t.throws(() => new DB({schema: {foos: {'x': Date, 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("non-indexable property: foos:x"));
    t.throws(() => new DB({schema: {foos: {'x': 'blob', 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("non-indexable property: foos:x"));
    t.throws(() => new DB({schema: {foos: {'x': {hasMany: {collection: 'bars', hasMany: 'foos'}}, 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("non-indexable property: foos:x"));
    t.throws(() => new DB({schema: {
        foos: {'bar': {unique: true, components: ['x','y']}},
        bars: {'z': {hasOne: {collection: 'foos', hasOne: 'x'}}}}}), new SchemaSyntaxError("can't assign foreign schema to foos:x from bars:z"));
    t.throws(() => new DB({schema: {
        foos: {'bar': {unique: true, components: ['x','y']}},
        bars: {'z': {hasOne: {collection: 'foos', hasMany: 'x'}}}}}), new SchemaSyntaxError("can't assign foreign schema to foos:x from bars:z"));
    t.throws(() => new DB({schema: {
        foos: {'bar': {unique: true, components: ['x','y']}},
        bars: {'z': {hasMany: {collection: 'foos', hasMany: 'x'}}}}}), new SchemaSyntaxError("can't assign foreign schema to foos:x from bars:z"));
    t.throws(() => new DB({schema: {
        bars: {'z': {hasOne: {collection: 'foos', hasOne: 'x'}}},
        foos: {'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("non-indexable property: foos:x"));
    t.throws(() => new DB({schema: {
        bars: {'z': {hasOne: {collection: 'foos', hasMany: 'x'}}},
        foos: {'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("non-indexable property: foos:x"));
    t.throws(() => new DB({schema: {
        bars: {'z': {hasMany: {collection: 'foos', hasMany: 'x'}}},
        foos: {'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("non-indexable property: foos:x"));
    t.end();
  });

  suite.test('relation required error', t => {
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: "bar", required: true}}}}), new SchemaSyntaxError("required is not supported with relations in for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: "bar", hasMany: "foos"}, required: true}}}}), new SchemaSyntaxError("required is not supported with relations in for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: {hasOne: {collection: "bar", hasOne: "foo"}, required: true}}}}), new SchemaSyntaxError("required is not supported with relations in for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bars: {hasMany: {collection: "bars", hasMany: "foos"}, required: true}}}}), new SchemaSyntaxError("required is not supported with relations in for foo:bars"));
    t.end();
  });

  suite.test('relation on deep property error', t => {
    t.throws(() => new DB({schema: {foo: {'b.ar': {hasOne: "bar"}}}}), new SchemaSyntaxError("unimplemented schema: relation on deep property in foo:b.ar"));
    t.throws(() => new DB({schema: {foo: {'b.ar': {hasOne: {collection: "bar", hasMany: "foos"}}}}}), new SchemaSyntaxError("unimplemented schema: relation on deep property in foo:b.ar"));
    t.throws(() => new DB({schema: {foo: {'b.ar': {hasOne: {collection: "bar", hasOne: "foo"}}}}}), new SchemaSyntaxError("unimplemented schema: relation on deep property in foo:b.ar"));
    t.throws(() => new DB({schema: {foo: {'b.ars': {hasMany: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError("unimplemented schema: relation on deep property in foo:b.ars"));
    t.end();
  });

  suite.test('hasMany and hasOne conflict error', t => {
    t.throws(() => new DB({schema: {foo: {'bar': {hasOne: {collection: "bar", hasMany: "foos"}, hasMany: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError('only one of "hasMany" or "hasOne" relation type may be defined in foo:bar'));
    t.throws(() => new DB({schema: {foo: {'bar': {hasOne: {collection: "bar", hasOne: "foo"}, hasMany: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError('only one of "hasMany" or "hasOne" relation type may be defined in foo:bar'));
    t.throws(() => new DB({schema: {foo: {'bars': {hasMany: {collection: "bars", hasMany: "foos"}, hasOne: "bar"}}}}), new SchemaSyntaxError('only one of "hasMany" or "hasOne" relation type may be defined in foo:bars'));
    t.end();
  });

  suite.test('foreign schema conflict', t => {
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: "bar"}}, bars: {foo: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("can't assign foreign schema to foos:bar from bars:foo"));
    t.throws(() => new DB({schema: {foos: {bars: String}, bars: {foo: {hasOne: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("can't assign foreign schema to foos:bars from bars:foo"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasMany: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("schema property already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: String}}}), new SchemaSyntaxError("schema property already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasMany: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("schema property already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("schema property already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasOne: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("schema property already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasOne: "foo"}}}, bars: {foo: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("schema property already exists: bars:foo"));
    t.end();
  });

  suite.end();
});
