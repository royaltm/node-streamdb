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

const { UniqueIndex } = require('../lib/collection/indexes');

const { UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with unique index", t => {
    t.plan(48+84);
    var db = new DB({schema: {
      test: {
        bool: {type: Boolean, unique: true},
        value: {unique: true},
        serial: {type: Number, unique: true},
        name: {type: String, unique: true, index: true},
        time: Date
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        bool: {type: Boolean, unique: true},
        value: {unique: true},
        serial: {type: Number, unique: true},
        name: {type: String, unique: true, index: true},
        time: {type: Date}
      }
    });

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')]),
      ['bool', 'value', 'serial', 'name', 'time']);

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].bool),
      ['name', 'required', 'type', 'unique', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.name, 'bool');
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.type, Boolean);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.prop, 'bool');
    t.strictSame(db.collections.test[Symbol.for('schema')].bool.unique, new UniqueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].bool.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].bool.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].value),
      ['name', 'required', 'type', 'unique', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.name, 'value');
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.type, new Primitive());
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.prop, 'value');
    t.strictSame(db.collections.test[Symbol.for('schema')].value.unique, new UniqueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].value.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].value.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].value.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].value.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].serial),
      ['name', 'required', 'type', 'unique', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.name, 'serial');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.type, Number);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.prop, 'serial');
    t.strictSame(db.collections.test[Symbol.for('schema')].serial.unique, new UniqueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].serial.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].serial.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].name),
      ['name', 'required', 'type', 'unique', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.name, 'name');
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.type, String);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.prop, 'name');
    t.strictSame(db.collections.test[Symbol.for('schema')].name.unique, new UniqueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].name.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].name.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].name.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].time),
      ['name', 'required', 'type', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.name, 'time');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.type, Date);
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.prop, 'time');
    t.notStrictEqual(db.collections.test[Symbol.for('schema')].time.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].time.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].time.readPropertySymbol, 'symbol');
    t.strictEqual(db.collections.test[Symbol.for('schema')].time.writePropertySymbol, undefined);

    t.strictEqual(db.collections.test.size, 0);

    db.stream.pipe(db.stream);

    var itemid;

    return db.writable.then(db => {
      itemid = db.collections.test.create({bool: true});
      return db.save();
    }).then(item => {
      t.type(item, Item);
      t.deepEqual(item.toJSON(), {_id: itemid, bool: true});
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.bool.get(undefined), undefined);
      t.strictEqual(db.collections.test.size, 1);
      return db.collections.test.createAndSave({bool: true, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.matches(err.message, /unique constraint violated: test\["[0-9a-f]{24}"\].bool = true/);
      t.strictEqual(err.conflictKey, true);
      t.type(err.constraintIndex, UniqueIndex);
      t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.test[itemid]);
      t.strictEqual(db.collections.test.size, 1);

      return db.collections.test.createAndSaveOrGetIfConflict({bool: true, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).then(item => {
      t.type(item, Item);
      t.deepEqual(item.toJSON(), {_id: itemid, bool: true});
      t.strictEqual(db.collections.test.size, 1);
      t.strictEqual(db.collections.test[0], db.collections.test[itemid])

      return db.collections.test.createAndSaveOrGetIfConflict({bool: false, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).then(item => {
      t.strictEqual(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bool: false, value: null, serial: 42, name: 'foo', time: new Date(2017,0,1).toJSON()});
      t.strictEqual(db.collections.test.by.bool.size, 2);
      t.strictEqual(db.collections.test.by.bool.get(false), item);
      t.notStrictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.bool.get(true), db.collections.test[itemid]);
      t.strictEqual(db.collections.test.by.value.get(null), item);
      t.strictEqual(db.collections.test.by.value.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.serial.get(42), item);
      t.strictEqual(db.collections.test.by.serial.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.name.get('foo'), item);
      t.strictEqual(db.collections.test.by.name.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.time, undefined);

      item = db.collections.test[itemid];
      item.value = 1;
      item.serial = 77;
      item.name = 'foo';
      item.time = new Date();
      return db.save();
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.strictEqual(err.message, `unique constraint violated: test["${itemid}"].name = foo`);
      t.strictEqual(err.conflictKey, 'foo');
      t.type(err.constraintIndex, UniqueIndex);
      t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.test[1]);
      t.strictEqual(db.collections.test.size, 2);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, value: 1, serial: 77});

      return db.collections.test.deleteAndSave(db.collections.test.by.bool.get(false));
    }).then(success => {
      t.strictEqual(db.collections.test.size, 1);
      t.strictEqual(success, true);
      var item = db.collections.test[itemid];
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false), undefined);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.value.get(1), item);
      t.strictEqual(db.collections.test.by.serial.get(77), item);
      t.strictEqual(db.collections.test.by.value.get(null), undefined);
      t.strictEqual(db.collections.test.by.value.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.serial.get(42), undefined);
      t.strictEqual(db.collections.test.by.serial.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.name.get('foo'), undefined);
      t.strictEqual(db.collections.test.by.name.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.time, undefined);
      item.name = 'foo';
      item.time = new Date(2016,10,30);
      return db.save();
    }).then(item => {
      t.strictEqual(db.collections.test.size, 1);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, value: 1, serial: 77, name: 'foo', time: new Date(2016,10,30).toJSON()});
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false), undefined);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.value.get(1), item);
      t.strictEqual(db.collections.test.by.serial.get(77), item);
      t.strictEqual(db.collections.test.by.value.get(null), undefined);
      t.strictEqual(db.collections.test.by.value.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.serial.get(42), undefined);
      t.strictEqual(db.collections.test.by.serial.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.name.get('foo'), item);
      t.strictEqual(db.collections.test.by.name.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.time, undefined);

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
      t.strictEqual(db.collections.test.by.bool.get(false), undefined);
      t.strictEqual(db.collections.test.by.bool.get(true), undefined);
      t.strictEqual(db.collections.test.by.value.size, 0);
      t.strictEqual(db.collections.test.by.value.get(1), undefined);
      t.strictEqual(db.collections.test.by.serial.size, 0);
      t.strictEqual(db.collections.test.by.serial.get(77), undefined);
      t.strictEqual(db.collections.test.by.value.get(null), undefined);
      t.strictEqual(db.collections.test.by.value.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.serial.get(42), undefined);
      t.strictEqual(db.collections.test.by.serial.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.name.size, 0);
      t.strictEqual(db.collections.test.by.name.get('foo'), undefined);
      t.strictEqual(db.collections.test.by.name.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.time, undefined);
    }).catch(t.threw);
  });

  suite.end();
});
