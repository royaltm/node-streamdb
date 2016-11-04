"use strict";

const iterator = Symbol.iterator
    , isArray = Array.isArray
    , setPrototypeOf = Object.setPrototypeOf
    , stringify = JSON.stringify

const { isRegExp } = require('./util');

const accessor = require('./collection/accessor');
const { Item } = require('./collection/item');

class Iterator {
  constructor(iter) {
    this._iter = iter;
    this.next = () => iter.next();
  }

  [Symbol.iterator]() {
    return this._iter;
  }

  /* lazy */

  each(callback) {
    return new Iterator(each(this, callback));
  }

  entries() {
    return new Iterator(entries(this));
  }

  drop(n) {
    return new Iterator(drop(this, n));
  }

  flatmap(mapper) {
    return new Iterator(flatmap(this, mapper));
  }

  grep(filter) {
    return new Iterator(grep(this, filter));
  }

  map(mapper) {
    return new Iterator(map(this, mapper));
  }

  pluck(field) {
    return new Iterator(pluck(this, field));
  }

  slices(size) {
    return new Iterator(slices(this, size));
  }

  /* exec */

  all() {
    return Array.from(this);
  }

  toArray() {
    return Array.from(this);
  }

  find(filter) {
    return this.grep(filter).first();
  }

  first() {
    return this.next().value;
  }

  forEach(callback) {
    var i = 0;
    for(var item of this) {
      callback(item, i++, this);
    }
  }

  count() {
    var n = 0;
    for(var _ of this) ++n;
    return n;
  }

  reduce(reductor, value) {
    var i = 0, it = this;
    if (value === undefined) {
      value = it.next().value;
    }
    for(var item of it) {
      value = reductor(value, item, i++, it);
    }
    return value;
  }

  sort(comparator) {
    return Array.from(this).sort(comparator);
  }

  sortBy(fields, direction) {
    return this.sort(orderBy(fields, direction));
  }

  partition(partitioner) {
    var i = 0, tret = [], fret = [];
    for(var item of this) {
      if (partitioner(item, i++, this)) {
        tret.push(item);
      }
      else fret.push(item);
    }
    return [tret, fret];
  }

  take(n) {
    var ret = [];
    if (n > 0) {
      for(var item of this) {
        ret.push(item);
        if (--n === 0) break;
      }
    }
    return ret;
  }
};

exports.Iterator = Iterator;

exports.iter = (it) => {
  if (it instanceof Iterator){
    return it;
  }
  else if ('function' === it.next) {
    return new Iterator(it);
  }
  else {
    return new Iterator(it[iterator]());
  }
};

exports.range = function(start, end, step, offset) {
  return new Iterator(range(start, end, step, offset));
};

exports.times = function(n) {
  return new Iterator(times(n));
};

exports.filterFunction = filterFunction;
exports.orderBy = orderBy;

/* lazy generators */

function* range(start, end, step, offset) {
  offset || (offset = 0);
  step || (step = 1);
  var len = 1 + ((Math.abs(end - start) + (offset * 2)) / step|0);
  for(var i = 0; i < len; ++i) {
    yield start < end ?
                      i * step + start - offset
                      :
                      (start - (i * step)) + offset;
  }
}

function *times(n) {
  for(var i = 0; i < n; ++i) yield i;
}

/* lazy iterators */

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

function* flatmap(iter, mapper) {
  var i = 0, it;
  for(var item of iter) {
    if (item[iterator]) {
      yield *new Iterator(item[iterator]()).flatmap(mapper);
    }
    else yield mapper(item, i++, iter);
  }
};

function* grep(iter, filter) {
  var i = 0;
  if ('function' !== typeof filter) {
    filter = filterFunction(filter);
  }
  for(var item of iter) {
    if (filter(item, i++, iter)) yield item;
  }
};

function* map(iter, mapper) {
  var i = 0;
  for(var item of iter) {
    yield mapper(item, i++, iter);
  }
};

function* pluck(iter, field) {
  const getter = accessor.get(field);
  for(var item of iter) {
    yield getter(item);
  }
};

function* slices(iter, size) {
  var slice = [];
  for(var item of iter) {
    if (slice.push(item) >= size) {
      yield slice;
      slice = [];
    }
  }
  if (slice.length !== 0) yield slice;
};

/* creates filter function from descriptor */

function filterFunction(descr) {
  var conditions = []
    , args = [];
  for(var field in descr) {
    if (descr.hasOwnProperty(field)) {
      let value = descr[field]
        , multifield = field.split('.').map(stringify).join('][');

      if (value instanceof Item) {
        value = value._id;
        multifield += ']["_id"';
      }

      let narg = args.push(value) - 1;

      if (isRegExp(value)) {
        conditions.push(`a[${narg}].test(o[${multifield}])`);
      }
      else {
        conditions.push(`o[${multifield}]===a[${narg}]`);
      }
    }
  }
  return new Function('a', `"use strict";
    return (o) => {
      try {
        return ${conditions.join(' && ')};
      } catch(e) { return false; }
    }`)(args);
}

const descPattern = /desc/i;

function orderBy(field, direction) {
  if (isArray(field))
    return orderByMulti(field, direction);

  var getter = accessor.get(field);
  return (direction < 0 || descPattern.test(direction))
          ? (b,a) => (a=getter(a)) < (b=getter(b)) ? -1 : a > b ? 1 : 0
          : (a,b) => (a=getter(a)) < (b=getter(b)) ? -1 : a > b ? 1 : 0;
};

function orderByMulti(fields, defaultDirection) {
  const getters = [], body = [], scope = [];
  var field;

  for(var index = fields.length; index-- !== 0;) {
    var direction, item = fields[index];
    if (isArray(item)) {
      field = item[0];
      direction = item[1];
    } else {
      field = item;
      direction = defaultDirection;
    }
    getters[index] = accessor.get(field);
    scope.push(`n${index}=g[${index}]`);
    body.unshift((direction < 0 || descPattern.test(direction))
            ? `(av=n${index}(a))>(bv=n${index}(b))?-1:av<bv?1:`
            : `(av=n${index}(a))<(bv=n${index}(b))?-1:av>bv?1:`);
  }

  return new Function('g', `"use strict";
      var ${scope.join(',')};
      return (a,b) => {var av,bv;return${body.join('')}0;}`
    )(getters);
}
