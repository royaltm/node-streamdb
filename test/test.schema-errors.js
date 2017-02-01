"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;
const { SchemaSyntaxError } = require('../lib/errors');

test("schema errors", suite => {

  suite.test('collection name error', t => {
    t.throws(() => new Collection({}), new SchemaSyntaxError('collection name must be a string'));
    t.throws(() => new Collection({}, Symbol.for('x')), new SchemaSyntaxError('collection name must be a string'));
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
    t.throws(() => new DB({schema: {'foos': {_id: String}}}),                  new SchemaSyntaxError('foos: reserved property name: _id'));
    t.throws(() => new DB({schema: {'foos': {inspect: String}}}),              new SchemaSyntaxError('foos: reserved property name: inspect'));
    t.throws(() => new DB({schema: {'foos': {toJSON: String}}}),               new SchemaSyntaxError('foos: reserved property name: toJSON'));
    t.throws(() => new DB({schema: {'foos': {constructor: String}}}),          new SchemaSyntaxError('foos: reserved property name: constructor'));
    t.throws(() => new DB({schema: {'foos': {hasOwnProperty: String}}}),       new SchemaSyntaxError('foos: reserved property name: hasOwnProperty'));
    t.throws(() => new DB({schema: {'foos': {isPrototypeOf: String}}}),        new SchemaSyntaxError('foos: reserved property name: isPrototypeOf'));
    t.throws(() => new DB({schema: {'foos': {propertyIsEnumerable: String}}}), new SchemaSyntaxError('foos: reserved property name: propertyIsEnumerable'));
    t.throws(() => new DB({schema: {'foos': {toLocaleString: String}}}),       new SchemaSyntaxError('foos: reserved property name: toLocaleString'));
    t.throws(() => new DB({schema: {'foos': {toString: String}}}),             new SchemaSyntaxError('foos: reserved property name: toString'));
    t.throws(() => new DB({schema: {'foos': {valueOf: String}}}),              new SchemaSyntaxError('foos: reserved property name: valueOf'));
    t.throws(() => new DB({schema: {'foos': {__: String}}}),                   new SchemaSyntaxError('foos: property name must not start with a "__": __'));
    t.throws(() => new DB({schema: {'foos': {___: String}}}),                  new SchemaSyntaxError('foos: property name must not start with a "__": ___'));
    t.throws(() => new DB({schema: {'foos': {'foo._id': String}}}),                  new SchemaSyntaxError('foos[].foo: reserved property name: _id'));
    t.throws(() => new DB({schema: {'foos': {'foo.inspect': String}}}),              new SchemaSyntaxError('foos[].foo: reserved property name: inspect'));
    t.throws(() => new DB({schema: {'foos': {'foo.toJSON': String}}}),               new SchemaSyntaxError('foos[].foo: reserved property name: toJSON'));
    t.throws(() => new DB({schema: {'foos': {'foo.constructor': String}}}),          new SchemaSyntaxError('foos[].foo: reserved property name: constructor'));
    t.throws(() => new DB({schema: {'foos': {'foo.hasOwnProperty': String}}}),       new SchemaSyntaxError('foos[].foo: reserved property name: hasOwnProperty'));
    t.throws(() => new DB({schema: {'foos': {'foo.isPrototypeOf': String}}}),        new SchemaSyntaxError('foos[].foo: reserved property name: isPrototypeOf'));
    t.throws(() => new DB({schema: {'foos': {'foo.propertyIsEnumerable': String}}}), new SchemaSyntaxError('foos[].foo: reserved property name: propertyIsEnumerable'));
    t.throws(() => new DB({schema: {'foos': {'foo.toLocaleString': String}}}),       new SchemaSyntaxError('foos[].foo: reserved property name: toLocaleString'));
    t.throws(() => new DB({schema: {'foos': {'foo.toString': String}}}),             new SchemaSyntaxError('foos[].foo: reserved property name: toString'));
    t.throws(() => new DB({schema: {'foos': {'foo.valueOf': String}}}),              new SchemaSyntaxError('foos[].foo: reserved property name: valueOf'));
    t.throws(() => new DB({schema: {'foos': {'foo.__': String}}}),                   new SchemaSyntaxError('foos[].foo: property name must not start with a "__": __'));
    t.throws(() => new DB({schema: {'foos': {'foo.___': String}}}),                  new SchemaSyntaxError('foos[].foo: property name must not start with a "__": ___'));
    t.throws(() => new DB({schema: {'foos': {'.': String}}}),                  new SchemaSyntaxError('foos: invalid "." separator placement in schema property .'));
    t.throws(() => new DB({schema: {'foos': {'.bar': String}}}),               new SchemaSyntaxError('foos: invalid "." separator placement in schema property .bar'));
    t.throws(() => new DB({schema: {'foos': {'aaa..': String}}}),              new SchemaSyntaxError('foos: invalid "." separator placement in schema property aaa..'));
    t.throws(() => new DB({schema: {'foos': {'xxx..bbb': String}}}),           new SchemaSyntaxError('foos: invalid "." separator placement in schema property xxx..bbb'));
    t.throws(() => new DB({schema: {'foos': {'xxx.': String}}}),               new SchemaSyntaxError('foos: property name must not end with a "." in xxx.'));
    t.throws(() => new DB({schema: {'foos': {'xxx.yyy.': String}}}),           new SchemaSyntaxError('foos: property name must not end with a "." in xxx.yyy.'));
    t.throws(() => new DB({schema: {'foos': {'': String}}}),                   new SchemaSyntaxError('foos: property name must not be empty'));
    t.end();
  });

  suite.test('deep property collision', t => {
    t.throws(() => new DB({schema: {'foos': {'arr': String, 'arr.arr': String}}}), new SchemaSyntaxError('foos: deep property: arr.arr collides with another property: arr'));
    t.throws(() => new DB({schema: {'foos': {'arr.arr': String, 'arr': String}}}), new SchemaSyntaxError('foos: schema property already exists: arr'));
    t.throws(() => new DB({schema: {'foos': {'arr.arr': String, 'arr.arr.arr': String}}}), new SchemaSyntaxError('foos: deep property: arr.arr.arr collides with another property: arr.arr'));
    t.throws(() => new DB({schema: {'foos': {'arr.arr.arr': String, 'arr.arr': String}}}), new SchemaSyntaxError('foos: schema property already exists: arr.arr'));
    t.throws(() => new DB({schema: {'foos': {'arr.arr.arr': String, 'arr': String}}}), new SchemaSyntaxError('foos: schema property already exists: arr'));
    t.end();
  });

  suite.test('property type error', t => {
    t.throws(() => new DB({schema: {foos: {bar: Object}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: 0}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: null}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: undefined}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: true}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: false}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: 'xxx'}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: Object}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: []}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 0}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: undefined}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: true}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: false}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'xxx'}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: ''}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: Object}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: []}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: 0}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: null}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: undefined}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: true}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: false}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'xxx', hasMany:'foos', hasOne: 'foo'}}}}}), new SchemaSyntaxError('foos: hasOne relation requires only one of "hasMany" or "hasOne" foreign property in bar'));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'xxx', hasOne: ''}}}}}), new SchemaSyntaxError('foos: hasOne foreign property name must be a non empty string in bar'));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'xxx', hasOne: null}}}}}), new SchemaSyntaxError('foos: hasOne foreign property name must be a non empty string in bar'));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'xxx', hasMany:''}}}}}), new SchemaSyntaxError('foos: hasMany foreign property name must be a non empty string in bar'));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'xxx', hasMany:null}}}}}), new SchemaSyntaxError('foos: hasMany foreign property name must be a non empty string in bar'));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: Object}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: []}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: 0}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: null}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: undefined}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: true}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: false}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: 'xxx'}}}}), new SchemaSyntaxError("foos: invalid schema type, hasMany or hasOne for bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: 'xxx'}}}}}), new SchemaSyntaxError("foos: hasMany relation requires hasMany foreign property in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: 'xxx', hasOne: 'foo'}}}}}), new SchemaSyntaxError("foos: hasMany relation forbids hasOne foreign property in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: 'xxx', hasMany:'foos', hasOne: 'foo'}}}}}), new SchemaSyntaxError("foos: hasMany relation forbids hasOne foreign property in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: 'xxx', hasMany:''}}}}}), new SchemaSyntaxError("foos: hasMany foreign property name must be a non empty string in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: 'xxx', hasMany:null}}}}}), new SchemaSyntaxError("foos: hasMany foreign property name must be a non empty string in bars"));
    t.throws(() => new DB({schema: {foos: {bar: 'enum'}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Enum'}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'enum', enum: ""}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'enum', enum: {}}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'enum', enum: []}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'enum', enum: [0]}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'enum', enum: [undefined]}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'enum', enum: [null]}}}}), new SchemaSyntaxError('foos: Enum requires an "enum" schema property as an array of non empty strings for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'blob', encoding: null}}}}), new SchemaSyntaxError('foos: Blob schema property "encoding" needs to be a proper encoding for bar'));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'blob', encoding: "foo"}}}}), new SchemaSyntaxError('foos: Blob schema property "encoding" needs to be a proper encoding for bar'));
    t.end();
  });

  suite.test('property default value errors', t => {
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: 'bar', default: null}}}}), new SchemaSyntaxError("foos: property default value is not allowed for a relation in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'bars', hasOne: 'foo'}, default: null}}}}), new SchemaSyntaxError("foos: property default value is not allowed for a relation in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: 'bars', hasMany: 'foos'}, default: null}}}}), new SchemaSyntaxError("foos: property default value is not allowed for a relation in bar"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: 'bars', hasMany: 'foos'}, default: null}}}}), new SchemaSyntaxError("foos: property default value is not allowed for a relation in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {type: null, default: {} }}}}), new SchemaSyntaxError("foos: property default value must be a function or a scalar in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {type: '*', default: [] }}}}), new SchemaSyntaxError("foos: property default value must be a function or a scalar in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {default: [] }}}}), new SchemaSyntaxError("foos: property default value must be a function or a scalar in bars"));
    t.throws(() => new DB({schema: {foos: {bars: {type: 'date', default: new Date() }}}}), new SchemaSyntaxError("foos: property default value must be a function or a scalar in bars"));
    t.end();
  });

  suite.test('forbidden indexed types', t => {
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Any', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'any', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: '*', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: null, unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Any', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'any', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: '*', index: true}}}}), new SchemaSyntaxError("foos: unimplemented: index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: null, index: true}}}}), new SchemaSyntaxError("foos: unimplemented: index on Any type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Date', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Date type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Date', index: true}}}}), new SchemaSyntaxError("foos: unimplemented: index on Date type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Blob', unique: true}}}}), new SchemaSyntaxError("foos: unimplemented: unique index on Blob type property in bar"));
    t.throws(() => new DB({schema: {foos: {bar: {type: 'Blob', index: true}}}}), new SchemaSyntaxError("foos: unimplemented: index on Blob type property in bar"));
    t.end();
  });

  suite.test('composite index errors', t => {
    t.throws(() => new DB({schema: {foos: {bar: [{}]}}}), new SchemaSyntaxError("foos: composite index components must be an array of property names: bar"));
    t.throws(() => new DB({schema: {foos: {bar: {components: [{}]}}}}), new SchemaSyntaxError("foos: composite index components must be an array of property names: bar"));
    t.throws(() => new DB({schema: {foos: {bar: []}}}), new SchemaSyntaxError("foos: composite index requires at least 2 components in bar"));
    t.throws(() => new DB({schema: {foos: {bar: ['rab']}}}), new SchemaSyntaxError("foos: composite index requires at least 2 components in bar"));
    t.throws(() => new DB({schema: {foos: {'b.ar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError('foos: composite index name must not include "." in b.ar'));
    t.throws(() => new DB({schema: {foos: {'toJSON': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: reserved composite index name: toJSON"));
    t.throws(() => new DB({schema: {foos: {'__bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError('foos: composite index name must not start with a "__": __bar'));
    t.throws(() => new DB({schema: {foos: {'': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError('foos: composite index name must not be empty'));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['x.x','y']}}}}), new SchemaSyntaxError("foos: unimplemented composite index on deep property in x.x"));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['','y']}}}}), new SchemaSyntaxError("foos: property name must not be empty"));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['__','y']}}}}), new SchemaSyntaxError('foos: property name must not start with a "__": __'));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['___','y']}}}}), new SchemaSyntaxError('foos: property name must not start with a "__": ___'));
    t.throws(() => new DB({schema: {foos: {'bar': {unique: true, components: ['toJSON','y']}}}}), new SchemaSyntaxError("foos: reserved property name: toJSON"));
    t.throws(() => new DB({schema: {foos: {'x': Date, 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': 'blob', 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': {hasOne: 'bars'}, 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': {hasOne: {collection: 'bars'}}, 'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': Date, 'bar': ['x','y']}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': 'blob', 'bar': ['x','y']}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': {hasOne: 'bars'}, 'bar': ['x','y']}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': {hasOne: {collection: 'bars'}}, 'bar': ['x','y']}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {foos: {'x': ['a', 'b', 'a']}}}), new SchemaSyntaxError("foos: index components must be unique in x"));
    t.throws(() => new DB({schema: {foos: {'x': {unique: false, components: ['a', 'b', 'a']}}}}), new SchemaSyntaxError("foos: index components must be unique in x"));
    t.throws(() => new DB({schema: {foos: {'x': {unique: true, components: ['a', 'b', 'a']}}}}), new SchemaSyntaxError("foos: index components must be unique in x"));
    t.throws(() => new DB({schema: {
        foos: {'bar': {unique: true, components: ['x','y']}},
        bars: {'z': {hasOne: {collection: 'foos', hasOne: 'x'}}}}}), new SchemaSyntaxError("bars: can't assign foreign schema to foos[].x from z"));
    t.throws(() => new DB({schema: {
        foos: {'bar': {unique: true, components: ['x','y']}},
        bars: {'z': {hasOne: {collection: 'foos', hasMany: 'x'}}}}}), new SchemaSyntaxError("bars: can't assign foreign schema to foos[].x from z"));
    t.throws(() => new DB({schema: {
        foos: {'bar': {unique: true, components: ['x','y']}},
        bars: {'z': {hasMany: {collection: 'foos', hasMany: 'x'}}}}}), new SchemaSyntaxError("bars: can't assign foreign schema to foos[].x from z"));
    t.throws(() => new DB({schema: {
        bars: {'z': {hasOne: {collection: 'foos', hasOne: 'x'}}},
        foos: {'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {
        bars: {'z': {hasOne: {collection: 'foos', hasMany: 'x'}}},
        foos: {'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.throws(() => new DB({schema: {
        bars: {'z': {hasMany: {collection: 'foos', hasMany: 'x'}}},
        foos: {'bar': {unique: true, components: ['x','y']}}}}), new SchemaSyntaxError("foos: non-indexable schema property: x"));
    t.end();
  });

  suite.test('relation required error', t => {
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: "bars", required: true}}}}), new SchemaSyntaxError("foos: required is not supported with relations in for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}, required: true}}}}), new SchemaSyntaxError("foos: required is not supported with relations in for bar"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasOne: "foo"}, required: true}}}}), new SchemaSyntaxError("foos: required is not supported with relations in for bar"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: "bars", hasMany: "foos"}, required: true}}}}), new SchemaSyntaxError("foos: required is not supported with relations in for bars"));
    t.end();
  });

  suite.test('relation on deep property error', t => {
    t.throws(() => new DB({schema: {foos: {'b.ar': {hasOne: "bars"}}}}), new SchemaSyntaxError("foos: unimplemented schema: relation on deep property in b.ar"));
    t.throws(() => new DB({schema: {foos: {'b.ar': {hasOne: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError("foos: unimplemented schema: relation on deep property in b.ar"));
    t.throws(() => new DB({schema: {foos: {'b.ar': {hasOne: {collection: "bars", hasOne: "foo"}}}}}), new SchemaSyntaxError("foos: unimplemented schema: relation on deep property in b.ar"));
    t.throws(() => new DB({schema: {foos: {'b.ars': {hasMany: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError("foos: unimplemented schema: relation on deep property in b.ars"));
    t.end();
  });

  suite.test('hasMany and hasOne conflict error', t => {
    t.throws(() => new DB({schema: {foos: {'bar': {hasOne: {collection: "bars", hasMany: "foos"}, hasMany: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError('foos: only one of "hasMany" or "hasOne" relation type may be defined in bar'));
    t.throws(() => new DB({schema: {foos: {'bar': {hasOne: {collection: "bars", hasOne: "foo"}, hasMany: {collection: "bars", hasMany: "foos"}}}}}), new SchemaSyntaxError('foos: only one of "hasMany" or "hasOne" relation type may be defined in bar'));
    t.throws(() => new DB({schema: {foos: {'bars': {hasMany: {collection: "bars", hasMany: "foos"}, hasOne: "bar"}}}}), new SchemaSyntaxError('foos: only one of "hasMany" or "hasOne" relation type may be defined in bars'));
    t.end();
  });

  suite.test('foreign schema conflict', t => {
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: "bar"}}, bars: {foo: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("bars: can't assign foreign schema to foos[].bar from foo"));
    t.throws(() => new DB({schema: {foos: {bars: String}, bars: {foo: {hasOne: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("bars: can't assign foreign schema to foos[].bars from foo"));
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasMany: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("bars: schema property already exists: foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: String}}}), new SchemaSyntaxError("bars: schema property already exists: foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasMany: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("bars: schema property already exists: foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("bars: schema property already exists: foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasOne: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("bars: schema property already exists: foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasOne: "foo"}}}, bars: {foo: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("bars: schema property already exists: foo"));
    t.end();
  });

  suite.end();
});
