"use strict";

const MSGPACK_ID_EXT = 0x42;

const { createCodec } = require('msgpack-lite');
const { Ident } = require('../lib/id');

/*
  This is codec for msgpack-lite to save collection items' id as 12 byte buffer.
  Assymetrically unpacking Idents as hex strings, more convenient to write to db.stream.
*/
const asymmetricCodec = exports.asymmetricCodec = createCodec({preset: true});
const codec = exports.codec = createCodec({preset: true});

asymmetricCodec.addExtPacker(MSGPACK_ID_EXT, Ident, identPacker);
asymmetricCodec.addExtUnpacker(MSGPACK_ID_EXT, identStringUnpacker);

codec.addExtPacker(MSGPACK_ID_EXT, Ident, identPacker);
codec.addExtUnpacker(MSGPACK_ID_EXT, identUnpacker);

function identPacker(ident) {
  return Buffer.from(ident.toString(), 'hex');
}

/* asymmetric unpacker creates strings */
function identStringUnpacker(buffer) {
  return buffer.toString('hex');
}

/* symmetric unpacker creates Idents */
function identUnpacker(buffer) {
  return new Ident(buffer.toString('hex'));
}
