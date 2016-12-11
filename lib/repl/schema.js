"use strict";

const util = require('util');
const colors = require('colors/safe')
    , { cyan, green, grey, magenta, red, yellow, bgGreen, bold } = colors;

const { lpad } = exports.lpad = require('./tools');

const defaultLogger = (...args) => console.log.apply(console, args);

/**
 * Outputs schema of a given collection name or all collection names
 *
 * @param {DB} db
 * @param {string} [name]
 * @param {Function} [logger]
 * @return {string}
**/
exports.showSchema = function(db, name, logger) {
  logger || (logger = defaultLogger);

  if (!name) {
    logger(grey("Database schema collections:"));
    Object.getOwnPropertyNames(db.schema).forEach(name => logger("    %s", cyan(name)));
  }
  else if (!db.schema[name]) {
    logger(red("no schema for:") + " %s", name);
  }
  else {
    var schema = db.collections[name][Symbol.for('schema')];
    logger(grey("Database schema for:") + " %s", name);
    var labelsize = 10;
    const properties = Object.getOwnPropertyNames(schema).sort()
    .map(prop => ({prop: prop, descr: schema[prop]}))
    .filter(({prop, descr}) => descr.name === prop)
    .map(({prop, descr}) => {
      var descr = schema[prop]
        , type = descr.type
        , tokens = ' ';
      if ('string' === typeof type && descr.collection !== undefined) {
        if (descr.hasMany === true) {
          prop += '[]';
          if (descr.foreign) {
            type = magenta('N <> N') + ` db.${type}[].${cyan(descr.foreign)}[]`;
          }
          else if (descr.primary) {
            type = magenta('1 <- N') + ` db.${type}[].${cyan(descr.primary)}`;
          }
        }
        else if (descr.hasMany === false) {
          type = magenta('1 <- 1') + ` db.${type}[].${cyan(descr.primary)}`;
        }
        else if (descr.hasOne && descr.foreign) {
          if (descr.collection[Symbol.for('schema')][descr.foreign].hasMany) {
            type = magenta('N -> 1') + ` db.${type}[].${cyan(descr.foreign)}[]`;
          }
          else {
            type = magenta('1 -> 1') + ` db.${type}[].${cyan(descr.foreign)}`;
          }
        }
        else {
          type = magenta('N -> 1') + ` db.${type}[]`;
        }
      }
      else {
        type = magenta('function' === typeof type && type.name || type.toString());
        if (descr.unique) tokens += colors.inverse('unique') + ' ';
        else if (descr.index) tokens += colors.inverse('index') + ' ';
      }
      if (descr.required) {
        tokens += green('required ');
      }
      if (descr.default !== undefined) {
        tokens += grey('default') + ': ';
        if ('function' === typeof descr.default) {
          tokens += descr.default.toString().replace(/\r|\n/g, ' ');
        }
        else tokens += util.inspect(descr.default);
      }

      if (prop.length + 1 > labelsize) labelsize = prop.length + 1;

      return [prop, type, tokens];
    })

    const composites = schema[Symbol.for("indexDescriptors")]
    .sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .map(({name, componentNames, isUnique}) => {
      if (name.length + 1 > labelsize) labelsize = name.length + 1;
      const type = bold(isUnique ? "composite unique index" : "composite index");
      return [name, type, componentNames];
    });
    properties.forEach(([prop, type, tokens]) => logger("%s %s%s", lpad(prop, labelsize), type, tokens));
    composites.forEach(([name, type, components]) => logger("%s %s(%s)", lpad(name, labelsize), type, components.join(', ')));
  }
};
