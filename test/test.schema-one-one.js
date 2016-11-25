"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const $this = Symbol.for('this');
const $itemKlass = require('../lib/collection/schema').itemKlassSym;
const isIdent = require('../lib/id').isIdent;
const Primitive = require('../lib/collection/schema/types').primitive;

const { SchemaSyntaxError, UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with one to one relations", t => {
    t.plan(82);
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

    t.strictSame(db.collections.foos[Symbol.for('schema')], {
      "name": {
        "name": "name",
        "prop": "name",
        "required": true,
        "type": String,
      },
      "value": {
        "name": "value",
        "prop": "value",
        "required": false,
        "type": new Primitive(),
      },
      "bar": {
        "name": "bar",
        "prop": "bar",
        "required": false,
        "type": "bars",
        "collection": db.collections.bars[$this],
        "hasOne": true,
        "klass": db.collections.bars[$this][$itemKlass],
        "unique": new Map,
        "foreign": "foo"
      }
    });
    t.strictSame(db.collections.bars[Symbol.for('schema')], {
      "counter": {
        "default": 0,
        "name": "counter",
        "prop": "counter",
        "required": false,
        "type": Number,
      },
      "foo": {
        "name": "foo",
        "prop": "foo",
        "type": "foos",
        "collection": db.collections.foos[$this],
        "klass": db.collections.foos[$this][$itemKlass],
        "primary": "bar",
        "hasMany": false
      }
    });

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
