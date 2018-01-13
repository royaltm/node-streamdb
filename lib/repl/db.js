"use strict";

const fs = require('fs');

const { createEncodeStream, createDecodeStream } = require('msgpack-lite');
const { createGzip, createUnzip, Z_BEST_COMPRESSION } = require('zlib');

const colors = require('colors/safe')
    , { cyan, green, grey, magenta, red, yellow, bgGreen } = colors;

const { Iterator } = require('../iter');

const { readline } = require('./repl');

const { lpad, prompt, inspect } = require('./tools');
const { showSchema } = require('./schema');
const { showPending } = require('./pending');

const IteratorReader = require('../../extras/iterator_reader');
const ImportTransform = require('../../extras/import_transform');
const { dumpDatabase
      , restoreLocalDatabase
      , restoreDatabase } = require('../../extras/db_dump');
const { exportDbToYamls
      , importDbFromYaml } = require('../../extras/yaml_export');

const { isArray  } = require('../util');

const { Z_DEFAULT_COMPRESSION } = require('zlib');

const defaultOptions = {
  compressionLevel: Z_DEFAULT_COMPRESSION,
  noUnzip: false,
  updateChunkSize: 131072,
  mergeImport: false,
};

var installedUnhandledRejection = false;

exports.getDbReplDefaultOptions = function getDbReplDefaultOptions() {
  return Object.assign(Object.create(null), defaultOptions);
};

const secondsFrom = exports.secondsFrom = (start) => ((Date.now() - start)/1000).toFixed(3);

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
 * - `.seal`     - Make database read-only (non-updatable from this side)
 * - `.dump`     - Dump database to specified file, encoded with msgpack and gzipped
 * - `.slurp`    - Locally load database from specified file, unzipped and decoded with msgpack
 * - `.restore`  - Restore database from specified file, unzipped and decoded with msgpack
 * - `.export`   - Export database to YAML files in specified directory
 * - `.import`   - Import database from YAML files in specified directory
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
 * - `optionsProperty` {string} expected context options property name
 * - `promiseResultProperty` {string} context property name for setting promise results
 * - `defineActions` {boolean|Array} define actions on repl (may be an array of names)
 * - `unhandledRejections` {boolean} define `unhandledRejection` handler to display error
 * - `resetPrompt` {Function} function to reset prompt called with (repl, prompt) arguments
 * - `databaseName` {String} database name for default resetPrompt
 * - `databaseNameProperty` {String} alternative database name property in context for default resetPrompt
 * - `fileNameGenerator` {Function} a function that produces default file names called with action name as its argument
 *
 * @param {REPLServer} repl
 * @param {Object} [options]
 * @return {DB}
**/
exports.databaseRepl = function(repl, options) {
  options = Object.assign({
    databaseProperty: 'database'
  , optionsProperty: 'opt'
  , promiseResultProperty: 'res'
  , defineActions: true
  , unhandledRejections: true
  , databaseName: 'db'
  , databaseNameProperty: undefined
  , fileNameGenerator: (_) => {}
  , resetPrompt: (repl, prompt) => setDbPrompt(repl, prompt, dbname || repl.context[dbnameprop], repl.context[dbprop])
  }, options);

  const dbnameprop = options.databaseNameProperty;
  const optprop = options.optionsProperty;
  const dbname = dbnameprop ? undefined : options.databaseName;
  const dbprop = options.databaseProperty;
  const promiseresprop = options.promiseResultProperty;
  const resetPrompt = options.resetPrompt;
  const genFileName = (action, pathname) => (pathname || options.fileNameGenerator(action));
  const getOpts = (repl) => Object.assign({}, defaultOptions, repl.context[optprop]);
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
    const actions = isArray(options.defineActions) ? new Set(options.defineActions)
                                                   : null;
    const defineCommand = (name, options) => {
      if (!actions || actions.has(name)) {
        repl.defineCommand(name, options);
      }
    };

    defineCommand('schema', {
      help: 'Describe collection schema',
      action: (name) => {
        var db = repl.context[dbprop];
        if (db) showSchema(db, name);
        prompt(repl);
      }
    });
    defineCommand('pending', {
      help: 'Show pending changes',
      action: (name) => {
        var db = repl.context[dbprop];
        if (db) showPending(db);
        prompt(repl);
      }
    });
    defineCommand('begin', {
      help: 'Trun on manual commit mode',
      action: () => {
        var db = repl.context[dbprop];
        if (db) {
          db.begin();
          repl.resetDatabasePrompt();
        }
        prompt(repl);
      }
    });
    defineCommand('auto', {
      help: 'Trun off manual commit mode',
      action: () => {
        var db = repl.context[dbprop];
        if (db) {
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
    defineCommand('commit', {
      help: 'Commit pending changes',
      action: () => {
        var db = repl.context[dbprop];
        if (db) {
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
    defineCommand('rollback', {
      help: 'Rollback uncommited changes',
      action: () => {
        var db = repl.context[dbprop];
        if (db) {
          if (db.autosave) {
            console.log(yellow("Database is in auto mode. ") + "Type " + grey(".begin") + " first.");
          }
          else if (db._spool) {
            let pending = (db._spool.length - 1) / 5;
            db.clearPending();
            repl.resetDatabasePrompt();
            console.log(cyan("Rolled back") + " %s " + cyan("changes."), pending);
          }
          else console.log(yellow("There are no pending changes."));
        }
        prompt(repl);
      }
    });
    defineCommand('seal', {
      help: 'Seal current database (make it read-only)',
      action: function() {
        var db = repl.context[dbprop];
        if (db) {
          db.makeReadonly();
          console.log(grey("Database is now sealed."));
        }
        prompt(repl);
      }
    });
    defineCommand('export', {
      help: 'Export database to a specified directory as YAML files',
      action: (pathname) => {
        var db = repl.context[dbprop];
        pathname = genFileName('export', pathname);
        if (!pathname) {
          console.log(yellow("Please specify path where to export database!"));
          prompt(repl);
        }
        else if (db) {
          console.log(grey('Exporting database to:') + cyan(' %j'), pathname);
          let start = Date.now();
          exportDbToYamls(db, pathname, console.log)
          .then(() => console.log(grey('Database exported successfully in') + ' %d s', secondsFrom(start)))
          .catch(err => {
            console.error(red('Exporting database failed: ') + '%s', err);
          })
          .then(() => prompt(repl));
        }
        else prompt(repl);
      }
    });
    defineCommand('import', {
      help: 'Import database from YAML files in specified directory',
      action: (pathname) => {
        var db = repl.context[dbprop];
        pathname = genFileName('import', pathname);
        if (!pathname) {
          console.log(yellow("Please specify path where to look for YAML files!"));
          prompt(repl);
        }
        else if (db) {
          const opts = getOpts(repl);
          console.log(grey('Importing database from:') + cyan(' %j') + grey(' chunk size:') + ' %d' , pathname, opts.updateChunkSize);
          let start = Date.now()
          importDbFromYaml(db, pathname, !!opts.mergeImport, console.log, opts.updateChunkSize)
          .then(() => db.save())
          .then(() => console.log(grey('Database imported successfully in') + ' %d s', secondsFrom(start)))
          .catch(err => {
            console.error(red('Importing database failed: ') + '%s', err);
          })
          .then(() => prompt(repl));
        }
        else prompt(repl);
      }
    });
    defineCommand('dump', {
      help: 'Dump database to a specified file',
      action: (filename) => {
        var db = repl.context[dbprop];
        filename = genFileName('dump', filename);
        if (!filename) {
          console.log(yellow("Please specify filename to dump database to!"));
          prompt(repl);
        }
        else if (db) {
          const opts = getOpts(repl);
          console.log(grey('Dumping database to:') + cyan(' %j') + grey(' zip level:') + ' %d', filename, opts.compressionLevel);
          let start = Date.now();
          dumpDatabase(db, filename, {flags: 'wx', compressionLevel: opts.compressionLevel})
          .then(() => console.log(grey('Database dumped in') + ' %d s', secondsFrom(start)))
          .catch(err => {
            console.error(red('Dumping database failed: ') + '%s', err);
          })
          .then(() => prompt(repl));
        }
        else prompt(repl);
      }
    });
    defineCommand('slurp', {
      help: 'Slurp local database from a specified dump file',
      action: (filename) => {
        var db = repl.context[dbprop];
        filename = genFileName('slurp', filename);
        if (!filename) {
          console.log(yellow("Please specify filename to slurp database from!"));
          prompt(repl);
        }
        else if (db) {
          const nounzip = !!getOpts(repl).noUnzip;
          console.log(grey('Slurping database locally from%s') + cyan(' %j'), nounzip ? ':' : ' zipped:', filename);
          let start = Date.now();
          restoreLocalDatabase(db, filename, nounzip)
          .then(() => console.log(grey('Database slurped successfully in') + ' %d s', secondsFrom(start)))
          .catch(err => {
            console.error(red('Slurping database failed: ') + '%s', err);
          })
          .then(() => prompt(repl));
        }
        else prompt(repl);
      }
    });
    defineCommand('restore', {
      help: 'Restore database from a specified dump file',
      action: (filename) => {
        var db = repl.context[dbprop];
        filename = genFileName('restore', filename);
        if (!filename) {
          console.log(yellow("Please specify filename to restore database from!"));
          prompt(repl);
        }
        else if (db) {
          const opts = getOpts(repl)
              , nounzip = !!opts.noUnzip;
          console.log(grey('Restoring database from%s') + cyan(' %j') + grey(' chunk size:') + ' %d', nounzip ? ':' : ' zipped:', filename, opts.updateChunkSize);
          let start = Date.now();
          restoreDatabase(db, filename, nounzip, opts.updateChunkSize)
          .then(() => db.save())
          .then(() => console.log(grey('Database restored successfully in') + ' %d s', secondsFrom(start)))
          .catch(err => {
            console.error(red('Restoring database failed: ') + '%s', err);
          })
          .then(() => prompt(repl));
        }
        else prompt(repl);
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
        console.log('\n' + green('Promise result:') + cyan(' %j'), inspect(result));
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
