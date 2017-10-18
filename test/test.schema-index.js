"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const $this = Symbol.for('this');
const $itemKlass = require('../lib/collection/schema').itemKlassSym;
const isIdent = require('../lib/id').isIdent;
const Primitive = require('../lib/collection/schema/types').primitive;
const Enum = require('../lib/collection/schema/types').enum;

const { MultiValueIndex } = require('../lib/collection/indexes');

test("DB", suite => {

  suite.test("should create database with index", t => {
    t.plan(64+136);
    var db = new DB({schema: {
      test: {
        bool: {type: Boolean, index: true},
        value: {index: true},
        serial: {type: Number, index: true},
        name: {type: String, index: true, unique: false},
        time: {type: Date, index: true}
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        bool: {type: Boolean, index: true},
        value: {index: true},
        serial: {type: Number, index: true},
        name: {type: String, index: true, unique: false},
        time: {type: Date, index: true}
      }
    });

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')]),
      ['bool', 'value', 'serial', 'name', 'time']);

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].bool),
      ['name', 'required', 'type', 'writePropertySymbol', 'readPropertySymbol', 'indexName', 'index', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.name, 'bool');
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.type, Boolean);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.indexName, 'bool');
    t.strictSame(db.collections.test[Symbol.for('schema')].bool.index, new MultiValueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.prop, 'bool');
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].bool.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].bool.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].value),
      ['name', 'required', 'type', 'writePropertySymbol', 'readPropertySymbol', 'indexName', 'index', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.name, 'value');
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.type, new Primitive());
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.indexName, 'value');
    t.strictSame(db.collections.test[Symbol.for('schema')].value.index, new MultiValueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.prop, 'value');
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].value.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].value.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].value.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].serial),
      ['name', 'required', 'type', 'writePropertySymbol', 'readPropertySymbol', 'indexName', 'index', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.name, 'serial');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.type, Number);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.indexName, 'serial');
    t.strictSame(db.collections.test[Symbol.for('schema')].serial.index, new MultiValueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.prop, 'serial');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].serial.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].serial.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].name),
      ['name', 'required', 'type', 'writePropertySymbol', 'readPropertySymbol', 'indexName', 'index', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.name, 'name');
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.type, String);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.indexName, 'name');
    t.strictSame(db.collections.test[Symbol.for('schema')].name.index, new MultiValueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.prop, 'name');
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].name.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].name.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].name.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].time),
      ['name', 'required', 'type', 'writePropertySymbol', 'readPropertySymbol', 'index', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.name, 'time');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.type, Date);
    t.strictSame(db.collections.test[Symbol.for('schema')].time.index, new MultiValueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.prop, 'time');
    t.notStrictEqual(db.collections.test[Symbol.for('schema')].time.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].time.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].time.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].time.writePropertySymbol, 'symbol');

    {
      let descr = db.collections.test[Symbol.for('schema')][db.collections.test[Symbol.for('schema')].time.writePropertySymbol];

      t.strictSame(Object.keys(descr),
        ['name', 'readPropertySymbol', 'writePropertySymbol', 'indexName', 'index']);
      t.type(descr.name, 'symbol');
      t.type(descr.readPropertySymbol, 'symbol');
      t.type(descr.writePropertySymbol, 'symbol');
      t.strictEqual(descr.indexName, 'time');
      t.strictEqual(descr.index, db.collections.test[Symbol.for('schema')].time.index);
    }

    t.strictEqual(db.collections.test.size, 0);
    t.strictEqual(db.collections.test.by.bool.size, 0);
    t.strictEqual(db.collections.test.by.value.size, 0);
    t.strictEqual(db.collections.test.by.serial.size, 0);
    t.strictEqual(db.collections.test.by.name.size, 0);
    t.strictEqual(db.collections.test.by.time.size, 0);

    db.stream.pipe(db.stream);

    var itemid;

    return db.writable.then(db => {
      itemid = db.collections.test.create({bool: true});
      return db.save();
    }).then(item => {
      t.type(item, Item);
      t.deepEqual(item.toJSON(), {_id: itemid, bool: true});
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(true).size, 1);
      t.strictEqual(db.collections.test.by.bool.get(true).first(), item);
      t.strictEqual(db.collections.test.by.bool.get(undefined).size, 0);
      t.strictEqual(db.collections.test.size, 1);
      return db.collections.test.createAndSave({bool: true, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).then(item => {
      t.strictEqual(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bool: true, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1).toJSON()});
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false).size, 0);
      t.strictEqual(db.collections.test.by.bool.get(true).size, 2);
      t.strictEqual(db.collections.test.by.bool.get(true).toArray()[0], db.collections.test[itemid]);
      t.strictEqual(db.collections.test.by.bool.get(true).toArray()[1], item);
      t.strictEqual(db.collections.test.by.value.size, 1);
      t.strictEqual(db.collections.test.by.value.get(null).size, 1);
      t.strictEqual(db.collections.test.by.value.get(null).first(), item);
      t.strictEqual(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.serial.size, 1);
      t.strictEqual(db.collections.test.by.serial.get(42).size, 1);
      t.strictEqual(db.collections.test.by.serial.get(42).first(), item);
      t.strictEqual(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.name.size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), item);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time.size, 1);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1)).size, 1);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1).getTime()).first(), item);
      t.strictEqual(db.collections.test.by.time.get(0).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date()).size, 0);
      t.strictEqual(db.collections.test.by.time.get(undefined).size, 0);

      item = db.collections.test[itemid];
      item.bool = false;
      item.value = 1;
      item.serial = 77;
      item.name = 'foo';
      item.time = new Date(2000,0,1);
      return db.save();
    }).then(item => {
      t.strictEqual(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: false, value: 1, serial: 77, name: 'foo', time: new Date(2000,0,1).toJSON()});
      t.strictEqual(item, db.collections.test[0]);
      t.type(db.collections.test[1], Item);
      t.notStrictEqual(item, db.collections.test[1]);
      t.strictEqual(db.collections.test.by.bool.size, 2);
      t.strictEqual(db.collections.test.by.bool.get(false).size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false).first(), item);
      t.strictEqual(db.collections.test.by.bool.get(true).size, 1);
      t.strictEqual(db.collections.test.by.bool.get(true).first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.value.size, 2);
      t.strictEqual(db.collections.test.by.value.get(null).size, 1);
      t.strictEqual(db.collections.test.by.value.get(null).first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.value.get(1).size, 1);
      t.strictEqual(db.collections.test.by.value.get(1).first(), item);
      t.strictEqual(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.serial.size, 2);
      t.strictEqual(db.collections.test.by.serial.get(42).size, 1);
      t.strictEqual(db.collections.test.by.serial.get(42).first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.serial.get(77).size, 1);
      t.strictEqual(db.collections.test.by.serial.get(77).first(), item);
      t.strictEqual(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.name.size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 2);
      t.strictEqual(db.collections.test.by.name.get('foo').toArray()[0], db.collections.test[1]);
      t.strictEqual(db.collections.test.by.name.get('foo').toArray()[1], item);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time.size, 2);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1)).size, 1);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1).getTime()).first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.time.get(new Date(2000,0,1)).size, 1);
      t.strictEqual(db.collections.test.by.time.get(new Date(2000,0,1).getTime()).first(), item);
      t.strictEqual(db.collections.test.by.time.get(0).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date()).size, 0);
      t.strictEqual(db.collections.test.by.time.get(undefined).size, 0);

      item.bool = true;
      return db.collections.test.deleteAndSave(db.collections.test[1]);
    }).then(success => {
      t.strictEqual(db.collections.test.size, 1);
      t.strictEqual(success, true);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, value: 1, serial: 77, name: 'foo', time: new Date(2000,0,1).toJSON()});
      t.strictEqual(item, db.collections.test[0]);
      t.strictEqual(db.collections.test[1], undefined);
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false).size, 0);
      t.strictSame(db.collections.test.by.bool.get(false).toArray(), []);
      t.strictEqual(db.collections.test.by.bool.get(true).size, 1);
      t.strictEqual(db.collections.test.by.bool.get(true).first(), item);
      t.strictEqual(db.collections.test.by.value.size, 1);
      t.strictEqual(db.collections.test.by.value.get(null).size, 0);
      t.strictSame(db.collections.test.by.value.get(null).toArray(), []);
      t.strictEqual(db.collections.test.by.value.get(1).size, 1);
      t.strictEqual(db.collections.test.by.value.get(1).first(), item);
      t.strictEqual(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.serial.size, 1);
      t.strictEqual(db.collections.test.by.serial.get(42).size, 0);
      t.strictSame(db.collections.test.by.serial.get(42).toArray(), []);
      t.strictEqual(db.collections.test.by.serial.get(77).size, 1);
      t.strictEqual(db.collections.test.by.serial.get(77).first(), item);
      t.strictEqual(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.name.size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), item);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), [item]);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time.size, 1);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1)).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1).getTime()).toArray().length, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date(2000,0,1)).size, 1);
      t.strictEqual(db.collections.test.by.time.get(new Date(2000,0,1).getTime()).first(), item);
      t.strictEqual(db.collections.test.by.time.get(0).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date()).size, 0);
      t.strictEqual(db.collections.test.by.time.get(undefined).size, 0);

      delete item.bool;
      delete item.value;
      delete item.serial;
      delete item.name;
      delete item.time;
      return db.save();
    }).then(item => {
      t.strictEqual(db.collections.test.size, 1);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid});
      t.strictEqual(db.collections.test.by.bool.size, 0);
      t.strictEqual(db.collections.test.by.bool.get(false).size, 0);
      t.strictSame(db.collections.test.by.bool.get(false).toArray(), []);
      t.strictEqual(db.collections.test.by.bool.get(true).size, 0);
      t.strictSame(db.collections.test.by.bool.get(true).toArray(), []);
      t.strictEqual(db.collections.test.by.value.size, 0);
      t.strictEqual(db.collections.test.by.value.get(null).size, 0);
      t.strictSame(db.collections.test.by.value.get(null).toArray(), []);
      t.strictEqual(db.collections.test.by.value.get(1).size, 0);
      t.strictSame(db.collections.test.by.value.get(1).toArray(), []);
      t.strictEqual(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.serial.size, 0);
      t.strictEqual(db.collections.test.by.serial.get(42).size, 0);
      t.strictSame(db.collections.test.by.serial.get(42).toArray(), []);
      t.strictEqual(db.collections.test.by.serial.get(77).size, 0);
      t.strictSame(db.collections.test.by.serial.get(77).toArray(), []);
      t.strictEqual(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.name.size, 0);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 0);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), []);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time.size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1)).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date(2017,0,1).getTime()).toArray().length, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date(2000,0,1)).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date(2000,0,1).getTime()).toArray().length, 0);
      t.strictEqual(db.collections.test.by.time.get(0).size, 0);
      t.strictEqual(db.collections.test.by.time.get(new Date()).size, 0);
      t.strictEqual(db.collections.test.by.time.get(undefined).size, 0);
    }).catch(t.threw);
  });

  suite.end();
});
