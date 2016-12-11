Stream Database
===============

Two concepts are behind the design of the Stream DB:

1. High Availability
2. Rapid state distribution

Stream DB is a [Document Database](https://en.wikipedia.org/wiki/Document-oriented_database) for nodejs which synchronizes its state via `Duplex` stream.

Key features:

- Serializable state published and read from a `Duplex` stream (requires external log-consensus entity)
- Document-oriented database
- Optional constraint schema (extensible types, required properties, default values)
- Lookup indexes on properties and unique indexes
- Composite (on many properties) unique indexes
- One-many, one-one and many-many relations with foreign key concept
- Searching is performed using built-in lazy [iterators](lib/iter/README.md)

Limitations:

- data must fit in program memory
- schema is currently static (no schema updates via stream), see #Schema below
- nodejs engine requires latest ES6 features (including Proxy) (nodejs >= 6)


Usage
-----

To be able to use Stream DB one must connect a writable end of its stream to the source of changes. This source can be another database instance stream, (e.g. located in the same program or in other process on other server or even another planet). To update database state one must connect readable end of the same stream to the log-consensus entity. This entity must then synchronize the changes from all sources and propagate it back to all database instances.

One can also use the Stream DB's `Duplex` stream for permanent data storage.

For demonstration purposes we will use a `stream.PassThrough` instance as a log-consensus entity.

Let's setup everything first.

```js
const DB = require('streamdb');

var db1 = new DB(); // create 1st instance
var db2 = new DB(); // create 2nd instance
var consensus = new require('stream').PassThrough({objectMode: true});
// connect 1st database stream output with log-consensus entity
// and the entity output with 1st database stream input
db1.stream.pipe(consensus).pipe(db1.stream);
// connect 2nd database stream output with log-consensus entity
// and the entity output with 2nd database stream input
db2.stream.pipe(consensus).pipe(db2.stream);
```

For a real-life example however one should consider applying a [consensus](https://en.wikipedia.org/wiki/Consensus_(computer_science)) algorithm to elect synchronizing master among concurrent servers. This can be some queue service like [Rabbitmq](https://www.rabbitmq.com) or [Apache Kafka](https://kafka.apache.org) with single partition topic or a generic [Raft](https://raft.github.io) server like [this one](https://github.com/royaltm/node-zmq-raft).

Ok, now let's create some documents on `db1`.

```js
// implicitly creates "constellations" collection
var constellations1 = db1.collections.constellations;
var itemId = constellations1.create({name: "Sagittarius"});
// the changes will propagate on next tick or we can force them to be flushed immediately
// this way we can wait for the results using promise
constellations1.save().then(item => console.log('We have now a new constellation: "%s"', item.name));
```

We've just created a new collection and a new document representing Sagittarius constellation.
Now let's see if we can pick up the changes on both databases.

```js
assert(constellations.size === 1);
// get item by its ID
var itemFromDb1 = constellations1[itemId];
console.log(itemFromDb1.name); // Sagittarius
assert(itemFromDb1._id === itemId);

assert(db2.collections.constellations.size === 1);
// get item by its ID
var itemFromDb2 = db2.collections.constellations[itemId];
console.log(itemFromDb2.name); // Sagittarius
assert(itemFromDb2._id === itemId);
```

Now let's make some changes to our constellation and see what happens:

```js
itemFromDb2.zodiac = "♐";
itemFromDb2.location = {ra: 19, dec: -25};
itemFromDb2.area = "867 sq. deg.";
db2.save().then(item => console.log('We have now an updated constellation: %j', item));
```

After changes are synchronized:

```js
assert(itemFromDb2.zodiac === "♐");
assert(itemFromDb1.zodiac === "♐");
```

To delete our document simply do (on any of the databases):

```js
constellations1.deleteAndSave(itemFromDb1).
  then(confirm => console.log('Constellation has been deleted: %s', confirm));
```

Check that our constellation is actually removed:

```js
constellations1.size === 0;
for(let item of constellations1) console.log(item); // nothing
db2.collections.constellations.size === 0
for(let item of db2.collections.constellations) console.log(item); // still nothing
itemFromDb1._id; // throws TypeError: Cannot perform 'get' on a proxy that has been revoked
itemFromDb2._id; // throws TypeError: Cannot perform 'get' on a proxy that has been revoked
```

### Schema

For the simplicity of the setup for the examples below, let's assume that our example database will synchronize its state with itself.

Let's create schema for our constellations and establish a relationship with stars.

```js
var db = new DB({schema: {

  constellations: {
    name: {type: String, unique: true, required: true},
    'location.ra': Number,
    'location.dec': Number,
    zodiac: String,
    createdAt: {type: Date, required: true, default: Date.now}
  },

  stars: {
    name: {type: String, unique: true, required: true},
    bayer: String,
    constellation: {hasOne: {collection: 'constellations', hasMany: 'stars'}}
  }
}});

var constellations = db.collections.constellations;
var stars = db.collections.stars;

db.stream.pipe(db.stream); // self updates only
```

Now let's create a constellation with a single new star

```js
var alrami_id = stars.create({name: "Alrami", bayer: "α Sagittarii"});
constellations.createAndSave({
  name: "Sagittarius",
  zodiac: "♐",
  location: {ra: 19, dec: -25},
  area: "867 sq. deg.",
  stars: [alrami_id]}).then(c=>console.log("%j", c));
```

In this instance the creation of Alrami and later Sagittarius will be an atomic operation.
If the creation of an "Alrami" star would fail because of unique index violation, the atomic operation would stop and the creation of "Sagittarius" won't happen.

Let's try to create a few more stars.

```js
var sagitarius = constellations.name.get("Sagittarius");
stars.create({name: "Arkab", bayer: "β Sagittarii", constellation: sagitarius});
stars.create({name: "Alrami", bayer: "α Sagittarii", constellation: sagitarius});
stars.create({name: "Albaldah", bayer: "π Sagittarii", constellation: sagitarius});
stars.save().catch(err => console.log(err.message));
// unique constraint violated: stars["575d7e9b26f27e31fcba7895"].name = Alrami
```

We succesfully added "Arkab" but on the seconds "Alrami" constraint violation occured.

```js
for(let star of stars.values()) console.log("%j", star);
// {"bayer":"α Sagittarii","name":"Alrami","constellation": ... ,"_id": ...}
// {"bayer":"β Sagittarii","name":"Arkab","constellation": ... ,"_id": ...}
```

Because we have added our stars to a constellation, let's see how relationship works.

```js
var alrami = stars.name.get("Alrami");
var arkab = stars.name.get("Arkab");
// or stars[alrami_id]
assert(alrami.constellation.name === "Sagittarius");
assert(arkab.constellation.name === "Sagittarius");
assert(sagitarius === alrami.constellation);
assert(sagitarius === arkab.constellation);
// and
console.log("%j", sagitarius.stars);
assert(sagitarius.stars.length === 2);
assert(sagitarius.stars[0] === alrami);
assert(sagitarius.stars[1] === arkab);
```

Let's break "Arkab" relationship with "Sagittarius".

```js
delete arkab.constellation;
db.save().then(o => assert(o === arkab));
```

Now let's check relationship.

```js
assert(arkab.constellation === undefined);
console.log("%j", sagitarius.stars);
assert(sagitarius.stars.length === 1);
assert(sagitarius.stars[0] === alrami);
assert(sagitarius.stars[1] === undefined);
```

Ok, and now let's remove "Alrami".

```js
delete stars[alrami._id];
// or stars.delete(alrami);
db.save().then(c => assert(c === true));
```

Then...

```js
console.log("%j", sagitarius.stars);
assert(sagitarius.stars.length === 0);
```

Schema
------

Schema is versioned using [semver](http://semver.org/) syntax without the pre-release tags (only MAJOR.MINOR.PATH).

Version can be set as `schema._version` property in `schema` option given to DB constructor.

Default version assumed is `1.0.0`.

Version is exported with `db.createDataExporter` command.
The database reads version command and decides whether to emit an `error`.

The error is emitted when:

- major version read is different than schema major
- minor version read is greater than schema minor
- version read could not be parsed

Version patch is simply ignored and has only informative purpose.

When database reads version and decides not to emit an `error` it emits `version` message instead.
