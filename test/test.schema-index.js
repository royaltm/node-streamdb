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

const { UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with index", t => {
    t.plan(48+108);
    var db = new DB({schema: {
      test: {
        bool: {type: Boolean, index: true},
        value: {index: true},
        serial: {type: Number, index: true},
        name: {type: String, index: true, unique: false},
        time: Date
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        bool: {type: Boolean, index: true},
        value: {index: true},
        serial: {type: Number, index: true},
        name: {type: String, index: true, unique: false},
        time: {type: Date}
      }
    });

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')]),
      ['bool', 'value', 'serial', 'name', 'time']);

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].bool),
      ['name', 'required', 'type', 'index', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.name, 'bool');
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.type, Boolean);
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.prop, 'bool');
    t.strictSame(db.collections.test[Symbol.for('schema')].bool.index, new MultiValueIndex());
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].bool.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].bool.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].value),
      ['name', 'required', 'type', 'index', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].value.name, 'value');
    t.strictEquals(db.collections.test[Symbol.for('schema')].value.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].value.type, new Primitive());
    t.strictEquals(db.collections.test[Symbol.for('schema')].value.prop, 'value');
    t.strictSame(db.collections.test[Symbol.for('schema')].value.index, new MultiValueIndex());
    t.strictEquals(db.collections.test[Symbol.for('schema')].value.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].value.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].value.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].value.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].serial),
      ['name', 'required', 'type', 'index', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.name, 'serial');
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.type, Number);
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.prop, 'serial');
    t.strictSame(db.collections.test[Symbol.for('schema')].serial.index, new MultiValueIndex());
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].serial.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].serial.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].name),
      ['name', 'required', 'type', 'index', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].name.name, 'name');
    t.strictEquals(db.collections.test[Symbol.for('schema')].name.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].name.type, String);
    t.strictEquals(db.collections.test[Symbol.for('schema')].name.prop, 'name');
    t.strictSame(db.collections.test[Symbol.for('schema')].name.index, new MultiValueIndex());
    t.strictEquals(db.collections.test[Symbol.for('schema')].name.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].name.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].name.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].name.writePropertySymbol, 'symbol');

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

    t.strictEquals(db.collections.test.size, 0);

    db.stream.pipe(db.stream);

    var itemid;

    return db.writable.then(db => {
      itemid = db.collections.test.create({bool: true});
      return db.save();
    }).then(item => {
      t.type(item, Item);
      t.deepEqual(item.toJSON(), {_id: itemid, bool: true});
      t.strictEquals(db.collections.test.by.bool.size, 1);
      t.strictEquals(db.collections.test.by.bool.get(true).size, 1);
      t.strictEquals(db.collections.test.by.bool.get(true).first(), item);
      t.strictEquals(db.collections.test.by.bool.get(undefined).size, 0);
      t.strictEquals(db.collections.test.size, 1);
      return db.collections.test.createAndSave({bool: true, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).then(item => {
      t.strictEquals(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bool: true, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1).toJSON()});
      t.strictEquals(db.collections.test.by.bool.size, 1);
      t.strictEquals(db.collections.test.by.bool.get(false).size, 0);
      t.strictEquals(db.collections.test.by.bool.get(true).size, 2);
      t.strictSame(db.collections.test.by.bool.get(true).toArray(), [db.collections.test[itemid], item]);
      t.strictEquals(db.collections.test.by.value.size, 1);
      t.strictEquals(db.collections.test.by.value.get(null).size, 1);
      t.strictEquals(db.collections.test.by.value.get(null).first(), item);
      t.strictEquals(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.serial.size, 1);
      t.strictEquals(db.collections.test.by.serial.get(42).size, 1);
      t.strictEquals(db.collections.test.by.serial.get(42).first(), item);
      t.strictEquals(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.name.size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').first(), item);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);

      item = db.collections.test[itemid];
      item.bool = false;
      item.value = 1;
      item.serial = 77;
      item.name = 'foo';
      item.time = new Date(2000,0,1);
      return db.save();
    }).then(item => {
      t.strictEquals(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: false, value: 1, serial: 77, name: 'foo', time: new Date(2000,0,1).toJSON()});
      t.strictEquals(item, db.collections.test[0]);
      t.type(db.collections.test[1], Item);
      t.notStrictEquals(item, db.collections.test[1]);
      t.strictEquals(db.collections.test.by.bool.size, 2);
      t.strictEquals(db.collections.test.by.bool.get(false).size, 1);
      t.strictEquals(db.collections.test.by.bool.get(false).first(), item);
      t.strictEquals(db.collections.test.by.bool.get(true).size, 1);
      t.strictEquals(db.collections.test.by.bool.get(true).first(), db.collections.test[1]);
      t.strictEquals(db.collections.test.by.value.size, 2);
      t.strictEquals(db.collections.test.by.value.get(null).size, 1);
      t.strictEquals(db.collections.test.by.value.get(null).first(), db.collections.test[1]);
      t.strictEquals(db.collections.test.by.value.get(1).size, 1);
      t.strictEquals(db.collections.test.by.value.get(1).first(), item);
      t.strictEquals(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.serial.size, 2);
      t.strictEquals(db.collections.test.by.serial.get(42).size, 1);
      t.strictEquals(db.collections.test.by.serial.get(42).first(), db.collections.test[1]);
      t.strictEquals(db.collections.test.by.serial.get(77).size, 1);
      t.strictEquals(db.collections.test.by.serial.get(77).first(), item);
      t.strictEquals(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.name.size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 2);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), [db.collections.test[1], item]);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);

      item.bool = true;
      return db.collections.test.deleteAndSave(db.collections.test[1]);
    }).then(success => {
      t.strictEquals(db.collections.test.size, 1);
      t.strictEquals(success, true);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, value: 1, serial: 77, name: 'foo', time: new Date(2000,0,1).toJSON()});
      t.strictEquals(item, db.collections.test[0]);
      t.strictEquals(db.collections.test[1], undefined);
      t.strictEquals(db.collections.test.by.bool.size, 1);
      t.strictEquals(db.collections.test.by.bool.get(false).size, 0);
      t.strictSame(db.collections.test.by.bool.get(false).toArray(), []);
      t.strictEquals(db.collections.test.by.bool.get(true).size, 1);
      t.strictEquals(db.collections.test.by.bool.get(true).first(), item);
      t.strictEquals(db.collections.test.by.value.size, 1);
      t.strictEquals(db.collections.test.by.value.get(null).size, 0);
      t.strictSame(db.collections.test.by.value.get(null).toArray(), []);
      t.strictEquals(db.collections.test.by.value.get(1).size, 1);
      t.strictEquals(db.collections.test.by.value.get(1).first(), item);
      t.strictEquals(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.serial.size, 1);
      t.strictEquals(db.collections.test.by.serial.get(42).size, 0);
      t.strictSame(db.collections.test.by.serial.get(42).toArray(), []);
      t.strictEquals(db.collections.test.by.serial.get(77).size, 1);
      t.strictEquals(db.collections.test.by.serial.get(77).first(), item);
      t.strictEquals(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.name.size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').first(), item);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), [item]);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);

      delete item.bool;
      delete item.value;
      delete item.serial;
      delete item.name;
      delete item.time;
      return db.save();
    }).then(item => {
      t.strictEquals(db.collections.test.size, 1);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid});
      t.strictEquals(db.collections.test.by.bool.size, 0);
      t.strictEquals(db.collections.test.by.bool.get(false).size, 0);
      t.strictSame(db.collections.test.by.bool.get(false).toArray(), []);
      t.strictEquals(db.collections.test.by.bool.get(true).size, 0);
      t.strictSame(db.collections.test.by.bool.get(true).toArray(), []);
      t.strictEquals(db.collections.test.by.value.size, 0);
      t.strictEquals(db.collections.test.by.value.get(null).size, 0);
      t.strictSame(db.collections.test.by.value.get(null).toArray(), []);
      t.strictEquals(db.collections.test.by.value.get(1).size, 0);
      t.strictSame(db.collections.test.by.value.get(1).toArray(), []);
      t.strictEquals(db.collections.test.by.value.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.serial.size, 0);
      t.strictEquals(db.collections.test.by.serial.get(42).size, 0);
      t.strictSame(db.collections.test.by.serial.get(42).toArray(), []);
      t.strictEquals(db.collections.test.by.serial.get(77).size, 0);
      t.strictSame(db.collections.test.by.serial.get(77).toArray(), []);
      t.strictEquals(db.collections.test.by.serial.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.name.size, 0);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 0);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), []);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);
    }).catch(t.threw);
  });

  suite.end();
});
