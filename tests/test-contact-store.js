/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-contact-store';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import("resource://ensemble/storage/SQLiteContactStore.jsm");
let os = {};
Cu.import("resource://mozmill/stdlib/os.js", os);

function initUtils() {
  const kUtils = "./test-utils.js";
  let utils = os.abspath(kUtils, os.getFileForPath(__file__));
  collector.initTestModule(utils);
}

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
  initUtils();
  collector.getModule('ensemble-test-utils').installInto(module);
  Services.prefs.setCharPref("contacts.db.logging.dump", "All");
}

let tasks;
let Store = SQLiteContactStore;

function test_setup_tasks() {
  tasks = new TaskTest();

  /**
   * Tests that we can successfully initialize, teardown,
   * and destroy a contact store.
   */
  tasks.addTask("Test initializing", function() {
    yield Store.init();
    let exists = yield Store.exists();
    assert_true(exists, "Store should exist.");
    yield Store.uninit();
    assert_true(exists, "Store should still exist.");
    yield Store.destroy();
    exists = yield Store.exists();
    assert_false(exists, "Store should not longer exist.");
  });

  tasks.runTasks();
}

