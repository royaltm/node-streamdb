"use strict";

const Duplex = require('stream').Duplex;

const update$ = Symbol.for("update");

module.exports = function createDBStream(db, options) {
  var producing = false;

  options = Object.assign({}, options, {
    objectMode: true,

    write(ary, enc, callback) {
      try {
        db[update$](ary);
      } catch(err) { return callback(err); }
      callback();
    },

    writev(data, callback) {
      try {
        for(var i = 0, len = data.length; i < len; ++i) {
          db[update$](data[i].chunk);
        }
      } catch(err) { return callback(err); }
      callback();
    },

    read(_size) {
      if (producing === false) {
        producing = true;
        db.emit('writable');
      }
    }
  });

  return Object.assign(new Duplex(options), {
    isReadableStreaming: false,

    produce(data) {
      return (producing = this.push(data));
    }

  });

};
