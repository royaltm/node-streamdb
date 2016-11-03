"use strict";

const DB = require('../lib');

module.exports = function(schemaOnly) {
  var db = new DB({schema: {
    constellations: {
      name: {type: String, unique: true, required: true},
      'location.ra': Number,
      'location.dec': Number,
      zodiac: String,
      createdAt: {type: Date, required: true, default: Date.now}
    },
    stars: {
      name: {type: String, unique: true, required: true},
      bayer: String,
      constellation: {hasOne: {collection: 'constellations', hasMany: 'stars'}}
    }
  }});

  if (schemaOnly) return Promise.resolve(db);

  db.stream.pipe(db.stream);
  return db.writable.then(db => {
    var constellations = db.collections.constellations;
    var stars = db.collections.stars;
    var alrami_id = stars.create({name: "Alrami", bayer: "α Sagittarii"});
    var sagitarius_id = constellations.create({
      name: "Sagittarius",
      zodiac: "♐",
      location: {ra: 19, dec: -25},
      area: "867 sq. deg.",
      stars: [alrami_id]});
    stars.create({name: "Arkab", bayer: "β Sagittarii", constellation: sagitarius_id});
    stars.create({name: "Albaldah", bayer: "π Sagittarii", constellation: sagitarius_id});
    return db.save().then(() => db);
  });
};
