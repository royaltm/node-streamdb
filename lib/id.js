"use strict";

const isBuffer = Buffer.isBuffer;
const crypto = require('crypto');
const os = require('os');
const now = Date.now;

const machineId = crypto.createHash('md5').update(os.hostname()).digest();
const buffer = Buffer.allocUnsafe(12);
machineId.copy(buffer, 4, 0, 3);
/*
  IMPORTANT: pid must be unique for the entire host,
  if used inside a docker container make user to run it with --pid=host */
buffer.writeUInt16BE(process.pid, 7);

var counter = crypto.randomBytes(3).readUIntBE(0, 3);

exports.genIdent = function(encoding) {
  var time = (now()/1000)>>>0;
  buffer.writeUInt32BE(time, 0, true);
  buffer.writeUIntBE(counter++, 9, 3, true);
  counter &= 0xffffff;
  return buffer.toString(encoding||'hex');
};

const IDMATCH = /^[0-9a-f]{24}$/;

var isIdent = exports.isIdent = function(value) {
  return 'string' === typeof value && IDMATCH.test(value);
};

const timebuf = new Buffer(4);
exports.getSeconds = function(value) {
  if (isIdent(value)) {
    timebuf.write(value, 'hex');
    value = timebuf;
  } else if (!isBuffer(value) || value.length !== 12) {
    throw TypeError("getSeconds: argument is not a valid identity");
  }
  return value.readUInt32BE(0, true);
};

/* this class is only for exporting idents */
class Ident {
  constructor(id) {
    if (id instanceof Ident) return id;
    if (!isIdent(id)) throw new TypeError("Ident: given constructor argument is not an ident");
    this.toString = () => id;
  }

  get length() {
    return 24;
  }

  valueOf() {
    return this.toString();
  }

  toJSON() {
    return this.toString();
  }

  inspect() {
    return `[Ident: ${this.toString()}]`;
  }
}

exports.Ident = Ident;
