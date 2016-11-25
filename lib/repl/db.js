"use strict";

const colors = require('colors/safe')
    , { cyan, green, grey, magenta, red, yellow, bgGreen } = colors;

const { Iterator } = require('../iter');

const { readline } = require('./repl');

const { lpad, prompt, inspect } = require('./tools');
const { showSchema } = require('./schema');
const { showPending } = require('./pending');

var installedUnhandledRejection = false;

/**
 * Enhances repl with database actions and output rendering
 *
 * Defines following actions by default:
 *
 * - `.schema`   - Describe collection schema
 * - `.pending`  - Show pending changes
 * - `.begin`    - Trun on manual commit mode
 * - `.auto`     - Trun off manual commit mode
 * - `.commit`   - Commit pending changes
 * - `.rollback` - Rollback uncommited changes
 * 
 * Intercepts Promise and Iterator instances.
 *
 * Makes your life easier.
 *
 * Assumes your database instance will be at `repl.context.database` by defaut.
 * Promise results are set to `repl.context.res` by default.
 *
 * `options`: 
 *
 * - `databaseProperty` {string} expected context database property name
 * - `promiseResultProperty` {string} context property name for setting promise results
 * - `defineActions` {boolean} define actions on repl
 * - `unhandledRejections` {boolean} define `unhandledRejection` handler to display error
 * - `resetPrompt` {Function} function to reset prompt called with (repl, prompt) arguments
 * - `databaseName` {String} database name for default resetPrompt
 * - `databaseNameProperty` {String} alternative database name property in context for default resetPrompt
 *
 * @param {REPLServer} repl
 * @param {Object} [options]
 * @return {DB}
**/
exports.databaseRepl = function(repl, options) {
  options = Object.assign({
    databaseProperty: 'database'
  , promiseResultProperty: 'res'
  , defineActions: true
  , unhandledRejections: true
  , databaseName: 'db'
  , databaseNameProperty: undefined
  , resetPrompt: (repl, prompt) => setDbPrompt(repl, prompt, dbname || repl.context[dbnameprop], repl.context[dbprop])
  }, options);

  const dbnameprop = options.databaseNameProperty
  const dbname = dbnameprop ? undefined : options.databaseName;
  const dbprop = options.databaseProperty;
  const promiseresprop = options.promiseResultProperty;
  const resetPrompt = options.resetPrompt;
  if (repl.context[dbprop] === undefined) repl.context[dbprop] = {collections: Symbol('collections')};

  repl.resetDatabasePrompt = (prompt) => resetPrompt(repl, prompt || '> ');

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
        showSchema(repl.context[dbprop], name);
        prompt(repl);
      }
    });
    repl.defineCommand('pending', {
      help: 'Show pending changes',
      action: (name) => {
        showPending(repl.context[dbprop]);
        prompt(repl);
      }
    });
    repl.defineCommand('begin', {
      help: 'Trun on manual commit mode',
      action: () => {
        if (repl.context[dbprop]) {
          repl.context[dbprop].begin();
          repl.resetDatabasePrompt();
        }
        prompt(repl);
      }
    });
    repl.defineCommand('auto', {
      help: 'Trun off manual commit mode',
      action: () => {
        if (repl.context[dbprop]) {
          let db = repl.context[dbprop];
          if (db._spool === undefined) {
            db.autosave = true;
            repl.resetDatabasePrompt();
          }
          else console.log(yellow("There are") + " %d " + yellow("uncommited changes to the database. ") +
              "Type " + grey(".commit") + " or " + grey(".rollback") + " first", (db._spool.length - 1) / 5);
        }
        prompt(repl);
      }
    });
    repl.defineCommand('commit', {
      help: 'Commit pending changes',
      action: () => {
        if (repl.context[dbprop]) {
          let db = repl.context[dbprop];
          if (db.autosave) {
            console.log(yellow("Database is in auto mode. ") + "Type " + grey(".begin") + " first.");
          }
          else if (db._spool) {
            db.save().then(() => {
              console.log(green('Saved.'));
              prompt(repl);
            });
            repl.resetDatabasePrompt();
            return;
          }
          else console.log(yellow("There are no pending changes."));
        }
        prompt(repl);
      }
    });
    repl.defineCommand('rollback', {
      help: 'Rollback uncommited changes',
      action: () => {
        if (repl.context[dbprop]) {
          let db = repl.context[dbprop];
          if (db.autosave) {
            console.log(yellow("Database is in auto mode. ") + "Type " + grey(".begin") + " first.");
          }
          else if (db._spool) {
            let pending = (db._spool.length - 1) / 5;
            db._spool = undefined;
            repl.resetDatabasePrompt();
            console.log(cyan("Rolled back") + " %s " + cyan("changes."), pending);
          }
          else console.log(yellow("There are no pending changes."));
        }
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
  repl.resetDatabasePrompt();

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
    else if (output === repl.context[dbprop].collections) {
      return Object.keys(output).map(name => cyan('db') + grey('.') + name).join('\n');
    }
    else if (output !== null && 'object' === typeof output && 'function' === typeof output.then) {
      output.then(result => {
        console.log('\n' + green('Promise result:') + ' %s', inspect(result));
        prompt(repl);
        repl.context[promiseresprop] = result;
        return result;
      });
    }
    repl.resetDatabasePrompt();
    return inspect(output);
  }

  function resetEval() {
    if (historyBeforeIteration) {
      repl.history = historyBeforeIteration;
      historyBeforeIteration = undefined;
      setImmediate(() => repl.savingHistory = true);
    }
    repl.resetDatabasePrompt();
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

function setDbPrompt(repl, prompt, name, db) {
  repl.setPrompt(magenta(name) + ' ' +
    (db.autosave ? yellow('(auto)') : (db._spool ? yellow(`(pending: ${(db._spool.length - 1) / 5})`) : '')) + prompt);
}
