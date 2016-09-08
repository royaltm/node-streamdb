"use strict";

const { isString, isArray, isPrimitive } = require('../util');

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

  toString() {
    return "Primitive";
  }

  static get typeName() {
    return "primitive"
  }
}

class Enum {
  constructor(schema) {
    var enums = schema.enum;
    if (!isArray(enums) || enums.length === 0 || !enums.every(s => isString(s) && s.length !== 0))
      throw TypeError("Enum datatype requires array of non empty strings in schema enum property");
    this.enums = new Set(enums);
  }

  validate(value, descr) {
    if (!this.enums.has(value)) throw new TypeError(`${descr.name}: property needs to be one of: ${this.enumToString()}`);
    return value;
  }

  enumToString() {
    return `"${Array.from(this.enums).join('","')}"`
  }

  toString() {
    return `{Enum: ${this.enumToString()}}`;
  }

  static get typeName() {
    return "enum"
  }
}


module.exports = {
  "enum": Enum,
  "primitive": Primitive
};
