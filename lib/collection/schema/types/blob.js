"use strict";

const { isEncoding, isBuffer } = Buffer;
const { SchemaSyntaxError } = require('../../../errors');

class Blob {
  constructor(schema) {
    var encoding = schema.encoding;
    if (encoding === undefined) encoding = "utf8";
    if (!isEncoding(encoding))
      throw new SchemaSyntaxError("Blob datatype encoding parameter needs to be a proper encoding name");
    this.encoding = encoding;
  }

  validate(value, descr) {
    if (!isBuffer(value)) {
      if ('string' === typeof value) {
        value = Buffer.from(value, this.encoding);
      }
      else throw new TypeError(`${descr.name}: property needs to be a buffer or a string`);
    }

    return value;
  }

  validateElement(value, descr) {
    throw new TypeError(`${descr.name}: Blob forbids element operation`);
  }

  get name() {
    return "Blob";
  }

  toString() {
    return "Blob";
  }

  get isPrimitive() {
    return false;
  }

  static get typeName() {
    return "blob"
  }
}

module.exports = exports = Blob;
