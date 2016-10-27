#!/usr/bin/env node
"use strict";

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

const colors = require('colors/safe');

const { createRepl } = require('../repl');

const msgpack = require('msgpack-lite');

const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;

console.log("----------------------------");
console.log("node-streamdb REPL, welcome!");
console.log("----------------------------");


createRepl().then(repl => {
  repl.on('exitsafe', () => {
    console.log('Received "exit" event from repl!');
    process.exit();
  });
  repl.on('reset', initializeContext);

  const ben = require('ben');

  function initializeContext(context) {

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
    db.stream.pipe(db.stream);
    var constellations = db.collections.constellations;
    var stars = db.collections.stars;
    db.writable.then(o => {
      var alrami_id = stars.create({name: "Alrami", bayer: "α Sagittarii"});
      var sagitarius_id = constellations.create({
        name: "Sagittarius",
        zodiac: "♐",
        location: {ra: 19, dec: -25},
        area: "867 sq. deg.",
        stars: [alrami_id]});
      stars.create({name: "Arkab", bayer: "β Sagittarii", constellation: sagitarius_id});
      stars.create({name: "Albaldah", bayer: "π Sagittarii", constellation: sagitarius_id});
      return db.save();
    }).then(() => {
      console.log(colors.green('\nDatabase ready!'));
      repl.lineParser.reset();
      repl.bufferedCommand = '';
      repl.displayPrompt();
    }).catch(err => console.warn(err.stack));

    Object.assign(context, {
      colors
    , ri: repl
    , msgpack
    , ben
    , DB
    , Item
    , Collection
    , db
    , constellations
    , stars
    });

  }

  initializeContext(repl.context);
}).catch(err => console.warn(err.stack));


/*

var gzip = zlib.createGzip();
for(var i = 0; i < 100000; ++i) {
  gzip.write(msgpack.encode(['somethin','sanitet',i,{foo:'bar'}]))
  let x = gzip.read();
  if (x !== null) console.log(x)
}

*/
