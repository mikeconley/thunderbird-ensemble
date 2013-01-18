/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ['SQLiteContactStore'];

const {interfaces: Ci, utils: Cu, classes: Cc, results: Cr} = Components;

const kDbFile = 'contacts.sqlite';
const kDbCurrentVersion = 1;

Cu.import("resource:///modules/gloda/log4moz.js");
Cu.import("resource://gre/modules/osfile.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/promise/core.js");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Sqlite.jsm");

let Common = {};
Cu.import('resource://ensemble/Common.jsm', Common);

let Log = Log4Moz.getConfiguredLogger('contacts.db');

const kPath = OS.Path.join(OS.Constants.Path.profileDir,
                           kDbFile);

let SQLiteContactStore = {
  _initted: false,
  _initting: false,
  _db: null,

  init: function SQLiteCS_init() {
    // First thing's first - let's make sure we're not re-entering.
    if (this._initted || this._initting) {
      Log.warn("Initialize called on SQLiteContactStore that was already"
               + " initializing or initialized.");
      return Promise.reject();
    }

    Log.info("Initializing SQLiteContactStore.");

    // We're in a half-way "initting" state as opposed to fully initialized.
    this._initting = true;

    // Grab a hold of the DB file we're going to be dealing with.
    let self = this;

    return Task.spawn(function() {
      self._db = yield Sqlite.openConnection({path: kPath});
//      yield self._migrateDb();
      this._initting = false;
      this._initted = true;
    });
  },

  uninit: function SQLiteCS_uninit() {
    // Uninit'ing - we're either fully initted, or we failed during the initting
    // stage and are trying to clean up.
    if (!this._initted && !this._initting) {
      Log.warn("Uninitialize called on SQLiteContactStore that was not yet"
               + " initialized.");
      return Promise.reject();
    }

    Log.info("Uninitializing SQLiteContactStore.");

    let self = this;
    return Task.spawn(function() {
      yield self._db.close();
      self._initted = false;
      self._db = null;
    });
  },

  destroy: function SQLiteCS_destroy() {
    // We can't destroy if we're initted or in the process of being
    // initted.
    if (this._initted || this._initting)
      return Promise.reject();

    Log.info("Destroying database! I hope that's what you wanted...");

    return OS.File.remove(kPath);
  },

  exists: function SQLiteCS_exists() {
    return OS.File.exists(kPath);
  },

/*
  _migrate: function SQLiteCS__migrate(aDb, aJobFinished) {
    let dbVersion = aDb.schemaVersion;

    // Preliminaries - make sure we were passed a database in a sane state.
    if (dbVersion == kDbCurrentVersion) {
      Log.warn('Attempted to migrate a db at version ' + dbVersion + ' but'
               + ' we can only migrate from versions ' + (kDbCurrentVersion - 1)
               + ' and lower.');
      // It's weird that we got here, but we should still be OK because we
      // can grok this db version.
      aJobFinished.jobSuccess(Cr.NS_OK);
    }

    if (dbVersion > kDbCurrentVersion) {
      Log.error('The database appears to be from the future... cannot deal with'
                + ' it. Bailing.');
      aJobFinished.jobError(
        new Error("The database version appears to be from the future.")
      );
    }

    // Ok, so dbVersion < kDbCurrentVersion. That's good.

    let trans = new SQLiteMultistepTransaction(aDb);

    // Schema 1
    if (dbVersion == 0) {
      trans.steps.push(function(aDb, aStorageCallback) {
        let stmtStrings = [
          "CREATE TABLE IF NOT EXISTS contacts (" +
            "id INTEGER PRIMARY KEY NOT NULL UNIQUE, " +
            "popularity INTEGER NOT NULL DEFAULT (0), " +
            "attributes TEXT, " +
            "display_name_family_given TEXT NOT NULL DEFAULT (''), " +
            "display_name_given_family TEXT NOT NULL DEFAULT (''), " +
            "created DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), " +
            "modified DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)) ",

          "CREATE TABLE IF NOT EXISTS contact_records (" +
            "id INTEGER PRIMARY KEY NOT NULL UNIQUE, " +
            "contact_id INTEGER NOT NULL, " +
            "data TEXT NOT NULL DEFAULT ('{}'), " +
            "source TEXT NOT NULL, " +
            "FOREIGN KEY(contact_id) REFERENCES contacts(id))",

          "CREATE TABLE IF NOT EXISTS contact_data (" +
            "id INTEGER PRIMARY KEY NOT NULL UNIQUE, " +
            "contact_id INTEGER NOT NULL, " +
            "data1 TEXT NOT NULL DEFAULT (''), " +
            "data2 TEXT NOT NULL DEFAULT (''), " +
            "data3 TEXT NOT NULL DEFAULT (''), " +
            "field_type TEXT NOT NULL, " +
            "FOREIGN KEY(contact_id) REFERENCES contacts(id)) ",

          "CREATE TABLE IF NOT EXISTS categories (" +
            "id INTEGER PRIMARY KEY NOT NULL UNIQUE, " +
            "display_name TEXT NOT NULL, " +
            "export_name TEXT NOT NULL, " +
            "originator TEXT NOT NULL)",

          "CREATE TABLE IF NOT EXISTS categorizations (" +
            "contact_id INTEGER NOT NULL, " +
            "category_id INTEGER NOT NULL, " +
            "FOREIGN KEY(contact_id) REFERENCES contacts(id), " +
            "FOREIGN KEY(category_id) REFERENCES categories(id))",
        ];

        let stmts = [
          aDb.createStatement(stmtString)
          for each (stmtString in stmtStrings)
        ];

        aDb.executeAsync(stmts, stmts.length, aStorageCallback);

        for each (let stmt in stmts)
          stmt.finalize();
      });

      trans.steps.push(function(aDb, aStorageCallback) {
        let stmtStrings = [
          "CREATE UNIQUE INDEX IF NOT EXISTS categorization_index " +
            "ON categorizations (" +
            "category_id ASC, " +
            "contact_id ASC)",

          "CREATE INDEX IF NOT EXISTS contact_data_search_index " +
            "ON contact_data (data1)",

          "CREATE INDEX IF NOT EXISTS contact_data_field_type " +
            "ON contact_data (field_type)",

          "CREATE INDEX IF NOT EXISTS contacts_display_name_family_given " +
            "ON contacts (display_name_family_given)",

          "CREATE INDEX contacts_display_name_given_family " +
            "ON contacts (display_name_given_family)",

          "CREATE INDEX IF NOT EXISTS contacts_popularity " +
            "ON contacts (popularity)",
        ];

        let stmts = [
          aDb.createStatement(stmtString)
          for each (stmtString in stmtStrings)
        ];

        aDb.executeAsync(stmts, stmts.length, aStorageCallback);

        for each (let stmt in stmts)
          stmt.finalize();
      });
    }

    trans.run(function(aResult) {
      if (aResult === Cr.NS_OK) {
        // Bump the dbVersion to current
        aDb.schemaVersion = kDbCurrentVersion;
        Log.info("Successfully migrated to schema version "
                 + kDbCurrentVersion);
        aJobFinished.jobSuccess(aResult);
      } else {
        aJobFinished.jobError(aResult);
      }
    });
  },
*/
};
