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
      Log.info("Opening SQLite connection.");
      self._db = yield Sqlite.openConnection({path: kPath});
      Log.info("Running migrations.");
      yield self._migrateDb();
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
      self._initting = false;
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

  ensureTransaction: function (aFunc, aType) {
    if (this._db.transactionInProgress) {
      return aFunc(this._db);
    } else {
      return this._db.executeTransaction(aFunc, aType);
    }
  },

  _migrateDb: function SQLiteCS__migrateDb() {
    let dbVersion = this._db.schemaVersion;
    // Preliminaries - make sure we were passed a database in a sane state.
    if (dbVersion == kDbCurrentVersion) {
      return Promise.resolve();
    }

    if (dbVersion > kDbCurrentVersion) {
      Log.error('The database appears to be from the future... cannot deal with'
                + ' it. Bailing.');
      return Promise.reject(new Error("The database version appears to be from the future."));
    }

    // Ok, so dbVersion < kDbCurrentVersion. That's good.
    // So are we starting from nothing? If so, skip migrations
    // and just create the current table schema from scratch.
    if (dbVersion == 0) {
      return this._createDb();
    }

    // This is where migrations should go... but I don't have
    // any yet, so I'll just resolve the returned promise.
    return Promise.resolve();
  },

  _createDb: function SQLiteCS__createDb() {
    const TABLES = {
      contacts:
        "id INTEGER PRIMARY KEY, " +
        "popularity INTEGER NOT NULL DEFAULT (0), " +
        "fields TEXT NOT NULL DEFAULT ('{}'), " +
        "meta TEXT NOT NULL DEFAULT ('{}'), " +
        "display_name_family_given TEXT NOT NULL DEFAULT (''), " +
        "display_name_given_family TEXT NOT NULL DEFAULT ('')",
/*
        "created DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), " +
        "modified DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)",
*/
      contact_records:
        "id INTEGER PRIMARY KEY, " +
        "contact_id INTEGER NOT NULL, " +
        "data TEXT NOT NULL DEFAULT ('{}'), " +
        "source TEXT NOT NULL, " +
        "FOREIGN KEY(contact_id) REFERENCES contacts(id)",

      contact_data:
        "id INTEGER PRIMARY KEY, " +
        "contact_id INTEGER NOT NULL, " +
        "data1 TEXT NOT NULL DEFAULT (''), " +
        "data2 TEXT NOT NULL DEFAULT (''), " +
        "data3 TEXT NOT NULL DEFAULT (''), " +
        "field_type TEXT NOT NULL, " +
        "FOREIGN KEY(contact_id) REFERENCES contacts(id)",

      categories:
        "id INTEGER PRIMARY KEY, " +
        "display_name TEXT NOT NULL, " +
        "export_name TEXT NOT NULL, " +
        "originator TEXT NOT NULL",

      categorizations:
        "contact_id INTEGER NOT NULL, " +
        "category_id INTEGER NOT NULL, " +
        "FOREIGN KEY(contact_id) REFERENCES contacts(id), " +
        "FOREIGN KEY(category_id) REFERENCES categories(id)"
    };

    // I know; it's supposed to be "indices".
    const INDEXES = {
      contact_data_search_index: "contact_data (data1)",
      contact_data_field_type: "contact_data (field_type)",
      contacts_display_name_family_given: "contacts (display_name_family_given)",
      contacts_display_name_given_family: "contacts (display_name_given_family)",
      contacts_popularity: "contacts (popularity)"
    };

    let self = this;
    return Task.spawn(function() {
      for (let [k, v] in Iterator(TABLES)) {
        Log.info("Creating table " + k);
        yield self._db.execute("CREATE TABLE " + k + "(" + v + ")");
        Log.info("Table " + k + " created.");
      }

      Log.info("Creating index categorization_index");
      yield self._db.execute("CREATE UNIQUE INDEX IF NOT EXISTS categorization_index ON categorizations (category_id ASC, contact_id ASC)");
      Log.info("Index categorization_index created.");

      for (let [k, v] in Iterator(INDEXES)) {
        Log.info("Creating index " + k);
        yield self._db.execute("CREATE INDEX IF NOT EXISTS " + k + " ON " + v);
        Log.info("Index " + k + " created.");
      }

      self._db.schemaVersion = kDbCurrentVersion;
    });
  }
};
