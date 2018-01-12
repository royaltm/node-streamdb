"use strict";

const dbUpdateStream = require('./db_update_stream');

const { Transform } = require('stream');

module.exports = function dbCollectionCreateStream(collection, options) {
  options = Object.assign({}, options, {
    updater(obj) {
      collection.create(obj);
    }
  });

  return dbUpdateStream(collection.db, options);
};
