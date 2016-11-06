"use strict";

const iteratorDone$ = Symbol.for('done');

const orderBy = require('./order');

module.exports = exports = {

  all() {
    return Array.from(this);
  }

, toArray() {
    return Array.from(this);
  }

, fetch() {
    var {value, done} = this.next();
    if (done) return iteratorDone$;
    return value;
  }

, find(filter) {
    return this.grep(filter).first();
  }

, first() {
    var item = iteratorDone$;
    for(item of this) break;

    return item;
  }

, forEach(callback) {
    var i = 0;
    for(var item of this) {
      callback(item, i++, this);
    }
  }

, count() {
    var n = 0;
    while(!this.next().done) ++n;
    return n;
  }

, reduce(reductor, value) {
    var i = 0, it = this;
    if (value === undefined) {
      value = it.next().value;
    }
    for(var item of it) {
      value = reductor(value, item, i++, it);
    }
    return value;
  }

, sort(comparator) {
    return Array.from(this).sort(comparator);
  }

, sortBy(fields, direction) {
    return this.sort(orderBy(fields, direction));
  }

, partition(partitioner) {
    var i = 0, tret = [], fret = [];
    for(var item of this) {
      if (partitioner(item, i++, this)) {
        tret.push(item);
      }
      else fret.push(item);
    }
    return [tret, fret];
  }

, run(n) {
    if (n === undefined) {
      while(!this.next().done);
    }
    else if (n > 0) {
      while(!this.next().done) {
        if (--n <= 0) break;
      }
    }
  }

, top(n) {
    var ret = [], item;
    if (n === undefined) {
      while(!(item = this.next()).done) {
        ret.push(item.value);
      }
    }
    else if (n > 0) {
      while(!(item = this.next()).done) {
        ret.push(item.value);
        if (--n <= 0) break;
      }
    }
    return ret;
  }

};
