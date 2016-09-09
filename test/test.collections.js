"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;

test("DB", suite => {

  suite.test('should have collections from schema', t => {
    var db = new DB({schema: {
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
      t.strictEqual(collection.size, 0);
      t.deepEqual(Array.from(collection), []);
      t.deepEqual(Array.from(collection.values()), []);
      t.deepEqual(Array.from(collection.keys()), []);
      t.type(collection.by, 'object');
    }
    t.deepEqual(Object.keys(db.collections.constellations.by), ['name']);
    t.strictEqual(db.collections.constellations.by.name, db.collections.constellations.name);
    t.strictEqual(db.collections.constellations.by.name.size, 0);
    t.deepEqual(Object.keys(db.collections.stars.by), ['name']);
    t.strictEqual(db.collections.stars.by.name, db.collections.stars.name);
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
      t.deepEqual(JSON.parse(JSON.stringify(constellation.toJSON())), {_id: constellation._id, name: "Sagittarius",
      createdAt: "1970-01-01T00:00:00.000Z",
      zodiac: "♐",
      location: {ra: 19, dec: -25},
      area: "867 sq. deg.",
      stars: [star._id]});
      t.deepEqual(constellation.stars, Array.from(db.collections.stars.values()));
      for(let [starid, star] of db.collections.stars) {
        t.strictEqual(star._id, starid);
      }
      t.deepEqual(star.toJSON(), {_id: star._id, name: "Alrami", bayer: "α Sagittarii",
                  constellation: constellation._id});
      t.strictEqual(star.constellation, constellation);
      t.strictEqual(constellation.stars[0], star);
      t.strictEqual(db.collections.stars.name.get('Alrami'), star);
      t.strictEqual(db.collections.stars.name.size, 1);
      t.strictEqual(db.collections.stars.name.has('Alrami'), true);
      t.strictEqual(db.collections.constellations.name.get('Sagittarius'), constellation);
      t.strictEqual(db.collections.constellations.name.size, 1);
      t.strictEqual(db.collections.constellations.name.has('Sagittarius'), true);
      t.end();
    });

  });

  suite.end();
});
