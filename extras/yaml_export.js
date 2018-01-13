"use strict";

const os = require('os');
const { createWriteStream
      , createReadStream
      , readFile } = require('fs');
const path = require('path');
const { Transform } = require('stream');

const mkdirp = require('mkdirp');

const yaml = require('js-yaml');

const IteratorReader = require('./iterator_reader');
const dbCollectionCreateStream = require('./db_collection_create_stream');

const { exportSym: export$
      , thisSym: this$
      , idSym: id$ } = require('../lib/collection/symbols');

const { Ident } = require('../lib/id');

const DB_SCHEMA = require('./yaml_schema');

const YAML_EXPORT_OPTIONS = {
  flowLevel: 4
, schema: DB_SCHEMA
, noCompatMode: true
, sortKeys: true
};

const yamlImportOptions = (filename) => ({
  filename, schema: DB_SCHEMA
});

const makeMetaPath = (dataPath) => path.join(dataPath, '_meta.yml');
const makeCollPath = (dataPath, name) => path.join(dataPath, name + '.yml');

exports.exportDbToYamls = exportDbToYamls;
exports.exportMetaToYaml = exportMetaToYaml;
exports.exportCollectionToYaml = exportCollectionToYaml;
exports.collectionToYamlExportStream = collectionToYamlExportStream;
exports.importDbFromYaml = importDbFromYaml;
exports.importCollectionFromYaml = importCollectionFromYaml;
exports.verifyMetaVersion = verifyMetaVersion;
exports.createYamlToObjTransform = createYamlToObjTransform;


function exportDbToYamls(db, dataPath, reporter, yamlOptions) {
  if ('object' === typeof reporter && reporter !== null) {
    yamlOptions = reporter, reporter = undefined;
  }
  /* prevent db updates during exporting */
  db.stream.cork();
  /* ensure db updates will be possible */
  const finish = () => db.stream.uncork();
 
  /* make a path */
  return new Promise((resolve, reject) => {
    mkdirp(dataPath, (err) => {
      if (err) reject(err); else resolve();
    });
  })
  .then(() => exportMetaToYaml(db, dataPath, yamlOptions))
  .then(() => Promise.all(
      Object.keys(db.collections)
            .map(name => exportCollectionToYaml(db.collection(name), dataPath, yamlOptions)
              .then(() => reporter && reporter("exported collection: %j", name))
            )
      )
  )
  .then(finish, (err) => {
    finish();
    throw err;
  });
}

function exportMetaToYaml(db, dataPath, yamlOptions) {
  yamlOptions = Object.assign({}, yamlOptions);

  return new Promise((resolve, reject) => {
    var metastr = yaml.dump({
      version: db.schemaVersion.version,
      created: new Date(),
      path: dataPath,
      host: os.hostname(),
      user: os.userInfo(),
      schema: db.schema
    }, yamlOptions);
    const metaPath = makeMetaPath(dataPath);
    const writer = createWriteStream(metaPath, {flags: 'wx'});
    writer
    .on('error', err => {
      writer.close();
      reject(err);
    })
    .on('finish', resolve)
    .end(metastr);
  });
}

function exportCollectionToYaml(collection, dataPath, yamlOptions) {
  const name = collection.name
      , collPath = makeCollPath(dataPath, name);

  return new Promise((resolve, reject) => {
    const writer = createWriteStream(collPath, {flags: 'wx'});
    const error = err => {
      writer.close();
      reject(err);
    };
    collectionToYamlExportStream(collection, yamlOptions)
    .on('error', error)
    .pipe(writer)
    .on('error', error)
    .on('finish', resolve);
  });
}

function collectionToYamlExportStream(collection, yamlOptions) {
  return new IteratorReader(exportItems(collection, yamlOptions), {objectMode: false});
}

function *exportItems(collection, yamlOptions) {
  yamlOptions = Object.assign({}, YAML_EXPORT_OPTIONS, yamlOptions);
  var proxy, item, obj;
  for(proxy of collection.values()) {
    item = proxy[this$];
    try {
      obj = item[export$]();
      obj._id = new Ident(item[id$]);
    } catch(e) {
      // ignore revoke errors
      console.error(e);
      continue;
    }
    let str = yaml.dump(obj, yamlOptions);
    yield '---\n' + str;
  }
}


function importDbFromYaml(db, dataPath, merge, reporter, updateChunkSize) {
  if ('number' === typeof reporter) {
    updateChunkSize = reporter, reporter = undefined;
  }

  return verifyMetaVersion(db, dataPath)
  .then(() => {
    var success = 0;

    const names = Object.keys(db.collections);
    if (names.length === 0) {
      if (reporter) reporter("No collections to import");
      return Promise.resolve(0);
    }

    function next() {
      const collection = db.collection(names.shift())
          , name = collection.name
          , collPath = makeCollPath(dataPath, name);

      return importCollectionFromYaml(collection, collPath, merge, updateChunkSize)
      .then(count => {
        ++success;
        if (reporter) reporter("Imported collection: %j items: %s", name, count);
      },
      err => {
        if (err.code === 'ENOENT') {
          console.error("Skipping: %s, no such file: %j", name, collPath);
        }
        else throw err;
      })
      .then(() => {
        if (names.length !== 0) return next();
      });
    }

    return next().then(() => success);
  });
}

function verifyMetaVersion(db, dataPath) {
  var metaPath = makeMetaPath(dataPath);

  return new Promise((resolve, reject) => readFile(metaPath, 'utf8', (err, text) => {
      if (err) reject(err); else resolve(text);
  }))
  .then(text => yaml.load(text, {filename: metaPath}))
  .then(meta => db.pushVersionMark(meta.version));
}

function importCollectionFromYaml(collection, collPath, merge, updateChunkSize) {
  var readStreamOptions = {encoding: 'utf8', highWaterMark: 131027};
  if (updateChunkSize !== undefined) readStreamOptions.highWaterMark = updateChunkSize;

  return new Promise((resolve, reject) => {
    collection.db.begin();
    if (!merge) collection.deleteAll();
    const reader = createReadStream(collPath, readStreamOptions);
    const error = err => {
      reader.close();
      reject(err);
    };
    reader
    .on('error', error)
    .pipe(createYamlToObjTransform(yamlImportOptions(collPath)))
    .on('error', error)
    .pipe(dbCollectionCreateStream(collection))
    .on('error', error)
    .on('data', resolve);
  });
}

function createYamlToObjTransform(yamlOptions) {
  var str = '';

  return new Transform({
    readableObjectMode: true,
    decodeStrings: false,
    transform(chunk, enc, callback) {
      str += chunk;
      let start = 0
        , end = str.indexOf('\n---\n');
      try {
        while (end !== -1) {
          let obj = yaml.load(str.slice(start, end), yamlOptions);
          this.push(obj);
          start = end + 1;
          end = str.indexOf('\n---\n', start + 3);
        }
        if (start !== 0) str = str.slice(start);
      } catch(err) {
        return callback(err);
      }
      callback();
    },
    flush(callback) {
      if (str.length !== 0) {
        try {
          let obj = yaml.load(str, yamlOptions);
          this.push(obj);
        } catch(err) {
          return callback(err);
        }
      }
      callback();
    }
  });
}
