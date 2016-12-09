"use strict";

const util = require('util');
const test = require('tap').test;

const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

test("DB", suite => {

  suite.test("should create database with custom validator", t => {
    t.plan(13);

    var db = new DB({
      validatorsRoot: {
        some: {
          validators: {
            foo(value, operator) {
              if (('number' !== typeof value || value % 1 !== 0 || value < 0)) {
                throw new TypeError(`${this.name}: is not a natural number`);
              }
              return value + 1;
            }
          }
        }
      },
      validators: {
        test: 'some.validators'
      }
    });

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        foo: {type: '*'}
      }
    });

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      return db.collections.test.createAndSave({foo: 0})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, foo: 1})
        t.throws(() => { item.foo = ''; }, new TypeError("foo: is not a natural number"));
        t.throws(() => { item.foo = 3.4; }, new TypeError("foo: is not a natural number"));
        t.throws(() => { item.foo = -1; }, new TypeError("foo: is not a natural number"));
        t.throws(() => { delete item.foo; }, new TypeError("foo: is not a natural number"));

        item.foo = 1;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, foo: 2});
        t.throws(() => { db.collections.test.add(item, 'foo', 'x'); }, new TypeError("foo: is not a natural number"));
        return db.collections.test.addAndSave(item, 'foo', 3);
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, foo: 6});
      });
    }).catch(t.threw);
  });

  suite.end();
});
