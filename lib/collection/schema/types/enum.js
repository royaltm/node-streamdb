"use strict";

const { isString, isArray } = require('../../../util');
const { SchemaSyntaxError } = require('../../../errors');

class Enum {
  constructor(schema) {
    var enums = schema.enum;
    if (!isArray(enums) || enums.length === 0 || !enums.every(s => isString(s) && s.length !== 0))
      throw new SchemaSyntaxError("Enum datatype requires array of non empty strings in schema enum property");
    this.enums = new Set(enums);
  }

  validate(value, descr) {
    if (!this.enums.has(value)) throw new TypeError(`${descr.name}: property needs to be one of: ${this.enumToString()}`);
    return value;
  }

  validateElement(value, descr) {
    throw new TypeError(`${descr.name}: Enum forbids element operation`);
  }

  enumToString() {
    return `${Array.from(this.enums).join('|')}`;
  }

  get name() {
    return "Enum";
  }

  toString() {
    return `Enum {${this.enumToString()}}`;
  }

  get isPrimitive() {
    return true;
  }

  static get typeName() {
    return "enum"
  }
}

module.exports = exports = Enum;
