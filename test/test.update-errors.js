"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;
const { UniqueConstraintViolationError } = require('../lib/errors');

test("update errors", suite => {

  suite.test('unique errors', t => {
    t.plan(117);
    var db = new DB({schema: {
      robots: {
        serial: {type: Number, unique: true, required: true},
        purpose: {type: String, required: true},
        user: {hasOne: {collection: "users", hasMany: "robots"}}
      },
      users: {
        name: String,
        email: {type: String, unique: true, required: true}
      }
    }});

    t.deepEqual(Object.keys(db.collections), ['robots', 'users']);
    t.strictEqual('users' in db.collections, true);
    t.strictEqual('robots' in db.collections, true);
    t.type(db.collections.user, Collection);
    t.type(db.collections.robots, Collection);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var robots = [
        db.collections.robots.create({serial: 1, purpose: "assistant"}),
        db.collections.robots.create({serial: 2, purpose: "transport"})
      ];
      return db.save()
      .then(robot2 => {
        t.type(robot2, Item);
        t.strictEquals(db.collections.robots.size, 2);
        t.strictEquals(db.collections.robots[1], robot2);
        t.strictEquals(robot2.serial, 2);
        t.strictEquals(robot2.purpose, "transport");
        var robot1 = db.collections.robots[robots[0]];
        t.strictEquals(db.collections.robots[0], robot1);
        t.strictEquals(robot1.serial, 1);
        t.strictEquals(robot1.purpose, "assistant");

        return db.collections.users.createAndSave({name: "Frank Drebin", email: "name@example.com", robots: robots});
      })
      .then(frank => {
        t.type(frank, Item);
        t.strictEquals(db.collections.users.size, 1);
        t.strictEquals(db.collections.users[0], frank);
        t.strictEquals(frank.name, "Frank Drebin");
        t.strictEquals(frank.email, "name@example.com");
        t.strictEquals(frank.robots.length, 2);
        t.strictEquals(frank.robots[0], db.collections.robots[0]);
        t.strictEquals(frank.robots[1], db.collections.robots[1]);
        t.strictEquals(db.collections.robots[0].user, frank);
        t.strictEquals(db.collections.robots[1].user, frank);
        return db.collections.users.createAndSave({name: "Frank Drebin2", email: "name@example.com", robots: robots});
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name@example\.com$/);
        t.strictEquals(err.isUniqueConstraintViolation, true);
        var frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEquals(db.collections.users.size, 1);
        t.strictEquals(frank.name, "Frank Drebin");
        t.strictEquals(frank.email, "name@example.com");
        t.strictEquals(frank.robots.length, 2);
        t.strictEquals(db.collections.robots[0].user, frank);
        t.strictEquals(db.collections.robots[1].user, frank);
        return db.collections.users.createAndSave({robots: robots, name: "Frank Drebin2", email: "name@example.com"});
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name@example\.com$/);
        t.strictEquals(err.isUniqueConstraintViolation, true);
        var frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEquals(db.collections.users.size, 1);
        t.strictEquals(frank.name, "Frank Drebin");
        t.strictEquals(frank.email, "name@example.com");
        t.strictEquals(frank.robots.length, 0);
        t.strictEquals(db.collections.robots[0].user, undefined);
        t.strictEquals(db.collections.robots[1].user, undefined);
        return db.collections.users.createAndSave({robots: robots, name: "Frank Drebin2", email: "name2@example.com"});
      })
      .then(frank => {
        t.type(frank, Item);
        t.strictEquals(db.collections.users.size, 2);
        t.strictEquals(db.collections.users[1], frank);
        t.strictEquals(frank.name, "Frank Drebin2");
        t.strictEquals(frank.email, "name2@example.com");
        t.strictEquals(frank.robots.length, 2);
        t.strictEquals(frank.robots[0], db.collections.robots[0]);
        t.strictEquals(frank.robots[1], db.collections.robots[1]);
        t.strictEquals(db.collections.robots[0].user, frank);
        t.strictEquals(db.collections.robots[1].user, frank);
        var impostor = db.collections.robots.create({serial: 1, purpose: "impostor", user: frank});
        db.collections.robots.create({serial: 3, purpose: "body guard", user: frank});
        frank.robots.add(impostor);
        return db.save();
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: robots\["[0-9a-f]{24}"\]\.serial = 1$/);
        t.strictEquals(err.isUniqueConstraintViolation, true);
        var frank = db.collections.users[1];
        t.type(frank, Item);
        t.strictEquals(db.collections.robots.size, 2);
        t.strictEquals(db.collections.users.size, 2);
        t.strictEquals(frank.name, "Frank Drebin2");
        t.strictEquals(frank.email, "name2@example.com");
        t.strictEquals(frank.robots.length, 2);
        t.strictEquals(frank.robots[0], db.collections.robots[0]);
        t.strictEquals(frank.robots[1], db.collections.robots[1]);
        t.strictEquals(db.collections.robots[0].user, frank);
        t.strictEquals(db.collections.robots[1].user, frank);
        var robot = db.collections.robots[0];
        t.type(robot, Item);
        t.strictEquals(robot.serial, 1);
        t.strictEquals(robot.purpose, "assistant");
        var barman = db.collections.robots.create({serial: 4, purpose: "barman"});
        robots.push(barman);
        robots.push(db.collections.robots.create({serial: 3, purpose: "body guard", user: frank}));
        frank.robots.add(barman);
        db.collections.users[0].email = "name2@example.com"; // unique error prevents from stealing robots
        db.collections.users[0].robots = robots;
        return db.save();
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name2@example\.com$/);
        t.strictEquals(err.isUniqueConstraintViolation, true);
        t.strictEquals(db.collections.robots.size, 4);
        t.strictEquals(db.collections.users.size, 2);
        var frank = db.collections.users[1];
        t.type(frank, Item);
        t.strictEquals(frank.name, "Frank Drebin2");
        t.strictEquals(frank.email, "name2@example.com");
        t.strictEquals(frank.robots.length, 4);
        t.strictEquals(frank.robots[0], db.collections.robots[0]);
        t.strictEquals(frank.robots[1], db.collections.robots[1]);
        t.strictEquals(frank.robots[2], db.collections.robots[3]);
        t.strictEquals(frank.robots[3], db.collections.robots[2]);
        t.strictEquals(db.collections.robots[0].user, frank);
        t.strictEquals(db.collections.robots[1].user, frank);
        t.strictEquals(db.collections.robots[2].user, frank);
        t.strictEquals(db.collections.robots[3].user, frank);
        var robot = db.collections.robots[3];
        t.type(robot, Item);
        t.strictEquals(robot.serial, 3);
        t.strictEquals(robot.purpose, "body guard");
        robot = db.collections.robots[2];
        t.type(robot, Item);
        t.strictEquals(robot.serial, 4);
        t.strictEquals(robot.purpose, "barman");
        frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEquals(frank.name, "Frank Drebin");
        t.strictEquals(frank.email, "name@example.com");
        t.strictEquals(frank.robots.length, 0);
        frank.robots = robots;
        frank.email = "name2@example.com"; // unique error does not prevent from stealing robots
        return db.save();
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name2@example\.com$/);
        t.strictEquals(err.isUniqueConstraintViolation, true);
        t.strictEquals(db.collections.robots.size, 4);
        t.strictEquals(db.collections.users.size, 2);
        var frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEquals(frank.name, "Frank Drebin");
        t.strictEquals(frank.email, "name@example.com");
        t.strictEquals(frank.robots.length, 4);
        t.strictEquals(frank.robots[0], db.collections.robots[0]);
        t.strictEquals(frank.robots[1], db.collections.robots[1]);
        t.strictEquals(frank.robots[2], db.collections.robots[2]);
        t.strictEquals(frank.robots[3], db.collections.robots[3]);
        t.strictEquals(db.collections.robots[0].user, frank);
        t.strictEquals(db.collections.robots[1].user, frank);
        t.strictEquals(db.collections.robots[2].user, frank);
        t.strictEquals(db.collections.robots[3].user, frank);
        frank = db.collections.users[1];
        t.type(frank, Item);
        t.strictEquals(frank.name, "Frank Drebin2");
        t.strictEquals(frank.email, "name2@example.com");
        t.strictEquals(frank.robots.length, 0);
      })
    }).catch(t.throws);
  });

  suite.end();
});
