"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const itemKlass$ = Symbol.for("itemKlass");

const genIdent = require('../lib/id').genIdent;

const Primitive = require('../lib/collection/schema/types').primitive;
const Enum = require('../lib/collection/schema/types').enum;
const Blob = require('../lib/collection/schema/types').blob;

test("DB", suite => {

  suite.test("should create database with type constraint schema", t => {
    t.plan(26+115+2);
    var db = new DB({schema: {
      test: {
        name: String,
        time: Date,
        'other.nested.count': Number,
        'other.nested.flag': {type: Boolean, required: true}
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        name: {type: String},
        time: {type: Date},
        'other.nested.count': {type: Number},
        'other.nested.flag': {type: Boolean, required: true}
      }
    });

    t.strictSame(Object.getOwnPropertyNames(db.collections.test[Symbol.for('schema')]),
      ['name', 'time', 'other', 'other.nested', 'other.nested.count', 'other.nested.flag']);
    t.strictSame(db.collections.test[Symbol.for('schema')].name, {
      name: 'name',
      required: false,
      type: String,
      prop: 'name'
    });
    t.strictSame(Object.getOwnPropertyNames(db.collections.test[Symbol.for('schema')].time),
      ['name', 'required', 'type', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.name, 'time');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.type, Date);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.prop, 'time');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].time.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].time.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].time.writePropertySymbol, 'symbol');
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested.count'], {
      name: 'other.nested.count',
      required: false,
      type: Number,
      prop: 'other.nested.count'
    });
    t.deepEqual(db.collections.test[Symbol.for('schema')].other, {
      nested:
        { count:
            { name: 'other.nested.count',
              required: false,
              type: Number,
              prop: 'count' },
          flag:
            { name: 'other.nested.flag',
              required: true,
              type: Boolean,
              prop: 'flag' } },
      'nested.count':
      { name: 'other.nested.count',
        required: false,
        type: Number,
        prop: 'nested.count' },
      'nested.flag':
        { name: 'other.nested.flag',
          required: true,
          type: Boolean,
          prop: 'nested.flag' }
    });
    t.deepEqual(db.collections.test[Symbol.for('schema')]['other.nested'], {
      count:
      { name: 'other.nested.count',
        required: false,
        type: Number,
        prop: 'count' },
      flag:
      { name: 'other.nested.flag',
        required: true,
        type: Boolean,
        prop: 'flag' }
    });
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested.flag'], {
      name: 'other.nested.flag',
      required: true,
      type: Boolean,
      prop: 'other.nested.flag'
    });

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      t.throws(() => { db.collections.test.validate()}, new TypeError("test[].other.nested.flag: property is required"));
      t.throws(() => { db.collections.test.validate({})}, new TypeError("test[].other.nested.flag: property is required"));
      t.throws(() => { db.collections.test.validate({_id: 'xxx', other: {nested: {flag: true}}})}, new TypeError("test: reserved property name: _id"));
      t.deepEquals(db.collections.test.validate({other: {nested: {flag: true}}}), {other: {nested: {flag: true}}});
      var detitem = db.collections.test.makeDetachedItem({other: {nested: {flag: true}}}).toJSON();
      t.deepEquals(Object.keys(detitem), ['_id', 'other']);
      t.deepEquals(detitem.other, {nested: {flag: true}});
      t.type(detitem._id, 'string');
      t.matches(detitem._id, /[0-9a-f]{24}/);

      return db.collections.test.createAndSave({name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});

        t.throws(() => { item._id = null; }, new TypeError("test: reserved property name: _id"));
        t.throws(() => { item.toJSON = null; }, new TypeError("test: reserved property name: toJSON"));
        t.throws(() => { item.toString = null; }, new TypeError("test: reserved property name: toString"));
        t.throws(() => { item.__ = null; }, new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => { item.__bar = null; }, new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => { item.hasOwnProperty = null; }, new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => { item.constructor = null; }, new TypeError("test: reserved property name: constructor"));
        t.throws(() => db.collections.test.update(item, {_id: null}), new TypeError("test: reserved property name: _id"));
        t.throws(() => db.collections.test.update(item, {toJSON: null}), new TypeError("test: reserved property name: toJSON"));
        t.throws(() => db.collections.test.update(item, {toString: null}), new TypeError("test: reserved property name: toString"));
        t.throws(() => db.collections.test.update(item, {__: null}), new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => db.collections.test.update(item, {__bar: null}), new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => db.collections.test.update(item, {hasOwnProperty: null}), new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => db.collections.test.update(item, {constructor: null}), new TypeError("test: reserved property name: constructor"));
        t.throws(() => db.collections.test.replace(item, {_id: null, other:{nested:{flag:false}}}), new TypeError("test: reserved property name: _id"));
        t.throws(() => db.collections.test.replace(item, {toJSON: null, other:{nested:{flag:false}}}), new TypeError("test: reserved property name: toJSON"));
        t.throws(() => db.collections.test.replace(item, {toString: null, other:{nested:{flag:false}}}), new TypeError("test: reserved property name: toString"));
        t.throws(() => db.collections.test.replace(item, {__: null, other:{nested:{flag:false}}}), new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => db.collections.test.replace(item, {__bar: null, other:{nested:{flag:false}}}), new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => db.collections.test.replace(item, {hasOwnProperty: null, other:{nested:{flag:false}}}), new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => db.collections.test.replace(item, {constructor: null, other:{nested:{flag:false}}}), new TypeError("test: reserved property name: constructor"));
        t.throws(() => { item._id = undefined; }, new TypeError("test: reserved property name: _id"));
        t.throws(() => { item.toJSON = undefined; }, new TypeError("test: reserved property name: toJSON"));
        t.throws(() => { item.toString = undefined; }, new TypeError("test: reserved property name: toString"));
        t.throws(() => { item.__ = undefined; }, new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => { item.__bar = undefined; }, new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => { item.hasOwnProperty = undefined; }, new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => { item.constructor = undefined; }, new TypeError("test: reserved property name: constructor"));
        t.throws(() => { delete item._id; }, new TypeError("test: reserved property name: _id"));
        t.throws(() => { delete item.toJSON; }, new TypeError("test: reserved property name: toJSON"));
        t.throws(() => { delete item.toString; }, new TypeError("test: reserved property name: toString"));
        t.throws(() => { delete item.__; }, new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => { delete item.__bar; }, new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => { delete item.hasOwnProperty; }, new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => { delete item.constructor; }, new TypeError("test: reserved property name: constructor"));
        t.throws(() => db.collections.test.update(item, {_id: undefined}), new TypeError("test: reserved property name: _id"));
        t.throws(() => db.collections.test.update(item, {toJSON: undefined}), new TypeError("test: reserved property name: toJSON"));
        t.throws(() => db.collections.test.update(item, {toString: undefined}), new TypeError("test: reserved property name: toString"));
        t.throws(() => db.collections.test.update(item, {__: undefined}), new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => db.collections.test.update(item, {__bar: undefined}), new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => db.collections.test.update(item, {hasOwnProperty: undefined}), new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => db.collections.test.update(item, {constructor: undefined}), new TypeError("test: reserved property name: constructor"));
        t.throws(() => db.collections.test.add(item, '', 1), new TypeError("test: property name must not be empty"));
        t.throws(() => db.collections.test.add(item, '_id', 1), new TypeError("test: reserved property name: _id"));
        t.throws(() => db.collections.test.add(item, 'toJSON', 1), new TypeError("test: reserved property name: toJSON"));
        t.throws(() => db.collections.test.add(item, 'toString', 1), new TypeError("test: reserved property name: toString"));
        t.throws(() => db.collections.test.add(item, '__', 1), new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => db.collections.test.add(item, '__bar', 1), new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => db.collections.test.add(item, 'hasOwnProperty', 1), new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => db.collections.test.add(item, 'constructor', 1), new TypeError("test: reserved property name: constructor"));
        t.throws(() => db.collections.test.pull(item, '', 1), new TypeError("test: property name must not be empty"));
        t.throws(() => db.collections.test.pull(item, '_id', 1), new TypeError("test: reserved property name: _id"));
        t.throws(() => db.collections.test.pull(item, 'toJSON', 1), new TypeError("test: reserved property name: toJSON"));
        t.throws(() => db.collections.test.pull(item, 'toString', 1), new TypeError("test: reserved property name: toString"));
        t.throws(() => db.collections.test.pull(item, '__', 1), new TypeError('test: property name must not start with a "__": __'));
        t.throws(() => db.collections.test.pull(item, '__bar', 1), new TypeError('test: property name must not start with a "__": __bar'));
        t.throws(() => db.collections.test.pull(item, 'hasOwnProperty', 1), new TypeError("test: reserved property name: hasOwnProperty"));
        t.throws(() => db.collections.test.pull(item, 'constructor', 1), new TypeError("test: reserved property name: constructor"));

        t.throws(() => { item.name = 123; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = []; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = {}; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = Symbol("asd"); }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = true; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = false; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = null; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = NaN; }, new TypeError("test[].name: property needs to be a string"));
        t.throws(() => { item.name = new Date; }, new TypeError("test[].name: property needs to be a string"));
        delete item.name;
        t.throws(() => { item.time = ""; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = "foo"; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = []; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = {}; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = Symbol("asd"); }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = true; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = false; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = NaN; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = null; }, new TypeError("test[].time: property needs to be a date or a primitive convertible to a date"));
        delete item.time;
        t.throws(() => { item.other.nested.count = ""; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = []; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = {}; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = Symbol("asd"); }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = true; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = false; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = null; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = new Date; }, new TypeError("test[].other.nested.count: property needs to be a number"));
        delete item.other.nested.count;
        t.throws(() => { item.other.nested.flag = ""; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = []; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = {}; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = Symbol("asd"); }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = NaN; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = 0; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = new Date; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = null; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested = {flag: null}; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other = {nested: {flag: null}}; }, new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => db.collections.test.replace(item, {other:{nested:{flag: null}}}), new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => db.collections.test.update(item, {other:{nested:{flag: null}}}), new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => db.collections.test.update(item, {'other.nested.flag': null}), new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => db.collections.test.update(item, {'other.nested': {flag: null}}), new TypeError("test[].other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = undefined; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { delete item.other.nested.flag; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { item.other.nested = undefined; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { delete item.other.nested; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { item.other = undefined; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { delete item.other; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { item.other.nested = {flag: undefined}; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { item.other = {nested: {flag: undefined}}; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => { item.other = {nested: undefined}; }, new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.replace(item, {}), new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.replace(item, {other:{}}), new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.replace(item, {other:{nested:{}}}), new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.replace(item, {other:{nested:{flag: undefined}}}), new TypeError("test[].other.nested.flag: property is required"));
        db.collections.test.update(item, {}); /* no op */
        t.throws(() => db.collections.test.update(item, {other:{}}), new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.update(item, {other:{nested:{}}}), new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.update(item, {'other.nested.flag': undefined}), new TypeError("test[].other.nested.flag: property is required"));
        t.throws(() => db.collections.test.update(item, {'other.nested': {flag: undefined}}), new TypeError("test[].other.nested.flag: property is required"));
        return db.save();
      })
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, other: {nested: {flag: true}}});
      });
    }).catch(t.threw);
  });

  suite.test("should create database with default constraint schema", t => {
    t.plan(107);
    var schema = {
      test: {
        name: {type: "string", default: "foo"},
        enum: {type: "enum", enum: ["foo", "bar"], default: "bar"},
        blob: {type: "blob", encoding: "hex", default: {function: 'Buffer.alloc(0)'}},
        scal: {type: 'primitive', required: true},
        time: {type: "date", default: () => new Date(2016,6,12,20,42)},
        'other.nested.count': {type: "number", default: 10},
        'other.nested.flag': {type: "boolean", default: true}
      }
    };
    var db = new DB({schema: schema});

    t.notStrictEqual(db.schema, schema);
    t.notStrictEqual(db.schema.test, schema.test);
    t.notStrictEqual(db.schema.test.name, schema.test.name);
    t.notStrictEqual(db.schema.test.time, schema.test.time);
    t.notStrictEqual(db.schema.test.enum, schema.test.enum);
    t.notStrictEqual(db.schema.test.blob, schema.test.blob);
    t.notStrictEqual(db.schema.test['other.nested.count'], schema.test['other.nested.count']);
    t.notStrictEqual(db.schema.test['other.nested.flag'], schema.test['other.nested.flag']);

    t.deepEqual(db.schema, {
      test: {
        name: { type: 'string', default: 'foo', },
        enum: { type: 'enum', enum: ['foo', 'bar'], default: 'bar'},
        blob: { type: 'blob', encoding: 'hex', default: {function: 'Buffer.alloc(0)'}},
        scal: { type: 'primitive', required: true},
        time: { type: 'date', default: "() => new Date(2016,6,12,20,42)" },
        'other.nested.count': { type: 'number', default: 10 },
        'other.nested.flag': { type: 'boolean', default: true }
      }
    });

    t.strictSame(Object.getOwnPropertyNames(db.collections.test[Symbol.for('schema')]),
      ['name', 'enum', 'blob', 'scal', 'time', 'other', 'other.nested', 'other.nested.count', 'other.nested.flag']);

    t.strictSame(db.collections.test[Symbol.for('schema')].name, {
      "default": "foo",
      "name": "name",
      "prop": "name",
      "required": false,
      "type": String,
    });
    t.strictSame(db.collections.test[Symbol.for('schema')].enum, {
      "name": "enum",
      "prop": "enum",
      "required": false,
      "type": new Enum({enum: ["foo", "bar"]}),
      "default": "bar"
    });
    t.strictSame(Object.getOwnPropertyNames(db.collections.test[Symbol.for('schema')].blob), 
      ['name', 'required', 'type', 'default', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].blob.name, "blob");
    t.strictEqual(db.collections.test[Symbol.for('schema')].blob.prop, "blob");
    t.strictEqual(db.collections.test[Symbol.for('schema')].blob.required, false);
    t.strictSame(db.collections.test[Symbol.for('schema')].blob.type, new Blob({encoding: "hex"}));
    t.type(db.collections.test[Symbol.for('schema')].blob.default, 'function');
    t.strictEqual(db.collections.test[Symbol.for('schema')].blob.default.toString(), '() => Buffer.alloc(0)');
    t.strictSame(db.collections.test[Symbol.for('schema')].scal, {
      "name": "scal",
      "prop": "scal",
      "required": true,
      "type": new Primitive()
    });
    t.deepEqual(db.collections.test[Symbol.for('schema')].other, {
      "nested": {
        "count": {
          "default": 10,
          "name": "other.nested.count",
          "prop": "count",
          "required": false,
          "type": Number,
        },
        "flag": {
          "default": true,
          "name": "other.nested.flag",
          "prop": "flag",
          "required": false,
          "type": Boolean,
        }
      },
      "nested.count": {
        "default": 10,
        "name": "other.nested.count",
        "prop": "nested.count",
        "required": false,
        "type": Number,
      },
      "nested.flag": {
        "default": true,
        "name": "other.nested.flag",
        "prop": "nested.flag",
        "required": false,
        "type": Boolean,
      }
    });
    t.deepEqual(db.collections.test[Symbol.for('schema')]['other.nested'], {
      "count": {
        "default": 10,
        "name": "other.nested.count",
        "prop": "count",
        "required": false,
        "type": Number,
      },
      "flag": {
        "default": true,
        "name": "other.nested.flag",
        "prop": "flag",
        "required": false,
        "type": Boolean,
      },
    });
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested.count'], {
      "default": 10,
      "name": "other.nested.count",
      "prop": "other.nested.count",
      "required": false,
      "type": Number,
    });
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested.flag'], {
      "default": true,
      "name": "other.nested.flag",
      "prop": "other.nested.flag",
      "required": false,
      "type": Boolean,
    });
    t.strictSame(Object.getOwnPropertyNames(db.collections.test[Symbol.for('schema')].time),
      ['name', 'required', 'type', 'default', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.name, 'time');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.type, Date);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.prop, 'time');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].time.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].time.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].time.writePropertySymbol, 'symbol');

    t.type(db, DB);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      t.throws(() => { db.collections.test.validate()}, new TypeError("test[].scal: property is required"));
      t.throws(() => { db.collections.test.validate({})}, new TypeError("test[].scal: property is required"));
      t.throws(() => { db.collections.test.validate({_id: 'xxx', scal: 1})}, new TypeError("test: reserved property name: _id"));
      t.deepEquals(db.collections.test.validate({scal: 1}), {
        name: "foo",
        enum: "bar",
        blob: Buffer.from(''),
        scal: 1,
        time: new Date(2016,6,12,20,42).getTime(),
        other: { nested: {count: 10, flag: true}}
      });
      var detitem = db.collections.test.makeDetachedItem({scal: true, name: "foofoo", other: {nested: {flag: false}}}).toJSON();
      t.deepEquals(Object.keys(detitem), ['_id', 'scal', 'name', 'other', 'enum', 'blob', 'time']);
      t.deepEquals(detitem.other, {nested: {count: 10, flag: false}});
      t.type(detitem._id, 'string');
      t.matches(detitem._id, /[0-9a-f]{24}/);

      return db.collections.test.createAndSave({scal: null})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'bar', blob: '', scal: null, time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        delete item.name;
        delete item.time;
        delete item.other;
        item.scal = 1;
        item.other.nested.count = 42;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'bar', blob: '', scal: 1, time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: true}}});
        item.enum = "foo";
        item.blob = "deadbaca";
        item.scal = "xxx";
        item.other.nested.flag = false;
        item.unschemed = "rarara";
        t.throws(() => { item.blob = null; }, new TypeError('test[].blob: property needs to be a buffer or a properly encoded string'));
        t.throws(() => db.collections.test.update(item, {blob: null}), new TypeError('test[].blob: property needs to be a buffer or a properly encoded string'));
        t.throws(() => { item.other.nested.flag = null; }, new TypeError('test[].other.nested.flag: property needs to be a boolean'));
        t.throws(() => { item.other.nested = {flag: null}; }, new TypeError('test[].other.nested.flag: property needs to be a boolean'));
        t.throws(() => { item.other = {nested:{flag: null}}; }, new TypeError('test[].other.nested.flag: property needs to be a boolean'));
        t.throws(() => db.collections.test.update(item, {other:{nested:{flag: null}}}), new TypeError('test[].other.nested.flag: property needs to be a boolean'));
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.type(item.blob, Buffer);
        t.deepEqual(item.blob, Buffer.from('deadbaca', 'hex'));
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: 'deadbaca', scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: false}}, unschemed: "rarara"});

        item.other.nested = undefined;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: 'deadbaca', scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}, unschemed: "rarara"});

        delete item.other;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: 'deadbaca', scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}, unschemed: "rarara"});

        delete item.other.nested.flag;
        item.other.nested.count = 42;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: 'deadbaca', scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: true}}, unschemed: "rarara"});

        t.throws(() => { item.enum = "baz"; }, new TypeError('enum: property needs to be one of: foo|bar'));
        t.throws(() => db.collections.test.update(item, {enum: "baz"}), new TypeError('test[].enum: property needs to be one of: foo|bar'));
        t.throws(() => { item.name = null; }, new TypeError('test[].name: property needs to be a string'));
        t.throws(() => db.collections.test.update(item, {name: null}), new TypeError('test[].name: property needs to be a string'));
        t.throws(() => { delete item.scal; }, new TypeError('test[].scal: property is required'));
        t.throws(() => db.collections.test.update(item, {scal: undefined}), new TypeError('test[].scal: property is required'));

        t.throws(() => db.collections.test.update(item, {'': null}), new TypeError("update: property name must not be empty"));
        t.throws(() => db.collections.test.update(item), new TypeError("update: value must be a plain object"));
        t.throws(() => db.collections.test.update(item, []), new TypeError("update: value must be a plain object"));
        t.throws(() => db.collections.test.update(item, /asd/), new TypeError("update: value must be a plain object"));
        t.throws(() => db.collections.test.update(item, new Date()), new TypeError("update: value must be a plain object"));
        t.throws(() => db.collections.test.update(item, ''), new TypeError("update: value must be a plain object"));
        t.throws(() => db.collections.test.update(item, 0), new TypeError("update: value must be a plain object"));
        t.throws(() => db.collections.test.update(item, null), new TypeError("update: value must be a plain object"));
        return db.collections.test.updateAndSave(item, {scal: undefined});
      })
      .catch(err => {
        t.type(err, TypeError);
        t.strictEqual(err.message, "test[].scal: property is required");
        var item = db.collections.test[0];
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: 'deadbaca', scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: true}}, unschemed: "rarara"});

        t.throws(() => db.collections.test.replace(item, []), new TypeError("test: property must be an object"));
        t.throws(() => db.collections.test.replace(item, /asd/), new TypeError("test: property must be an object"));
        t.throws(() => db.collections.test.replace(item, new Date()), new TypeError("test: property must be an object"));
        t.throws(() => db.collections.test.replace(item, ''), new TypeError("test: property must be an object"));
        t.throws(() => db.collections.test.replace(item, 0), new TypeError("test: property must be an object"));
        t.throws(() => db.collections.test.replace(item, null), new TypeError("test: property must be an object"));
        t.throws(() => db.collections.test.replace(item._id, {}), new TypeError("test[].scal: property is required"));
        t.throws(() => db.collections.test.replace(item, {}), new TypeError("test[].scal: property is required"));
        return db.collections.test.replaceAndSave(item._id, {});
      })
      .catch(err => {
        t.type(err, TypeError);
        t.strictEqual(err.message, "test[].scal: property is required");
        var item = db.collections.test[0];
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: 'deadbaca', scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: true}}, unschemed: "rarara"});

        return db.collections.test.replaceAndSave(item, {scal: true, name: "baz", time: 0, enum: "bar", blob: Buffer.from([1,2,3,4])});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'baz', enum: "bar", blob: '01020304', scal: true, time: new Date(0), other: {nested: {count: 10, flag: true}}});

        db.collections.test.add(item, 'name', 'zzz')
        db.collections.test.add(item, 'time', +new Date(2016, 10, 25, 11, 45, 42, 500))
        db.collections.test.add(item, 'other.nested.count', 101);
        t.throws(() => db.collections.test.add(item, 'enum', null), new TypeError("test[].enum: Enum forbids element operation"));
        t.throws(() => db.collections.test.add(item, 'blob', null), new TypeError("test[].blob: Blob forbids element operation"));
        t.throws(() => db.collections.test.add(item, 'scal', null), new TypeError("test[].scal: Primitive forbids element operation"));
        delete item.enum;
        delete item.blob;
        item.xxx = [1,'3',2];
        item.xxxset = new Set([1,3,2]);
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'bazzzz', enum: "bar", blob: '', scal: true, time: new Date(2016, 10, 25, 11, 45, 42, 500), other: {nested: {count: 111, flag: true}}, xxx: [1,'3',2], xxxset: new Set([1,3,2])});
        db.collections.test.subtract(item, 'name', 'baz')
        db.collections.test.subtract(item, 'time', +new Date(2016, 10, 25, 11, 45, 42, 500))
        db.collections.test.subtract(item, 'other.nested.count', 101);
        db.collections.test.pull(item, 'xxx', '3');
        db.collections.test.pull(item, 'xxxset', 3);
        t.throws(() => db.collections.test.subtract(item, 'enum', null), new TypeError("test[].enum: Enum forbids element operation"));
        t.throws(() => db.collections.test.subtract(item, 'blob', null), new TypeError("test[].blob: Blob forbids element operation"));
        t.throws(() => db.collections.test.subtract(item, 'scal', null), new TypeError("test[].scal: Primitive forbids element operation"));
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'zzz', enum: "bar", blob: '', scal: true, time: new Date(0), other: {nested: {count: 10, flag: true}}, xxx: [1,2], xxxset: new Set([1,2])});
        t.strictEqual(db.collections.test.size, 1);
        return db.collections.test.updateAndSave(item, {});
      })
      .then(res => {
        t.strictEqual(res, void 0);
        return db.collections.test.deleteAllAndSave();
      })
      .then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.test.size, 0);
      });
    }).catch(t.threw);
  });

  suite.test("should create database with simple relation", t => {
    t.plan(56);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bar: {hasOne: {collection: "bars"}}
      },
      bars: {
        counter: {type: "number", default: 0}
      }
    };
    var db = new DB({schema: schema});

    t.type(db, DB);

    t.strictSame(Object.getOwnPropertyNames(db.collections.foos[Symbol.for('schema')]), ['name', 'value', 'bar']);
    t.strictSame(db.collections.foos[Symbol.for('schema')].name, {
      "name": "name",
      "prop": "name",
      "required": true,
      "type": String
    });
    t.strictSame(db.collections.foos[Symbol.for('schema')].value, {
      "name": "value",
      "prop": "value",
      "required": false,
      "type": new Primitive()
    });
    t.strictSame(Object.getOwnPropertyNames(db.collections.foos[Symbol.for('schema')].bar),
      ['name', 'required', 'type', 'collection', 'klass', 'hasOne', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.name, "bar");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.prop, "bar");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.required, false);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.type, "bars");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.collection, db.collections.bars[Item.this]);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.hasOne, true);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.klass, db.collections.bars[Item.this][itemKlass$]);
    t.type(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].bar.writePropertySymbol, 'symbol');

    t.strictSame(Object.getOwnPropertyNames(db.collections.bars[Symbol.for('schema')]), ['counter']);
    t.strictSame(db.collections.bars[Symbol.for('schema')].counter, {
      "default": 0,
      "name": "counter",
      "prop": "counter",
      "required": false,
      "type": Number
    });

    t.strictEqual(db.collections.foos.size, 0);
    t.strictEqual(db.collections.bars.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid, fooid2 = genIdent();
      return db.collections.foos.createAndSave({name: "meh", value: -50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meh", value: -50});
        t.throws(() => { item.name = null; }, new TypeError('foos[].name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('foos[].value: property needs to be null, a string, a number or a boolean'));

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        fooid = item._id;
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: fooid, name: "meh", value: -50, bar: barid});
        t.deepEqual(item.bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(item.bar, db.collections.bars[barid]);
        return db.collections.foos.createAndSave({_id: fooid2, name: "woof!", bar: item.bar});
      })
      .then(item => {
        t.type(item, Item);
        t.notStrictEqual(item._id, fooid);
        t.strictEqual(item._id, fooid2);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "woof!", bar: barid});
        t.deepEqual(item.bar.toJSON(), {_id: barid, counter: 0});
        var bar = db.collections.bars[barid];
        t.strictEqual(item.bar, bar);
        var foo = db.collections.foos[fooid];
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "meh", value: -50, bar: barid});
        t.throws(() => { db.collections.bars.delete(foo) }, new TypeError('Ident: given constructor argument is not an ident'));
        return db.collections.bars.deleteAndSave(bar);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.bars[barid], undefined);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, undefined);
          t.strictEqual(item.toJSON().bar, undefined);
        }
        return db.collections.bars.replaceAndSave(barid, {counter: 42});
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 42});
        t.strictEqual(db.collections.bars[barid], bar);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, bar);
          t.strictEqual(item.toJSON().bar.toString(), barid);
        }
        t.strictEqual(db.collections.foos.size, 2);
        t.strictEqual(db.collections.bars.size, 1);
        delete db.collections.foos;
        db.collections.bars.deleteAll();
        return db.save();
      })
      .then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.foos.size, 0);
        t.strictEqual(db.collections.bars.size, 0);
      });
    }).catch(t.threw);
  });

  suite.end();
});
