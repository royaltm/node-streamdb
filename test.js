"use strict";

const DB = require('./lib');
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

// var db2 = new DB({schema: schema});

// const syncStream = new require('stream').PassThrough({objectMode: true});

// db.stream.pipe(syncStream).pipe(db.stream);
// db2.stream.pipe(syncStream).pipe(db2.stream);
db.stream.pipe(db.stream);

/*
require('./test')
var constellations = db.collections.constellations;
var stars = db.collections.stars;
constellations[Symbol.for('schema')]
stars[Symbol.for('schema')]

var starid = stars.create({name: "Alrami", bayer: "α Sagittarii"});constellations.createAndSave({
  name: "Sagittarius",
  zodiac: "♐",
  location: {ra: 19, dec: -25},
  area: "867 sq. deg.",
  stars: [starid]}).then(c=>console.log("%j", c));

var starid = stars.create({name: "Alrami", bayer: "α Sagittarii"})
var star = stars[starid];
constellations.createAndSave({name: "Sagittarius", zodiac: "♐", location: {ra: 19, dec: -25}, area: "867 sq. deg.", stars: [star]}).then(c=>console.log("%j", c));

constellations.createAndSave({name: "Sagittarius", zodiac: "♐", location: {ra: 19, dec: -25}, area: "867 sq. deg.", stars: [stars.create({name: "Alrami", bayer: "α Sagittarii"})]}).then(c=>console.log("%j", c));



var bid = db.collections.bars.create();
var fid = db.collections.foos.create();
var fid2 = db.collections.foos.create();

var bar = db.collections.bars[bid];
var foo = db.collections.foos[fid];
var foo2 = db.collections.foos[fid2];
foo.bar = bar;
delete db.collections.foos[fid]

var bar2 = db2.collections.bars[bid];
var foo2 = db2.collections.foos[fid];

*/
global.db = db;
// global.db2 = db2;
global.DB = DB;
