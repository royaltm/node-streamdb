"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const { thisSym: this$ } = require('../lib/collection/symbols');

const itemKlass$ = Symbol.for("itemKlass");

const ManyToManySet = require('../lib/collection/schema/many_to_many');
const Primitive = require('../lib/collection/schema/types').primitive;

test("DB", suite => {

  suite.test("should create database with many to many relations", t => {
    t.plan(157);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bars: {hasMany: {collection: "bars", hasMany: "foos"}}
      },
      bars: {
        counter: {type: "number", default: 0}
      }
    };
    var db = new DB({schema: schema});
    t.type(db, DB);

    t.strictSame(Object.keys(db.collections.foos[Symbol.for('schema')]), ['name', 'value', 'bars']);
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
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.name, "bars");
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.prop, "bars");
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.required, false);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.type, "bars");
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.collection, db.collections.bars[this$]);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.hasMany, true);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.klass, db.collections.bars[this$][itemKlass$]);
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.foreign, "foos");
    t.type(db.collections.foos[Symbol.for('schema')].bars.readPropertySymbol, 'symbol');
    t.strictEquals(db.collections.foos[Symbol.for('schema')].bars.writePropertySymbol, undefined);

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')]), ['foos', 'counter']);
    t.strictSame(db.collections.bars[Symbol.for('schema')].counter, {
      "default": 0,
      "name": "counter",
      "prop": "counter",
      "required": false,
      "type": Number
    });
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.name, "foos");
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.prop, "foos");
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.type, "foos");
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.collection, db.collections.foos[this$]);
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.klass, db.collections.foos[this$][itemKlass$]);
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.foreign, "bars");
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.hasMany, true);
    t.type(db.collections.bars[Symbol.for('schema')].foos.readPropertySymbol, 'symbol');
    t.strictEquals(db.collections.bars[Symbol.for('schema')].foos.writePropertySymbol, undefined);

    t.strictEqual(db.collections.foos.size, 0);
    t.strictEqual(db.collections.bars.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid;
      return db.collections.foos.createAndSave({name: "blah", value: 50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {name: "blah", value: 50, bars: [], _id: item._id});
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be a primitive'));
        t.strictEqual(db.collections.foos.size, 1);

        item.bars = [barid = db.collections.bars.create()];
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.strictSame(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "blah", value: 50, bars: [barid]});
        t.strictSame(JSON.parse(JSON.stringify(item.bars)), [{_id: barid, counter: 0, foos: [item._id]}]);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(item.bars, ManyToManySet);
        t.type(item.bars.ary, Array);
        t.strictEqual(item.bars.length, 1);
        t.strictEqual(item.bars[0], bar);
        t.type(bar.foos, ManyToManySet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 1);
        t.strictEqual(bar.foos[0], item);
        t.strictEqual(db.collections.bars.size, 1);
        return db.collections.foos.createAndSave({name: "meow", bars: Array.from(item.bars)});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow", bars: [barid]});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(bar.foos, ManyToManySet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 2);
        t.type(bar.foos[0], Item);
        t.type(bar.foos[1], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.strictEqual(bar.foos[1], db.collections.foos[1])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        t.strictEqual(db.collections.foos.size, 2);
        delete item.bars;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow", bars: []});
        t.strictEqual(item.bar, undefined);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(bar.foos, ManyToManySet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 1);
        for(var foo of db.collections.foos.values()) {
          if (foo !== item) break;
        }
        t.type(foo, Item);
        t.strictEqual(foo.bars[0], bar);
        t.strictEqual(bar.foos[0], foo);
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: foo._id, name: "blah", value: 50, bars: [barid]});
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: [foo._id]});
        delete bar.foos;
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.strictEqual(bar, db.collections.bars[barid]);
        t.type(bar.foos, ManyToManySet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 0);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0, foos: []});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictSame(foo.toJSON().bars, []);
          t.strictEqual(foo.bar, undefined);
        }
        bar.foos = Array.from(db.collections.foos.values());
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.type(bar.foos, ManyToManySet);
        t.type(bar.foos.ary, Array);
        t.strictEqual(bar.foos.length, 2);
        t.type(bar.foos[0], Item);
        t.type(bar.foos[1], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.strictEqual(bar.foos[1], db.collections.foos[1])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictSame(foo.toJSON().bars.map(x => x.toString()), [barid]);
          t.strictEqual(foo.bars[0], bar);
        }
        fooid = db.collections.foos[0]._id;
        return db.collections.foos.deleteAndSave(fooid);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.foos[fooid], undefined);
        var bar = db.collections.bars[barid];
        t.type(bar.foos, ManyToManySet);
        t.type(bar.foos.ary, Array);
        t.type(bar._id, barid);
        t.strictEqual(bar.foos.length, 1);
        t.type(bar.foos[0], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictSame(foo.toJSON().bars.map(x => x.toString()), [barid]);
          t.strictEqual(foo.bars[0], bar);
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
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow", bars: []});
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
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow", bars: []});
        t.strictEqual(item.bars.length, 0);
        fooid = item._id;
        item.bars.add(bar);
        bar.foos.add(item);
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 42, foos: [fooid]});
        t.strictEqual(db.collections.bars[barid], bar);
        t.strictEqual(db.collections.bars.size, 1);
        var item = db.collections.foos.values().next().value;
        t.strictEqual(bar.foos.length, 1);
        t.strictEqual(bar.foos[0], item);
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: fooid, name: "meow", bars: [barid]});
        t.strictEqual(item.bars.length, 1);
        t.strictEqual(item.bars[0], bar);
        bar.foos.delete(item);
        var foos = [
          db.collections.foos.create({name: "jeden", value: 1, bars: [barid]}),
          db.collections.foos.create({name: "dwa", value: 2, bars: [barid]}),
          db.collections.foos.create({name: "trzy", value: 3, bars: [barid]})];
        return db.collections.bars.createAndSave({counter: 11, foos: foos})
        .then(bar => {
          t.type(bar, Item);
          t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: bar._id, counter: 11, foos: foos});
          t.strictEqual(db.collections.bars[bar._id], bar);
          t.strictEqual(db.collections.bars.size, 2);
          t.strictEqual(db.collections.foos.size, 4);
          for(let foo of db.collections.foos.iter) {
            t.type(foo, Item);
            if (foo._id === fooid) {
              t.strictSame(JSON.parse(JSON.stringify(foo)).bars, []);
            }
            else {
              t.strictSame(JSON.parse(JSON.stringify(foo)).bars, [barid, bar._id]);
              t.strictEqual(foo.bars[1], bar);
            }
          }
          var foo = db.collections.foos[fooid];
          barid = bar._id;
          foo.bars.add(bar);
          foos.forEach(id => db.collections.foos.delete(id));
          db.collections.bars.add(bar, 'counter', 7);
          db.collections.foos.add(foo, 'name', " kitty");
          db.collections.bars.subtract(bar, 'counter', 15);
          return db.save();
        });
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 11+7-15, foos: [fooid]});
          var foo = db.collections.foos[fooid];
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "meow kitty", bars: [barid]});
        t.strictEqual(bar.foos[0], foo);
        t.strictEqual(foo.bars[0], bar);
        t.strictEqual(db.collections.bars[barid], bar);
        t.strictEqual(db.collections.bars.size, 2);
        t.strictEqual(db.collections.foos.size, 1);
      });
    }).catch(t.threw);

  });

  suite.end();
});
