"use strict";


const { Iterator, iter } = require('./iter');


Object.assign(Iterator.prototype
             , require('./lazy')
             , require('./exec'));

Object.assign(exports, {
  iter
, Iterator
, done: iter.done
, orderBy: require('./order')
, createFilterFn: require('./filter')

}
, require('./generators'));
