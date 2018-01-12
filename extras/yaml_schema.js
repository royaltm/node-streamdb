"use strict";

const { Ident, isIdent } = require('../lib/id');
const { Type, Schema: { create: createSchema }, DEFAULT_FULL_SCHEMA } = require('js-yaml');

var IdentYamlType = new Type('!id', {
  kind: 'scalar',

  resolve(data) {
    return isIdent(data);
  },

  construct(data) {
    return new Ident(data);
  },

  instanceOf: Ident,

  represent(ident) {
    return ident.toString();
  }
});

module.exports = createSchema([DEFAULT_FULL_SCHEMA], [ IdentYamlType ]);
