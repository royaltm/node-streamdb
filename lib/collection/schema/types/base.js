"use strict";

class Type {
  /* implementors may override this
     validation is never performed on `undefined` value */
  validate(value, descr) {
    return value;
  }

  /* implementors may override this if underlying type supports '+' or '-' operations
     validation is never performed on `undefined` value */
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

  /* implementors may override this if property values are always primitives
     and therefore indexes may be defined on properties of this type
     in this case provide valueOf method which is used to get indexable value */
  get isPrimitive() {
    return false;
  }

  /* implementors may override this if value needs to be converted to some other type
     for plain object (JSON) convertion, not applied for export */
  toObject(value) {
    return value;
  }

  /* property schema type - this must be lowercase and unique for each type */
  static get typeName() {
    return "type"
  }
}

module.exports = exports = Type;
