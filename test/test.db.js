"use strict";

const test = require('tap').test;
const { PassThrough } =require('stream');
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const {genIdent, Ident} = require('../lib/id');
const errors = require('../lib/errors');
const { VersionError } = errors;
const itertools = require('../lib/iter');
const schemaUtils = require('../lib/collection/schema/utils');

test("DB", suite => {

  suite.type(DB, 'function');

  suite.test('should have static properties', t => {
    t.type(DB.Item, 'function');
    t.strictEqual(DB.Item, Item);
    t.type(DB.Item.this, 'symbol');
    t.type(DB.Item.collection, 'symbol');
    t.type(DB.itertools, Object);
    t.strictEqual(DB.itertools, itertools);
    t.strictEqual(DB.schemaUtils, schemaUtils);
    t.type(DB.VersionError, 'function')
    t.type(DB.VersionError.prototype, Error);
    t.strictEqual(DB.VersionError, errors.VersionError)
    t.type(DB.SchemaSyntaxError, 'function')
    t.type(DB.SchemaSyntaxError.prototype, Error);
    t.strictEqual(DB.SchemaSyntaxError, errors.SchemaSyntaxError)
    t.type(DB.UniqueConstraintViolationError, 'function')
    t.type(DB.UniqueConstraintViolationError.prototype, Error);
    t.strictEqual(DB.UniqueConstraintViolationError, errors.UniqueConstraintViolationError);
    t.strictEqual(DB.Ident, Ident);
    t.strictEqual(DB.uniqueId, genIdent);
    t.end();
  });

  suite.test('should throw error on mingled version syntax', t => {
    t.throws(() => new DB({schema: {_version: null}})), new VersionError('Could not read schema version: null');
    t.throws(() => new DB({schema: {_version: false}})), new VersionError('Could not read schema version: false');
    t.throws(() => new DB({schema: {_version: 0}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: ''}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: {}}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: []}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: new Date()}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: /.*/}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: '0'}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: '0.0'}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: '1.0'}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: '1.1'}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: '01.1.0'}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: '1.1.00'}})), new VersionError('Could not read schema version: 0');
    t.throws(() => new DB({schema: {_version: 100}})), new VersionError('Could not read schema version: 100');
    t.throws(() => new DB({schema: {_version: '100'}})), new VersionError('Could not read schema version: 100');
    t.end();
  });

  suite.test('should emit error on uncompatible version from stream', t => {
    t.plan(41);
    var syncStream = new PassThrough({objectMode: true});

    var db = new DB({schema: {_version: '2.1.5'}});
    t.strictEqual(db.schemaVersion.version, '2.1.5');
    t.strictSame(db.schemaVersion, {major: 2, minor: 1, patch: 5, version: '2.1.5'});
    t.strictEqual(db.readonly, false);

    t.throws(() => db.verifyDataVersion('1.0'), new VersionError('Could not parse version read from stream: "1.0"'));
    t.throws(() => db.verifyDataVersion('1.0.0'), new VersionError('Version read from stream has different major: 1.0.0 !^ 2.1.5'));
    t.throws(() => db.verifyDataVersion('2.2.0'), new VersionError('Version read from stream has greater minor: 2.2.0 > 2.1.5'));
    t.throws(() => db.pushVersionMark('1.0'), new VersionError('Could not parse version read from stream: "1.0"'));
    t.throws(() => db.pushVersionMark('1.0.0'), new VersionError('Version read from stream has different major: 1.0.0 !^ 2.1.5'));
    t.throws(() => db.pushVersionMark('2.2.0'), new VersionError('Version read from stream has greater minor: 2.2.0 > 2.1.5'));
    t.strictSame(db.verifyDataVersion('2.0.0'), {major: 2, minor: 0, patch: 0, version: '2.0.0'});
    t.strictSame(db.verifyDataVersion('2.1.99'), {major: 2, minor: 1, patch: 99, version: '2.1.99'});

    syncStream.pipe(db.stream);

    var db2 = new DB({schema: {_version: '1.1.5'}});
    t.strictEqual(db2.schemaVersion.version, '1.1.5');
    t.strictSame(db2.schemaVersion, {major: 1, minor: 1, patch: 5, version: '1.1.5'});
    t.strictEqual(db2.readonly, false);
    db2.stream.pipe(syncStream).pipe(db2.stream);
    return db2.writable.then(db2 => {
      var promise = Promise.all([
        new Promise((resolve, reject) => {
          db.once('error', err => {
            try {
              t.type(err, VersionError);
              t.matches(err.message, 'Version read from stream has different major: 1.1.5 !^ 2.1.5');
              t.strictEqual(err.isVersion, true);
              resolve();
            } catch(err) { reject(err) };
          });
        }),
        new Promise((resolve, reject) => {
          db2.on('version', ver => {
            try {
              t.notStrictEqual(ver, db2.schemaVersion);
              t.strictSame(ver, db2.schemaVersion);
              t.strictEqual(ver.version, '1.1.5');
              t.strictSame(ver, {major: 1, minor: 1, patch: 5, version: '1.1.5'});
              resolve();
            } catch(err) { reject(err) };
          });
        })
      ]);
      db2.pushVersionMark();
      return promise;
    }).then(() => {
      var db3 = new DB({schema: {_version: '2.2.5'}});
      t.strictEqual(db3.schemaVersion.version, '2.2.5');
      t.strictSame(db3.schemaVersion, {major: 2, minor: 2, patch: 5, version: '2.2.5'});
      t.strictEqual(db3.readonly, false);

      db3.stream.pipe(syncStream).pipe(db3.stream);
      return db3.writable;
    }).then(db3 => {
      var promise = Promise.all([
        new Promise((resolve, reject) => {
          db.once('error', err => {
            try {
              t.type(err, VersionError);
              t.matches(err.message, 'Version read from stream has greater minor: 2.2.5 > 2.1.5');
              t.strictEqual(err.isVersion, true);
              resolve();
            } catch(err) { reject(err) };
          });
        }),
        new Promise((resolve, reject) => {
          db3.on('version', ver => {
            try {
              t.notStrictEqual(ver, db3.schemaVersion);
              t.strictSame(ver, db3.schemaVersion);
              t.strictEqual(ver.version, '2.2.5');
              t.strictSame(ver, {major: 2, minor: 2, patch: 5, version: '2.2.5'});
              resolve(db3);
            } catch(err) { reject(err) };
          });
        })
      ]);
      db3.pushVersionMark();
      return Promise.all([promise, db3.save()]);
    }).then(([[_, db3], res]) => {
      t.strictEqual(res, undefined);

      db.stream.pipe(syncStream);
      return Promise.all([db3, db.writable]);
    }).then(([db3, db]) => {
      var promise = Promise.all([
        new Promise((resolve, reject) => {
          db.once('error', err => {
            try {
              t.type(err, VersionError);
              t.matches(err.message, 'Could not parse version read from stream: "foo"');
              t.strictEqual(err.isVersion, true);
              resolve();
            } catch(err) { reject(err) };
          });
        }),
        new Promise((resolve, reject) => {
          db2.once('error', err => {
            try {
              t.type(err, VersionError);
              t.matches(err.message, 'Could not parse version read from stream: "foo"');
              t.strictEqual(err.isVersion, true);
              resolve();
            } catch(err) { reject(err) };
          });
        }),
        new Promise((resolve, reject) => {
          db3.once('error', err => {
            try {
              t.type(err, VersionError);
              t.matches(err.message, 'Could not parse version read from stream: "foo"');
              t.strictEqual(err.isVersion, true);
              resolve();
            } catch(err) { reject(err) };
          });
        })
      ]);
      db._push('_version', '_', 'foo', null, null);
      return promise;
    }).catch(t.threw);
  });

  suite.test('should save() resolve promise with latest update', t => {
    t.plan(44);

    var db = new DB({schema: {
      foos: {
        name: {type: String, unique: true, required: true}
      }
    }});

    t.strictEqual(db.schemaVersion.version, '1.0.0');
    t.strictSame(db.schemaVersion, {major: 1, minor: 0, patch: 0, version: '1.0.0'});
    t.deepEqual(Object.keys(db.collections), ['foos']);
    t.strictEqual('foos' in db.collections, true);
    t.type(db.collections.foos, Collection);
    t.type(db.collection('foos'), Collection);
    t.deepEqual(Object.keys(db.collections), ['foos']);
    t.strictEqual(db.collections.foos.size, 0);
    t.strictEqual(db.collections.foos.by.name.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.foos.createAndSave({name: ''});
    }).then(foo => {
      t.type(foo, Item);
      t.strictEqual(foo.name, '');
      t.strictEqual(db.collections.foos.by.name.get(''), foo);
      t.strictEqual(db.collections.foos[foo._id], foo);
      t.strictEqual(db.collections.foos[0], foo);
      t.strictEqual(db.collections.foos.size, 1);
      t.strictEqual(db.collections.foos.by.name.size, 1);

      t.strictEqual(db._spool, undefined);
      t.strictEqual(db._lastIdent, undefined);
      foo.name = 'rabarbar';
      foo.name = 'kajak';
      t.type(db._spool, Array);
      t.strictEqual(db._lastIdent, undefined);
      return db.save();
    }).then(foo => {
      t.type(foo, Item);
      t.strictEqual(foo.name, 'kajak');
      t.strictEqual(db.collections.foos.by.name.get('kajak'), foo);
      t.strictEqual(db.collections.foos[foo._id], foo);
      t.strictEqual(db.collections.foos[0], foo);
      t.strictEqual(db.collections.foos.size, 1);
      t.strictEqual(db.collections.foos.by.name.size, 1);

      t.strictEqual(db._spool, undefined);
      t.strictEqual(db._lastIdent, undefined);
      foo.name = 'rabarbar';
      foo.name = '';
      t.type(db._spool, Array);
      t.strictEqual(db._lastIdent, undefined);
      db.stream.cork();
      db._flush();
      t.strictEqual(db._spool, undefined);
      t.type(db._lastIdent, 'string');
      setImmediate(() => db.stream.uncork());
      return Promise.all([db.save(), db.save(), db.save()]);
    }).then(([foo1, foo2, foo3]) => {
      t.type(foo1, Item);
      t.strictEqual(foo1.name, '');
      t.strictEqual(foo1, foo2);
      t.strictEqual(foo1, foo3);
      t.strictEqual(db.collections.foos.by.name.get(''), foo1);
      t.strictEqual(db.collections.foos[foo1._id], foo1);
      t.strictEqual(db.collections.foos[0], foo1);
      t.strictEqual(db.collections.foos.size, 1);
      t.strictEqual(db.collections.foos.by.name.size, 1);
      t.strictEqual(db._spool, undefined);
      t.strictEqual(db._lastIdent, undefined);
    }).catch(t.threw);
  });

  suite.test('should create read-only database', t => {
    t.plan(4);

    var db = new DB({readonly: true});
    t.strictEqual(db.readonly, true);
    t.throws(() => db.collections.test.create({}), new Error("DB: no updates are allowed: database is in read-only mode"));

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.test.createAndSave({});
    }).catch(err => {
      t.type(err, Error);
      t.strictEqual(err.message, "DB: no updates are allowed: database is in read-only mode");
    }).catch(t.threw);
  });

  suite.test('should make read-only database', t => {
    t.plan(18);

    var db = new DB({readonly: false});
    t.strictEqual(db.readonly, false);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.test.createAndSave({});
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(db.makeReadonly(), true);
      t.strictEqual(db.readonly, true);
      t.strictEqual(db.makeReadonly(), false);
      t.strictEqual(db.readonly, true);
      t.throws(() => db.collections.test.create({}), new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => { item.foo = null; }, new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => { delete item.foo; }, new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => { delete db.collections.test[item._id]; }, new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => { delete db.collections.test; }, new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => db.collections.test.replace(item, {}), new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => db.collections.test.update(item, {foo: 1}), new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => db.collections.test.update(item, {foo: undefined}), new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => db.collections.test.add(item, 'foo', 1), new Error("DB: no updates are allowed: database is in read-only mode"));
      t.throws(() => db.collections.test.pull(item, 'foo', 1), new Error("DB: no updates are allowed: database is in read-only mode"));
      return db.collections.test.updateAndSave(item, {foo: 1});
    }).catch(err => {
      t.type(err, Error);
      t.strictEqual(err.message, "DB: no updates are allowed: database is in read-only mode");
    }).catch(t.threw);
  });

  suite.test('update and result events', t => {
    t.plan(35);

    var id, db = new DB();
    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      id = db.collections.test.create({foo: 'bar'});
      db.collections.test.update(id, {baz: 42});

      return Promise.all([
        new Promise((resolve, reject) => {
          db.on('update', pending => {
            try {
              t.type(pending[0], 'string');
              t.strictEqual(pending[0].length, 24);
              t.match(pending[0], /^[0-9a-f]{24}$/);
              t.strictEqual(pending[1], 'test');
              t.strictEqual(pending[2], '=');
              t.strictEqual(pending[3].toString(), id);
              t.strictSame(pending[3], new Ident(id));
              t.strictEqual(pending[4], '');
              t.strictSame(pending[5], {foo: 'bar'});
              t.strictEqual(pending[6], 'test');
              t.strictEqual(pending[7], '=');
              t.strictEqual(pending[8].toString(), id);
              t.strictSame(pending[8], new Ident(id));
              t.strictEqual(pending[9], 'baz');
              t.strictSame(pending[10], 42);
              resolve();
            } catch(err) { reject(err) };
          })
        }),
        new Promise((resolve, reject) => {
          db.on('result', (item, pending, index) => {
            if (index !== 1) return;
            try {
              t.type(item, Item);
              t.strictEqual(item._id, id);
              t.strictEqual(item, db.collections.test[id]);
              t.strictEqual(item.foo, 'bar');
              t.strictEqual(item.baz, undefined);
              t.strictEqual(pending[index + 0], 'test');
              t.strictEqual(pending[index + 1], '=');
              t.strictSame(pending[index + 2], new Ident(id));
              t.strictEqual(pending[index + 3], '');
              t.strictSame(pending[index + 4], {foo: 'bar'});
              resolve();
            } catch(err) { reject(err) };
          })
        }),
        new Promise((resolve, reject) => {
          db.on('result', (item, pending, index) => {
            if (index !== 6) return;
            try {
              t.type(item, Item);
              t.strictEqual(item._id, id);
              t.strictEqual(item, db.collections.test[id]);
              t.strictEqual(item.foo, 'bar');
              t.strictEqual(item.baz, 42);
              t.strictEqual(pending[index + 0], 'test');
              t.strictEqual(pending[index + 1], '=');
              t.strictSame(pending[index + 2], new Ident(id));
              t.strictEqual(pending[index + 3], 'baz');
              t.strictSame(pending[index + 4], 42);
              resolve();
            } catch(err) { reject(err) };
          })
        })
      ]);
    }).catch(t.threw);
  });

  suite.end();
});
