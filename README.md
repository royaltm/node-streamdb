Stream Database
===============

Stream DB is a node.js based in-memory [Document Database](https://en.wikipedia.org/wiki/Document-oriented_database) which synchronizes via log stream.

Key features:

- Document-oriented database
- Data must fit in program memory
- Duplex stream for publishing and receiving changes
- Optional type enforce schema
- Optional one-many, one-one and many-many relation schema with spcecial relation accessors
- Optional multi and unique indexes for model properties
- Updates are propagated asynchronously via log stream

Limitation:

- Requires latest ES6 features (including Proxy)


Usage
-----

To be able to use Stream DB one must connect its writable end of stream to the source of changes. This source can be another database stream source, e.g. located in other process on other server. To update database state one must connect its readable end of stream to the log synchronizing entity. This entity must then synchronize the changes from all sources and propagate it back to all synchronized database instances.

One can also use the Stream DB duplex stream for permanent data storage.

For demonstration purposes as a synchronizing entity we will use a `stream.PassThrough` instance.

Let's setup everything first.

```js
const DB = require('streamdb');
var db1 = new DB();
var db2 = new DB();
var syncStream = new require('stream').PassThrough({objectMode: true});
db1.stream.pipe(syncStream).pipe(db1.stream);
db2.stream.pipe(syncStream).pipe(db2.stream);
```

For a real-life example however one should consider applying a [consensus](https://en.wikipedia.org/wiki/Consensus_(computer_science)) algorithm to elect synchronizing master among concurrent servers.

Ok, now let's create some documents on db1.

```js
var constellations1 = db1.collections.constellations;
var doc_id = constellations1.create({name: "Sagittarius"});
// the changes will propagate on next tick or we can force them to be flushed immediately
// so we can wait for the results
constellations1.save().then(p => console.log('We have now a new constellation: "%s"', p.name));
```

We have just created a new collection and a new document representing Sagittarius constellation.
Now let's see if we can pick up the changes on both databases.

```js
assert(constellations.size === 1);
var doc_from1 = constellations1[doc_id];
console.log(doc_from1.name); // Sagittarius
assert(doc_from1._id === doc_id);

assert(db2.collections.constellations.size === 1);
var doc_from2 = db2.collections.constellations[doc_id];
console.log(doc_from2.name); // Sagittarius
assert(doc_from2._id === doc_id);
```

Now let's make some changes to our constellation and see what happens:

```js
doc_from2.zodiac = "♐";
doc_from2.location = {ra: 19, dec: -25};
doc_from2.area = "867 sq. deg.";
db2.save().then(p => console.log('We have now an updated constellation: %j', p));
```

After changes are synchronized:

```js
assert(doc_from2.zodiac === "♐");
assert(doc_from1.zodiac === "♐");
```

To delete our document simply do (on any of the databases):

```js
delete constellations1[doc_from1._id];
constellations1.save().then(confirm => console.log('Constellation has been deleted: %s', confirm));
```

Check that our constellation is actually removed:

```js
constellations1.size === 0;
for(let doc of constellations1) console.log(doc); // nothing
db2.collections.constellations.size === 0
for(let doc of db2.collections.constellations) console.log(doc); // still nothing
doc_from1._id; // TypeError: Cannot perform 'get' on a proxy that has been revoked
doc_from2._id; // TypeError: Cannot perform 'get' on a proxy that has been revoked
```

### Schema

For the simplicity of setup for the examples belowe assume that our example database will synchronize state with itself.

Let's create schema to our constellations and create a relationship with stars.

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
var starid = stars.create({name: "Alrami", bayer: "α Sagittarii"});
constellations.createAndSave({
  name: "Sagittarius",
  zodiac: "♐",
  location: {ra: 19, dec: -25},
  area: "867 sq. deg.",
  stars: [starid]}).then(c=>console.log("%j", c));
```

In this instance the creation of Alrami and later Sagittarius will be an atomic operation.
If the creation of an "Alrami" star would fail because of unique index violation, the atomic operation would stop and the creation of "Sagittarius" won't happen.

Let's try to create a few more stars.

```js
var sagitarius = constellations.name.get("Sagittarius");
stars.save(() => {
  stars.create({name: "Arkab", bayer: "β Sagittarii", constellation: sagitarius});
  stars.create({name: "Alrami", bayer: "α Sagittarii", constellation: sagitarius});
  stars.create({name: "Albaldah", bayer: "π Sagittarii", constellation: sagitarius});
}).catch(err => console.log(err.message));
// unique constraint violated: stars["575d7e9b26f27e31fcba7895"].name = Alrami
```

```js
for(let star of stars.values()) console.log("%j", star);
// {"bayer":"α Sagittarii","name":"Alrami","constellation":"575d813426f27e1bf035c45b"}
// {"bayer":"β Sagittarii","name":"Arkab","constellation":"575d813426f27e1bf035c45b"}
```
