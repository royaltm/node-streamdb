"use strict";

const dbUpdateStream = require('./db_update_stream');

/**
 * Produces a transform stream which calculates a number of items created
 * and as a side effect updates the database with the data from object stream.
 *
 * Throttles updates.
 *
 * Turns off database autosave.
 *
 * Source stream should produce objects that can be passed directly to `collection.create` method.
 *
 *
 * @param {Collection} collection
 * @param {Object} [options] Transform initialization options
 * @return {Transform}
 **/
module.exports = function dbCollectionCreateStream(collection, options) {
  options = Object.assign({}, options, {
    updater(obj) {
      collection.create(obj);
    }
  });

  return dbUpdateStream(collection.db, options);
};
