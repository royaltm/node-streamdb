#!/usr/bin/env node
"use strict";

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

const colors = require('colors/safe');

const { createRepl, databaseRepl } = require('../lib/repl');

const msgpack = require('msgpack-lite');

const DB = require('../lib');
const { Item } = require('../lib/collection/item');
const { Collection } = require('../lib/collection');
const { iter, orderBy, range, times, Iterator, createFilterFn } = require('../lib/iter');
const createExampleDb = require(`../example/${process.argv[2] || 'cellestial'}`);

console.log("----------------------------");
console.log("node-streamdb REPL, welcome!");
console.log("----------------------------");


createRepl().then(repl => {
  repl.on('exitsafe', () => {
    console.log('Received "exit" event from repl!');
    process.exit();
  });
  repl.on('reset', initializeContext);

  databaseRepl(repl);

  const ben = require('ben');

  function initializeContext(context) {
    createExampleDb().then(db => {
      console.log(colors.green('\nDatabase ready!'));
      repl.lineParser.reset();
      repl.bufferedCommand = '';
      repl.displayPrompt();

      context.database = db;

      context.db = {};

      for(let name in db.collections) {
        context.db[name] = db.collection(name);
      }
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
    , createFilterFn
    });

  }

  initializeContext(repl.context);
}).catch(err => console.warn(err.stack));
