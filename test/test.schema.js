"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

test("DB", suite => {

  suite.test("should create database with type constraint schema", t => {
    t.plan(5+34+2);
    var db = new DB({schema: {
      test: {
        name: String,
        time: Date,
        'other.nested.count': Number,
        'other.nested.flag': Boolean
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        name: {type: String},
        time: {type: Date},
        'other.nested.count': {type: Number},
        'other.nested.flag': {type: Boolean}
      }
    });

    t.deepEqual(db.collections.test[Symbol.for('schema')], {
      name:
        { name: 'name',
          required: false,
          type: String,
          prop: 'name' },
      time:
        { name: 'time',
          required: false,
          type: Date,
          prop: 'time' },
      'other.nested.count':
        { name: 'other.nested.count',
          required: false,
          type: Number,
          prop: 'other.nested.count' },
      other:
        { 'nested.count':
          { name: 'other.nested.count',
            required: false,
            type: Number,
            prop: 'nested.count' },
          nested:
            { count:
                { name: 'other.nested.count',
                  required: false,
                  type: Number,
                  prop: 'count' },
              flag:
                { name: 'other.nested.flag',
                  required: false,
                  type: Boolean,
                  prop: 'flag' } },
          'nested.flag':
            { name: 'other.nested.flag',
              required: false,
              type: Boolean,
              prop: 'nested.flag' } },
      'other.nested':
        { count:
          { name: 'other.nested.count',
            required: false,
            type: Number,
            prop: 'count' },
          flag:
          { name: 'other.nested.flag',
            required: false,
            type: Boolean,
            prop: 'flag' } },
      'other.nested.flag':
        { name: 'other.nested.flag',
          required: false,
          type: Boolean,
          prop: 'other.nested.flag' }
      });

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      return db.collections.test.createAndSave({name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}})
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        t.throws(() => { item.name = 123; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = []; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = {}; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = Symbol("asd"); }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = true; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = false; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = null; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = NaN; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = new Date; }, new TypeError("name: property needs to be a string"));
        delete item.name;
        t.throws(() => { item.time = ""; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = "foo"; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = []; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = {}; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = Symbol("asd"); }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = true; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = false; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = NaN; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = null; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        delete item.time;
        t.throws(() => { item.other.nested.count = ""; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = []; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = {}; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = Symbol("asd"); }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = true; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = false; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = null; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = new Date; }, new TypeError("other.nested.count: property needs to be a number"));
        delete item.other.nested.count;
        t.throws(() => { item.other.nested.flag = ""; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = []; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = {}; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = Symbol("asd"); }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = NaN; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = 0; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = null; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = new Date; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        delete item.other.nested.flag;
        return db.save();
      })
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, name: undefined, time: undefined, other: {nested: {count: undefined, flag: undefined}}});
      });
    }).catch(t.throws);
  });

  suite.test("should create database with default constraint schema", t => {
    t.plan(17);
    var schema = {
      test: {
        name: {type: "string", default: "foo"},
        enum: {type: "enum", enum: ["foo", "bar"]},
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
    t.notStrictEqual(db.schema.test['other.nested.count'], schema.test['other.nested.count']);
    t.notStrictEqual(db.schema.test['other.nested.flag'], schema.test['other.nested.flag']);

    t.deepEqual(db.schema, {
      test: {
        name: { type: 'string', default: 'foo' },
        enum: { type: 'enum', enum: ['foo', 'bar']},
        time: { type: 'date', default: "() => new Date(2016,6,12,20,42)" },
        'other.nested.count': { type: 'number', default: 10 },
        'other.nested.flag': { type: 'boolean', default: true }
      }
    });

    t.deepEqual(db.collections.test[Symbol.for('schema')], {
      "name": {
        "default": "foo",
        "name": "name",
        "prop": "name",
        "required": false,
        "type": String,
      },
      "enum": {
        "name": "enum",
        "prop": "enum",
        "required": false,
        "type": {enums: {}}
      },
      "other": {
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
          },
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
        },
      },
      "other.nested": {
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
      },
      "other.nested.count": {
        "default": 10,
        "name": "other.nested.count",
        "prop": "other.nested.count",
        "required": false,
        "type": Number,
      },
      "other.nested.flag": {
        "default": true,
        "name": "other.nested.flag",
        "prop": "other.nested.flag",
        "required": false,
        "type": Boolean,
      },
      "time": {
        "default": "() => new Date(2016,6,12,20,42)",
        "name": "time",
        "prop": "time",
        "required": false,
        "type": Date,
      }
    });

    t.type(db, DB);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.test.createAndSave()
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: null, time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        delete item.name;
        delete item.time;
        delete item.other;
        return db.save();
      })
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: null, time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        item.enum = "bar";
        return db.save();
      })
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: "bar", time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        t.throws(() => { item.enum = "baz"; }, new TypeError('enum: property needs to be one of: "foo","bar"'));
      });
    }).catch(t.throws);
  });

  suite.end();
});
