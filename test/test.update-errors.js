"use strict";

const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Collection = require('../lib/collection').Collection;
const Ident = require('../lib/id').Ident;

const { UniqueIndex } = require('../lib/collection/indexes');

const { UniqueConstraintViolationError } = require('../lib/errors');

test("update errors", suite => {

  suite.test('property errors', t => {
    t.plan(9);
    var db = new DB({schema: {
      foos: {
        bar: {hasOne: {collection: "bars", hasMany: "foos"}}
      },
      bars: {
        name: String
      }
    }});

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.foos.createAndSave({bar: db.collections.bars.create({name: 'bar1'})});
    })
    .then(foo => {
      t.type(foo, Item);
      t.type(foo.bar, Item);
      t.strictEqual(db.collections.foos.size, 1);
      t.strictEqual(db.collections.bars.size, 1);

      t.throw(() => db.collections.foos.update(foo, new Date()), new TypeError("update: value must be a plain object"));
      t.throw(() => db.collections.foos.update(foo, {__xxx: 1}), new TypeError('foos: property name must not start with a "__": __xxx'));
      t.throw(() => db.collections.foos.update(foo, {_id: -1}), new TypeError("foos: reserved property name: _id"));
      t.throw(() => db.collections.foos.update(foo, {"bar.name": 42}), new TypeError('foos: deep property "bar.name" is cross-reference'));
      t.throw(() => db.collections.bars.update(foo.bar, {"foos.length": 0}), new TypeError('bars: deep property "foos.length" is cross-reference'));
    }).catch(t.threw);
  });

  suite.test('unique errors', t => {
    t.plan(132);
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
        t.strictEqual(db.collections.robots.size, 2);
        t.strictEqual(db.collections.robots[1], robot2);
        t.strictEqual(robot2.serial, 2);
        t.strictEqual(robot2.purpose, "transport");
        var robot1 = db.collections.robots[robots[0]];
        t.strictEqual(db.collections.robots[0], robot1);
        t.strictEqual(robot1.serial, 1);
        t.strictEqual(robot1.purpose, "assistant");

        return db.collections.users.createAndSave({name: "Frank Drebin", email: "name@example.com", robots: robots});
      })
      .then(frank => {
        t.type(frank, Item);
        t.strictEqual(db.collections.users.size, 1);
        t.strictEqual(db.collections.users[0], frank);
        t.strictEqual(frank.name, "Frank Drebin");
        t.strictEqual(frank.email, "name@example.com");
        t.strictEqual(frank.robots.length, 2);
        t.strictEqual(frank.robots[0], db.collections.robots[0]);
        t.strictEqual(frank.robots[1], db.collections.robots[1]);
        t.strictEqual(db.collections.robots[0].user, frank);
        t.strictEqual(db.collections.robots[1].user, frank);
        return db.collections.users.createAndSave({name: "Frank Drebin2", email: "name@example.com", robots: robots});
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name@example\.com$/);
        t.strictEqual(err.isUniqueConstraintViolation, true);
        t.strictEqual(err.conflictKey, "name@example.com");
        t.type(err.constraintIndex, UniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.users[0]);
        var frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEqual(db.collections.users.size, 1);
        t.strictEqual(frank.name, "Frank Drebin");
        t.strictEqual(frank.email, "name@example.com");
        t.strictEqual(frank.robots.length, 2);
        t.strictEqual(db.collections.robots[0].user, frank);
        t.strictEqual(db.collections.robots[1].user, frank);
        return db.collections.users.createAndSave({robots: robots, name: "Frank Drebin2", email: "name@example.com"});
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name@example\.com$/);
        t.strictEqual(err.isUniqueConstraintViolation, true);
        t.strictEqual(err.conflictKey, "name@example.com");
        t.type(err.constraintIndex, UniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.users[0]);
        var frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEqual(db.collections.users.size, 1);
        t.strictEqual(frank.name, "Frank Drebin");
        t.strictEqual(frank.email, "name@example.com");
        t.strictEqual(frank.robots.length, 0);
        t.strictEqual(db.collections.robots[0].user, undefined);
        t.strictEqual(db.collections.robots[1].user, undefined);
        return db.collections.users.createAndSave({robots: robots, name: "Frank Drebin2", email: "name2@example.com"});
      })
      .then(frank => {
        t.type(frank, Item);
        t.strictEqual(db.collections.users.size, 2);
        t.strictEqual(db.collections.users[1], frank);
        t.strictEqual(frank.name, "Frank Drebin2");
        t.strictEqual(frank.email, "name2@example.com");
        t.strictEqual(frank.robots.length, 2);
        t.strictEqual(frank.robots[0], db.collections.robots[0]);
        t.strictEqual(frank.robots[1], db.collections.robots[1]);
        t.strictEqual(db.collections.robots[0].user, frank);
        t.strictEqual(db.collections.robots[1].user, frank);
        var impostor = db.collections.robots.create({serial: 1, purpose: "impostor", user: frank});
        db.collections.robots.create({serial: 3, purpose: "body guard", user: frank});
        frank.robots.add(impostor);
        return db.save();
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: robots\["[0-9a-f]{24}"\]\.serial = 1$/);
        t.strictEqual(err.isUniqueConstraintViolation, true);
        t.strictEqual(err.conflictKey, 1);
        t.type(err.constraintIndex, UniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.robots[0]);
        var frank = db.collections.users[1];
        t.type(frank, Item);
        t.strictEqual(db.collections.robots.size, 2);
        t.strictEqual(db.collections.users.size, 2);
        t.strictEqual(frank.name, "Frank Drebin2");
        t.strictEqual(frank.email, "name2@example.com");
        t.strictEqual(frank.robots.length, 2);
        t.strictEqual(frank.robots[0], db.collections.robots[0]);
        t.strictEqual(frank.robots[1], db.collections.robots[1]);
        t.strictEqual(db.collections.robots[0].user, frank);
        t.strictEqual(db.collections.robots[1].user, frank);
        var robot = db.collections.robots[0];
        t.type(robot, Item);
        t.strictEqual(robot.serial, 1);
        t.strictEqual(robot.purpose, "assistant");
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
        t.strictEqual(err.isUniqueConstraintViolation, true);
        t.strictEqual(err.conflictKey, "name2@example.com");
        t.type(err.constraintIndex, UniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.users[1]);
        t.strictEqual(db.collections.robots.size, 4);
        t.strictEqual(db.collections.users.size, 2);
        var frank = db.collections.users[1];
        t.type(frank, Item);
        t.strictEqual(frank.name, "Frank Drebin2");
        t.strictEqual(frank.email, "name2@example.com");
        t.strictEqual(frank.robots.length, 4);
        t.strictEqual(frank.robots[0], db.collections.robots[0]);
        t.strictEqual(frank.robots[1], db.collections.robots[1]);
        t.strictEqual(frank.robots[2], db.collections.robots[3]);
        t.strictEqual(frank.robots[3], db.collections.robots[2]);
        t.strictEqual(db.collections.robots[0].user, frank);
        t.strictEqual(db.collections.robots[1].user, frank);
        t.strictEqual(db.collections.robots[2].user, frank);
        t.strictEqual(db.collections.robots[3].user, frank);
        var robot = db.collections.robots[3];
        t.type(robot, Item);
        t.strictEqual(robot.serial, 3);
        t.strictEqual(robot.purpose, "body guard");
        robot = db.collections.robots[2];
        t.type(robot, Item);
        t.strictEqual(robot.serial, 4);
        t.strictEqual(robot.purpose, "barman");
        frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEqual(frank.name, "Frank Drebin");
        t.strictEqual(frank.email, "name@example.com");
        t.strictEqual(frank.robots.length, 0);
        frank.robots = robots;
        frank.email = "name2@example.com"; // unique error does not prevent from stealing robots
        return db.save();
      })
      .catch(err => {
        t.type(err, UniqueConstraintViolationError);
        t.matches(err.message, /^unique constraint violated: users\["[0-9a-f]{24}"\]\.email = name2@example\.com$/);
        t.strictEqual(err.isUniqueConstraintViolation, true);
        t.strictEqual(err.conflictKey, "name2@example.com");
        t.type(err.constraintIndex, UniqueIndex);
        t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.users[1]);
        t.strictEqual(db.collections.robots.size, 4);
        t.strictEqual(db.collections.users.size, 2);
        var frank = db.collections.users[0];
        t.type(frank, Item);
        t.strictEqual(frank.name, "Frank Drebin");
        t.strictEqual(frank.email, "name@example.com");
        t.strictEqual(frank.robots.length, 4);
        t.strictEqual(frank.robots[0], db.collections.robots[0]);
        t.strictEqual(frank.robots[1], db.collections.robots[1]);
        t.strictEqual(frank.robots[2], db.collections.robots[2]);
        t.strictEqual(frank.robots[3], db.collections.robots[3]);
        t.strictEqual(db.collections.robots[0].user, frank);
        t.strictEqual(db.collections.robots[1].user, frank);
        t.strictEqual(db.collections.robots[2].user, frank);
        t.strictEqual(db.collections.robots[3].user, frank);
        frank = db.collections.users[1];
        t.type(frank, Item);
        t.strictEqual(frank.name, "Frank Drebin2");
        t.strictEqual(frank.email, "name2@example.com");
        t.strictEqual(frank.robots.length, 0);
      })
    }).catch(t.threw);
  });

  suite.test('update rejection event', t => {
    t.plan(16);
    var db = new DB({schema: {
      things: {
        unique: {type: 'primitive', unique: true, required: true}
      }
    }});

    t.deepEqual(Object.keys(db.collections), ['things']);
    t.strictEqual('things' in db.collections, true);
    t.type(db.collections.things, Collection);
    t.strictEqual(db.collections.things.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var promise = Promise.all([
        new Promise((resolve, reject) => {
          db.on('update', pending => {
            try {
              t.type(pending, Array);
              t.strictEqual(pending.length, 1 + 3*5);
              resolve();
            } catch(err) { reject(err) };
          });
        }),
        new Promise((resolve, reject) => {
          db.on('updateRejection', (err, pending, index) => {
            try {
              t.type(err, UniqueConstraintViolationError)
              t.matches(err.message, /^unique constraint violated: things\["[0-9a-f]{24}"\]\.unique = 1$/);
              t.strictEqual(err.isUniqueConstraintViolation, true);
              t.strictEqual(err.conflictKey, 1);
              t.type(err.constraintIndex, UniqueIndex);
              t.strictEqual(err.constraintIndex.get(err.conflictKey), db.collections.things[0]);
              t.strictEqual(db.collections.things.size, 1);
              t.strictEqual(db.collections.things[thingid]._id, thingid);
              t.strictEqual(db.collections.things[0]._id, thingid);
              t.strictEqual(db.collections.things[0].unique, 1);
              resolve();
            } catch(err) { reject(err) };
          });
        })
      ]);

      var thingid = db.collections.things.create({unique: 1});
      db.collections.things.create({unique: 1});
      db.collections.things.create({unique: 2});

      return promise;
    }).catch(t.threw);
  });

  suite.test('push error throw', t => {
    t.plan(34);
    var error, db = new DB();
    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      t.throws(() => db._push('test', ' '), new Error('DB._push: unknown reserved operator: " "'));
      t.throws(() => db._push(undefined, 'xyz'), new Error('DB._push: all arguments must be defined'));
      t.throws(() => db._push(null, 'xyz'), new Error('DB._push: all arguments must be defined'));
      t.throws(() => db._push(null, 'xyz', null), new Error('DB._push: all arguments must be defined'));
      t.throws(() => db._push(null, 'xyz', null, null), new Error('DB._push: all arguments must be defined'));
      t.throws(() => db._push(null, '='), new Error('DB._push: invalid single operator arguments'));
      t.throws(() => db._push(null, '=', null, null, null), new Error('DB._push: invalid single operator arguments'));
      t.throws(() => db._push(null, 'U'), new Error('DB._push: invalid filter operator arguments'));
      t.throws(() => db._push(null, 'U', null, null, null), new Error('DB._push: invalid filter operator arguments'));
      t.throws(() => db._push(null, '!'), new Error('DB._push: invalid collection operator arguments'));
      t.throws(() => db._push(null, '!', null, null, null), new Error('DB._push: invalid collection operator arguments'));
      t.throws(() => db._push(null, '_'), new Error('DB._push: invalid internal operator arguments'));
      t.throws(() => db._push(null, '_', null, null, null), new Error('DB._push: invalid internal operator arguments'));
      t.throws(() => db._push(null, 'T'), new Error('DB._push: invalid error operator arguments'));
      t.throws(() => db._push(null, 'T', null, null, null), new Error('DB._push: invalid error operator arguments'));

      db.pushErrorThrow(error = new Error('foo'));
      return db.save();
    })
    .catch(err => {
      t.type(err, Error);
      t.strictEqual(err, error);

      db.pushErrorThrow('bar', 'collection', 'filter', {some: 1, properties: [1,2,3]});
      return db.save();
    })
    .catch(err => {
      t.type(err, Error);
      t.notStrictEqual(err, error);
      t.strictEqual(err.message, 'bar');
      t.strictEqual(err.collection, 'collection');
      t.strictEqual(err.filter, 'filter');
      t.strictEqual(err.some, 1);
      t.strictSame(err.properties, [1,2,3]);

      db._push(null, 'custom', null, null, 'message');

      return Promise.all([
        new Promise((resolve, reject) => {
          db.on('update', pending => {
            try {
              t.strictEqual(pending[2], 'custom');
              t.strictEqual(pending[5], 'message');
              pending[2] = 'T';
              resolve();
            } catch(err) { reject(err) };
          })
        }),
        new Promise((resolve, reject) => {
          db.on('updateRejection', (err, pending, index) => {
            try {
              t.type(err, Error);
              t.notStrictEqual(err, error);
              t.strictEqual(err.message, 'message');
              t.strictEqual(err.collection, null);
              t.strictEqual(err.filter, null);
              t.strictEqual(index, 1);
              t.strictEqual(pending[index + 1], 'T');
              t.strictEqual(pending[index + 4], 'message');
              resolve();
            } catch(err) { reject(err) };
          });
        })
      ]);
    }).catch(t.threw);
  });

  suite.end();
});
