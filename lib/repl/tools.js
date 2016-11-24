"use strict";

const util = require('util');
const colors = require('colors/safe')
    , { cyan, green, grey, magenta, red, yellow, bgGreen } = colors;

const { Iterator } = require('../iter');

const { readline } = require('./repl');

exports.lpad = lpad;
exports.prompt = prompt;
exports.inspect = inspect;

const defaultLogger = (...args) => console.log.apply(console, args);

var installedUnhandledRejection = false;

/**
 * Enhances repl with database actions and output rendering
 *
 * Defines `.schema` action.
 * 
 * Intercepts Promise and Iterator instances.
 *
 * Makes your life easier.
 *
 * Assumes your database instance will be at `context.database` by defaut.
 * Promise results are set to `context.res` by default.
 *
 * `options`: 
 *
 * - `databaseProperty` {string} expected context database property name
 * - `promiseResultProperty` {string} context property name for setting promise results
 * - `defineActions` {boolean} define actions on repl
 * - `unhandledRejections` {boolean} define `unhandledRejection` handler to display error
 * - `resetPrompt` {Function} function to reset prompt called with (repl, prompt) arguments
 *
 * @param {REPLServer} repl
 * @param {Object} context
 * @param {Object} [options]
 * @return {DB}
**/
exports.databaseRepl = function(repl, context, options) {
  options = Object.assign({
    databaseProperty: 'database'
  , promiseResultProperty: 'res'
  , defineActions: true
  , unhandledRejections: true
  , resetPrompt: (repl, prompt) => repl.setPrompt(prompt)
  }, options);

  const dbprop = options.databaseProperty;
  const promiseresprop = options.promiseResultProperty;
  const resetPrompt = options.resetPrompt;
  context || (context = repl.context);
  if (context[dbprop] === undefined) context[dbprop] = {collections: Symbol('collections')};

  if (options.unhandledRejections) {
    if (!installedUnhandledRejection) {
      installedUnhandledRejection = true;
      process.on('unhandledRejection', (error, promise) => {
        console.log('\n' + red('Promise rejected with: ') + '%s', error);
        if (error.stack) console.warn(error.stack);
      });
    }
  }

  if (options.defineActions) {
    repl.defineCommand('schema', {
      help: 'Describe collection schema',
      action: (name) => {
        showSchema(context[dbprop], name);
        prompt(repl);
      }
    });
  }

  /* custom eval */
  var iterated
    , historyBeforeIteration
    , iteratedCount = 0
    , iteratorEval = repl._domain.bind(iteratorPager)
    , defaultEval = repl.eval;

  repl.writer = replWriter;

  function replIteratorWriter(output) {
    return grey('---------------- item ') + green(++iteratedCount) + ":\n" + inspect(output);
  }

  function replWriter(output) {
    if (output instanceof Iterator) {
      if (iterated !== output) iteratedCount = 0;
      iterated = output;
      output = iterated.fetch();
      if (output === Iterator.done) {
        resetEval();
        return inspect(output);
      }
      else {
        historyBeforeIteration = repl.history;
        repl.history = [];
        repl.setPrompt(grey('more (') + 'Y/n' + grey(') ') + '? ');
        repl.eval = iteratorEval;
        repl.writer = replIteratorWriter;
        setImmediate(() => repl.savingHistory = false);
        if (!repl.underscoreAssigned) repl.last = output;
        return replIteratorWriter(output);
      }
    }
    else if (output === context[dbprop].collections) {
      return Object.keys(output).map(name => cyan('db') + grey('.') + name).join('\n');
    }
    else if (output !== null && 'object' === typeof output && 'function' === typeof output.then) {
      output.then(result => {
        console.log('\n' + green('Promise result:') + ' %s', inspect(result));
        prompt(repl);
        context[promiseresprop] = result;
        return result;
      });
    }
    resetPrompt(repl, '> ');
    return inspect(output);
  }

  function resetEval() {
    if (historyBeforeIteration) {
      repl.history = historyBeforeIteration;
      historyBeforeIteration = undefined;
      setImmediate(() => repl.savingHistory = true);
    }
    resetPrompt(repl, '> ');
    repl.eval = defaultEval;
    repl.writer = replWriter;
  }

  function iteratorPager(cmd, context, filename, callback) {
    cmd = cmd.trim();
    if (cmd.length === 0 || 'yes'.startsWith(cmd.toLowerCase())) {
      readline.moveCursor(repl.outputStream, 0, -1);
      readline.clearScreenDown(repl.outputStream);
      try {
        let output = iterated.fetch();
        if (output === Iterator.done) resetEval();
        callback(null, output);
      } catch(err) {
        resetEval();
        callback(err);
      }
    }
    else {
      resetEval();
      callback(null);
    }
  }

};

function inspect(output) {
  if (output === Iterator.done) return grey('done');
  return util.inspect(output, {colors: true, depth: 3});
}

function prompt(repl) {
  repl.lineParser.reset();
  repl.bufferedCommand = '';
  repl.displayPrompt();
}

/**
 * Outputs schema of a given collection name or all collection names
 *
 * @param {DB} db
 * @param {string} [name]
 * @param {Function} [logger]
 * @return {string}
**/
const showSchema = exports.showSchema = function(db, name, logger) {
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
    Object.getOwnPropertyNames(schema).sort()
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
        type = magenta(type.name || type.toString());
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
    .forEach(([prop, type, tokens]) => logger("%s %s%s", lpad(prop, labelsize), type, tokens));
  }
};

const spaces = (" ").repeat(256);
/**
 * Returns string padded to size with optional padder.
 *
 * @param {string} input
 * @param {number} size
 * @param {string} [padder]
 * @return {string}
**/
function lpad(input, size, padder) {
  if ('string' !== typeof input) input = String(input);
  var strlen = input.length;
  size >>= 0;
  if (strlen >= size) return input;
  if ('string' !== typeof padder) {
    padder = (padder !== undefined ? String(padder) : spaces);
  }
  var padlen = padder.length;
  if (size > padlen) {
    padder = padder.repeat((size + padlen - 1) / padlen >>> 0);
  }
  return padder.substring(0, size - strlen) + input;
}
