"use strict";

const DB = require('../lib');

module.exports = function(schemaOnly) {
  var db = new DB({schema: {
    groups: {
      createdAt: {type: Date, required: true, default: Date.now},
      name: {type: String, unique: true, required: true}
    },
    roles: {
      role: {type: 'enum', index: true, required: true, enum: ['owner', 'admin', 'guest']},
      group: {hasOne: {collection: 'groups', hasMany: 'roles'}},
      users: {hasMany: {collection: 'users', hasMany: 'roles'}}
    },
    users: {
      createdAt: {type: Date, required: true, default: Date.now},
      name: {type: String, unique: true, required: true},
      email: String
    }
  }});

  if (schemaOnly) return Promise.resolve(db);

  db.stream.pipe(db.stream);
  return db.writable.then(db => {
    var roles = db.collections.roles;
    var users = db.collections.users;
    var groups = db.collections.groups;

    var badassesId = groups.create({name: 'Badasses'});
    var wimpsId = groups.create({name: 'Wimps'});

    var badassOwnerId = roles.create({role: 'owner', group: badassesId});
    var badassAdminId = roles.create({role: 'admin', group: badassesId});
    var badassGuestId = roles.create({role: 'guest', group: badassesId});

    var wimpOwnerId = roles.create({role: 'owner', group: wimpsId});
    var wimpAdminId = roles.create({role: 'admin', group: wimpsId});
    var wimpGuestId = roles.create({role: 'guest', group: wimpsId});

    users.create({name: "Badass Numer Uno", roles: [wimpOwnerId, badassOwnerId, badassAdminId]});
    users.create({name: "BOFH",             roles: [badassAdminId]});
    users.create({name: "LART user",        roles: [badassAdminId]});
    users.create({name: "Badass MF",        roles: [badassGuestId]});

    users.create({name: "Whiny admin",      roles: [wimpAdminId]});
    users.create({name: "Wimpy 1",          roles: [wimpGuestId]});
    users.create({name: "Whiny guest",      roles: [wimpGuestId]});

    users.create({name: "The Guest",        roles: [badassGuestId, wimpGuestId]});

    return db.save().then(() => db);
  });
};
