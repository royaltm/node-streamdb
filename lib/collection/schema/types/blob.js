"use strict";

const { isEncoding, isBuffer } = Buffer;
const { SchemaSyntaxError } = require('../../../errors');

const name$ = Symbol.for("name");

const Type = require('./base');

class Blob extends Type {
  constructor(schema, property, collectionName) {
    super();
    var encoding = schema.encoding;
    if (encoding === undefined) encoding = "utf8";
    if (!isEncoding(encoding))
      throw new SchemaSyntaxError(`${collectionName}: Blob schema property "encoding" needs to be a proper encoding for ${property}`);
    this.encoding = encoding;
  }

  validate(value, descr) {
    if (!isBuffer(value)) {
      if ('string' === typeof value) {
        value = Buffer.from(value, this.encoding);
      }
      else throw new TypeError(`${descr[name$]}: property needs to be a buffer or a properly encoded string`);
    }

    return value;
  }

  validateElement(value, descr) {
    throw new TypeError(`${descr[name$]}: Blob forbids element operation`);
  }

  toObject(value) {
    return value.toString(this.encoding);
  }

  static get typeName() {
    return "blob"
  }
}

module.exports = exports = Blob;
