"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;

const exported = [
  [ '_version', '_', '4.2.1', null, null ],
  [ 'constellations', '!', null, null, null ],
  [ 'constellations', '=', new Ident('5838c3ec26f27e1f64abbf88'), '', {
    zodiac: '♐',
    location: {ra: 19, dec: -25},
    area: '867 sq. deg.',
    name: 'Sagittarius',
    createdAt: new Date('2016-11-25T23:06:20.659Z') } ],
  [ 'stars', '!', null, null, null ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf87'), '', {
    bayer: 'α Sagittarii',
    name: 'Alrami',
    constellation: new Ident('5838c3ec26f27e1f64abbf88') } ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf89'), '', {
    bayer: 'β Sagittarii',
    name: 'Arkab',
    constellation: new Ident('5838c3ec26f27e1f64abbf88') } ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf8a'), '', {
    bayer: 'π Sagittarii',
    name: 'Albaldah',
    constellation: new Ident('5838c3ec26f27e1f64abbf88') } ],
  [ 'constellations', '=', new Ident('5838c3ec26f27e1f64abbf88'), 'stars', [
      new Ident('5838c3ec26f27e1f64abbf87'),
      new Ident('5838c3ec26f27e1f64abbf89'),
      new Ident('5838c3ec26f27e1f64abbf8a')] ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf87'), 'siblings', [new Ident('5838c3ec26f27e1f64abbf8a')] ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf89'), 'siblings', [new Ident('5838c3ec26f27e1f64abbf8a')] ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf8a'), 'siblings', [new Ident('5838c3ec26f27e1f64abbf8a')] ],
  [ 'stars', '=', new Ident('5838c3ec26f27e1f64abbf8a'), 'companions', [
      new Ident('5838c3ec26f27e1f64abbf8a'),
      new Ident('5838c3ec26f27e1f64abbf87'),
      new Ident('5838c3ec26f27e1f64abbf89')]
  ]
];

test("DB", suite => {

  suite.test('should export all collections', t => {
    t.plan(3 + exported.length);
    var db = new DB({schema: {
      _version: '4.2.1',
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
        constellation: {hasOne: {collection: 'constellations', hasMany: 'stars'}},
        companions: {hasMany: {collection: 'stars', hasMany: 'siblings'}}
      }
    }});

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var constellations = db.collections.constellations;
      var stars = db.collections.stars;
      stars.replace('5838c3ec26f27e1f64abbf87', {name: "Alrami", bayer: "α Sagittarii"});
      var sagitarius_id = constellations.replace('5838c3ec26f27e1f64abbf88', {
        name: "Sagittarius",
        zodiac: "♐",
        location: {ra: 19, dec: -25},
        area: "867 sq. deg.",
        createdAt: Date.parse('2016-11-25T23:06:20.659Z'),
        stars: ['5838c3ec26f27e1f64abbf87']});
      stars.replace('5838c3ec26f27e1f64abbf89', {name: "Arkab", bayer: "β Sagittarii", constellation: '5838c3ec26f27e1f64abbf88'});
      stars.replace('5838c3ec26f27e1f64abbf8a', {name: "Albaldah", bayer: "π Sagittarii", constellation: '5838c3ec26f27e1f64abbf88',
        companions: ['5838c3ec26f27e1f64abbf8a', '5838c3ec26f27e1f64abbf87', '5838c3ec26f27e1f64abbf89']});
      return db.save().then(() => db);
    })
    .then(db => {
      var exporter = db.createDataExporter();
      t.type(exporter, Object);
      t.type(exporter.next, 'function');
      t.type(exporter.throw, 'function');
      var i = 0;
      for(var line of exporter) {
        t.strictEqual(JSON.stringify(line), JSON.stringify(exported[i++]));
      }
    })
    .catch(t.threw);
  });

  suite.end();
});
