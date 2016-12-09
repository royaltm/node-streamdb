"use strict";

const util = require('util');
const test = require('tap').test;

const DB = require('../lib');
const Item = require('../lib/collection/item').Item;
const Type = require('../lib/collection/schema/types/base');
const types = require('../lib/collection/schema/types');

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
    var o = {};
    t.type(new Type().validate, 'function');
    t.type(new Type().validateElement, 'function');
    t.strictEqual(new Type().validate(o), o);
    t.strictEqual(new Type().validateElement(o), o);
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
    t.strictEqual(new Primitive().validate(null), null);
    t.strictEqual(new Primitive().validate(), undefined);
    t.strictEqual(new Primitive().validate(false), false);
    t.strictEqual(new Primitive().validate(''), '');
    t.strictEqual(new Primitive().validate('foo'), 'foo');
    var val = Symbol('x');
    t.strictEqual(new Primitive().validate(val), val);
    t.throws(() => new Primitive().validate({}, {name: 'foo'}), new TypeError("foo: property needs to be a primitive"));
    t.throws(() => new Primitive().validate([], {name: 'foo'}), new TypeError("foo: property needs to be a primitive"));
    t.throws(() => new Primitive().validate(new Date(), {name: 'foo'}), new TypeError("foo: property needs to be a primitive"));
    t.throws(() => new Primitive().validate(/asd/, {name: 'foo'}), new TypeError("foo: property needs to be a primitive"));
    t.throws(() => new Primitive().validateElement(undefined, {name: 'foo'}), new TypeError("foo: Primitive forbids element operation"));
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
    t.throws(() => new Enum(schema).validate(undefined, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(null, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(false, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(true, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate('', {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate('xxx', {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(0, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(1, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate({}, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate({}, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate({}, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate([], {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(new Date(), {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validate(/asd/, {name: 'foo'}), new TypeError("foo: property needs to be one of: foo|bar"));
    t.throws(() => new Enum(schema).validateElement(undefined, {name: 'foo'}), new TypeError("foo: Enum forbids element operation"));
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
    t.throws(() => new Blob(schema).validate(undefined, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(null, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(false, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(true, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate('xxx', {name: 'foo'}), new TypeError("Invalid hex string"));
    t.throws(() => new Blob(schema).validate(0, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(1, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate({}, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate({}, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate({}, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate([], {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(new Date(), {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validate(/asd/, {name: 'foo'}), new TypeError("foo: property needs to be a buffer or a properly encoded string"));
    t.throws(() => new Blob(schema).validateElement(undefined, {name: 'foo'}), new TypeError("foo: Blob forbids element operation"));
    t.end();
  });

  suite.end();
});

test("DB", suite => {

  class Stars extends Type {
    validate(value, descr) {
      if ('string' !== typeof value || !/^\*+$/.test(value)) throw new TypeError(`${descr.name}: not a star`);
      return value;
    }
    validateElement(value, descr) {
      if ('string' !== typeof value || !/^\*+$/.test(value)) throw new TypeError(`${descr.name}: not a star`);
      return value;
    }
    get isPrimitive() { return true; }
    static get typeName() {
      return 'stars';
    }
  }

  class Email extends Type {
    validate(value, descr) {
      if ('string' !== typeof value || !value.includes('@')) throw new TypeError(`${descr.name}: not an email`);
      return value;
    }
    validateElement(value, descr) {
      throw new TypeError(`${descr.name}: Email forbids element operation`);
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
        t.throws(() => { item.email = ''; }, new TypeError("email: not an email"));
        t.throws(() => { item.email = 'foo'; }, new TypeError("email: not an email"));
        t.throws(() => { item.email = null; }, new TypeError("email: not an email"));
        t.throws(() => { item.stars = ''; }, new TypeError("stars: not a star"));
        t.throws(() => { item.stars = 'foo'; }, new TypeError("stars: not a star"));
        t.throws(() => { item.stars = null; }, new TypeError("stars: not a star"));

        delete item.email;
        item.stars = undefined;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id});
        t.throws(() => { db.collections.test.add(item, 'email', ''); }, new TypeError("email: Email forbids element operation"));
        t.throws(() => { db.collections.test.add(item, 'stars', 'x'); }, new TypeError("stars: not a star"));
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
