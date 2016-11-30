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

const { UniqueIndex, MultiValueIndex, CompositeUniqueIndex } = require('../lib/collection/indexes');

const { UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with composite unique index", t => {
    t.plan(47+85);
    var db = new DB({schema: {
      test: {
        bool: {type: Boolean, unique: true},
        serial: {type: Number},
        name: {type: String, index: true, unique: false},
        time: Date,
        multi: {unique: true, components: ["serial", "multi"]},
        duo: {unique: true, components: ["multi", "name"]},
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        bool: {type: Boolean, unique: true},
        serial: {type: Number},
        name: {type: String, index: true, unique: false},
        time: {type: Date},
        multi: {unique: true, components: ["serial", "multi"]},
        duo: {unique: true, components: ["multi", "name"]},
      }
    });

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')]),
      ['bool', 'serial', 'name', 'time', 'multi']);

    t.strictSame(db.collections.test[Symbol.for('schema')][Symbol.for("indexDescriptors")].map(d => d.name),
      ['multi', 'duo']);

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].bool),
      ['name', 'required', 'type', 'unique', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.name, 'bool');
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.type, Boolean);
    t.strictEquals(db.collections.test[Symbol.for('schema')].bool.prop, 'bool');
    t.strictSame(db.collections.test[Symbol.for('schema')].bool.unique, new UniqueIndex());
    t.strictSame(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].bool.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].bool.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].multi),
      ['name', 'required', 'type', 'prop', 'writePropertySymbol', 'readPropertySymbol',
       'indexName', 'indexComponentName', 'compositePropertySymbol', 'indexComponentIdx', 'indexComponentCount', 'unique']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].multi.name, 'multi');
    t.strictEquals(db.collections.test[Symbol.for('schema')].multi.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].multi.type, new Primitive());
    t.strictEquals(db.collections.test[Symbol.for('schema')].multi.prop, 'multi');
    t.notStrictEquals(db.collections.test[Symbol.for('schema')].multi.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].multi.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].multi.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].multi.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].serial),
      ['name', 'required', 'type', 'prop', 'writePropertySymbol', 'readPropertySymbol',
       'indexName', 'indexComponentName', 'compositePropertySymbol', 'indexComponentIdx', 'indexComponentCount', 'unique']);
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.name, 'serial');
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.required, false);
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.type, Number);
    t.strictEquals(db.collections.test[Symbol.for('schema')].serial.prop, 'serial');
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
    t.notStrictEquals(db.collections.test[Symbol.for('schema')].name.readPropertySymbol,
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
      t.strictEquals(db.collections.test.by.bool.get(true), item);
      t.strictEquals(db.collections.test.by.bool.get(undefined), undefined);
      t.strictEquals(db.collections.test.size, 1);
      return db.collections.test.createAndSave({bool: true, multi: 'm', serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.matches(err.message, /unique constraint violated: test\["[0-9a-f]{24}"\].bool = true/);
      t.strictEquals(db.collections.test.size, 1);
      return db.collections.test.createAndSave({bool: false, multi: 'm', serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).then(item => {
      t.strictEquals(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bool: false, multi: 'm', serial: 42, name: 'foo', time: new Date(2017,0,1).toJSON()});
      t.strictEquals(db.collections.test.by.bool.size, 2);
      t.strictEquals(db.collections.test.by.bool.get(false), item);
      t.notStrictEquals(db.collections.test.by.bool.get(true), item);
      t.strictEquals(db.collections.test.by.bool.get(true), db.collections.test[itemid]);
      t.strictEquals(db.collections.test.by.name.size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').first(), item);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);

      item = db.collections.test[itemid];
      item.serial = 42;
      item.name = 'foo';
      item.multi= 'm';
      item.time = new Date();
      return db.save();
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.strictEquals(err.message, `unique constraint violated: (multi) test["${itemid}"].multi = m`);
      t.strictEquals(db.collections.test.size, 2);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, serial: 42, name: 'foo'});
      t.strictEquals(db.collections.test.by.bool.size, 2);
      t.strictEquals(db.collections.test.by.bool.get(false), db.collections.test[1]);
      t.strictEquals(db.collections.test.by.bool.get(true), item);
      t.strictEquals(db.collections.test.by.name.size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 2);
      t.strictEquals(db.collections.test.by.name.get('foo').first(), db.collections.test[1]);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), [db.collections.test[1], item]);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);

      item = db.collections.test[itemid];
      item.serial = 77;
      item.name = 'goo';
      item.multi= 'm';
      item.name = 'foo';
      item.time = new Date();
      return db.save();
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.strictEquals(err.message, `unique constraint violated: (duo) test["${itemid}"].name = foo`);
      t.strictEquals(db.collections.test.size, 2);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, serial: 77, multi: 'm', name: 'goo'});
      t.strictEquals(db.collections.test.by.bool.size, 2);
      t.strictEquals(db.collections.test.by.bool.get(false), db.collections.test[1]);
      t.strictEquals(db.collections.test.by.bool.get(true), item);
      t.strictEquals(db.collections.test.by.name.size, 2);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').first(), db.collections.test[1]);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), [db.collections.test[1]]);
      t.strictEquals(db.collections.test.by.name.get('goo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('goo').first(), item);
      t.strictSame(db.collections.test.by.name.get('goo').toArray(), [item]);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      return db.collections.test.deleteAndSave(db.collections.test.by.bool.get(false));
    }).then(success => {
      t.strictEquals(success, true);
      t.strictEquals(db.collections.test.size, 1);
      var item = db.collections.test[itemid];
      t.strictEquals(db.collections.test.by.bool.size, 1);
      t.strictEquals(db.collections.test.by.bool.get(false), undefined);
      t.strictEquals(db.collections.test.by.bool.get(true), item);
      t.strictEquals(db.collections.test.by.name.get('goo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('goo').first(), item);
      t.strictSame(db.collections.test.by.name.get('goo').toArray(), [item]);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 0);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), []);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);

      item.name = 'foo';
      item.time = new Date(2016,10,30);
      return db.save();
    }).then(item => {
      t.strictEquals(db.collections.test.size, 1);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, serial: 77, multi: 'm', name: 'foo', time: new Date(2016,10,30).toJSON()});
      t.strictEquals(db.collections.test.by.bool.size, 1);
      t.strictEquals(db.collections.test.by.bool.get(false), undefined);
      t.strictEquals(db.collections.test.by.bool.get(true), item);
      t.strictEquals(db.collections.test.by.name.get('goo').size, 0);
      t.strictSame(db.collections.test.by.name.get('goo').toArray(), []);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 1);
      t.strictEquals(db.collections.test.by.name.get('foo').first(), item);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), [item]);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);

      delete item.bool;
      delete item.multi;
      delete item.serial;
      delete item.name;
      delete item.time;
      return db.save();
    }).then(item => {
      t.strictEquals(db.collections.test.size, 1);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid});
      t.strictEquals(db.collections.test.by.bool.size, 0);
      t.strictEquals(db.collections.test.by.bool.get(false), undefined);
      t.strictEquals(db.collections.test.by.bool.get(true), undefined);
      t.strictEquals(db.collections.test.by.name.size, 0);
      t.strictEquals(db.collections.test.by.name.get('goo').size, 0);
      t.strictSame(db.collections.test.by.name.get('goo').toArray(), []);
      t.strictEquals(db.collections.test.by.name.get('foo').size, 0);
      t.strictSame(db.collections.test.by.name.get('foo').toArray(), []);
      t.strictEquals(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEquals(db.collections.test.by.time, undefined);
    }).catch(t.threw);
  });

  suite.end();
});
