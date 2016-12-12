"use strict";

const name$ = Symbol.for("name");

const Type = require('./base');

var primitive;

class Primitive extends Type {
  constructor() {
    if (primitive === undefined) {
      super();
      primitive = this;
    }
    return primitive;
  }

  validate(value, descr) {
    if (value !== null && 'string' !== typeof value
                       && 'number' !== typeof value
                       && 'boolean' !== typeof value) {
      throw new TypeError(`${descr[name$]}: property needs to be null, a string, a number or a boolean`);
    }
    return value;
  }

  validateElement(value, descr) {
    throw new TypeError(`${descr[name$]}: Primitive forbids element operation`);
  }

  get isPrimitive() {
    return true;
  }

  static get typeName() {
    return "primitive"
  }
}

module.exports = exports = Primitive;
