/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = "ensemble-test-utils";
const RELATIVE_ROOT = "../shared-modules";
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import("resource://gre/modules/Task.jsm");

let fdr;

function setupModule() {
  fdr = collector.getModule('folder-display-helpers');
}
function installInto(module) {
  setupModule();
  module.TaskTest = TaskTest;
}

// This will have to do until I can figure out how to move
// the promise tests over to xpcshell-tests.

function TaskTest() {
  this._tasks = [];
}

TaskTest.prototype = {
  addTask: function(aName, aTask) {
    this._tasks.push({name: aName,
                      func: aTask});
  },

  runTasks: function() {
    let self = this;
    Task.spawn(function() {
      for (let task of self._tasks) {
        dump("\nRunning: " + task.name + "...");
        yield task.func();
        dump("PASS\n");
      }
    }).then(function() {
      self._done = true;
    }, function(aError) {
      self._done = true;
      self._error = aError;
    })

    fdr.mc.waitFor(function() self._done,
                   "Failed to complete tests!");
    if (self._error) {
      dump("\nError: " + self._error + " -- " + self._error.stack + "\n");
      throw self._error;
    }
  },
};
