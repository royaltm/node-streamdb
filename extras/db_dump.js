"use strict";

const { createReadStream, createWriteStream } = require('fs');

const { createEncodeStream, createDecodeStream } = require('msgpack-lite');

const { createUnzip, createGzip, Z_NO_COMPRESSION, Z_BEST_COMPRESSION } = require('zlib');

const { codec, asymmetricCodec } = require('./msgpack_lite_codec');
const IteratorReader = require('./iterator_reader');
const ImportTransform = require('./import_transform');
const dbUpdateStream = require('./db_update_stream');

const DEFAULT_CHUNK_SIZE = 131072;

exports.dumpDatabase = dumpDatabase;
exports.createDumpReadStream = createDumpReadStream;
exports.restoreLocalDatabase = restoreLocalDatabase;
exports.restoreDatabase = restoreDatabase;
exports.createRestoreStreamPair = createRestoreStreamPair;

/**
 * Exports database into a msgpacked binary file with optional zip compression.
 *
 * `options` are:
 *
 * - `compressionLevel` {number}: default is zlib.Z_BEST_COMPRESSION
 *
 * to turn of compression pass zlib.Z_NO_COMPRESSION to `compressionLevel` options.
 *
 * Any other options are passed to fs.createWriteStream.
 *
 * @param {DB} db
 * @param {string} filePath
 * @param {Object|string} [options]
 * @return {Promise}
 **/
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


/**
 * Locally restores database from a msgpacked export file with optional zip inflation.
 *
 * This method will pipe exported data directly to the writable part of the db.stream
 * so the data after import will be only available in a local database instance.
 *
 * @param {DB} db
 * @param {string} filePath
 * @param {bool} [nounzip] - no zip inflation
 * @return {Promise}
 **/
function restoreLocalDatabase(db, filePath, nounzip) {
  return new Promise((resolve, reject) => {
    const {writer, reader} = createRestoreStreamPair(nounzip, asymmetricCodec, {chunkSize: DEFAULT_CHUNK_SIZE});
    const fileReader = createReadStream(filePath, {highWaterMark: DEFAULT_CHUNK_SIZE});
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

/**
 * Restores database from a msgpacked export file with optional zip inflation.
 *
 * This method will update all interconnected databases globally with the imported data.
 *
 * Every database instance connected to the log stream source will be affected.
 *
 * This operation is not atomic and updated data can be divided into many log entry updates.
 *
 * @param {DB} db
 * @param {string} filePath
 * @param {bool} [nounzip] - no zip inflation
 * @param {number} [updateChunkSize] - a rough estimation of the expected single log entry size
 * @return {Promise}
 **/
function restoreDatabase(db, filePath, nounzip, updateChunkSize) {
  if ('number' === typeof nounzip) {
    updateChunkSize = nounzip, nounzip = false;
  }
  updateChunkSize = (updateChunkSize>>>0) || DEFAULT_CHUNK_SIZE;

  return new Promise((resolve, reject) => {
    const {writer, reader} = createRestoreStreamPair(nounzip, codec, {chunkSize: updateChunkSize});
    const fileReader = createReadStream(filePath, {highWaterMark: updateChunkSize});
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

function createRestoreStreamPair(nounzip, mpcodec, unzipOptions) {
  var writer;

  unzipOptions = Object.assign({chunkSize: DEFAULT_CHUNK_SIZE}, unzipOptions);

  const reader = createDecodeStream({codec: mpcodec || codec});
  if (!nounzip) {
    writer = createUnzip(unzipOptions)
    .on('error', err => reader.emit('error', err));
    writer.pipe(reader);
  }
  else {
    writer = reader;
  }

  return {writer, reader};
}
