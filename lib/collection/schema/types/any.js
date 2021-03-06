"use strict";

const Type = require('./base');

var any;

class Any extends Type {
  constructor() {
    if (any === undefined) {
      super();
      any = this;
    }
    return any;
  }

  get name() {
    return "Any";
  }

  static get typeName() {
    return "any"
  }
}

module.exports = exports = Any;
