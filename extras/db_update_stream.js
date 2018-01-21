"use strict";

const { Transform } = require('stream');

const isArray = Array.isArray;

/**
 * Produces a transform stream which calculates a number of updates
 * and as a side effect updates the database with the data from object stream.
 *
 * Throttles updates.
 *
 * Turns off database autosave.
 *
 * By default source stream should produce 5-element array tuples as arguments for db._push.
 *
 * However you can override whatever your database command is by providing the `updater(chunk)` option.
 *
 * @param {DB} db
 * @param {Object} [options] updater and Transform initialization options
 * @return {Transform}
 **/
module.exports = function dbUpdateStream(db, options) {
  options = Object.assign({}, options);

  var counter = 0
    , flusher
    , wantFlush = false
    , updater = options.updater;

  if (updater === undefined) {
    const push = db._push;
    updater = (ary) => {
      if (!isArray(ary) || ary.length !== 5) {
        throw new TypeError("DbUpdateStream: expecting 5 element tuple");
      }
      push.apply(db, ary);
    };
  }
  else {
    delete options.updater;
    if ('function' !== typeof updater) {
      throw new TypeError("DbUpdateStream: updater must be a function");
    }
  }

  db.begin();

  return new Transform(Object.assign(options, {
    objectMode: true,

    transform(obj, enc, callback) {
      try {
        ++counter;
        updater(obj);
      }
      catch(err) {
        return callback(err);
      }

      if (flusher === undefined) flusher = setImmediate(() => { wantFlush = true });

      if (wantFlush) {
        wantFlush = false;
        flusher = undefined;
        if (db._flush() === false) {
          db.once('writable', callback);
        }
        else {
          callback();
        }
      }
      else {
        callback();
      }
    },

    flush(callback) {
      db._flush();
      callback(null, counter);
    }
  }));

};
