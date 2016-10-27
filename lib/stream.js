"use strict";

const assert = require('assert');
const Duplex = require('stream').Duplex;

const isArray = Array.isArray;

const $update = Symbol.for("update");

class DBStream extends Duplex {
  constructor(db, options) {
    options || (options = {});
    if (options.objectMode === undefined)
      options.objectMode = true;

    super(options);

    if (!options.objectMode) {
      throw new Error("unimplemented");
      // this.push = serializer.bind(this);
      // this._write = deserialize.bind(db);
      // this._writev = deserializeMany.bind(db);
    } else {
      this._write = function(chunk, encoding, callback) {
        assert(isArray(chunk));
        db[$update](...chunk);
        callback();
      }

      this.push = function() {
        throw new Error("DBStream: please connect readable end to some destination before making updates");
      };
      this._read = function(size) {
        delete this.push;
        delete this._read;
        db.emit('writable');
      };
    }
  }

  get isReadableStreaming() {
    return this._read === DBStream.prototype._read;
  }

  _read(size) {}
}

function serializer([ident, ...args]) {
  // TODO: finish this
  // var offset = collection.length;
  // var propsize = property.length;
  // var datasize = data.length;
  // var buf = new Buffer(offset + propsize + datasize + 31);
  // buf[0] = offset;
  // buf.write(collection, 1);
  // buf.write(id, offset += 1, 'hex');
  // offset += 12;
  // buf.writeInt16LE(propsize, offset);
  // buf.write(property, offset += 2);
  // buf[offset++] = operator.charAt(0);
  // buf.writeInt32LE(datasize, offset);  
  // buf.write(data, offset + 4);
  // super.push(buf);
}



module.exports = DBStream;
