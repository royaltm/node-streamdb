"use strict";

const util = require('util');
const test = require('tap').test;

const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

test("DB", suite => {

  suite.test("should create database with custom models", t => {
    t.plan(39);

    class Person extends Item {
      constructor() {
        super();
        this.private = 'private';
      }
      get hasName() {
        return this.name !== undefined;
      }
      static get schema() {
        return {
          name: 'String'
        };
      }
      static get validator() {
        return {
          name(value) { if ('string' === typeof value) return value.toUpperCase(); }
        }
      }
      static create(name) {
        return this.collection.create({name: name});
      }
    }

    var db = new DB({
      modelsRoot: {
        some: {
          model: {
            get voice() {
              switch(this.type) {
                case 'cat': return this.hungry ? "MEOW" : "meow";
                case 'dog': return this.hungry ? "WHOOF" : "whoof";
              }
            }
          }
        }
      },
      models: {
        animals: 'some.model',
        people: Person
      },
      schema: {
        animals: {
          type: {type: 'enum', enum: ['cat', 'dog']},
          hungry: 'boolean'
        }
      }
    });

    t.type(db, DB);
    t.deepEqual(db.schema, {
      people: {
        name: {type: 'String'}
      },
      animals: {
        type: {type: 'enum', enum: ['cat', 'dog']},
        hungry: {type: 'boolean'}
      }
    });

    t.strictEqual(db.models.people, Person);
    t.type(db.collections.people.model.prototype, Person);
    t.type(db.models.animals, 'function');
    t.type(db.models.animals.prototype, Item);
    t.type(db.collections.animals.model.prototype, Item);
    t.strictEqual(db.collections.people.model.prototype[Item.collection], db.collections.people[Item.this]);
    t.notStrictEqual(db.collections.people.model.prototype[Item.collection], db.collections.people);
    t.strictEqual(db.collections.people.model.collection, db.collections.people);
    t.notStrictEqual(db.collections.people.model.collection, db.collections.people[Item.this]);
    t.strictEqual(db.collections.people.model.collection[Item.this], db.collections.people[Item.this]);

    db.stream.pipe(db.stream);

    var animalId, personId;

    return db.writable.then(db => {
      animalId = db.collections.animals.create({type: "dog", hungry: false});
      personId = db.collections.people.model.create("Stefan");
      return db.save()
      .then(person => {
        t.type(person, Item);
        t.type(person, Person);
        t.deepEqual(person.toJSON(), {_id: personId, name: 'STEFAN', private: 'private'});
        t.strictEqual(person.name, 'STEFAN');
        t.strictEqual(person.private, 'private');
        t.strictEqual(person.hasName, true);
        t.strictEqual(person[Symbol.for('foo')], undefined);
        t.strictEqual(person[Symbol.for('foo')] = 'foo', 'foo');
        t.strictEqual(person[Symbol.for('foo')], 'foo');
        t.strictEqual(delete person[Symbol.for('foo')], true);
        t.strictEqual(person[Symbol.for('foo')], undefined);
        var dog = db.collections.animals[animalId];
        t.type(dog, Item);
        t.deepEqual(dog.toJSON(), {_id: dog._id, type: 'dog', hungry: false, voice: "whoof"});
        t.strictEqual(dog.type, 'dog');
        t.strictEqual(dog.hungry, false);
        t.strictEqual(dog.voice, "whoof");

        dog.hungry = true;
        dog.type = 'cat';
        delete person.name;
        return db.save();
      })
      .then(person => {
        t.type(person, Item);
        t.type(person, Person);
        t.deepEqual(person.toJSON(), {_id: person._id, private: 'private'})
        t.strictEqual(person.name, undefined);
        t.strictEqual(person.private, 'private');
        t.strictEqual(person.hasName, false);
        var cat = db.collections.animals[animalId];
        t.type(cat, Item);
        t.deepEqual(cat.toJSON(), {_id: cat._id, type: 'cat', hungry: true, voice: "MEOW"});
        t.strictEqual(cat.type, 'cat');
        t.strictEqual(cat.hungry, true);
        t.strictEqual(cat.voice, "MEOW");
      });
    }).catch(t.threw);
  });

  suite.end();
});
