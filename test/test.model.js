"use strict";

const util = require('util');
const test = require('tap').test;

const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

test("DB", suite => {

  suite.test("should create database with custom models", t => {
    t.plan(29);

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

    db.stream.pipe(db.stream);

    var animalId;

    return db.writable.then(db => {
      animalId = db.collections.animals.create({type: "dog", hungry: false});
      return db.collections.people.createAndSave({name: "Stefan"})
      .then(person => {
        t.type(person, Item);
        t.type(person, Person);
        t.deepEqual(person.toJSON(), {_id: person._id, name: 'STEFAN', private: 'private'})
        t.strictEquals(person.name, 'STEFAN');
        t.strictEquals(person.private, 'private');
        t.strictEquals(person.hasName, true);
        t.strictEquals(person[Symbol.for('foo')], undefined);
        t.strictEquals(person[Symbol.for('foo')] = 'foo', 'foo');
        t.strictEquals(person[Symbol.for('foo')], 'foo');
        t.strictEquals(delete person[Symbol.for('foo')], true);
        t.strictEquals(person[Symbol.for('foo')], undefined);
        var dog = db.collections.animals[animalId];
        t.type(dog, Item);
        t.deepEqual(dog.toJSON(), {_id: dog._id, type: 'dog', hungry: false, voice: "whoof"});
        t.strictEquals(dog.type, 'dog');
        t.strictEquals(dog.hungry, false);
        t.strictEquals(dog.voice, "whoof");

        dog.hungry = true;
        dog.type = 'cat';
        delete person.name;
        return db.save();
      })
      .then(person => {
        t.type(person, Item);
        t.type(person, Person);
        t.deepEqual(person.toJSON(), {_id: person._id, private: 'private'})
        t.strictEquals(person.name, undefined);
        t.strictEquals(person.private, 'private');
        t.strictEquals(person.hasName, false);
        var cat = db.collections.animals[animalId];
        t.type(cat, Item);
        t.deepEqual(cat.toJSON(), {_id: cat._id, type: 'cat', hungry: true, voice: "MEOW"});
        t.strictEquals(cat.type, 'cat');
        t.strictEquals(cat.hungry, true);
        t.strictEquals(cat.voice, "MEOW");
      });
    }).catch(t.threw);
  });

  suite.end();
});
