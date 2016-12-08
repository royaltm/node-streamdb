"use strict";

const { isPrimitive } = require('../../../util');

var primitive;

class Primitive {
  constructor(schema) {
    if (primitive === undefined) primitive = this;
    return primitive;
  }

  validate(value, descr) {
    if (!isPrimitive(value)) throw new TypeError(`${descr.name}: property needs to be a primitive`);
    return value;
  }

  validateElement(value, descr) {
    throw new TypeError(`${descr.name}: Primitive forbids element operation`);
  }

  get name() {
    return "Primitive";
  }

  toString() {
    return "Primitive";
  }

  get isPrimitive() {
    return true;
  }

  static get typeName() {
    return "primitive"
  }
}

module.exports = exports = Primitive;
