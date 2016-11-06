Iterator
========

To create an iterator call iter(arrayLikeOrIterator).

```
const iter = require('iter')
iter([1,2,3]).grep(x => x % 2 === 1).all();
```


Lazy iterator methods returns Iterator instances for chaining.
To get the actual results iterate with `for(.. of iter)` or convert to array with Array.from(iter)
or [...iter] or call one of the execution methods which performs additional tasks on the iterator.

each(callback)        : calls `callback(item, index, iterator)` and yields each item

entries()             : yields [index, item]

dedup([field|mapper}) : yields non-duplicate items (items must be sorted for complete uniqueness)
                        `field` may be specified in this instance items are yielded whose field
                        values are non-duplicate 
                        `mapper(item, index, iterator)` may be specified in this instance items
                        are yielded for which returned values from a mapper are non-duplicate
drop(n)               : yields items skipping `n` from the beginning

flatmap([mapper],[maxdepth])
                      : yields returned values from a `mapper(item, index0, index1, ...indexN)` 
                        recursively applying mapper to items which are arrays or iterators
                        when mapper may is omited flatmap yields all items recursively

grep(filters)         : yields only items for which filter returns truish value
                        `filters` may be a function(item, index, iterator) or a filter descriptor
                        see below in filters

head()                : a sugar for take(1)

map(mapper)           : yields returned values from a `mapper(item, index, iterator)`

pluck(field)          : yields extracted items' fields

slices(size)          : yields items as array slices of a given maximum size

sorted(comparator)    : sorts items with a `comparator(a, b) => -1|0|1` and returns iterator

sortedBy(fields[, direction]) : sorts items by `fields` and `direction` order and returns iterator
                                `fields` may be a single field name or an array of field names
                                or an array of tuples `[field, direction]`
                              specify `direction` as "desc" or -1 for descendant order

tail()                : a sugar for drop(1)

take(n)               : yields at most `n` items skipping the rest

unique(field)         : yields unique items
                        `field` may be specified in this instance items are yielded whose field
                        values are unique
                        `mapper(item, index, iterator)` may be specified in this instance items
                        are yielded for which returned values from a mapper are unique

Execution methods:

all()                       : converts iterator to an Array a sugar for `Array.from(iter)`

toArray()                   : another sugar for `Array.from(iter)`

find(filter)                : a sugar for `grep(filter).first()`

first()                     : returns first iterator item or iter.done Symbol

fetch()                     : fetches next item from the iterator
                              can be called again on the same iterator
                              returns iter.done Symbol when there are no more entries

forEach(callback)           : iterates over items invoking `callback(item, index, iterator)`
                              returns `undefined`

count()                     : counts items in an iterator returning a number of items

run([n])                    : executes an iterator returning nothing (`undefined`)
                              if `n` is specified executes at most `n` times
                              can be called again on the same iterator

reduce(reductor[, value])   : reduces items to a single value invoking
                              `reductor(value, item, index, iterator)`
                              for each item and replacing value with result of the reductor
                              returns the last value
                              if value is not specified it becomes the first item of the iterator and the reductor is
                              invoked starting from the next item

sort(comparator)            : sorts items with a `comparator(a, b) => -1|0|1` and returns sorted Array

sortBy(fields[, direction]) : sorts items by `fields` and `direction` order and returns sorted Array
                              `fields` may be a single field name or an array of field names
                              or an array of tuples `[field, direction]`
                              specify `direction` as "desc" or -1 for descendant order

partition(partitioner)      : invokes `partitioner(item, index, iterator)` and partitions items into
                              two arrays: truthy and falsy depending on values returned by the partitioner
                              returns [truthy, falsy] arrays as a two item Array

top(n)                      : collects iterator items at most `n` times, returns an Array
                              can be called again on the same iterator


Filters
-------

`grep` method can create filter function from filter descriptors.

You may compile and use later a function for `grep` with `createFilterFn(filters)`.

The `filters` argument describes a condition, it may be one of:

- a function (obviously)
- a scalar (it is compared using `===`)
- a regexp
- a Set (matches any value in a set)
- an Array
  in this instance array constitutes a logical sum of its condition elements (or, ||)
- an Object
  in this instance expected value must be an object
  if properties are defined on a condition object their values constitute a conjunction
  of conditions matched against target properties (and, &&)


e.g.:

```
grep("one")
```

matches only:

- `"one"`


```
grep(/some/)
```

matches e.g.:

- `"awesome"`


```
grep({})
```

matches any object


```
grep({goodies: Array.isArray})
```

matches any item with an array in a `goodies` property e.g. `{goodies: []}`


```
grep({organization: {name: /ACME/i, owner: ['Fred', {name: 'Fred'}] } })
```

matches e.g.:

- `{organization: {name: "acme", owner: "Fred", ...} }`
- `{organization: {name: "acme", owner: {name: "Fred", age: 42, ...}, ...}, ...}`


 `grep(["foo", /bar/, {name: /Stefan/i, address: {city: ['Melbourne','Warsaw']}}])`

 will match any of the following:

 - `"foo"`
 - `"rabarbar"`
 - `{name: "just some stefan", {city: "Melbourne"}}`
 - `{name: "Stefan Batory", {city: "Warsaw"}}`

