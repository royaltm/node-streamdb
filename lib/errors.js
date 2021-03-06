"use strict";


function UniqueConstraintViolationError(message, conflictKey, constraintIndex) {
  Error.captureStackTrace(this, UniqueConstraintViolationError);
  this.name = 'UniqueConstraintViolationError';
  this.message = message || 'unique constraint violated';
  this.conflictKey = conflictKey;
  this.constraintIndex = constraintIndex;
}

UniqueConstraintViolationError.prototype = Object.create(Error.prototype);
UniqueConstraintViolationError.prototype.constructor = UniqueConstraintViolationError;
UniqueConstraintViolationError.prototype.isUniqueConstraintViolation = true;

exports.UniqueConstraintViolationError = UniqueConstraintViolationError;


function SchemaSyntaxError(message) {
  SyntaxError.captureStackTrace(this, SchemaSyntaxError);
  this.name = 'SchemaSyntaxError';
  this.message = message || 'schema syntax error';
}

SchemaSyntaxError.prototype = Object.create(SyntaxError.prototype);
SchemaSyntaxError.prototype.constructor = SchemaSyntaxError;
SchemaSyntaxError.prototype.isSchemaSyntax = true;

exports.SchemaSyntaxError = SchemaSyntaxError;


function VersionError(message) {
  SyntaxError.captureStackTrace(this, VersionError);
  this.name = 'VersionError';
  this.message = message || 'version error';
}

VersionError.prototype = Object.create(SyntaxError.prototype);
VersionError.prototype.constructor = VersionError;
VersionError.prototype.isVersion = true;

exports.VersionError = VersionError;
