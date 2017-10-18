"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const { thisSym: this$ } = require('../lib/collection/symbols');

const Primitive = require('../lib/collection/schema/types').primitive;

const { UniqueIndex, MultiValueIndex, CompositeUniqueIndex } = require('../lib/collection/indexes');

const { UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with composite unique index", t => {
    t.plan(61+183);
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
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.name, 'bool');
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.type, Boolean);
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.prop, 'bool');
    t.strictSame(db.collections.test[Symbol.for('schema')].bool.unique, new UniqueIndex());
    t.strictEqual(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].bool.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].bool.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].bool.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].multi),
      ['name', 'required', 'type', 'prop', 'writePropertySymbol', 'readPropertySymbol',
       'indexName', 'indexComponentName', 'compositePropertySymbol', 'indexComponentIdx', 'indexComponentCount', 'compositeUnique']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.name, 'multi');
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.type, new Primitive());
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.prop, 'multi');
    t.notStrictEqual(db.collections.test[Symbol.for('schema')].multi.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].multi.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].multi.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].multi.writePropertySymbol, 'symbol');
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.indexName, 'multi');
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.indexComponentName, 'multi');
    t.type(db.collections.test[Symbol.for('schema')].multi.compositePropertySymbol, 'symbol');
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.indexComponentIdx, 1);
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.indexComponentCount, 2);
    t.strictSame(db.collections.test[Symbol.for('schema')].multi.compositeUnique, new CompositeUniqueIndex(2));

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].serial),
      ['name', 'required', 'type', 'prop', 'writePropertySymbol', 'readPropertySymbol',
       'indexName', 'indexComponentName', 'compositePropertySymbol', 'indexComponentIdx', 'indexComponentCount', 'compositeUnique']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.name, 'serial');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.type, Number);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.prop, 'serial');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol,
      db.collections.test[Symbol.for('schema')].serial.writePropertySymbol);
    t.type(db.collections.test[Symbol.for('schema')].serial.readPropertySymbol, 'symbol');
    t.type(db.collections.test[Symbol.for('schema')].serial.writePropertySymbol, 'symbol');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.indexName, 'multi');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.indexComponentName, 'serial');
    t.type(db.collections.test[Symbol.for('schema')].serial.compositePropertySymbol, 'symbol');
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.indexComponentIdx, 0);
    t.strictEqual(db.collections.test[Symbol.for('schema')].serial.indexComponentCount, 2);
    t.strictSame(db.collections.test[Symbol.for('schema')].serial.compositeUnique, new CompositeUniqueIndex(2));

    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.compositeUnique,
                   db.collections.test[Symbol.for('schema')].serial.compositeUnique);
    t.strictEqual(db.collections.test[Symbol.for('schema')].multi.compositePropertySymbol,
                   db.collections.test[Symbol.for('schema')].serial.compositePropertySymbol);

    t.strictSame(Object.keys(db.collections.test[Symbol.for('schema')].name),
      ['name', 'required', 'type', 'index', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.name, 'name');
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.required, false);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.type, String);
    t.strictEqual(db.collections.test[Symbol.for('schema')].name.prop, 'name');
    t.strictSame(db.collections.test[Symbol.for('schema')].name.index, new MultiValueIndex());
    t.notStrictEqual(db.collections.test[Symbol.for('schema')].name.readPropertySymbol,
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
      t.strictEqual(db.collections.test.size, 1);
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.bool.get(undefined), undefined);
      t.strictEqual(db.collections.test.by.multi.size, 0);
      t.strictEqual(db.collections.test.by.duo.size, 0);
      return db.collections.test.createAndSave({bool: true, multi: 'm', serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.matches(err.message, /unique constraint violated: test\["[0-9a-f]{24}"\].bool = true/);
      t.strictEqual(err.conflictKey, true);
      t.type(err.constraintIndex, UniqueIndex);
      t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.test[itemid]);
      t.strictEqual(db.collections.test.size, 1);
      return db.collections.test.createAndSave({bool: false, multi: 'm', serial: 42, name: 'foo', time: new Date(2017,0,1)});
    }).then(item => {
      t.strictEqual(db.collections.test.size, 2);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bool: false, multi: 'm', serial: 42, name: 'foo', time: new Date(2017,0,1).toJSON()});
      t.strictEqual(db.collections.test.by.bool.size, 2);
      t.strictEqual(db.collections.test.by.bool.get(false), item);
      t.notStrictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.bool.get(true), db.collections.test[itemid]);
      t.strictEqual(db.collections.test.by.name.size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), item);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time, undefined);
      t.strictEqual(db.collections.test.by.multi.size, 1);
      t.strictEqual(db.collections.test.by.multi.toArray()[0], item);
      t.strictEqual(db.collections.test.by.multi.get(42, 'm'), item);
      t.strictEqual(db.collections.test.by.multi.get(42).count(), 1);
      t.strictEqual(db.collections.test.by.multi.get(42).toArray()[0], item);
      t.strictEqual(db.collections.test.by.duo.size, 1);
      t.strictEqual(db.collections.test.by.duo.count(), 1);
      t.strictEqual(db.collections.test.by.duo.toArray()[0], item);
      t.strictEqual(db.collections.test.by.duo.get('m', 'foo'), item);
      t.strictEqual(db.collections.test.by.duo.get('m').count(), 1);
      t.strictEqual(db.collections.test.by.duo.get('m').toArray()[0], item);

      item = db.collections.test[itemid];
      item.serial = 42;
      item.name = 'foo';
      item.multi= 'm';
      item.time = new Date();
      return db.save();
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.strictEqual(err.message, `unique constraint violated: multi(42,m) test["${itemid}"].multi = m`);
      t.strictSame(err.conflictKey, [42, "m"]);
      t.type(err.constraintIndex, CompositeUniqueIndex);
      t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.test[1]);
      t.strictEqual(db.collections.test.size, 2);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, serial: 42, name: 'foo'});
      t.strictEqual(db.collections.test.by.bool.size, 2);
      t.strictEqual(db.collections.test.by.bool.get(false), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.name.size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 2);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.name.get('foo').count(), 2);
      t.strictEqual(db.collections.test.by.name.get('foo').toArray()[1], item);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.multi.size, 1);
      t.strictEqual(db.collections.test.by.multi.count(), 2);
      t.strictEqual(db.collections.test.by.multi.first(), item);
      t.strictEqual(db.collections.test.by.multi.toArray()[1], db.collections.test[1]);
      t.strictEqual(db.collections.test.by.multi.get(42, 'm'), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.multi.get(42).count(), 2);
      t.strictEqual(db.collections.test.by.multi.get(42).first(), item);
      t.strictEqual(db.collections.test.by.multi.get(42).toArray()[1], db.collections.test[1]);
      t.strictEqual(db.collections.test.by.duo.size, 1);
      t.strictEqual(db.collections.test.by.duo.count(), 1);
      t.strictEqual(db.collections.test.by.duo.first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.duo.get('m', 'foo'), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.duo.get('m').count(), 1);
      t.strictEqual(db.collections.test.by.duo.get('m').first(), db.collections.test[1]);

      item = db.collections.test[itemid];
      item.serial = 77;
      item.name = 'goo';
      item.multi= 'm';
      item.name = 'foo';
      item.time = new Date();
      return db.save();
    }).catch(err => {
      t.type(err, UniqueConstraintViolationError);
      t.strictEqual(err.message, `unique constraint violated: duo(m,foo) test["${itemid}"].name = foo`);
      t.strictSame(err.conflictKey, ["m", "foo"]);
      t.type(err.constraintIndex, CompositeUniqueIndex);
      t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.test[1]);
      t.strictEqual(db.collections.test.size, 2);
      var item = db.collections.test[itemid];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, serial: 77, multi: 'm', name: 'goo'});
      t.strictEqual(db.collections.test.by.bool.size, 2);
      t.strictEqual(db.collections.test.by.bool.get(false), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.name.size, 2);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.name.get('foo').count(), 1);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.name.get('goo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('goo').first(), item);
      t.strictEqual(db.collections.test.by.name.get('goo').toArray()[0], item);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.multi.size, 2);
      t.strictEqual(db.collections.test.by.multi.count(), 2);
      t.strictEqual(db.collections.test.by.multi.first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.multi.toArray()[1], item);
      t.strictEqual(db.collections.test.by.multi.get(42, 'm'), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.multi.get(42).count(), 1);
      t.strictEqual(db.collections.test.by.multi.get(42).first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.multi.get(77, 'm'), item);
      t.strictEqual(db.collections.test.by.multi.get(77).count(), 1);
      t.strictEqual(db.collections.test.by.multi.get(77).first(), item);
      t.strictEqual(db.collections.test.by.duo.size, 1);
      t.strictEqual(db.collections.test.by.duo.count(), 2);
      t.strictEqual(db.collections.test.by.duo.first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.duo.toArray()[1], item);
      t.strictEqual(db.collections.test.by.duo.get('m', 'foo'), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.duo.get('m', 'goo'), item);
      t.strictEqual(db.collections.test.by.duo.get('m').count(), 2);
      t.strictEqual(db.collections.test.by.duo.get('m').first(), db.collections.test[1]);
      t.strictEqual(db.collections.test.by.duo.get('m').toArray()[1], item);

      return db.collections.test.deleteAndSave(db.collections.test.by.bool.get(false));
    }).then(success => {
      t.strictEqual(success, true);
      t.strictEqual(db.collections.test.size, 1);
      var item = db.collections.test[itemid];
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false), undefined);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.name.get('goo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('goo').count(), 1);
      t.strictEqual(db.collections.test.by.name.get('goo').first(), item);
      t.strictEqual(db.collections.test.by.name.get('goo').count(), 1);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 0);
      t.strictEqual(db.collections.test.by.name.get('foo').count(), 0);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time, undefined);
      t.strictEqual(db.collections.test.by.multi.size, 1);
      t.strictEqual(db.collections.test.by.multi.first(), item);
      t.strictEqual(db.collections.test.by.multi.get(42, 'm'), undefined);
      t.strictEqual(db.collections.test.by.multi.get(42).count(), 0);
      t.strictEqual(db.collections.test.by.multi.get(77, 'm'), item);
      t.strictEqual(db.collections.test.by.multi.get(77).count(), 1);
      t.strictEqual(db.collections.test.by.multi.get(77).first(), item);
      t.strictEqual(db.collections.test.by.duo.size, 1);
      t.strictEqual(db.collections.test.by.duo.count(), 1);
      t.strictEqual(db.collections.test.by.duo.first(), item);
      t.strictEqual(db.collections.test.by.duo.get('m', 'foo'), undefined);
      t.strictEqual(db.collections.test.by.duo.get('m', 'goo'), item);
      t.strictEqual(db.collections.test.by.duo.get('m').count(), 1);
      t.strictEqual(db.collections.test.by.duo.get('m').first(), item);

      item.name = 'foo';
      item.time = new Date(2016,10,30);
      return db.save();
    }).then(item => {
      t.strictEqual(db.collections.test.size, 1);
      t.type(item, Item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: itemid, bool: true, serial: 77, multi: 'm', name: 'foo', time: new Date(2016,10,30).toJSON()});
      t.strictEqual(db.collections.test.by.bool.size, 1);
      t.strictEqual(db.collections.test.by.bool.get(false), undefined);
      t.strictEqual(db.collections.test.by.bool.get(true), item);
      t.strictEqual(db.collections.test.by.name.get('goo').size, 0);
      t.strictEqual(db.collections.test.by.name.get('goo').count(), 0);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 1);
      t.strictEqual(db.collections.test.by.name.get('foo').count(), 1);
      t.strictEqual(db.collections.test.by.name.get('foo').first(), item);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.multi.size, 1);
      t.strictEqual(db.collections.test.by.multi.count(), 1);
      t.strictEqual(db.collections.test.by.multi.first(), item);
      t.strictEqual(db.collections.test.by.multi.get(42, 'm'), undefined);
      t.strictEqual(db.collections.test.by.multi.get(42).count(), 0);
      t.strictEqual(db.collections.test.by.multi.get(77, 'm'), item);
      t.strictEqual(db.collections.test.by.multi.get(77).count(), 1);
      t.strictEqual(db.collections.test.by.multi.get(77).first(), item);
      t.strictEqual(db.collections.test.by.duo.size, 1);
      t.strictEqual(db.collections.test.by.duo.count(), 1);
      t.strictEqual(db.collections.test.by.duo.first(), item);
      t.strictEqual(db.collections.test.by.duo.get('m', 'foo'), item);
      t.strictEqual(db.collections.test.by.duo.get('m', 'goo'), undefined);
      t.strictEqual(db.collections.test.by.duo.get('m').count(), 1);
      t.strictEqual(db.collections.test.by.duo.get('m').first(), item);

      delete item.bool;
      delete item.multi;
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
      t.strictEqual(db.collections.test.by.name.size, 0);
      t.strictEqual(db.collections.test.by.name.get('goo').size, 0);
      t.strictEqual(db.collections.test.by.name.get('goo').count(), 0);
      t.strictEqual(db.collections.test.by.name.get('foo').size, 0);
      t.strictEqual(db.collections.test.by.name.get('foo').count(), 0);
      t.strictEqual(db.collections.test.by.name.get(undefined).size, 0);
      t.strictEqual(db.collections.test.by.time, undefined);
      t.strictEqual(db.collections.test.by.multi.size, 0);
      t.strictEqual(db.collections.test.by.multi.count(), 0);
      t.strictEqual(db.collections.test.by.multi.get(42, 'm'), undefined);
      t.strictEqual(db.collections.test.by.multi.get(42).count(), 0);
      t.strictEqual(db.collections.test.by.multi.get(77, 'm'), undefined);
      t.strictEqual(db.collections.test.by.multi.get(77).count(), 0);
      t.strictEqual(db.collections.test.by.duo.size, 0);
      t.strictEqual(db.collections.test.by.duo.count(), 0);
      t.strictEqual(db.collections.test.by.duo.get('m', 'foo'), undefined);
      t.strictEqual(db.collections.test.by.duo.get('m', 'goo'), undefined);
      t.strictEqual(db.collections.test.by.duo.get('m').count(), 0);
    }).catch(t.threw);
  });

  suite.test("should create database with composite unique index over relations", t => {
    t.plan(87 + 521);
    var db = new DB({schema: {
      foos: {
        bar: {hasOne: {collection: "bars", hasMany: "foos"}},
        barone: {hasOne: {collection: "bars", hasOne: "foo"}},
        barsome: {hasOne: {collection: "bars"}},
        barattr: {unique: true, components: ["bar", "attr"]},
        bartrip: {unique: true, components: ["bar", "barone", "barsome"]},
        bargrip: {unique: true, components: ["bar", "barsome"]},
      },
      bars: {
        value: {type: Number, unique: true, required: true}
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      foos: {
        bar: {hasOne: {collection: "bars", hasMany: "foos"}},
        barone: {hasOne: {collection: "bars", hasOne: "foo"}},
        barsome: {hasOne: {collection: "bars"}},
        barattr: {unique: true, components: ["bar", "attr"]},
        bartrip: {unique: true, components: ["bar", "barone", "barsome"]},
        bargrip: {unique: true, components: ["bar", "barsome"]},
      },
      bars: {
        value: {type: Number, unique: true, required: true}
      }
    });

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')]),
      ['bar', 'barone', 'barsome', 'attr']);

    t.strictSame(db.collections.foos[Symbol.for('schema')][Symbol.for("indexDescriptors")].map(d => d.name),
      ['barattr', 'bartrip', 'bargrip']);

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')].bar),
      ['name', 'required', 'type', 'collection', 'klass', 'foreign', 'hasOne',
       'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.name, 'bar');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.required, false);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.type, "bars");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.collection, db.collections.bars[this$]);
    t.type(db.collections.foos[Symbol.for('schema')].bar.klass.prototype, Item);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.foreign, 'foos');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.hasOne, true);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.prop, 'bar');
    t.notStrictEqual(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol,
      db.collections.foos[Symbol.for('schema')].bar.writePropertySymbol);
    t.type(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].bar.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')].barone),
      ['name', 'required', 'type', 'collection', 'klass', 'unique', 'foreign', 'hasOne',
       'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.name, 'barone');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.required, false);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.type, "bars");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.collection, db.collections.bars[this$]);
    t.type(db.collections.foos[Symbol.for('schema')].barone.klass.prototype, Item);
    t.strictSame(db.collections.foos[Symbol.for('schema')].barone.unique, new UniqueIndex());
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.foreign, 'foo');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.hasOne, true);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barone.prop, 'barone');
    t.notStrictEqual(db.collections.foos[Symbol.for('schema')].barone.readPropertySymbol,
      db.collections.foos[Symbol.for('schema')].barone.writePropertySymbol);
    t.type(db.collections.foos[Symbol.for('schema')].barone.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].barone.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')].barsome),
      ['name', 'required', 'type', 'collection', 'klass', 'hasOne',
       'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.name, 'barsome');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.required, false);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.type, "bars");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.collection, db.collections.bars[this$]);
    t.type(db.collections.foos[Symbol.for('schema')].barsome.klass.prototype, Item);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.foreign, undefined);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.hasOne, true);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].barsome.prop, 'barsome');
    t.notStrictEqual(db.collections.foos[Symbol.for('schema')].barsome.readPropertySymbol,
      db.collections.foos[Symbol.for('schema')].barsome.writePropertySymbol);
    t.type(db.collections.foos[Symbol.for('schema')].barsome.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].barsome.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')].attr),
      ['name', 'required', 'type', 'prop', 'writePropertySymbol', 'readPropertySymbol',
       'indexName', 'indexComponentName', 'compositePropertySymbol', 'indexComponentIdx', 'indexComponentCount', 'compositeUnique']);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.name, 'attr');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.required, false);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.type, new Primitive());
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.prop, 'attr');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.readPropertySymbol,
      db.collections.foos[Symbol.for('schema')].attr.writePropertySymbol);
    t.type(db.collections.foos[Symbol.for('schema')].attr.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].attr.writePropertySymbol, 'symbol');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.indexName, 'barattr');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.indexComponentName, 'attr');
    t.type(db.collections.foos[Symbol.for('schema')].attr.compositePropertySymbol, 'symbol');
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.indexComponentIdx, 1);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].attr.indexComponentCount, 2);
    t.strictSame(db.collections.foos[Symbol.for('schema')].attr.compositeUnique, new CompositeUniqueIndex(2));

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')]), ["foos", "foo", "value"]);

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')].foos),
      ['name', 'required', 'type', 'collection', 'klass', 'hasMany',
       'readPropertySymbol', 'primary', 'prop']);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.name, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.prop, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.required, false);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.type, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.collection, db.collections.foos[this$]);
    t.type(db.collections.bars[Symbol.for('schema')].foos.klass.prototype, Item);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.primary, "bar");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.hasMany, true);
    t.type(db.collections.bars[Symbol.for('schema')].foos.readPropertySymbol, 'symbol');
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.writePropertySymbol, undefined);

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')].foo),
      ['name', 'required', 'type', 'collection', 'klass', 'hasMany',
       'readPropertySymbol', 'primary', 'prop']);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.name, "foo");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.prop, "foo");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.required, false);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.type, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.collection, db.collections.foos[this$]);
    t.type(db.collections.bars[Symbol.for('schema')].foo.klass.prototype, Item);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.primary, "barone");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.hasMany, false);
    t.type(db.collections.bars[Symbol.for('schema')].foo.readPropertySymbol, 'symbol');
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.writePropertySymbol, undefined);

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')].value),
      ['name', 'required', 'type', 'unique', 'writePropertySymbol', 'readPropertySymbol', 'prop']);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].value.name, 'value');
    t.strictEqual(db.collections.bars[Symbol.for('schema')].value.required, true);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].value.type, Number);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].value.prop, 'value');
    t.strictSame(db.collections.bars[Symbol.for('schema')].value.unique, new UniqueIndex());
    t.strictEqual(db.collections.bars[Symbol.for('schema')].value.readPropertySymbol,
      db.collections.bars[Symbol.for('schema')].value.writePropertySymbol);
    t.type(db.collections.bars[Symbol.for('schema')].value.readPropertySymbol, 'symbol');
    t.type(db.collections.bars[Symbol.for('schema')].value.writePropertySymbol, 'symbol');

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      var bars = [
        db.collections.bars.create({value: 1}),
        db.collections.bars.create({value: 2}),
        db.collections.bars.create({value: 3})
      ];
      var bar1, bar2, bar3;
      return db.save()
      .then(item => {
        t.strictEqual(db.collections.bars.size, 3);
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: bars[2], value: 3, foos: []});

        return db.collections.foos.createAndSave({bar: bars[0], barone: bars[1], barsome: bars[2]});
      }).then(item => {
        t.strictEqual(db.collections.bars.size, 3);
        t.strictEqual(db.collections.foos.size, 1);
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0], barone: bars[1], barsome: bars[2]});
        t.strictEqual(item.bar, bar1 = db.collections.bars.by.value.get(1));
        t.strictEqual(item.barone, bar2 = db.collections.bars.by.value.get(2));
        t.strictEqual(bar2.foo, item);
        t.strictEqual(item.barsome, bar3 = db.collections.bars.by.value.get(3));
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.barattr.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar2, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[0]).count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[2], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar3), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bar2._id, bar3._id), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar2), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar3), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        return db.collections.foos.createAndSave({bar: bar1, attr: null, barsome: bar3});
      }).catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /unique constraint violated: bargrip\([0-9a-f]{24},[0-9a-f]{24}\) foos\["[0-9a-f]{24}"\].barsome = [0-9a-f]{24}/);
        t.strictSame(err.conflictKey, [bar1._id, bar3._id]);
        t.type(err.constraintIndex, CompositeUniqueIndex);
        var item = db.collections.foos.first();
        t.strictEqual(err.constraintIndex.get(err.conflictKey), item);
        t.strictEqual(db.collections.foos.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar3), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bar2._id, bar3._id), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar2), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar3), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        return db.collections.foos.createAndSave({bar: bar1, attr: null, barsome: bar2});
      }).then(item => {
        t.strictEqual(db.collections.bars.size, 3);
        t.strictEqual(db.collections.foos.size, 2);
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0], attr: null, barsome: bars[1]});
        t.strictEqual(db.collections.foos[1], item);
        t.notStrictEqual(db.collections.foos[0], item);
        t.strictEqual(bar1.foos.size, 2);
        t.strictEqual(bar1.foos.count(), 2);
        t.strictEqual(bar1.foos.first(), db.collections.foos[0]);
        t.strictEqual(bar1.foos.toArray()[1], item);
        t.strictEqual(item.bar, bar1);
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 2);
        t.strictEqual(db.collections.foos.by.barattr.first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.barattr.toArray()[1], item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).toArray()[1], item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), item);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 2);
        t.strictEqual(db.collections.foos.by.bartrip.first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.toArray()[1], db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).toArray()[1], db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined, bar2), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar3), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bar2._id, bar3._id), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar2), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.toArray()[1], item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).toArray()[1], item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar2), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar3), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).toArray()[1], item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        item = db.collections.foos[0];
        item.bar = item.bar; // should move to last position
        item.attr = null;
        delete item.barone;
        delete item.barsome;
        return db.save();
      }).catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /unique constraint violated: barattr\([0-9a-f]{24},null\) foos\["[0-9a-f]{24}"\].attr = null/);
        t.strictSame(err.conflictKey, [bars[0], null]);
        t.type(err.constraintIndex, CompositeUniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.size, 2);
        t.strictEqual(db.collections.bars.size, 3);
        var item = db.collections.foos[0];
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0], barone: bars[1], barsome: bars[2]});
        t.notStrictEqual(db.collections.foos[1], item);
        t.strictEqual(bar2.foo, item);
        t.strictEqual(bar1.foo, undefined);
        t.strictEqual(bar1.foos.size, 2);
        t.strictEqual(bar1.foos.count(), 2);
        t.strictEqual(bar1.foos.first(), db.collections.foos[1]);
        t.strictEqual(bar1.foos.toArray()[1], item);
        t.strictEqual(item.bar, bar1);
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 2);
        t.strictEqual(db.collections.foos.by.barattr.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 2);
        t.strictEqual(db.collections.foos.by.bartrip.first(), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bartrip.toArray()[1], item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).toArray()[1], item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined, bar2), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar3), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bar2._id, bar3._id), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar2, bar2), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar2), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar3), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar2, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        delete db.collections.bars[bar2._id];
        return db.save();
      }).then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.bars.size, 2);
        t.strictEqual(db.collections.bars[0], bar1);
        t.strictEqual(db.collections.bars[1], bar3);
        t.strictEqual(db.collections.foos.size, 2);
        var item = db.collections.foos[0];
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0], barsome: bars[2]});
        t.strictEqual(item.bar, bar1);
        t.strictEqual(item.barone, undefined);
        t.strictEqual(item.barsome, bar3);
        t.strictEqual(bar1.foo, undefined);
        t.strictEqual(bar1.foos.size, 2);
        t.strictEqual(bar1.foos.count(), 2);
        t.strictEqual(bar1.foos.first(), db.collections.foos[1]);
        t.strictEqual(bar1.foos.toArray()[1], item);
        item = db.collections.foos[1];
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0], attr: null});
        t.strictEqual(item.bar, bar1);
        t.strictEqual(item.barone, undefined);
        t.strictEqual(item.barsome, undefined);

        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 2);
        t.strictEqual(db.collections.foos.by.barattr.first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.barattr.toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 2);
        t.strictEqual(db.collections.foos.by.bartrip.first(), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bartrip.toArray()[1], db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).toArray()[1], db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1]).count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bar3), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bars[1]._id, bar3._id), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bars[1]), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar3), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 2);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).toArray()[1], db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), db.collections.foos[1]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), db.collections.foos[0]);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        return db.collections.foos.deleteAndSave(db.collections.foos[1]);
      }).then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.bars.size, 2);
        t.strictEqual(db.collections.bars[0], bar1);
        t.strictEqual(db.collections.bars[1], bar3);
        t.strictEqual(db.collections.foos.size, 1);
        t.strictEqual(db.collections.foos[1], undefined);
        var item = db.collections.foos[0];
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0], barsome: bars[2]});
        t.strictEqual(item.bar, bar1);
        t.strictEqual(item.barone, undefined);
        t.strictEqual(item.barsome, bar3);
        t.strictEqual(bar1.foo, undefined);
        t.strictEqual(bar1.foos.size, 1);
        t.strictEqual(bar1.foos.count(), 1);
        t.strictEqual(bar1.foos.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1]).count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bar3), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bars[1]._id, bar3._id), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar3), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar3, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        delete db.collections.bars[bars[2]];
        return db.save();
      }).then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.bars.size, 1);
        t.strictEqual(db.collections.bars[0], bar1);
        t.strictEqual(db.collections.bars[1], undefined);
        t.strictEqual(db.collections.foos.size, 1);
        var item = db.collections.foos[0];
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0]});
        t.strictEqual(item.bar, bar1);
        t.strictEqual(item.barone, undefined);
        t.strictEqual(item.barsome, undefined);
        t.strictEqual(bar1.foo, undefined);
        t.strictEqual(bar1.foos.size, 1);
        t.strictEqual(bar1.foos.count(), 1);
        t.strictEqual(bar1.foos.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1]).count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bars[1]._id, bars[2]._id), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bars[2]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        delete item.barsome;
        return db.save();
      }).then(item => {
        t.type(item, Item);
        t.strictEqual(item, db.collections.foos[0]);
        t.strictEqual(db.collections.bars.size, 1);
        t.strictEqual(db.collections.bars[0], bar1);
        t.strictEqual(db.collections.bars[1], undefined);
        t.strictEqual(db.collections.foos.size, 1);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, bar: bars[0]});
        t.strictEqual(item.bar, bar1);
        t.strictEqual(item.barone, undefined);
        t.strictEqual(item.barsome, undefined);
        t.strictEqual(bar1.foo, undefined);
        t.strictEqual(bar1.foos.size, 1);
        t.strictEqual(bar1.foos.count(), 1);
        t.strictEqual(bar1.foos.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.size, 1);
        t.strictEqual(db.collections.foos.by.barattr.count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bar1, null), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.size, 1);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1]).count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, undefined, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bar1).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1._id, bars[1]._id, bars[2]._id), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bar1), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bar1, bars[1], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 1);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bar1), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bar1, bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 1);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).first(), item);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);

        delete db.collections.bars;
        return db.save();
      }).then(success => {
        t.strictEqual(success, true);
        t.strictEqual(db.collections.bars.size, 0);
        t.strictEqual(db.collections.bars[0], undefined);
        t.strictEqual(db.collections.bars[1], undefined);
        t.strictEqual(db.collections.foos.size, 1);
        var item = db.collections.foos[0];
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id});
        t.strictEqual(item.bar, undefined);
        t.strictEqual(item.barone, undefined);
        t.strictEqual(item.barsome, undefined);
        t.strictEqual(db.collections.foos.by.barattr.size, 0);
        t.strictEqual(db.collections.foos.by.barattr.count(), 0);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[0]).count(), 0);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.barattr.get(bars[0], null), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0]).count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], bars[1]).count(), 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], undefined).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], undefined, bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], bars[0]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], bars[1], bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0]._id, bars[1]._id, bars[2]._id), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], bars[1], bars[0]), undefined);
        t.strictEqual(db.collections.foos.by.bartrip.get(bars[0], bars[1], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.count(), 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2]).size, 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[0]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0]).count(), 0);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[1]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[0], bars[2]), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[1], undefined), undefined);
        t.strictEqual(db.collections.foos.by.bargrip.get(bars[2], undefined), undefined);
      });
    }).catch(t.threw);
  });

  suite.end();
});
