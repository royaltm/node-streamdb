"use strict";


function UniqueConstraintViolationError(message) {
  Error.captureStackTrace(this, UniqueConstraintViolationError);
  this.name = 'UniqueConstraintViolationError';
  this.message = message || 'unique constraint violated';
}

UniqueConstraintViolationError.prototype = Object.create(Error.prototype);
UniqueConstraintViolationError.prototype.constructor = UniqueConstraintViolationError;
UniqueConstraintViolationError.prototype.isUniqueConstraintViolation = true;

exports.UniqueConstraintViolationError = UniqueConstraintViolationError;


function SchemaSyntaxError(message) {
  SyntaxError.captureStackTrace(this, SchemaSyntaxError);
  this.name = 'SchemaSyntaxError';
  this.message = message || 'unique constraint violated';
}

SchemaSyntaxError.prototype = Object.create(SyntaxError.prototype);
SchemaSyntaxError.prototype.constructor = SchemaSyntaxError;
SchemaSyntaxError.prototype.isSchemaSyntax = true;

exports.SchemaSyntaxError = SchemaSyntaxError;
