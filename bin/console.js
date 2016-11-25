#!/usr/bin/env node
"use strict";

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

const colors = require('colors/safe');

const { createRepl, databaseRepl, prompt } = require('../lib/repl');

const msgpack = require('msgpack-lite');

const DB = require('../lib');
const { Item } = require('../lib/collection/item');
const { Collection } = require('../lib/collection');
const { iter, orderBy, range, times, Iterator, createFilterFn } = require('../lib/iter');
const databaseName = process.argv[2] || 'cellestial';
const createExampleDb = require(`../example/${databaseName}`);

console.log("----------------------------");
console.log("node-streamdb REPL, welcome!");
console.log("----------------------------");


createRepl().then(repl => {
  repl.on('exitsafe', () => {
    console.log('Received "exit" event from repl!');
    process.exit();
  });
  repl.on('reset', initializeContext);

  databaseRepl(repl, {databaseName});

  const ben = require('ben');

  function initializeContext(context) {
    createExampleDb().then(db => {
      console.log(colors.green('\nDatabase ready!'));
      context.database = db;
      context.db = db.collections;

      db.on('error', err => {
        console.log("%s %s", colors.red('ERROR'), err);
        if (err.stack) console.warn(err.stack);
        prompt(repl);
      })
      .on('version', ver => {
        console.log("DB schema version tag accepted: %s", colors.green(ver.version));
        prompt(repl);
      });

      repl.resetDatabasePrompt();
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
