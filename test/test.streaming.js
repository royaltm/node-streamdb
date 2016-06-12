"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const { Duplex, PassThrough } = require('stream');

test("DB", suite => {

  suite.test("should create read only database", t => {
    var db = new DB();

    t.type(db, DB);
    t.type(db.stream, Duplex);

    db.collections.test.create();
    t.throws(() => { db.save() }, new Error("DBStream: please connect readable end to some destination before making updates"));
    t.end();
  });

  suite.test("should create loopback database", t => {
    t.plan(6);
    var db = new DB();

    t.type(db, DB);
    t.type(db.stream, Duplex);
    t.strictEqual(db.stream.pipe(db.stream), db.stream);
    setImmediate(() => {
      var id = db.collections.test.create({foo: "bar", baz: 2, rabarbar: [1,2,3]});
      var promise = db.save();
      t.type(promise, Promise);
      promise.then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {foo: "bar", baz: 2, rabarbar: [1,2,3], _id: id});
      }).catch(t.threw);
    });

  });

  suite.test("should create one-way streaming database", t => {
    t.plan(5);
    var dbMaster = new DB();
    var dbClient = new DB();

    var syncStream = new PassThrough({objectMode: true});
    dbMaster.stream.pipe(syncStream).pipe(dbClient.stream);
    syncStream.pipe(dbMaster.stream);

    setImmediate(() => {
      dbMaster.collections.test.createAndSave({foo: "bar", baz: 2, rabarbar: [1,2,3]})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {foo: "bar", baz: 2, rabarbar: [1,2,3], _id: item._id});
        var itemCopy = dbClient.collections.test[item._id];
        t.type(itemCopy, Item);
        t.deepEqual(itemCopy.toJSON(), item.toJSON());

        dbClient.collections.test.create();
        t.throws(() => { dbClient.save() }, new Error("DBStream: please connect readable end to some destination before making updates"));

      }).catch(t.threw);
    });

  });

  suite.test("should create two-way streaming database", t => {
    t.plan(8);
    var dbMaster = new DB();
    var dbClient = new DB();

    var syncStream = new PassThrough({objectMode: true});
    dbMaster.stream.pipe(syncStream).pipe(dbMaster.stream);
    dbClient.stream.pipe(syncStream).pipe(dbClient.stream);

    setImmediate(() => {
      dbMaster.collections.test.createAndSave({foo: "bar", baz: 2, rabarbar: [1,2,3]})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {foo: "bar", baz: 2, rabarbar: [1,2,3], _id: item._id});
        var itemCopy = dbClient.collections.test[item._id];
        t.type(itemCopy, Item);
        t.deepEqual(itemCopy.toJSON(), item.toJSON());

        var id = dbClient.collections.test.create();
        return dbClient.save().then(item2 => {
          t.type(item2, Item);
          t.deepEqual(item2.toJSON(), {_id: item2._id});
          var item2Copy = dbMaster.collections.test[item2._id];
          t.type(item2Copy, Item);
          t.deepEqual(item2Copy.toJSON(), item2.toJSON());
        });

      }).catch(t.threw);
    });

  });


  suite.end();
});
