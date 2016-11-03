"use strict";

const Duplex = require('stream').Duplex;

const isArray = Array.isArray;

const $update = Symbol.for("update");

class DBStream extends Duplex {
  constructor(db, options) {
    options = Object.assign({objectMode: true}, options || {});

    super(options);

    this._write = function(chunk, encoding, callback) {
      try {
        db[$update](chunk);
      } catch(err) { return callback(err); }
      callback();
    }

    this._read = function(size) {
      delete this._read;
      db.emit('writable');
    };
  }

  get isReadableStreaming() {
    return this._read === DBStream.prototype._read;
  }

  _read(size) {}
}

module.exports = DBStream;
