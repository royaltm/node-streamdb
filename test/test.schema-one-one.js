"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const { thisSym: this$ } = require('../lib/collection/symbols');

const itemKlass$ = Symbol.for("itemKlass");

const isIdent = require('../lib/id').isIdent;

const Primitive = require('../lib/collection/schema/types').primitive;

const { UniqueIndex } = require('../lib/collection/indexes');

const { UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with one to one relations", t => {
    t.plan(110);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bar: {hasOne: {collection: "bars", hasOne: "foo"}}
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
    t.type(db.collections.foos[Symbol.for('schema')].bar.unique, Map);
    t.strictEqual(db.collections.foos[Symbol.for('schema')].bar.foreign, "foo");
    t.type(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol, 'symbol');
    t.type(db.collections.foos[Symbol.for('schema')].bar.writePropertySymbol, 'symbol');

    t.strictSame(Object.keys(db.collections.bars[Symbol.for('schema')]), ['foo', 'counter']);
    t.strictSame(db.collections.bars[Symbol.for('schema')].counter, {
      "default": 0,
      "name": "counter",
      "prop": "counter",
      "required": false,
      "type": Number
    });
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.name, "foo");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.prop, "foo");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.type, "foos");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.collection, db.collections.foos[this$]);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.klass, db.collections.foos[this$][itemKlass$]);
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.primary, "bar");
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.hasMany, false);
    t.type(db.collections.foos[Symbol.for('schema')].bar.readPropertySymbol, 'symbol');
    t.strictEqual(db.collections.bars[Symbol.for('schema')].foo.writePropertySymbol, undefined);

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
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be a primitive'));

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "blah", value: 50, bar: barid});
        t.deepEqual(JSON.parse(JSON.stringify(item.bar)), {_id: barid, counter: 0, foo: item._id});
        t.strictEqual(item.bar, db.collections.bars[barid]);
        fooid = db.collections.foos.create({name: "meow", bar: item.bar});
        t.ok(isIdent(fooid));
        return db.save();
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.strictEqual(err.message, `unique constraint violated: foos["${fooid}"].bar = ${barid}`);
        t.strictEqual(err.conflictKey, barid);
        t.type(err.constraintIndex, UniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.foos[0]);
        var bar = db.collections.bars[barid];
        fooid = bar.foo._id;
        t.ok(isIdent(fooid));
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: fooid});
        t.deepEqual(JSON.parse(JSON.stringify(bar.foo)), {_id: fooid, name: "blah", value: 50, bar: barid});
        delete bar.foo.bar;
        return db.collections.foos.createAndSave({name: "meow", bar: bar});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow", bar: barid});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.strictEqual(bar.foo, item);
        t.strictEqual(item.bar, bar);
        bar.foo = item;
        return db.save()
        .then(bar => {
          t.type(bar, Item);
          t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: item._id});
          t.strictEqual(bar.foo, item);
          t.strictEqual(item.bar, bar);
          var foo = db.collections.foos[fooid];
          t.type(foo, Item);
          t.notStrictEqual(foo, item);
          t.strictEqual(foo.bar, undefined);
          t.deepEqual(foo.toJSON(), {_id: fooid, name: "blah", value: 50});
          bar.foo = foo;
          return db.save();
        });
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: fooid});
        var foo = db.collections.foos[fooid];
        t.type(foo, Item);
        t.strictEqual(bar.foo, foo);
        t.strictEqual(foo.bar, bar);
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "blah", value: 50, bar: barid});
        for(var item of db.collections.foos.values()) {
          if (item !== foo) break;
        }
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.notStrictEqual(item, foo);
        t.strictEqual(item.bar, undefined);
        delete bar.foo;
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(bar.foo, undefined);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, undefined);
        }
        var foo = db.collections.foos[fooid];
        t.strictEqual(foo.bar, undefined);
        foo.bar = bar;
        return db.save();
      })
      .then(foo => {
        t.type(foo, Item);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: fooid});
        t.strictEqual(bar.foo, foo);
        t.strictEqual(foo.bar, bar);
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "blah", value: 50, bar: barid});
        for(var item of db.collections.foos.values()) {
          if (item !== foo) break;
        }
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow"});
        t.notStrictEqual(item, foo);
        t.strictEqual(item.bar, undefined);
        return db.collections.foos.deleteAndSave(fooid);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.foos[fooid], undefined);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(bar.foo, undefined);
        var item = db.collections.foos.values().next().value;
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.throws(() => { db.collections.foos.replace(bar, {}) }, new TypeError('Ident: given constructor argument is not an ident'));
        db.collections.foos.replace(item, {name: "whoa!", bar: barid, value: null});
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.notStrictEqual(item._id, fooid);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "whoa!", value: null, bar: barid});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: item._id});
        t.strictEqual(bar.foo, item);
        t.strictEqual(item.bar, bar);
        db.collections.bars.delete(barid);
        return db.save();
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.bars[barid], undefined);
        var item = db.collections.foos.values().next().value;
        t.deepEqual(item.toJSON(), {_id: item._id, name: "whoa!", value: null});
        t.strictEqual(item.bar, undefined);
        return db.collections.bars.replaceAndSave(barid, {counter: -12});
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: -12});
        t.strictEqual(db.collections.bars[barid], bar);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, undefined);
          t.strictEqual(item.toJSON().bar, undefined);
        }
      });
    }).catch(t.threw);
  });

  suite.end();
});
