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
      users: {hasMany: {collection: 'users', hasMany: 'roles'}},
      rolesGroups: {unique: true, components: ['role', 'group']}
    },
    users: {
      createdAt: {type: Date, required: true, default: Date.now},
      login: {type: String, unique: true, required: true},
      email: String,
      firstName: String,
      lastName: String,
      nameEmail: ['lastName', 'firstName', 'email']
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

    users.create({login: "Badass Numer Uno", roles: [wimpOwnerId, badassOwnerId, badassAdminId],
        firstName: "Dżon", lastName: "Kowalski", email: "dzon@badasses.me"});
    users.create({login: "BOFH",             roles: [badassAdminId],
        firstName: "Suzuki", lastName: "Kowalski", email: "suzu@badasses.me"});
    users.create({login: "LART user",        roles: [badassAdminId],
        firstName: "Suzuki", lastName: "Kowalski"});
    users.create({login: "Badass MF",        roles: [badassGuestId],
        firstName: "Misha", lastName: "Zupenko", email: "zupenko@ru.net"});
    users.create({login: "Whiny admin",      roles: [wimpAdminId],
        lastName: "Kowalski"});
    users.create({login: "Wimpy 1",          roles: [wimpGuestId],
        firstName: "Foo", lastName: "Bar"});
    users.create({login: "Whiny guest",      roles: [wimpGuestId],
        firstName: "Foo", lastName: "Bar"});
    users.create({login: "The Guest",        roles: [badassGuestId, wimpGuestId],
        firstName: "Clint", lastName: "Eastwood", email: "goahead@makemy.day"});

    return db.save().then(() => db);
  });
};
