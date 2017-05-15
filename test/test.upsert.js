"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const $this = Symbol.for('this');
const $itemKlass = require('../lib/collection/schema').itemKlassSym;
const isIdent = require('../lib/id').isIdent;
const Primitive = require('../lib/collection/schema/types').primitive;
const Enum = require('../lib/collection/schema/types').enum;

const { UniqueIndex } = require('../lib/collection/indexes');

const { UniqueConstraintViolationError } = require('../lib/errors');

test("DB", suite => {

  suite.test("should create database with unique index", t => {
    t.plan(5+51);
    var db = new DB({schema: {
      users: {
        login: {type: String, required: true, unique: true},
        name: String
      },
      groups: {
        name: {type: String, required: true, unique: true},
        description: String
      },
      roles: {
        role: {type: 'enum', required: true, default: "guest", enum: ["admin", "guest"]},
        group: {hasOne: {collection: "groups", hasMany: "userRoles"}},
        user: {hasOne: {collection: "users", hasMany: "groupRoles"}},
        groupUser: {unique: true, components: ["group", "user"]}
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      users: {
        login: {type: String, required: true, unique: true},
        name: {type: String}
      },
      groups: {
        name: {type: String, required: true, unique: true},
        description: {type: String}
      },
      roles: {
        role: {type: 'enum', required: true, default: "guest", enum: ["admin", "guest"]},
        group: {hasOne: {collection: "groups", hasMany: "userRoles"}},
        user: {hasOne: {collection: "users", hasMany: "groupRoles"}},
        groupUser: {unique: true, components: ["group", "user"]}
      }
    });

    t.strictEqual(db.collections.users.size, 0);
    t.strictEqual(db.collections.groups.size, 0);
    t.strictEqual(db.collections.roles.size, 0);

    db.stream.pipe(db.stream);

    var user1id, group1id, role1id;

    return db.writable.then(db => {
      t.throws(() => db.collections.users.upsert({login: "foo"}, "bzzzz"), new TypeError('upsert: mode must be one of: "replace", "merge" or "ignore"'));

      user1id = db.collections.users.upsert({login: "foo", name: "Foo Bar"});
      group1id = db.collections.groups.upsert({name: "group1", description: "The First Group"}, "merge");
      role1id = db.collections.roles.upsert({group: group1id, user: user1id}, "ignore");

      return db.save();
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(db.collections.roles[role1id], item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: role1id, role: "guest", group: group1id, user: user1id});
      t.strictEqual(db.collections.users.size, 1);
      t.strictEqual(db.collections.groups.size, 1);
      t.strictEqual(db.collections.roles.size, 1);
      item = db.collections.groups[group1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: group1id, name: "group1", description: "The First Group", userRoles: [role1id]});
      item = db.collections.users[user1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "Foo Bar", groupRoles: [role1id]});

      return db.collections.users.upsertAndSave({login: "foo"}, "ignore");
    }).then(item => {
      t.strictEqual(item, undefined);
      t.strictEqual(db.collections.users.size, 1);
      item = db.collections.users[user1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "Foo Bar", groupRoles: [role1id]});

      return db.collections.users.upsertAndSave({login: "foo", other: 1}, "merge");
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(db.collections.users[user1id], item);
      t.strictEqual(db.collections.users.size, 1);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "Foo Bar", other: 1, groupRoles: [role1id]});

      return db.collections.users.upsertAndSave({login: "foo", name: "Bar Foo"}, "replace");
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(db.collections.users[user1id], item);
      t.strictEqual(db.collections.users.size, 1);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "Bar Foo", groupRoles: []});
      item = db.collections.roles[role1id];
      t.strictEqual(item.user, undefined);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: role1id, role: "guest", group: group1id});

      return db.collections.users.upsertAndSave({login: "foo", name: "", groupRoles: [role1id]}, "replace");
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(db.collections.users[user1id], item);
      t.strictEqual(db.collections.users.size, 1);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "", groupRoles: [role1id]});
      item = db.collections.roles[role1id];
      t.strictEqual(item.user, db.collections.users[user1id]);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: role1id, role: "guest", group: group1id, user: user1id});

      return db.collections.roles.upsertAndSave({group: group1id, user: user1id, role: "admin"}, "ignore");
    }).then(item => {
      t.strictEqual(item, undefined);
      t.strictEqual(db.collections.roles.size, 1);
      item = db.collections.roles[role1id];
      t.strictEqual(item.user, db.collections.users[user1id]);
      t.strictEqual(item.group, db.collections.groups[group1id]);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: role1id, role: "guest", group: group1id, user: user1id});

      return db.collections.roles.upsertAndSave({group: group1id, user: user1id, role: "admin"});
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(role1id, item._id);
      t.strictEqual(db.collections.roles[role1id], item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: role1id, role: "admin", group: group1id, user: user1id});
      t.strictEqual(db.collections.users.size, 1);
      t.strictEqual(db.collections.groups.size, 1);
      t.strictEqual(db.collections.roles.size, 1);
      item = db.collections.groups[group1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: group1id, name: "group1", description: "The First Group", userRoles: [role1id]});
      item = db.collections.users[user1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "", groupRoles: [role1id]});

      return db.collections.roles.upsertAndSave({group: group1id, user: user1id}, "merge");
    }).then(item => {
      t.type(item, Item);
      t.strictEqual(role1id, item._id);
      t.strictEqual(db.collections.roles[role1id], item);
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: role1id, role: "guest", group: group1id, user: user1id});
      t.strictEqual(db.collections.users.size, 1);
      t.strictEqual(db.collections.groups.size, 1);
      t.strictEqual(db.collections.roles.size, 1);
      item = db.collections.groups[group1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: group1id, name: "group1", description: "The First Group", userRoles: [role1id]});
      item = db.collections.users[user1id];
      t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: user1id, login: "foo", name: "", groupRoles: [role1id]});

    }).catch(t.threw);
  });

  suite.end();
});
