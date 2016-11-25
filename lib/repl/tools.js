"use strict";

const util = require('util');
const colors = require('colors/safe')
    , { cyan, green, grey, magenta, red, yellow, bgGreen } = colors;

const { Iterator } = require('../iter');

exports.inspect = function(output) {
  if (output === Iterator.done) return grey('done');
  return util.inspect(output, {colors: true, depth: 3});
};

exports.prompt = function(repl) {
  repl.lineParser.reset();
  repl.bufferedCommand = '';
  repl.displayPrompt();
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
exports.lpad = function(input, size, padder) {
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
};
