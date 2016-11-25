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
    t.throws(() => new DB({schema: {'foos': {__: String}}}), new SchemaSyntaxError('collection property name must not start with "__": foos:__'));
    t.throws(() => new DB({schema: {'foos': {___: String}}}), new SchemaSyntaxError('collection property name must not start with "__": foos:___'));
    t.throws(() => new DB({schema: {'foos': {'.': String}}}), new SchemaSyntaxError('collection property name must not start with ".": foos:.'));
    t.throws(() => new DB({schema: {'foos': {'aaa..': String}}}), new SchemaSyntaxError('consecutive "." separator in schema property aaa..'));
    t.throws(() => new DB({schema: {'foos': {'xxx..bbb': String}}}), new SchemaSyntaxError('consecutive "." separator in schema property xxx..bbb'));
    t.throws(() => new DB({schema: {'foos': {'xxx.': String}}}), new SchemaSyntaxError('schema: property name must not end with a "." in xxx.'));
    t.end();
  });

  suite.test('property type error', t => {
    t.throws(() => new DB({schema: {foo: {bar: Object}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
    t.throws(() => new DB({schema: {foo: {bar: []}}}), new SchemaSyntaxError("invalid schema type, hasMany or hasOne for foo:bar"));
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
    t.throws(() => new DB({schema: {foos: {bars: {hasMany: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasMany: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("schema property descriptor already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: String}}}), new SchemaSyntaxError("schema property descriptor already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasMany: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("schema property descriptor already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("schema property descriptor already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasMany: "foos"}}}, bars: {foos: {hasOne: {collection: "foos", hasMany: "bars"}}}}}), new SchemaSyntaxError("schema property descriptor already exists: bars:foos"));
    t.throws(() => new DB({schema: {foos: {bar: {hasOne: {collection: "bars", hasOne: "foo"}}}, bars: {foo: {hasOne: {collection: "foos", hasOne: "bar"}}}}}), new SchemaSyntaxError("schema property descriptor already exists: bars:foo"));
    t.end();
  });

  suite.end();
});
