"use strict";

const versionMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

exports.parse = function(str) {
  var match;

  if ('string' === typeof str) {
    match = str.match(versionMatch);

    if (match) {
      return {
        major: +match[1],
        minor: +match[2],
        patch: +match[3],
        version: str
      }
    }

  }

};

