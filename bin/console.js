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
const { Item } = require('../lib/collection/item');
const { Collection } = require('../lib/collection');
const { iter, orderBy, range, times, Iterator, filterFunction } = require('../lib/iter');

const createExampleDb = require('../example/cellestial');

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
    createExampleDb().then(db => {
      console.log(colors.green('\nDatabase ready!'));
      repl.lineParser.reset();
      repl.bufferedCommand = '';
      repl.displayPrompt();

      context.db = db;
      context.constellations = db.collections.constellations;
      context.stars = db.collections.stars;
      context.c = db.collections;
    }).catch(err => console.warn(err.stack));

    Object.assign(context, {
      colors
    , ri: repl
    , msgpack
    , ben
    , DB
    , Item
    , Collection
    , iter
    , orderBy
    , range
    , times
    , Iterator
    , filterFunction
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
