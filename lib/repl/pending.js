"use strict";

const util = require('util');
const colors = require('colors/safe')
    , { cyan, green, grey, magenta, red, yellow, bgGreen } = colors;

const { lpad } = exports.lpad = require('./tools');

const defaultLogger = (...args) => console.log.apply(console, args);

/**
 * Outputs pending (uncommited) updates
 *
 * @param {DB} db
 * @param {Function} [logger]
 * @return {string}
**/
exports.showPending = function(db, logger) {
  logger || (logger = defaultLogger);

  const args = db._spool;

  if (args === undefined) return;

  for(let i = 1, len = args.length; i < len; i+= 5) {
    let collection = args[i]
      , operator   = args[i + 1]
      , filter     = args[i + 2]
      , options    = args[i + 3]
      , data       = args[i + 4];

    switch(operator) {
      case '=':
        showAssign(collection, filter, options, data);
        break;
      case '!':
        showDelete(collection, filter, options, data);
        break;
      case '+':
        showAdd(collection, filter, options, data);
        break;
      case '-':
        showPull(collection, filter, options, data);
        break;
      default:
        logger("db.%s <%s> filter=%j options=%j data=%j", collection, operator, id, property, value);
    }
  }

  function showAssign(collection, id, property, value) {
    if (property.length === 0) {
      if (value == null) {
        logger("%s db.%s%s", red('delete'), collection, grey("['") + cyan(id) + grey("']"));
      }
      else {
        logger("db.%s%s = %s", collection, grey("['") + cyan(id) + grey("']"), util.inspect(value, {colors: true, depth: 3}));
      }
    }
    else if (value === undefined) {
      logger("%s db.%s%s.%s", red('delete'), collection, grey("['") + cyan(id) + grey("']"), yellow(property));
    }
    else {
      logger("db.%s%s.%s = %s", collection, grey("['") + cyan(id) + grey("']"), property, util.inspect(value, {colors: true, depth: 3}));
    }
  }

  function showDelete(collection, id, property) {
    if (id === null) {
      logger("%s db.%s", red('delete'), collection);
    }
    else if (property.length === 0) {
      logger("%s db.%s%s", red('delete'), collection, grey("['") + cyan(id) + grey("']"));
    }
    else {
      logger("%s db.%s%s.%s", red('delete'), collection, grey("['") + cyan(id) + grey("']"), yellow(property));
    }
  }

  function showAdd(collection, id, property, value) {
    logger("db.%s%s.%s += %s", collection, grey("['") + cyan(id) + grey("']"), property, util.inspect(value, {colors: true, depth: 3}));
  }

  function showPull(collection, id, property, value) {
    logger("db.%s%s.%s -= %s", collection, grey("['") + cyan(id) + grey("']"), property, util.inspect(value, {colors: true, depth: 3}));
  }

};
