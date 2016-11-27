"use strict";

const test = require('tap').test;
const { PassThrough } =require('stream');
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;
const { VersionError } = require('../lib/errors');

test("DB", suite => {

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
    t.plan(30);
    var syncStream = new PassThrough({objectMode: true});

    var db = new DB({schema: {_version: '2.1.5'}});
    t.strictEqual(db.schemaVersion.version, '2.1.5');
    t.strictSame(db.schemaVersion, {major: 2, minor: 1, patch: 5, version: '2.1.5'});

    syncStream.pipe(db.stream);

    var db2 = new DB({schema: {_version: '1.1.5'}});
    t.strictEqual(db2.schemaVersion.version, '1.1.5');
    t.strictSame(db2.schemaVersion, {major: 1, minor: 1, patch: 5, version: '1.1.5'});
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

  suite.end();
});
