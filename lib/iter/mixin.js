"use strict";

exports.mixin = function(object) {
  for(var name in methods) {
    if (!(name in object))
      object[name] = methods[name];
  }

  if (!('iter' in object)) {
    Object.defineProperty(object, 'iter', {
      get() {
        return iter(this);
      },
      configurable: true,
      enumerable: false
    });
  }

  return object;
};

const methods = exports.methods = {

  /* lazy */

  concat(...iters) {
    return this.iter.concat(...iters);
  }

, dedup(field) {
    return this.iter.dedup(field);
  }

, drop(n) {
    return this.iter.drop(n);
  }

, each(callback) {
    return this.iter.each(callback);
  }

, entries() {
    return this.iter.entries();
  }

, flatmap(mapper, maxdepth) {
    return this.iter.flatmap(mapper, maxdepth);
  }

, flatten(maxdepth) {
    return this.iter.flatten(maxdepth);
  }

, grep(...filters) {
    return this.iter.grep(...filters);
  }

, head() {
    return this.iter.head();
  }

, map(mapper) {
    return this.iter.map(mapper);
  }

, pluck(field) {
    return this.iter.pluck(field);
  }

, slices(size) {
    return this.iter.slices(size);
  }

, sorted(comparator) {
    return this.iter.sorted(comparator);
  }

, sortedBy(fields, direction) {
    return this.iter.sortedBy(fields, direction);
  }

, tail() {
    return this.iter.tail();
  }

, take(n) {
    return this.iter.take(n);
  }

, unique(field) {
    return this.iter.unique(field);
  }

, zip(...args) {
    return this.iter.zip(...args);
  }

  /* exec */

, all() {
    return this.iter.all();
  }

, count() {
    return this.iter.count();
  }

, every(callback) {
    return this.iter.every(callback);
  }

, fetch() {
    return this.iter.fetch();
  }

, find(filter) {
    return this.iter.find(filter);
  }

, first() {
    return this.iter.first();
  }

, forEach(callback) {
    return this.iter.forEach(callback);
  }

, partition(partitioner) {
    return this.iter.partition(partitioner);
  }

, run(n) {
    return this.iter.run(n);
  }

, reduce(reductor, value) {
    return this.iter.reduce(reductor, value);
  }

, some(callback) {
    return this.iter.some(callback);
  }

, sort(comparator) {
    return this.iter.sort(comparator);
  }

, sortBy(fields, direction) {
    return this.iter.sortBy(fields, direction);
  }

, top(n) {
    return this.iter.top(n);
  }

, toArray() {
    return this.iter.toArray();
  }

, toMap() {
    return this.iter.toMap();
  }

, toSet() {
    return this.iter.toSet();
  }

};
