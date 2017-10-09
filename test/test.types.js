"use strict";

const util = require('util');
const test = require('tap').test;

const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Type = require('../lib/collection/schema/types/base');
const types = require('../lib/collection/schema/types');

const Any = types.any;
const Primitive = types.primitive;
const Enum = types.enum;
const Blob = types.blob;

test("types", suite => {

  suite.test("Type", t => {
    t.type(Type, 'function');
    t.strictEqual(Type.typeName, 'type');
    t.strictEqual(new Type().name, 'Type');
    t.strictEqual(new Type().toString(), 'Type');
    t.strictEqual(new Type().isPrimitive, false);
    var val = {};
    t.type(new Type().validate, 'function');
    t.type(new Type().validateElement, 'function');
    t.strictEqual(new Type().validate(val), val);
    t.strictEqual(new Type().validateElement(val), val);
    t.end();
  });

  suite.test("Any", t => {
    t.type(Any, 'function');
    t.type(Any.prototype, Type);
    t.strictEqual(new Any(), new Any());
    t.strictEqual(Any.typeName, 'any');
    t.strictEqual(new Any().name, 'Any');
    t.strictEqual(new Any().toString(), 'Any');
    t.strictEqual(new Any().isPrimitive, false);
    t.type(new Any().validate, 'function');
    t.type(new Any().validateElement, 'function');
    t.strictEqual(new Any().validate(0), 0);
    t.strictEqual(new Any().validate(-1), -1);
    t.strictEqual(new Any().validate(1/0), 1/0);
    t.strictEqual(new Any().validate(null), null);
    t.strictEqual(new Any().validate(false), false);
    t.strictEqual(new Any().validate(true), true);
    t.strictEqual(new Any().validate(''), '');
    t.strictEqual(new Any().validate('foo'), 'foo');
    t.strictEqual(new Any().validateElement(0), 0);
    t.strictEqual(new Any().validateElement(-1), -1);
    t.strictEqual(new Any().validateElement(1/0), 1/0);
    t.strictEqual(new Any().validateElement(null), null);
    t.strictEqual(new Any().validateElement(false), false);
    t.strictEqual(new Any().validateElement(true), true);
    t.strictEqual(new Any().validateElement(''), '');
    t.strictEqual(new Any().validateElement('foo'), 'foo');
    var val = new Date();
    t.strictEqual(new Any().validate(val), val);
    t.strictEqual(new Any().validateElement(val), val);
    val = /qwe/;
    t.strictEqual(new Any().validate(val), val);
    t.strictEqual(new Any().validateElement(val), val);
    val = {};
    t.strictEqual(new Any().validate(val), val);
    t.strictEqual(new Any().validateElement(val), val);
    val = [];
    t.strictEqual(new Any().validate(val), val);
    t.strictEqual(new Any().validateElement(val), val);
    t.end();
  });

  suite.test("Primitive", t => {
    t.type(Primitive, 'function');
    t.type(Primitive.prototype, Type);
    t.strictEqual(new Primitive(), new Primitive());
    t.strictEqual(Primitive.typeName, 'primitive');
    t.strictEqual(new Primitive().name, 'Primitive');
    t.strictEqual(new Primitive().toString(), 'Primitive');
    t.strictEqual(new Primitive().isPrimitive, true);
    t.type(new Primitive().validate, 'function');
    t.type(new Primitive().validateElement, 'function');
    t.strictEqual(new Primitive().validate(0), 0);
    t.strictEqual(new Primitive().validate(-1), -1);
    t.strictEqual(new Primitive().validate(1/0), 1/0);
    t.strictEqual(new Primitive().validate(null), null);
    t.strictEqual(new Primitive().validate(false), false);
    t.strictEqual(new Primitive().validate(true), true);
    t.strictEqual(new Primitive().validate(''), '');
    t.strictEqual(new Primitive().validate('foo'), 'foo');
    var descr = {[Symbol.for("name")]: 'foo'};
    t.throws(() => new Primitive().validate(Symbol('x'), descr), new TypeError("foo: property needs to be null, a string, a number or a boolean"));
    t.throws(() => new Primitive().validate({}, descr), new TypeError("foo: property needs to be null, a string, a number or a boolean"));
    t.throws(() => new Primitive().validate([], descr), new TypeError("foo: property needs to be null, a string, a number or a boolean"));
    t.throws(() => new Primitive().validate(new Date(), descr), new TypeError("foo: property needs to be null, a string, a number or a boolean"));
    t.throws(() => new Primitive().validate(/asd/, descr), new TypeError("foo: property needs to be null, a string, a number or a boolean"));
    t.throws(() => new Primitive().validateElement(undefined, descr), new TypeError("foo: Primitive forbids element operation"));
    t.end();
  });

  suite.test("Enum", t => {
    t.type(Enum, 'function');
    t.type(Enum.prototype, Type);
    var schema = {enum: ['foo', 'bar']}
    t.strictEqual(Enum.typeName, 'enum');
    t.strictEqual(new Enum(schema).name, 'Enum');
    t.strictEqual(new Enum(schema).toString(), 'Enum {foo|bar}');
    t.strictEqual(new Enum(schema).isPrimitive, true);
    t.type(new Enum(schema).validate, 'function');
    t.type(new Enum(schema).validateElement, 'function');
    t.strictEqual(new Enum(schema).validate('foo'), 'foo');
    t.strictEqual(new Enum(schema).validate('bar'), 'bar');
    t.throws(() => new Enum(schema).validate(null, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(false, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(true, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate('', {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate('xxx', {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(0, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(1, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate({}, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate({}, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate({}, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate([], {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(new Date(), {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(/asd/, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validateElement(undefined, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: Enum forbids element operation"));
    t.end();
  });

  suite.test("Blob", t => {
    t.type(Blob, 'function');
    t.type(Blob.prototype, Type);
    var schema = {encoding: 'hex'}
    t.strictEqual(Blob.typeName, 'blob');
    t.strictEqual(new Blob({}).encoding, 'utf8');
    t.strictEqual(new Blob(schema).name, 'Blob');
    t.strictEqual(new Blob(schema).encoding, 'hex');
    t.strictEqual(new Blob(schema).toString(), 'Blob');
    t.strictEqual(new Blob(schema).isPrimitive, false);
    t.type(new Blob(schema).validate, 'function');
    t.type(new Blob(schema).validateElement, 'function');
    var val = Buffer.allocUnsafe(10000);
    t.strictSame(new Blob(schema).validate('abba'), Buffer.from('abba', 'hex'));
    t.strictSame(new Blob(schema).validate(''), Buffer.alloc(0));
    t.strictSame(new Blob(schema).validate(val), val);
    t.throws(() => new Blob(schema).validate(null, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(false, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(true, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(0, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(1, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate({}, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate({}, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate({}, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate([], {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(new Date(), {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(/asd/, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validateElement(undefined, {[Symbol.for("name")]: 'foo'}), new TypeError("foo: Blob forbids element operation"));
    t.end();
  });

  suite.end();
});

test("DB", suite => {

  class Stars extends Type {
    validate(value, descr) {
      if ('string' !== typeof value || !/^\*+$/.test(value)) throw new TypeError(`${descr[Symbol.for("name")]}: not a star`);
      return value;
    }
    validateElement(value, descr) {
      if ('string' !== typeof value || !/^\*+$/.test(value)) throw new TypeError(`${descr[Symbol.for("name")]}: not a star`);
      return value;
    }
    get isPrimitive() { return true; }
    static get typeName() {
      return 'stars';
    }
  }

  class Email extends Type {
    validate(value, descr) {
      if ('string' !== typeof value || !value.includes('@')) throw new TypeError(`${descr[Symbol.for("name")]}: not an email`);
      return value;
    }
    validateElement(value, descr) {
      throw new TypeError(`${descr[Symbol.for("name")]}: Email forbids element operation`);
    }
    get isPrimitive() { return true; }
    static get typeName() {
      return 'email';
    }
  }

  suite.test("should create database with custom types", t => {
    t.plan(16);

    var db = new DB({
      typesRoot: {
        xxx: {
          Stars: Stars
        }
      },
      types: [Email, 'xxx.Stars'],
      schema: {
        test: {
          email: 'Email',
          stars: 'Stars'
        }
      }
    });

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        email: {type: 'Email'},
        stars: {type: 'Stars'}
      }
    });

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      return db.collections.test.createAndSave({email: 'foo@bar', stars: '************'})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, email: 'foo@bar', stars: '************'})
        t.throws(() => { item.email = ''; }, new TypeError("test[].email: not an email"));
        t.throws(() => { item.email = 'foo'; }, new TypeError("test[].email: not an email"));
        t.throws(() => { item.email = null; }, new TypeError("test[].email: not an email"));
        t.throws(() => { item.stars = ''; }, new TypeError("test[].stars: not a star"));
        t.throws(() => { item.stars = 'foo'; }, new TypeError("test[].stars: not a star"));
        t.throws(() => { item.stars = null; }, new TypeError("test[].stars: not a star"));

        delete item.email;
        item.stars = undefined;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id});
        t.throws(() => { db.collections.test.add(item, 'email', ''); }, new TypeError("test[].email: Email forbids element operation"));
        t.throws(() => { db.collections.test.add(item, 'stars', 'x'); }, new TypeError("test[].stars: not a star"));
        return db.collections.test.addAndSave(item, 'stars', '*');
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, stars: '*'});
      });
    }).catch(t.threw);
  });

  suite.end();
});
