"use strict";

const iterator$ = Symbol.iterator;

const orderBy = require('./order');

const { Iterator, iter: toIter } = require('./iter');

const { isRegExp } = require('../util');

const accessor = require('../collection/accessor');
const createFilterFn = require('./filter');
// const createMapper = require('./mapper');

function createMapper(field) {
  if ('function' === typeof field) {
    return field;
  }
  else if ('string' === typeof field) {
    return accessor.get(field);
  }
  else if (field !== undefined) {
    throw new TypeError("`field' should be a string or a function");
  }
}

const oneOfaKind$ = Symbol('OneOfaKind');

const identityFn = x => x;

module.exports = exports = {

  concat(...iters) {
    return new Iterator(concat(this, ...iters));
  }

, dedup(field) {
    return new Iterator(dedup(this, field));
  }

, drop(n) {
    return new Iterator(drop(this, n));
  }

, each(callback) {
    return new Iterator(each(this, callback));
  }

, entries() {
    return new Iterator(entries(this));
  }

, flatmap(mapper, maxdepth) {
    if ('number' === typeof mapper) {
      return this.flatten(maxdepth = mapper);
    }
    else if (mapper === undefined) {
      return this.flatten();
    }
    else return new Iterator(flatmap(this, mapper, new Array(1), maxdepth));
  }

, flatten(maxdepth) {
    return new Iterator(flatten(this, 0, maxdepth));
  }

, grep(...filters) {
    return new Iterator(grep(this, ...filters));
  }

, head() {
    return new Iterator(take(this, 1));
  }

, map(mapper) {
    return new Iterator(map(this, mapper));
  }

, pluck(field) {
    return new Iterator(pluck(this, field));
  }

, slices(size) {
    return new Iterator(slices(this, size));
  }

, sorted(comparator) {
    return new Iterator(Array.from(this).sort(comparator));
  }

, sortedBy(fields, direction) {
    return this.sorted(orderBy(fields, direction));
  }

, tail() {
    return new Iterator(tail(this));
  }

, take(n) {
    return new Iterator(take(this, n));
  }

, unique(field) {
    return new Iterator(unique(this, field));
  }

, zip(...args) {
    return new Iterator(zip(this, ...args));
  }

};

/* lazy iterators */

function* concat(iter, ...iters) {
  iters = iters.map(toIter);

  yield *iter;

  for(let iter of iters) {
    yield *iter;
  }
}

function* dedup(iter, field) {
  const mapper = createMapper(field);

  var last = oneOfaKind$;

  if (mapper !== undefined) {
    let i = 0;
    for(var item of iter) {
      let value = mapper(item, i++, iter);
      if (last !== value) {
        last = value;
        yield item;
      }
    }
  }
  else {
    for(var item of iter) {
      if (last !== item) yield (last = item);
    }
  }
}

function* drop(iter, n) {
  for(var item of iter) {
    if (n > 0) {
      --n;
      continue;
    }
    yield item;
  }
}

function* each(iter, callback) {
  var i = 0;
  for(var item of iter) {
    callback(item, i++, iter);
    yield item;
  }
}

function* entries(iter) {
  var i = 0;
  for(var item of iter) {
    yield [i++, item];
  }
}

function* flatmap(iter, mapper, args, maxdepth) {
  var i = 0, depth = args.length;
  for(var item of iter) {
    args[depth] = i;
    if (!(maxdepth < depth)
              && item !== null && 'object' === typeof item
              && 'function' === typeof item[iterator$]) {
      yield *flatmap(item[iterator$](), mapper, args, maxdepth);
    }
    else {
      args[0] = item;
      yield mapper.apply(null, args);
    }

    ++i;
  }
  args.length = depth;
}

function* flatten(iter, depth, maxdepth) {
  var i = 0;
  ++depth;
  for(var item of iter) {
    if (!(maxdepth < depth)
              && item !== null && 'object' === typeof item
              && 'function' === typeof item[iterator$]) {
      yield *flatten(item[iterator$](), depth, maxdepth);
    }
    else yield item;
  }
}

function* grep(iter, ...filters) {
  const filterFn = createFilterFn(filters);
  var i = 0;
  for(var item of iter) {
    if (filterFn(item, i++, iter)) yield item;
  }
}

function* map(iter, mapper) {
  var i = 0;
  for(var item of iter) {
    yield mapper(item, i++, iter);
  }
}

function* pluck(iter, field) {
  const getter = accessor.get(field);
  for(var item of iter) {
    yield getter(item);
  }
}

function* slices(iter, size) {
  var slice = [];
  for(var item of iter) {
    if (slice.push(item) >= size) {
      yield slice;
      slice = [];
    }
  }
  if (slice.length !== 0) yield slice;
}

function* tail(iter) {
  iter.next();
  yield *iter;
}

function* take(iter, n) {
  if (n > 0) {
    for(var item of iter) {
      yield item;
      if (--n <= 0) break;
    }
  }
}

function* unique(iter, field) {
  const mapper = createMapper(field)
      , seen = new Set();

  if (mapper !== undefined) {
    let i = 0;
    for(var item of iter) {
      let value = mapper(item, i++, iter);
      if (!seen.has(value)) {
        seen.add(value);
        yield item;
      }
    }
  }
  else {
    for(var item of iter) {
      if (!seen.has(item)) {
        seen.add(item);
        yield item;
      }
    }
  }
}

function* zip(...iters) {
  var len = iters.length
    , mapper;

  if (len === 0) throw new TypeError("zip: at least one iterator should be specified");

  if ('function' === typeof iters[len - 1]) {
    mapper = iters.pop();
  }

  iters = iters.map(toIter);

  len = iters.length;

  for(;;) {
    let args = Array(len);

    for(let i = 0; i < len; ++i) {
      let item = iters[i].next();
      if (item.done) return;
      args[i] = item.value;
    }

    if (mapper === undefined) {
      yield args;
    }
    else yield mapper(...args);
  }

}
