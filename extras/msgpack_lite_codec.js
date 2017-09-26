"use strict";

const MSGPACK_ID_EXT = 0x42;

const { createCodec } = require('msgpack-lite');
const { Ident } = require('../lib/id');

/*
  This codec for msgpack-lite to save collection items' id as 12 byte buffer.
  Assymetrically unpacking Idents as hex strings, more convenient to write to db.stream.
*/
const codec = module.exports = exports = createCodec({preset: true});

codec.addExtPacker(MSGPACK_ID_EXT, Ident, identPacker);
codec.addExtUnpacker(MSGPACK_ID_EXT, identUnpacker);

function identPacker(ident) {
  return Buffer.from(ident.toString(), 'hex');
}

/* asymmetric unpacker creates strings */
function identUnpacker(buffer) {
  return buffer.toString('hex');
}
