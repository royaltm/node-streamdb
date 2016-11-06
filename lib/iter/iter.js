"use strict";

const iterator$ = Symbol.iterator

class Iterator {
  constructor(iter) {
    this._iter = iter;
    this.next = () => iter.next();
  }

  [Symbol.iterator]() {
    return this._iter;
  }
};

exports.Iterator = Iterator;

const iter = exports.iter = function(it) {
  if (it instanceof Iterator){
    return it;
  }
  else if ('function' === it.next) {
    return new Iterator(it);
  }
  else {
    return new Iterator(it[iterator$]());
  }
};

exports.done = iter.done = Iterator.done = Symbol.for('done');
