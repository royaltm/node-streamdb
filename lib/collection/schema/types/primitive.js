"use strict";

const { isPrimitive } = require('../../../util');

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
    if (!isPrimitive(value)) throw new TypeError(`${descr[name$]}: property needs to be a primitive`);
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
