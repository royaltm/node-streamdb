"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const { thisSym: this$ } = require('../lib/collection/symbols');

const itemKlass$ = Symbol.for("itemKlass");

const ManyToOneSet = require('../lib/collection/schema/many_to_one');
const Primitive = require('../lib/collection/schema/types').primitive;

test("DB", suite => {

  suite.test("should create database with one to many relations", t => {
    t.plan(120);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bar: {hasOne: {collection: "bars", hasMany: "foos"}}
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
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.name, "bar");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.prop, "bar");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.required, false);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.type, "bars");
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.collection, db.collections.bars[this$]);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.hasOne, true);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.klass, db.collections.bars[this$][itemKlass$]);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.foreign, "foos");
    t.type(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].bar.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')]), ['foos', 'counter']);
    t.strictSame(db.collections.bars[Symbol.for('schema')].counter, {
      "default": 0,
      "name": "counter",
      "prop": "counter",
      "required": false,
      "type": Number
    });
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.name, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.prop, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.type, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.collection, db.collections.foos[this$]);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.klass, db.collections.foos[this$][itemKlass$]);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.primary, "bar");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.hasMany, true);
    t.type(db.collections.bars[Symbol.for('schema')].foos.readPropertySymbol, 'symbol');
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foos.writePropertySymbol, undefined);

    t.strictEqual(db.collections.foos.size, 0);
    t.strictEqual(db.collections.bars.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid;
      return db.collections.foos.createAndSave({name: "blah", value: 50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "blah", value: 50});
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be null, a string, a number or a boolean'));
        t.strictEqual(db.collections.foos.size, 1);

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "blah", value: 50, bar: barid});
        t.deepEqual(JSON.parse(JSON.stringify(item.bar)), {_id: barid, counter: 0, foos: [item._id]});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.strictEqual(item.bar, bar);
        t.type(bar.foos, ManyToOneSet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 1);
        t.strictEqual(bar.foos[0], item);
        t.strictEqual(db.collections.bars.size, 1);
        return db.collections.foos.createAndSave({name: "meow", bar: item.bar});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow", bar: barid});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(bar.foos, ManyToOneSet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 2);
        t.type(bar.foos[0], Item);
        t.type(bar.foos[1], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.strictEqual(bar.foos[1], db.collections.foos[1])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        t.strictEqual(db.collections.foos.size, 2);
        delete item.bar;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.strictEqual(item.bar, undefined);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(bar.foos, ManyToOneSet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 1);
        for(var foo of db.collections.foos.values()) {
          if (foo !== item) break;
        }
        t.type(foo, Item);
        t.strictEqual(foo.bar, bar);
        t.strictEqual(bar.foos[0], foo)
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: foo._id, name: "blah", value: 50, bar: barid});
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: [foo._id]});
        delete bar.foos;
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.strictEqual(bar, db.collections.bars[barid]);
        t.type(bar.foos, ManyToOneSet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 0);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0, foos: []});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictEqual(foo.toJSON().bar, undefined);
          t.strictEqual(foo.bar, undefined);
        }
        bar.foos = Array.from(db.collections.foos.values());
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.type(bar.foos, ManyToOneSet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 2);
        t.type(bar.foos[0], Item);
        t.type(bar.foos[1], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.strictEqual(bar.foos[1], db.collections.foos[1])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictEqual(foo.toJSON().bar.toString(), barid);
          t.strictEqual(foo.bar, bar);
        }
        fooid = db.collections.foos[0]._id;
        return db.collections.foos.deleteAndSave(fooid);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.foos[fooid], undefined);
        var bar = db.collections.bars[barid];
        t.type(bar.foos, ManyToOneSet);
        t.type(bar.foos.ary, Array);
        t.type(bar._id, barid);
        t.strictEqual(bar.foos.length, 1);
        t.type(bar.foos[0], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictEqual(foo.toJSON().bar.toString(), barid);
          t.strictEqual(foo.bar, bar);
        }
        t.strictEqual(db.collections.foos.size, 1);
        return db.collections.bars.deleteAndSave(bar);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.bars[barid], undefined);
        t.strictEqual(db.collections.bars.size, 0);
        t.strictEqual(db.collections.foos.size, 1);
        var item = db.collections.foos.values().next().value;
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.strictEqual(item.bar, undefined);
        return db.collections.bars.replaceAndSave(barid, {counter: 42});
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 42, foos: []});
        t.strictEqual(db.collections.bars[barid], bar);
        t.strictEqual(db.collections.bars.size, 1);
        var item = db.collections.foos.values().next().value;
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.strictEqual(item.bar, undefined);
      });
    }).catch(t.threw);

  });

  suite.end();
});
