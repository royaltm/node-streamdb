"use strict";

const { isEncoding, isBuffer } = Buffer;
const { SchemaSyntaxError } = require('../../../errors');

const Type = require('./base');

class Blob extends Type {
  constructor(schema, property) {
    super();
    var encoding = schema.encoding;
    if (encoding === undefined) encoding = "utf8";
    if (!isEncoding(encoding))
      throw new SchemaSyntaxError(`${property}: Blob datatype encoding schema property needs to be a proper encoding name`);
    this.encoding = encoding;
  }

  validate(value, descr) {
    if (!isBuffer(value)) {
      if ('string' === typeof value) {
        value = Buffer.from(value, this.encoding);
      }
      else throw new TypeError(`${descr.name}: property needs to be a buffer or a properly encoded string`);
    }

    return value;
  }

  validateElement(value, descr) {
    throw new TypeError(`${descr.name}: Blob forbids element operation`);
  }

  static get typeName() {
    return "blob"
  }
}

module.exports = exports = Blob;
