"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Ident = require('../lib/id').Ident;

const { Duplex, PassThrough } = require('stream');

test("DB", suite => {

  suite.test("should create read only database", t => {
    t.plan(4);
    var db = new DB();

    t.type(db, DB);
    t.type(db.stream, Duplex);

    db.collections.test.create();
    var promise = db.save();
    t.type(promise, Promise);
    promise.then(() => t.ok(false));
    setTimeout(() => t.ok(true), 100);
  });

  suite.test("should create loopback database", t => {
    t.plan(21);
    var db = new DB(), updateEvent = false;

    t.type(db, DB);
    t.type(db.stream, Duplex);
    t.strictEqual(db.stream.pipe(db.stream), db.stream);
    t.strictEqual(db.stream.isReadableStreaming, false);
    db.on('update', args => {
      t.type(args, Array);
      t.strictEqual(args.length, 6);
      t.type(args[0], 'string')
      t.strictEqual(args[0].length, 24);
      t.strictEqual(args[1], 'test');
      t.strictEqual(args[2], '=');
      t.type(args[3], Ident);
      t.strictEqual(args[3].length, 24);
      t.notStrictEqual(args[3], args[0]);
      t.strictEqual(args[4], '');
      t.deepEqual(args[5], {foo: "bar", baz: 2, rabarbar: [1,2,3]});
      updateEvent = true;
    });
    db.writable.then(o => {
      t.strictEqual(db.stream.isReadableStreaming, true);
      t.strictEqual(o, db);
      var id = db.collections.test.create({foo: "bar", baz: 2, rabarbar: [1,2,3]});
      var promise = db.save();
      t.type(promise, Promise);
      return promise.then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {foo: "bar", baz: 2, rabarbar: [1,2,3], _id: id});
        t.strictEqual(updateEvent, true);
      })
    }).catch(t.threw);

  });

  suite.test("should create one-way streaming database", t => {
    t.plan(11);
    var dbMaster = new DB();
    var dbClient = new DB();

    var syncStream = new PassThrough({objectMode: true});
    dbMaster.stream.pipe(syncStream).pipe(dbClient.stream);
    syncStream.pipe(dbMaster.stream);
    t.strictEqual(dbMaster.stream.isReadableStreaming, false);
    t.strictEqual(dbClient.stream.isReadableStreaming, false);

    dbMaster.writable.then(db => {
      t.strictEqual(db, dbMaster);
      t.strictEqual(dbMaster.stream.isReadableStreaming, true);
      t.strictEqual(dbClient.stream.isReadableStreaming, false);
      return dbMaster.collections.test.createAndSave({foo: "bar", baz: 2, rabarbar: [1,2,3]})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {foo: "bar", baz: 2, rabarbar: [1,2,3], _id: item._id});
        var itemCopy = dbClient.collections.test[item._id];
        t.type(itemCopy, Item);
        t.deepEqual(itemCopy.toJSON(), item.toJSON());

        dbClient.collections.test.create();
        var promise = dbClient.save();
        t.type(promise, Promise);
        promise.then(() => t.ok(false));
        setTimeout(() => t.ok(true), 100);
      });
    }).catch(t.threw);

  });

  suite.test("should create two-way streaming database", t => {
    t.plan(14);
    var dbMaster = new DB();
    var dbClient = new DB();

    var syncStream = new PassThrough({objectMode: true});
    dbMaster.stream.pipe(syncStream).pipe(dbMaster.stream);
    dbClient.stream.pipe(syncStream).pipe(dbClient.stream);
    t.strictEqual(dbMaster.stream.isReadableStreaming, false);
    t.strictEqual(dbClient.stream.isReadableStreaming, false);

    Promise.all([dbMaster.writable, dbClient.writable]).then(dbs => {
      t.strictEqual(dbs[0], dbMaster);
      t.strictEqual(dbs[1], dbClient);
      t.strictEqual(dbMaster.stream.isReadableStreaming, true);
      t.strictEqual(dbClient.stream.isReadableStreaming, true);
      return dbMaster.collections.test.createAndSave({foo: "bar", baz: 2, rabarbar: [1,2,3]})
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

  suite.test("autosave", t => {
    t.plan(7 + 10*14 + 1);
    var db = new DB()

    t.type(db, DB);
    t.type(db.stream, Duplex);
    t.strictEqual(db.autosave, true);
    t.strictEqual(db.stream.pipe(db.stream), db.stream);
    t.strictEqual(db.stream.isReadableStreaming, false);
    var check = 0, id;
    db.on('update', args => {
      t.type(args, Array);
      t.strictEqual(args.length, 6);
      t.type(args[0], 'string')
      t.strictEqual(args[0].length, 24);
      t.strictEqual(args[1], 'test');
      t.strictEqual(args[2], '=');
      t.type(args[3], Ident);
      t.strictEqual(args[3].length, 24);
      t.strictEqual(args[3].toString(), id);
      t.notStrictEqual(args[3], args[0]);
      t.strictEqual(args[4], '');
      t.type(args[5], Object);
      t.strictEqual(args[5].num, ++check);
    });
    db.writable.then(o => {
      t.strictEqual(db.stream.isReadableStreaming, true);
      t.strictEqual(o, db);
      var num = 0;
      const next = () => {
        t.type(id = db.collections.test.create({num: ++num}), 'string');
        if (num < 10) setImmediate(next);
        else t.ok(true);
      }
      next();
    }).catch(t.threw);

  });

  suite.test("no autosave", t => {
    t.plan(10 + 13 + 9*2 + 4 + 9*9 + 4);
    var db = new DB({autosave: false})

    t.type(db, DB);
    t.type(db.stream, Duplex);
    t.strictEqual(db.autosave, false);
    db.autosave = true;
    t.strictEqual(db.stream.pipe(db.stream), db.stream);
    t.strictEqual(db.stream.isReadableStreaming, false);
    var check = 0, id, updateEvent = 0, ids = [];
    db.once('update', args => {
      ++updateEvent;
      t.type(args, Array);
      t.strictEqual(args.length, 6);
      t.type(args[0], 'string')
      t.strictEqual(args[0].length, 24);
      t.strictEqual(args[1], 'test');
      t.strictEqual(args[2], '=');
      t.type(args[3], Ident);
      t.strictEqual(args[3].length, 24);
      t.strictEqual(args[3].toString(), id);
      t.notStrictEqual(args[3], args[0]);
      t.strictEqual(args[4], '');
      t.type(args[5], Object);
      t.strictEqual(args[5].num, ++check);
      db.on('update', args => {
        ++updateEvent;
        t.type(args, Array);
        t.strictEqual(args.length, 1+9*5);
        t.type(args[0], 'string')
        t.strictEqual(args[0].length, 24);
        for(var i = 0, n = 0; i < args.length - 1; i+=5) {
          t.strictEqual(args[i+1], 'test');
          t.strictEqual(args[i+2], '=');
          t.type(args[i+3], Ident);
          t.strictEqual(args[i+3].length, 24);
          t.strictEqual(args[i+3].toString(), ids[n++]);
          t.notStrictEqual(args[i+3], args[0]);
          t.strictEqual(args[i+4], '');
          t.type(args[i+5], Object);
          t.strictEqual(args[i+5].num, ++check);
        }
      });
    });
    db.writable.then(o => {
      t.strictEqual(db.stream.isReadableStreaming, true);
      t.strictEqual(o, db);
      var num = 0;
      const next = () => {
        db.begin();
        t.strictEqual(db.autosave, false);
        t.type(id = db.collections.test.create({num: ++num}), 'string');
        ids.push(id);
        if (num < 10) return setImmediate(next);
        var promise = db.save();
        t.type(promise, Promise);
        return promise.then(item => {
          t.type(item, Item);
          t.deepEqual(item.toJSON(), {num: check, _id: id});
          t.strictEqual(updateEvent, 2);
        })
      }
      t.type(id = db.collections.test.create({num: ++num}), 'string');
      t.strictEqual(db.autosave, true);
      db.begin();
      t.strictEqual(db.autosave, false);
      setImmediate(next);
    }).catch(t.threw);

  });

  suite.end();
});
