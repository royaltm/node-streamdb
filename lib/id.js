"use strict";

const crypto = require('crypto');
const os = require('os');
const now = Date.now;
const isString = require('util').isString;

const machineId = crypto.createHash('md5').update(os.hostname()).digest();
const buffer = new Buffer(12);
machineId.copy(buffer, 4, 0, 3);
buffer.writeUInt16BE(process.pid, 7);

var counter = crypto.randomBytes(3).readUIntBE(0, 3);

exports.genIdent = function() {
  var time = (now()/1000)>>>0;
  buffer.writeUInt32BE(time, 0);
  buffer.writeUIntBE(counter++, 9, 3);
  counter &= 0xffffff;
  return buffer.toString('hex');
};

const IDMATCH = /^[0-9a-f]{24}$/;

exports.isIdent = function(value) {
  return isString(value) && IDMATCH.test(value);
};
