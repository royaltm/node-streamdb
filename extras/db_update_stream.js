"use strict";

const { Transform } = require('stream');

const isArray = Array.isArray;

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
        if (db._flush()) {
          callback();
        }
        else {
          db.once('writable', callback);
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
