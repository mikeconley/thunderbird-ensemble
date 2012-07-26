/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ['SQLiteContactStore'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const kDbFile = 'contacts.sqlite';
const kDbFileDir = 'ProfD';

const kDbCurrentVersion = 1;

Cu.import('resource:///modules/gloda/log4moz.js');
Cu.import('resource://gre/modules/Services.jsm');

let Log = Log4Moz.getConfiguredLogger('contacts.db');

let SQLiteContactStore = {
  _initted: false,
  _db: null,

  init: function(aCallback) {
    if (this._initted) {
      Log.warn("Initialize called on SQLiteContactStore that was already"
               + " initialized.");
      return;
    }

    Log.info("Initializing SQLiteContactStore.");

    let dbFile = Services.dirsvc.get(kDbFileDir, Ci.nsIFile);
    dbFile.append(kDbFile);

    let db = Cc["@mozilla.org/storage/service;1"]
               .getService(Ci.mozIStorageService)
               .openDatabase(dbFile);

    if (!db.connectionReady)
      throw new Error("Could not establish connection to contacts.sqlite");

    try {
      db.setGrowthIncrement(512 * 1024, "");
    } catch (e if e.result == Cr.NS_ERROR_FILE_TOO_BIG) {
      Log.warn('Not setting growth increment on contacts.sqlite because the'
               + ' available disk space is limited.');
    }


    let finished = function(aResult) {

      if (aResult == Cr.NS_OK) {
        Log.info("SQLiteContactStore initialized.");
        this._db = db;
        this._initted = true;
      } else {
        Log.error("Initialization failed with status: " + aResult);
      }

      aCallback(aResult);
    }.bind(this);


    if (this._needsMigration(db.schemaVersion)) {
      Log.info('contacts.sqlite is at outdated schema version '
               + db.schemaVersion + '. Migrating...');
      this._migrate(db, finished);
    }
    else {
      finished(Cr.NS_OK);
    }
  },

  uninit: function() {
    if (!this._initted) {
      Log.warn("Uninitialize called on SQLiteContactStore that was not yet"
               + " initialized.");
      return;
    }

    Log.info("Uninitializing SQLiteContactStore.");
    this._initted = false;
  },

  _needsMigration: function(aDbVersion) {
    return (aDbVersion < kDbCurrentVersion);
  },

  _migrate: function(aDb, aCallback) {
    let dbVersion = aDb.schemaVersion;

    // Preliminaries - make sure we were passed a database in a sane state.
    if (dbVersion == kDbCurrentVersion) {
      Log.warn('Attempted to migrate a db at version ' + dbVersion + ' but'
               + ' we can only migrate from versions ' + (kDbCurrentVersion - 1)
               + ' and lower.');
      // It's weird that we got here, but we should still be OK because we
      // can grok this db version.
      aCallback(Cr.NS_OK);
    }

    if (dbVersion > kDbCurrentVersion) {
      Log.error('The database appears to be from the future... cannot deal with'
                + ' it. Bailing.');
      aCallback(Cr.NS_ERROR_FAILURE);
    }

    // Ok, so dbVersion < kDbCurrentVersion. That's good.

    let stmtStrings = [];

    // Schema 1
    if (dbVersion == 0) {
      stmtStrings = stmtStrings.concat([
        "CREATE TABLE IF NOT EXISTS contacts (" +
          "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, " +
          "display_name_family_given TEXT NOT NULL DEFAULT (''), " +
          "display_name_given_family TEXT NOT NULL DEFAULT (''), " +
          "popularity INTEGER NOT NULL DEFAULT (0), " +
          "created DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), " +
          "modified DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP))",

        "CREATE TABLE IF NOT EXISTS contact_records (" +
          "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, " +
          "contact_id INTEGER NOT NULL, " +
          "data TEXT NOT NULL DEFAULT ('{}'), " +
          "source TEXT NOT NULL, " +
          "FOREIGN KEY(contact_id) REFERENCES contacts(id))",

        "CREATE TABLE IF NOT EXISTS contact_data (" +
          "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, " +
          "contact_id INTEGER NOT NULL, " +
          "data1 TEXT NOT NULL DEFAULT (''), " +
          "data2 TEXT NOT NULL DEFAULT (''), " +
          "data3 TEXT NOT NULL DEFAULT (''), " +
          "mime_type TEXT NOT NULL DEFAULT ('text/plain'), " +
          "field_type TEXT NOT NULL, " +
          "FOREIGN KEY(contact_id) REFERENCES contacts(id)) ",

        "CREATE TABLE IF NOT EXISTS categories (" +
          "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, " +
          "display_name TEXT NOT NULL, " +
          "export_name TEXT NOT NULL, " +
          "originator TEXT NOT NULL)",

        "CREATE TABLE IF NOT EXISTS categorizations (" +
          "contact_id INTEGER NOT NULL, " +
          "category_id INTEGER NOT NULL, " +
          "FOREIGN KEY(contact_id) REFERENCES contacts(id), " +
          "FOREIGN KEY(category_id) REFERENCES categories(id))",

        "CREATE UNIQUE INDEX categorization_index ON categorizations (" +
          "category_id ASC, " +
          "contact_id ASC)",
      ]);
    }

    // Create statements
    let stmts = [aDb.createStatement(stmtStr)
                 for each (stmtStr in stmtStrings)];

    aDb.executeAsync(stmts, stmts.length, {
      handleResult: function(aResultSet) {},
      handleError: function(aError) {
        // TODO!
      },
      handleCompletion: function(aReason) {
        // TODO!
        aCallback(Cr.NS_OK);
      }
    });

  },

  save: function(aContactRecord, aCallback) {
  },

};
