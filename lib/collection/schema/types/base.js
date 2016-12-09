"use strict";

class Type {
  /* implementors may override this */
  validate(value, descr) {
    return value;
  }

  /* implementors may override this */
  validateElement(value, descr) {
    return value;
  }

  /* implementors should override all properties below */
  get name() {
    return this.constructor.name;
  }

  /* this function may return more descriptive information than just a name */
  toString() {
    return this.name;
  }

  /* implementors may override this if property values are primitives and therefore indexes may be defined */
  get isPrimitive() {
    return false;
  }

  /* property schema type - this must be lowercase and unique for each type */
  static get typeName() {
    return "type"
  }
}

module.exports = exports = Type;
