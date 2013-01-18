/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-contact-store';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

const {results: Cr} = Components;

Cu.import("resource://ensemble/storage/SQLiteContactStore.jsm");

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
  Services.prefs.setCharPref("contacts.db.logging.dump", "All");
}

function test_init() {
  let done = false;
  let error = null;
  SQLiteContactStore.init().then(function() {
    done = true;
  }, function(aError) {
    done = true;
    error = aError;
  });

  mc.waitFor(function() done, "Timed out waiting to init contact store.");

  if (error) {
    throw error;
  }

  done = false;

  SQLiteContactStore.uninit().then(function() {
    done = true;
  }, function(aError) {
    done = true;
    error = aError;
  });

  mc.waitFor(function() done, "Timed out waiting to uninit contact store.");

  if (error) {
    throw error;
  }
}
