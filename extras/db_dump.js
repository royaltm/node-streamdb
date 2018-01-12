"use strict";

const { createReadStream, createWriteStream } = require('fs');

const { createEncodeStream, createDecodeStream } = require('msgpack-lite');

const { createUnzip, createGzip, Z_NO_COMPRESSION, Z_BEST_COMPRESSION, constants } = require('zlib');

const { codec, asymmetricCodec } = require('./msgpack_lite_codec');
const IteratorReader = require('./iterator_reader');
const ImportTransform = require('./import_transform');
const dbUpdateStream = require('./db_update_stream');

exports.dumpDatabase = dumpDatabase;
exports.createDumpReadStream = createDumpReadStream;
exports.restoreLocalDatabase = restoreLocalDatabase;
exports.restoreDatabase = restoreDatabase;
exports.createRestoreStreamPair = createRestoreStreamPair;

function dumpDatabase(db, filePath, options) {
  var compressionLevel = Z_BEST_COMPRESSION;
  if ('string' === typeof options) {
    options = {encoding: options};
  }
  else if ('number' === typeof options) {
    compressionLevel = options, options = undefined;
  }
  else if (options != null) {
    if (options.compressionLevel !== undefined) {
      compressionLevel = options.compressionLevel;
    }
  }

  return new Promise((resolve, reject) => {
    const writer = createWriteStream(filePath, options);
    const error = err => {
      db.stream.uncork();
      writer.close();
      reject(err);
    };
    db.stream.cork();
    createDumpReadStream(db, compressionLevel)
    .on('error', error)
    .pipe(writer)
    .on('error', error)
    .on('finish', () => {
      db.stream.uncork();
      resolve()
    });
  });
}

function createDumpReadStream(db, compressionLevel) {
  if (compressionLevel === undefined) compressionLevel = Z_BEST_COMPRESSION;

  var transform
    , reader = new IteratorReader(db.createDataExporter())
    , encoder = createEncodeStream({codec: codec});

  reader
  .on('error', err => encoder.emit('error', err))
  .pipe(encoder);

  if (compressionLevel !== Z_NO_COMPRESSION) {
    transform = createGzip({level: compressionLevel});
    encoder
    .on('error', err => transform.emit('error', err))
    .pipe(transform);
  }
  else {
    transform = encoder;
  }

  return transform;
}


function restoreLocalDatabase(db, filePath, nounzip) {
  return new Promise((resolve, reject) => {
    const {writer, reader} = createRestoreStreamPair(nounzip, asymmetricCodec);
    const fileReader = createReadStream(filePath, {highWaterMark: 131072});
    const error = err => {
      db.stream.removeListener('error', error);
      fileReader.close();
      reject(err);
    };
    fileReader
    .on('error', error)
    .pipe(writer);
    reader
    .on('error', error)
    .pipe(new ImportTransform())
    .on('error', error)
    .on('end', () => {
      db.stream.removeListener('error', error);
      resolve();
    })
    .pipe(db.stream, {end: false})
    .on('error', error);
  });
}

function restoreDatabase(db, filePath, nounzip) {
  return new Promise((resolve, reject) => {
    const {writer, reader} = createRestoreStreamPair(nounzip);
    db.begin();
    const fileReader = createReadStream(filePath, {highWaterMark: 131072});
    const error = err => {
      fileReader.close();
      reject(err);
    };
    fileReader
    .on('error', error)
    .pipe(writer);
    reader
    .on('error', error)
    .pipe(dbUpdateStream(db))
    .on('error', error)
    .on('data', resolve);
  });
}

function createRestoreStreamPair(nounzip, mpcodec) {
  var writer;
  const reader = createDecodeStream({codec: mpcodec || codec});
  if (!nounzip) {
    writer = createUnzip({highWaterMark: 131072, chunkSize: 131072})
    .on('error', err => reader.emit('error', err));
    writer.pipe(reader);
  }
  else {
    writer = reader;
  }

  return {writer, reader};
}
