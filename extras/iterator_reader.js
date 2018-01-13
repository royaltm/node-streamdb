"use strict";

const { Readable } = require('stream');

/*

  turns iterator into readable object stream

  example:

    const { asymmetricCodec } = require('./msgpack_lite_codec');
    const exportIterator = db.createDataExporter();
    new IteratorReader(exportIterator)
    .pipe(msgpack.createEncodeStream({codec: asymmetricCodec}))
    .pipe(fs.createWriteStream("dump.db"));

*/

class IteratorReader extends Readable {
  constructor(iterator, options) {
    options = Object.assign({objectMode: true}, options);

    if ('function' !== typeof iterator.next) {
      iterator = iterator[Symbol.iterator]();
    }

    super(options);

    this.iterator = iterator;
  }

  _read(size) {
    var line
      , iterator = this.iterator;

    try {
      do {
        line = iterator.next();
        if (line.done) {
          this.push(null);
          return;
        }
      } while (this.push(line.value));
    } catch(err) {
      setImmediate(() => this.emit('error', err));
    }
  }
}

module.exports = exports = IteratorReader;
