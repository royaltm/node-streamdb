"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;

test("DB", suite => {

  suite.test('should have collections from schema', t => {
    t.plan(72);

    var db = new DB({schema: {
      _version: '1.2.3',
      constellations: {
        name: {type: String, unique: true, required: true},
        'location.ra': Number,
        'location.dec': Number,
        zodiac: String,
        createdAt: {type: Date, required: true, default: Date.now}
      },
      stars: {
        name: {type: String, unique: true, required: true},
        bayer: String,
        constellation: {hasOne: {collection: 'constellations', hasMany: 'stars'}}
      }
    }});

    t.strictEqual(db.schemaVersion.version, '1.2.3');
    t.strictSame(db.schemaVersion, {major: 1, minor: 2, patch: 3, version: '1.2.3'});
    t.deepEqual(Object.keys(db.collections), ['constellations', 'stars']);
    t.strictEqual('constellations' in db.collections, true);
    t.strictEqual('stars' in db.collections, true);
    t.strictEqual('foobar' in db.collections, false);
    t.type(db.collections.constellations, Collection);
    t.type(db.collections.stars, Collection);
    t.type(db.collections.foobar, Collection);
    t.type(db.collection('barfoo'), Collection);
    t.deepEqual(Object.keys(db.collections), ['constellations', 'stars', 'foobar', 'barfoo']);
    for(var name in db.collections) {
      var collection = db.collections[name];
      t.strictEqual(db.collection(name), collection);
      t.strictEqual(collection._db, db);
      t.strictEqual(collection._name, name);
      t.strictEqual(collection.db, db);
      t.strictEqual(collection.name, name);
      t.strictEqual(collection.size, 0);
      t.deepEqual(Array.from(collection), []);
      t.deepEqual(Array.from(collection.values()), []);
      t.deepEqual(Array.from(collection.keys()), []);
      t.type(collection.by, 'object');
    }
    t.deepEqual(Object.keys(db.collections.constellations.by), ['name']);
    t.strictEqual(db.collections.constellations.by.name.size, 0);
    t.deepEqual(Object.keys(db.collections.stars.by), ['name']);
    t.strictEqual(db.collections.stars.by.name.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var alrami_id = db.collections.stars.create({name: "Alrami", bayer: "α Sagittarii"});
      return db.collections.constellations.createAndSave({
        name: "Sagittarius",
        createdAt: new Date(0),
        zodiac: "♐",
        location: {ra: 19, dec: -25},
        area: "867 sq. deg.",
        stars: [alrami_id]
      });
    })
    .then(constellation => {
      t.type(constellation, Item);
      var star = db.collections.stars.by.name.get('Alrami');
      t.type(star, Item);
      t.deepEqual(JSON.parse(JSON.stringify(constellation)), {_id: constellation._id, name: "Sagittarius",
      createdAt: "1970-01-01T00:00:00.000Z",
      zodiac: "♐",
      location: {ra: 19, dec: -25},
      area: "867 sq. deg.",
      stars: [star._id]});
      t.deepEqual(constellation.stars.slice(), Array.from(db.collections.stars.values()));
      for(let [starid, star] of db.collections.stars) {
        t.strictEqual(star._id, starid);
      }
      t.deepEqual(JSON.parse(JSON.stringify(star)), {_id: star._id, name: "Alrami", bayer: "α Sagittarii",
                  constellation: constellation._id});
      t.strictEqual(star.constellation, constellation);
      t.strictEqual(constellation.stars[0], star);
      t.strictEqual(db.collections.stars.by.name.get('Alrami'), star);
      t.strictEqual(db.collections.stars.by.name.size, 1);
      t.strictEqual(db.collections.stars.by.name.has('Alrami'), true);
      t.strictEqual(db.collections.constellations.by.name.get('Sagittarius'), constellation);
      t.strictEqual(db.collections.constellations.by.name.size, 1);
      t.strictEqual(db.collections.constellations.by.name.has('Sagittarius'), true);

      db.pushVersionMark();

      db.on('version', ver => {
        t.notStrictEqual(ver, db.schemaVersion);
        t.strictSame(ver, db.schemaVersion);
        t.strictSame(ver, {major: 1, minor: 2, patch: 3, version: '1.2.3'});
      });
      return db.save();
    }).catch(t.threw);


  });

  suite.end();
});
