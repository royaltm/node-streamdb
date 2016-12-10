"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const { thisSym: this$ } = require('../lib/collection/symbols');

const itemKlass$ = Symbol.for("itemKlass");

const Primitive = require('../lib/collection/schema/types').primitive;
const Enum = require('../lib/collection/schema/types').enum;
const Blob = require('../lib/collection/schema/types').blob;

test("DB", suite => {

  suite.test("should create database with type constraint schema", t => {
    t.plan(18+34+2);
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

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')]),
      ['name', 'time', 'other.nested.count', 'other', 'other.nested', 'other.nested.flag']);
    t.strictSame(db.collections.test[Symbol.for('schema')].name, {
      name: 'name',
      required: false,
      type: String,
      prop: 'name'
    });
    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].time),
      ['name', 'required', 'type', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.name, 'time');
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.type, Date);
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.prop, 'time');
    t.notStrictEquals(db.collections.test[Symbol.for('schema')].time.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].time.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].time.readPropertySymbol, 'symbol');
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.writePropertySymbol, undefined);
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested.count'], {
      name: 'other.nested.count',
      required: false,
      type: Number,
      prop: 'other.nested.count'
    });
    t.strictSame(db.collections.test[Symbol.for('schema')].other, {
      'nested.count':
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
          prop: 'nested.flag' }
    });
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested'], {
      count:
      { name: 'other.nested.count',
        required: false,
        type: Number,
        prop: 'count' },
      flag:
      { name: 'other.nested.flag',
        required: false,
        type: Boolean,
        prop: 'flag' }
    });
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested.flag'], {
      name: 'other.nested.flag',
      required: false,
      type: Boolean,
      prop: 'other.nested.flag'
    });

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      return db.collections.test.createAndSave({name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}})
      .then(item => {
        t.type(item, Item);
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
        t.deepEqual(item.toJSON(), {_id: item._id, other: {nested: {}}});
      });
    }).catch(t.threw);
  });

  suite.test("should create database with default constraint schema", t => {
    t.plan(61);
    var schema = {
      test: {
        name: {type: "string", default: "foo"},
        enum: {type: "enum", enum: ["foo", "bar"], default: "bar"},
        blob: {type: "blob", encoding: "hex", default: {function: 'Buffer.alloc(0)'}},
        scal: { type: 'primitive', required: true},
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

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')]),
      ['name', 'enum', 'blob', 'scal', 'time', 'other.nested.count', 'other', 'other.nested', 'other.nested.flag']);

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
    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].blob), 
      ['name', 'required', 'type', 'default', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].blob.name, "blob");
    t.strictEquals(db.collections.test[Symbol.for('schema')].blob.prop, "blob");
    t.strictEquals(db.collections.test[Symbol.for('schema')].blob.required, false);
    t.strictSame(db.collections.test[Symbol.for('schema')].blob.type, new Blob({encoding: "hex"}));
    t.type(db.collections.test[Symbol.for('schema')].blob.default, 'function');
    t.strictEquals(db.collections.test[Symbol.for('schema')].blob.default.toString(), '() => Buffer.alloc(0)');
    t.strictSame(db.collections.test[Symbol.for('schema')].scal, {
      "name": "scal",
      "prop": "scal",
      "required": true,
      "type": new Primitive()
    });
    t.strictSame(db.collections.test[Symbol.for('schema')].other, {
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
    t.strictSame(db.collections.test[Symbol.for('schema')]['other.nested'], {
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
    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].time),
      ['name', 'required', 'type', 'default', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.name, 'time');
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.type, Date);
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.prop, 'time');
    t.notStrictEquals(db.collections.test[Symbol.for('schema')].time.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].time.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].time.readPropertySymbol, 'symbol');
    t.strictEquals(db.collections.test[Symbol.for('schema')].time.writePropertySymbol, undefined);

    t.type(db, DB);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.test.createAndSave({scal: null})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'bar', blob: Buffer.alloc(0), scal: null, time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        delete item.name;
        delete item.time;
        delete item.other;
        item.scal = 1;
        item.other.nested.count = 42;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'bar', blob: Buffer.alloc(0), scal: 1, time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: true}}});
        item.enum = "foo";
        item.blob = "deadbaca";
        item.scal = "xxx";
        item.other.nested.flag = false;
        item.unschemed = "rarara";
        t.throws(() => { item.blob = "foo"; }, new TypeError('Invalid hex string'));
        t.throws(() => { item.blob = null; }, new TypeError('blob: property needs to be a buffer or a properly encoded string'));
        t.throws(() => { item.other.nested.flag = null; }, new TypeError('other.nested.flag: property needs to be a boolean'));
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: 'foo', blob: Buffer.from('deadbaca', 'hex'), scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: false}}, unschemed: "rarara"});
        t.throws(() => { item.enum = "baz"; }, new TypeError('enum: property needs to be one of: foo|bar'));
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { delete item.scal; }, new TypeError('scal: property is required'));
        return db.collections.test.replaceAndSave(item._id, {scal: true, name: "baz", time: 0, enum: "bar", blob: Buffer.from([1,2,3,4])});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'baz', enum: "bar", blob: Buffer.from([1,2,3,4]), scal: true, time: new Date(0), other: {nested: {count: 10, flag: true}}});
        t.throws(() => db.collections.test.replace(item._id, {}), new TypeError('scal: property is required'));
        db.collections.test.add(item, 'name', 'zzz')
        db.collections.test.add(item, 'time', +new Date(2016, 10, 25, 11, 45, 42, 500))
        db.collections.test.add(item, 'other.nested.count', 101);
        t.throws(() => db.collections.test.add(item, 'enum', null), new TypeError("enum: Enum forbids element operation"));
        t.throws(() => db.collections.test.add(item, 'blob', null), new TypeError("blob: Blob forbids element operation"));
        t.throws(() => db.collections.test.add(item, 'scal', null), new TypeError("scal: Primitive forbids element operation"));
        delete item.enum;
        delete item.blob;
        item.xxx = [1,'3',2];
        item.xxxset = new Set([1,3,2]);
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'bazzzz', enum: "bar", blob: Buffer.alloc(0), scal: true, time: new Date(2016, 10, 25, 11, 45, 42, 500), other: {nested: {count: 111, flag: true}}, xxx: [1,'3',2], xxxset: [1,3,2]});
        db.collections.test.subtract(item, 'name', 'baz')
        db.collections.test.subtract(item, 'time', +new Date(2016, 10, 25, 11, 45, 42, 500))
        db.collections.test.subtract(item, 'other.nested.count', 101);
        db.collections.test.pull(item, 'xxx', '3');
        db.collections.test.pull(item, 'xxxset', 3);
        t.throws(() => db.collections.test.subtract(item, 'enum', null), new TypeError("enum: Enum forbids element operation"));
        t.throws(() => db.collections.test.subtract(item, 'blob', null), new TypeError("blob: Blob forbids element operation"));
        t.throws(() => db.collections.test.subtract(item, 'scal', null), new TypeError("scal: Primitive forbids element operation"));
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'zzz', enum: "bar", blob: Buffer.alloc(0), scal: true, time: new Date(0), other: {nested: {count: 10, flag: true}}, xxx: [1,2], xxxset: [1,2]});

        t.strictEqual(db.collections.test.size, 1);
        return db.collections.test.deleteAllAndSave();
      })
      .then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.test.size, 0);
      });
    }).catch(t.threw);
  });

  suite.test("should create database with simple relation", t => {
    t.plan(54);
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

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')]), ['name', 'value', 'bar']);
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
    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')].bar),
      ['name', 'required', 'type', 'collection', 'klass', 'hasOne', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.name, "bar");
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.prop, "bar");
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.required, false);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.type, "bars");
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.collection, db.collections.bars[this$]);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.hasOne, true);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bar.klass, db.collections.bars[this$][itemKlass$]);
    t.type(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].bar.writePropertySymbol, 'symbol');

    t.strictSame(db.collections.bars[Symbol.for('schema')], {
      "counter": {
        "default": 0,
        "name": "counter",
        "prop": "counter",
        "required": false,
        "type": Number,
      }
    });

    t.strictEqual(db.collections.foos.size, 0);
    t.strictEqual(db.collections.bars.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid;
      return db.collections.foos.createAndSave({name: "meh", value: -50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meh", value: -50});
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be a primitive'));

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        fooid = item._id;
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: fooid, name: "meh", value: -50, bar: barid});
        t.deepEqual(item.bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(item.bar, db.collections.bars[barid]);
        return db.collections.foos.createAndSave({name: "woof!", bar: item.bar});
      })
      .then(item => {
        t.type(item, Item);
        t.notStrictEqual(item._id, fooid);
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
