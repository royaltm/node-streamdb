"use strict";

const { Transform } = require('stream');

const isArray = Array.isArray;

const anonymousId = Symbol('anonymous');

/*

  prepends array with anonymous id

  example:

    const codec = require("./msgpack_lite_codec");
    fs.createReadStream("dump.db")
    .pipe(msgpack.createDecodeStream({codec: codec}))
    .pipe(new ImportTransform())
    .pipe(db.stream, {end: false});
*/

class ImportTransform extends Transform {
  constructor(options) {
    options = Object.assign({}, options, {objectMode: true});

    super(options);
  }

  _transform(array, enc, callback) {
    if (!isArray(array)) {
      callback(new TypeError('expecting stream of arrays'));
    }
    else {
      array.unshift(anonymousId);
      callback(null, array);
    }
  }
}

module.exports = exports = ImportTransform;
