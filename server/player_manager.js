'use strict';

var cp = require('child_process');
var config = require('./config');
var PassThrough = require('stream').PassThrough;
var stream = new PassThrough();

var worker;
var state = require('./player_state');
var logger = require('./logger');

function start() {
  console.log('Worker started');
  if (worker) {
    state.running = true;
    return;
  }

  worker = cp.fork(__dirname + '/player_worker.js', {
    silent: true,
    cwd: __dirname
  });
  _attachEvents();
  _attachOutputs();
  state.running = true;
}

function _attachEvents() {
  worker.on('exit', function (code, sig) {
    logger.log('CHILD EXIT', code, sig);
    state.playing = false;
    state.running = false;
    worker = null;
    if (config.autoReload) start();
  });

  worker.on('error', function (err) {
    logger.error('Worker Error:', err);
    worker.kill();
    worker = null;
  });

  worker.on('message', logger.onMsg);
}

function _attachOutputs() {
  if (worker) worker.stdout.pipe(stream, { end: false });
}

module.exports = {
  start: start,
  stop: function stop() { if (worker) worker.kill(); },
  state: function state() { return state; },
  setAuto: function setAuto(bool) { config.autoReload = bool; },
  stream: stream
};

if (config.autoReload) start();
