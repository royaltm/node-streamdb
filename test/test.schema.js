"use strict";

const util = require('util');
const test = require('tap').test;
const DB = require('../lib');
const Item = require('../lib/collection/item').Item;

const $this = Symbol.for('this');
const $itemKlass = require('../lib/collection/schema').itemKlassSym;
const isIdent = require('../lib/id').isIdent;
const Multi = require('../lib/collection/multi');

test("DB", suite => {

  suite.test("should create database with type constraint schema", t => {
    t.plan(5+34+2);
    var db = new DB({schema: {
      test: {
        name: String,
        time: Date,
        'other.nested.count': Number,
        'other.nested.flag': Boolean
      }
    }});

    t.type(db, DB);
    t.deepEqual(db.schema, {
      test: {
        name: {type: String},
        time: {type: Date},
        'other.nested.count': {type: Number},
        'other.nested.flag': {type: Boolean}
      }
    });

    t.deepEqual(db.collections.test[Symbol.for('schema')], {
      name:
        { name: 'name',
          required: false,
          type: String,
          prop: 'name' },
      time:
        { name: 'time',
          required: false,
          type: Date,
          prop: 'time' },
      'other.nested.count':
        { name: 'other.nested.count',
          required: false,
          type: Number,
          prop: 'other.nested.count' },
      other:
        { 'nested.count':
          { name: 'other.nested.count',
            required: false,
            type: Number,
            prop: 'nested.count' },
          nested:
            { count:
                { name: 'other.nested.count',
                  required: false,
                  type: Number,
                  prop: 'count' },
              flag:
                { name: 'other.nested.flag',
                  required: false,
                  type: Boolean,
                  prop: 'flag' } },
          'nested.flag':
            { name: 'other.nested.flag',
              required: false,
              type: Boolean,
              prop: 'nested.flag' } },
      'other.nested':
        { count:
          { name: 'other.nested.count',
            required: false,
            type: Number,
            prop: 'count' },
          flag:
          { name: 'other.nested.flag',
            required: false,
            type: Boolean,
            prop: 'flag' } },
      'other.nested.flag':
        { name: 'other.nested.flag',
          required: false,
          type: Boolean,
          prop: 'other.nested.flag' }
      });

    db.stream.pipe(db.stream);

    return db.writable.then(db => {
      return db.collections.test.createAndSave({name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        t.throws(() => { item.name = 123; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = []; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = {}; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = Symbol("asd"); }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = true; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = false; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = null; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = NaN; }, new TypeError("name: property needs to be a string"));
        t.throws(() => { item.name = new Date; }, new TypeError("name: property needs to be a string"));
        delete item.name;
        t.throws(() => { item.time = ""; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = "foo"; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = []; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = {}; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = Symbol("asd"); }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = true; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = false; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = NaN; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        t.throws(() => { item.time = null; }, new TypeError("time: property needs to be a date or a primitive convertible to a date"));
        delete item.time;
        t.throws(() => { item.other.nested.count = ""; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = []; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = {}; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = Symbol("asd"); }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = true; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = false; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = null; }, new TypeError("other.nested.count: property needs to be a number"));
        t.throws(() => { item.other.nested.count = new Date; }, new TypeError("other.nested.count: property needs to be a number"));
        delete item.other.nested.count;
        t.throws(() => { item.other.nested.flag = ""; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = []; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = {}; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = Symbol("asd"); }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = NaN; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = 0; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = null; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        t.throws(() => { item.other.nested.flag = new Date; }, new TypeError("other.nested.flag: property needs to be a boolean"));
        delete item.other.nested.flag;
        return db.save();
      })
      .then(item => {
        t.type(item, Item)
        t.deepEqual(item.toJSON(), {_id: item._id, other: {nested: {}}});
      });
    }).catch(t.throws);
  });

  suite.test("should create database with default constraint schema", t => {
    t.plan(23);
    var schema = {
      test: {
        name: {type: "string", default: "foo"},
        enum: {type: "enum", enum: ["foo", "bar"]},
        scal: { type: 'primitive', required: true},
        time: {type: "date", default: () => new Date(2016,6,12,20,42)},
        'other.nested.count': {type: "number", default: 10},
        'other.nested.flag': {type: "boolean", default: true}
      }
    };
    var db = new DB({schema: schema});

    t.notStrictEqual(db.schema, schema);
    t.notStrictEqual(db.schema.test, schema.test);
    t.notStrictEqual(db.schema.test.name, schema.test.name);
    t.notStrictEqual(db.schema.test.time, schema.test.time);
    t.notStrictEqual(db.schema.test.enum, schema.test.enum);
    t.notStrictEqual(db.schema.test['other.nested.count'], schema.test['other.nested.count']);
    t.notStrictEqual(db.schema.test['other.nested.flag'], schema.test['other.nested.flag']);

    t.deepEqual(db.schema, {
      test: {
        name: { type: 'string', default: 'foo', },
        enum: { type: 'enum', enum: ['foo', 'bar']},
        scal: { type: 'primitive', required: true},
        time: { type: 'date', default: "() => new Date(2016,6,12,20,42)" },
        'other.nested.count': { type: 'number', default: 10 },
        'other.nested.flag': { type: 'boolean', default: true }
      }
    });

    t.deepEqual(db.collections.test[Symbol.for('schema')], {
      "name": {
        "default": "foo",
        "name": "name",
        "prop": "name",
        "required": false,
        "type": String,
      },
      "enum": {
        "name": "enum",
        "prop": "enum",
        "required": false,
        "type": {enums: {}}
      },
      "scal": {
        "name": "scal",
        "prop": "scal",
        "required": true,
        "type": {}
      },
      "other": {
        "nested": {
          "count": {
            "default": 10,
            "name": "other.nested.count",
            "prop": "count",
            "required": false,
            "type": Number,
          },
          "flag": {
            "default": true,
            "name": "other.nested.flag",
            "prop": "flag",
            "required": false,
            "type": Boolean,
          },
        },
        "nested.count": {
          "default": 10,
          "name": "other.nested.count",
          "prop": "nested.count",
          "required": false,
          "type": Number,
        },
        "nested.flag": {
          "default": true,
          "name": "other.nested.flag",
          "prop": "nested.flag",
          "required": false,
          "type": Boolean,
        },
      },
      "other.nested": {
        "count": {
          "default": 10,
          "name": "other.nested.count",
          "prop": "count",
          "required": false,
          "type": Number,
        },
        "flag": {
          "default": true,
          "name": "other.nested.flag",
          "prop": "flag",
          "required": false,
          "type": Boolean,
        },
      },
      "other.nested.count": {
        "default": 10,
        "name": "other.nested.count",
        "prop": "other.nested.count",
        "required": false,
        "type": Number,
      },
      "other.nested.flag": {
        "default": true,
        "name": "other.nested.flag",
        "prop": "other.nested.flag",
        "required": false,
        "type": Boolean,
      },
      "time": {
        "default": "() => new Date(2016,6,12,20,42)",
        "name": "time",
        "prop": "time",
        "required": false,
        "type": Date,
      }
    });

    t.type(db, DB);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      return db.collections.test.createAndSave({scal: null})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', scal: null, time: new Date(2016,6,12,20,42), other: {nested: {count: 10, flag: true}}});
        delete item.name;
        delete item.time;
        delete item.other;
        item.scal = 1;
        item.other.nested.count = 42;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', scal: 1, time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: true}}});
        item.enum = "bar";
        item.scal = "xxx";
        item.other.nested.flag = false;
        item.unschemed = "rarara";
        t.throws(() => { item.other.nested.flag = null; }, new TypeError('other.nested.flag: property needs to be a boolean'));
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'foo', enum: "bar", scal: "xxx", time: new Date(2016,6,12,20,42), other: {nested: {count: 42, flag: false}}, unschemed: "rarara"});
        t.throws(() => { item.enum = "baz"; }, new TypeError('enum: property needs to be one of: "foo","bar"'));
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { delete item.scal; }, new TypeError('scal: property is required'));
        return db.collections.test.replaceAndSave(item._id, {scal: true, name: "baz", time: 0, enum: "foo"});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: 'baz', enum: "foo", scal: true, time: new Date(0), other: {nested: {count: 10, flag: true}}});
        t.throws(() => { db.collections.test.replace(item._id, {}); }, new TypeError('scal: property is required'));
      });
    }).catch(t.throws);
  });

  suite.test("should create database with simple relation", t => {
    t.plan(35);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bar: {hasOne: {collection: "bars"}}
      },
      bars: {
        counter: {type: "number", default: 0}
      }
    };
    var db = new DB({schema: schema});

    t.type(db, DB);

    t.deepEqual(db.collections.foos[Symbol.for('schema')], {
      "name": {
        "name": "name",
        "prop": "name",
        "required": true,
        "type": String,
      },
      "value": {
        "name": "value",
        "prop": "value",
        "required": false,
        "type": {},
      },
      "bar": {
        "name": "bar",
        "prop": "bar",
        "required": false,
        "type": "bars",
        "collection": db.collections.bars[$this],
        "klass": db.collections.bars[$this][$itemKlass]
      }
    });
    t.deepEqual(db.collections.bars[Symbol.for('schema')], {
      "counter": {
        "default": 0,
        "name": "counter",
        "prop": "counter",
        "required": false,
        "type": Number,
      }
    });

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid;
      return db.collections.foos.createAndSave({name: "meh", value: -50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meh", value: -50});
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be a primitive'));

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        fooid = item._id;
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: fooid, name: "meh", value: -50, bar: barid});
        t.deepEqual(item.bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(item.bar, db.collections.bars[barid]);
        return db.collections.foos.createAndSave({name: "woof!", bar: item.bar});
      })
      .then(item => {
        t.type(item, Item);
        t.notStrictEqual(item._id, fooid);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "woof!", bar: barid});
        t.deepEqual(item.bar.toJSON(), {_id: barid, counter: 0});
        var bar = db.collections.bars[barid];
        t.strictEqual(item.bar, bar);
        var foo = db.collections.foos[fooid];
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "meh", value: -50, bar: barid});
        t.throws(() => { db.collections.bars.delete(foo) }, new TypeError('Ident: given constructor argument is not an ident'));
        return db.collections.bars.deleteAndSave(bar);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.bars[barid], undefined);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, undefined);
          t.strictEqual(item.toJSON().bar, undefined);
        }
        return db.collections.bars.replaceAndSave(barid, {counter: 42});
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 42});
        t.strictEqual(db.collections.bars[barid], bar);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, bar);
          t.strictEqual(item.toJSON().bar.toString(), barid);
        }
      });
    }).catch(t.throws);
  });

  suite.test("should create database with one to one relations", t => {
    t.plan(82);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bar: {hasOne: {collection: "bars", hasOne: "foo"}}
      },
      bars: {
        counter: {type: "number", default: 0}
      }
    };
    var db = new DB({schema: schema});

    t.type(db, DB);

    t.deepEqual(db.collections.foos[Symbol.for('schema')], {
      "name": {
        "name": "name",
        "prop": "name",
        "required": true,
        "type": String,
      },
      "value": {
        "name": "value",
        "prop": "value",
        "required": false,
        "type": {},
      },
      "bar": {
        "name": "bar",
        "prop": "bar",
        "required": false,
        "type": "bars",
        "collection": db.collections.bars[$this],
        "klass": db.collections.bars[$this][$itemKlass],
        "unique": new Map,
        "foreign": "foo"
      }
    });
    t.deepEqual(db.collections.bars[Symbol.for('schema')], {
      "counter": {
        "default": 0,
        "name": "counter",
        "prop": "counter",
        "required": false,
        "type": Number,
      },
      "foo": {
        "name": "foo",
        "prop": "foo",
        "type": "foos",
        "collection": db.collections.foos[$this],
        "klass": db.collections.foos[$this][$itemKlass],
        "primary": "bar",
        "hasMany": false
      }
    });

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid;
      return db.collections.foos.createAndSave({name: "blah", value: 50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "blah", value: 50});
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be a primitive'));

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "blah", value: 50, bar: barid});
        t.deepEqual(JSON.parse(JSON.stringify(item.bar)), {_id: barid, counter: 0, foo: item._id});
        t.strictEqual(item.bar, db.collections.bars[barid]);
        fooid = db.collections.foos.create({name: "meow", bar: item.bar});
        t.ok(isIdent(fooid));
        return db.save();
      })
      .catch(err => {
        t.type(err, Error);
        t.strictEqual(err.message, `unique constraint violated: foos["${fooid}"].bar = ${barid}`);
        var bar = db.collections.bars[barid];
        fooid = bar.foo._id;
        t.ok(isIdent(fooid));
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: fooid});
        t.deepEqual(JSON.parse(JSON.stringify(bar.foo)), {_id: fooid, name: "blah", value: 50, bar: barid});
        delete bar.foo.bar;
        return db.collections.foos.createAndSave({name: "meow", bar: bar});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow", bar: barid});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.strictEqual(bar.foo, item);
        t.strictEqual(item.bar, bar);
        bar.foo = item;
        return db.save()
        .then(bar => {
          t.type(bar, Item);
          t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: item._id});
          t.strictEqual(bar.foo, item);
          t.strictEqual(item.bar, bar);
          var foo = db.collections.foos[fooid];
          t.type(foo, Item);
          t.notStrictEqual(foo, item);
          t.strictEqual(foo.bar, undefined);
          t.deepEqual(foo.toJSON(), {_id: fooid, name: "blah", value: 50});
          bar.foo = foo;
          return db.save();
        });
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: fooid});
        var foo = db.collections.foos[fooid];
        t.type(foo, Item);
        t.strictEqual(bar.foo, foo);
        t.strictEqual(foo.bar, bar);
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "blah", value: 50, bar: barid});
        for(var item of db.collections.foos.values()) {
          if (item !== foo) break;
        }
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.notStrictEqual(item, foo);
        t.strictEqual(item.bar, undefined);
        delete bar.foo;
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(bar.foo, undefined);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, undefined);
        }
        var foo = db.collections.foos[fooid];
        t.strictEqual(foo.bar, undefined);
        foo.bar = bar;
        return db.save();
      })
      .then(foo => {
        t.type(foo, Item);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: fooid});
        t.strictEqual(bar.foo, foo);
        t.strictEqual(foo.bar, bar);
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: fooid, name: "blah", value: 50, bar: barid});
        for(var item of db.collections.foos.values()) {
          if (item !== foo) break;
        }
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow"});
        t.notStrictEqual(item, foo);
        t.strictEqual(item.bar, undefined);
        return db.collections.foos.deleteAndSave(fooid);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.foos[fooid], undefined);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0});
        t.strictEqual(bar.foo, undefined);
        var item = db.collections.foos.values().next().value;
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.throws(() => { db.collections.foos.replace(bar, {}) }, new TypeError('Ident: given constructor argument is not an ident'));
        db.collections.foos.replace(item, {name: "whoa!", bar: barid, value: null});
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.notStrictEqual(item._id, fooid);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "whoa!", value: null, bar: barid});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foo: item._id});
        t.strictEqual(bar.foo, item);
        t.strictEqual(item.bar, bar);
        db.collections.bars.delete(barid);
        return db.save();
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.bars[barid], undefined);
        var item = db.collections.foos.values().next().value;
        t.deepEqual(item.toJSON(), {_id: item._id, name: "whoa!", value: null});
        t.strictEqual(item.bar, undefined);
        return db.collections.bars.replaceAndSave(barid, {counter: -12});
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: -12});
        t.strictEqual(db.collections.bars[barid], bar);
        for(var item of db.collections.foos.values()) {
          t.type(item, Item);
          t.strictEqual(item.bar, undefined);
          t.strictEqual(item.toJSON().bar, undefined);
        }
      });
    }).catch(t.throws);
  });


  suite.test("should create database with one to many relations", t => {
    t.plan(92);
    var schema = {
      foos: {
        name: {type: "string", required: true},
        value: {type: "primitive"},
        bar: {hasOne: {collection: "bars", hasMany: "foos"}}
      },
      bars: {
        counter: {type: "number", default: 0}
      }
    };
    var db = new DB({schema: schema});
    t.type(db, DB);

    t.deepEqual(db.collections.foos[Symbol.for('schema')], {
      "name": {
        "name": "name",
        "prop": "name",
        "required": true,
        "type": String,
      },
      "value": {
        "name": "value",
        "prop": "value",
        "required": false,
        "type": {},
      },
      "bar": {
        "name": "bar",
        "prop": "bar",
        "required": false,
        "type": "bars",
        "collection": db.collections.bars[$this],
        "klass": db.collections.bars[$this][$itemKlass],
        "index": new Multi(),
        "foreign": "foos"
      }
    });

    t.deepEqual(db.collections.bars[Symbol.for('schema')], {
      "counter": {
        "default": 0,
        "name": "counter",
        "prop": "counter",
        "required": false,
        "type": Number,
      },
      "foos": {
        "name": "foos",
        "prop": "foos",
        "type": "foos",
        "collection": db.collections.foos[$this],
        "klass": db.collections.foos[$this][$itemKlass],
        "primary": "bar",
        "hasMany": true
      }
    });

    t.strictEqual(db.collections.foos.size, 0);
    t.strictEqual(db.collections.bars.size, 0);

    db.stream.pipe(db.stream);
    return db.writable.then(db => {
      var barid, fooid;
      return db.collections.foos.createAndSave({name: "blah", value: 50})
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "blah", value: 50});
        t.throws(() => { item.name = null; }, new TypeError('name: property needs to be a string'));
        t.throws(() => { item.value = []; }, new TypeError('value: property needs to be a primitive'));
        t.strictEqual(db.collections.foos.size, 1);

        item.bar = barid = db.collections.bars.create();
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "blah", value: 50, bar: barid});
        t.deepEqual(JSON.parse(JSON.stringify(item.bar)), {_id: barid, counter: 0, foos: [item._id]});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.strictEqual(item.bar, bar);
        t.type(bar.foos, Array);
        t.strictEqual(bar.foos.length, 1);
        t.strictEqual(bar.foos[0], item);
        t.strictEqual(db.collections.bars.size, 1);
        return db.collections.foos.createAndSave({name: "meow", bar: item.bar});
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(JSON.parse(JSON.stringify(item)), {_id: item._id, name: "meow", bar: barid});
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(bar.foos, Array);
        t.strictEqual(bar.foos.length, 2);
        t.type(bar.foos[0], Item);
        t.type(bar.foos[1], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.strictEqual(bar.foos[1], db.collections.foos[1])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        t.strictEqual(db.collections.foos.size, 2);
        delete item.bar;
        return db.save();
      })
      .then(item => {
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.strictEqual(item.bar, undefined);
        var bar = db.collections.bars[barid];
        t.type(bar, Item);
        t.type(bar.foos, Array);
        t.strictEqual(bar.foos.length, 1);
        for(var foo of db.collections.foos.values()) {
          if (foo !== item) break;
        }
        t.type(foo, Item);
        t.strictEqual(foo.bar, bar);
        t.strictEqual(bar.foos[0], foo)
        t.deepEqual(JSON.parse(JSON.stringify(foo)), {_id: foo._id, name: "blah", value: 50, bar: barid});
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: [foo._id]});
        delete bar.foos;
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.strictEqual(bar, db.collections.bars[barid]);
        t.type(bar.foos, Array);
        t.strictEqual(bar.foos.length, 0);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 0, foos: []});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictEqual(foo.toJSON().bar, undefined);
          t.strictEqual(foo.bar, undefined);
        }
        bar.foos = Array.from(db.collections.foos.values());
        return db.save();
      })
      .then(bar => {
        t.type(bar, Item);
        t.type(bar.foos, Array);
        t.strictEqual(bar.foos.length, 2);
        t.type(bar.foos[0], Item);
        t.type(bar.foos[1], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.strictEqual(bar.foos[1], db.collections.foos[1])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictEqual(foo.toJSON().bar.toString(), barid);
          t.strictEqual(foo.bar, bar);
        }
        fooid = db.collections.foos[0]._id;
        return db.collections.foos.deleteAndSave(fooid);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.foos[fooid], undefined);
        var bar = db.collections.bars[barid];
        t.type(bar.foos, Array);
        t.type(bar._id, barid);
        t.strictEqual(bar.foos.length, 1);
        t.type(bar.foos[0], Item);
        t.strictEqual(bar.foos[0], db.collections.foos[0])
        t.deepEqual(JSON.parse(JSON.stringify(bar)), {_id: barid, counter: 0, foos: Array.from(db.collections.foos.keys())});
        for(var foo of db.collections.foos.values()) {
          t.type(foo, Item);
          t.strictEqual(foo.toJSON().bar.toString(), barid);
          t.strictEqual(foo.bar, bar);
        }
        t.strictEqual(db.collections.foos.size, 1);
        return db.collections.bars.deleteAndSave(bar);
      })
      .then(check => {
        t.strictEqual(check, true);
        t.strictEqual(db.collections.bars[barid], undefined);
        t.strictEqual(db.collections.bars.size, 0);
        t.strictEqual(db.collections.foos.size, 1);
        var item = db.collections.foos.values().next().value;
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.strictEqual(item.bar, undefined);
        return db.collections.bars.replaceAndSave(barid, {counter: 42});
      })
      .then(bar => {
        t.type(bar, Item);
        t.deepEqual(bar.toJSON(), {_id: barid, counter: 42, foos: []});
        t.strictEqual(db.collections.bars[barid], bar);
        t.strictEqual(db.collections.bars.size, 1);
        var item = db.collections.foos.values().next().value;
        t.type(item, Item);
        t.deepEqual(item.toJSON(), {_id: item._id, name: "meow"});
        t.strictEqual(item.bar, undefined);
      });
    }).catch(t.throws);

  });

  suite.end();
});
