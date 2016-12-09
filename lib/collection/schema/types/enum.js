"use strict";

const { isString, isArray } = require('../../../util');
const { SchemaSyntaxError } = require('../../../errors');

const Type = require('./base');

class Enum extends Type {
  constructor(schema, property) {
    super();
    var enums = schema.enum;
    if (!isArray(enums) || enums.length === 0 || !enums.every(s => isString(s) && s.length !== 0))
      throw new SchemaSyntaxError(`${property}: Enum datatype requires array of non empty strings in enum schema property`);
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
