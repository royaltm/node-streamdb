"use strict";

const DB = require('../lib');

module.exports = function(schemaOnly) {
  var db = new DB({schema: {
    test: {
      name: String,
      time: Date,
      'other.nested.count': Number,
      'other.nested.flag': {type: Boolean, required: true},
      'other.yet.anything': {required: true, default: null}
    }
  }});

  if (schemaOnly) return Promise.resolve(db);

  db.stream.pipe(db.stream);
  return db.writable.then(db => {
    db.collections.test.create({name: 'foo', time: new Date, other:{nested:{flag:false}}});
    db.collections.test.create({name: 'bar', time: new Date(0), other:{nested:{flag:true,count:1},yet:{anything:[]}}});
    return db.save().then(() => db);
  });
};
