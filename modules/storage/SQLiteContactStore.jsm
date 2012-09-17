/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ['SQLiteContactStore'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const kSQLCallbacks = Ci.mozIStorageStatementCallback;
const kDbFile = 'contacts.sqlite';
const kDbFileDir = 'ProfD';

const kDbCurrentVersion = 1;

Cu.import("resource:///modules/gloda/log4moz.js");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://ensemble/JobQueue.jsm");

let Common = {};
Cu.import('resource://ensemble/Common.jsm', Common);

let Log = Log4Moz.getConfiguredLogger('contacts.db');

let SQLiteContactStore = {
  _initted: false,
  _initting: false,
  _db: null,

  init: function SQLiteCS_init(aCallback) {
    // First thing's first - let's make sure we're not re-entering.
    if (this._initted || this._initting) {
      Log.warn("Initialize called on SQLiteContactStore that was already"
               + " initializing or initialized.");
      return;
    }

    Log.info("Initializing SQLiteContactStore.");

    // We're in a half-way "initting" state as opposed to fully initialized.
    this._initting = true;

    // Grab a hold of the DB file we're going to be dealing with.
    let dbFile = Services.dirsvc.get(kDbFileDir, Ci.nsIFile);
    dbFile.append(kDbFile);

    let db = Cc["@mozilla.org/storage/service;1"]
               .getService(Ci.mozIStorageService)
               .openDatabase(dbFile);

    if (!db.connectionReady) {
      let err = new Error("Could not establish connection to contacts.sqlite");
      err.code = Common.Errors.NO_CONNECTION;
      throw err;
    }

    // Not sure if these are smart numbers or not. Copied from the Thunderbird
    // instant messaging DB code (which I believe is shared with InstantBird
    // as well).
    try {
      db.setGrowthIncrement(512 * 1024, "");
    } catch (e if e.result == Cr.NS_ERROR_FILE_TOO_BIG) {
      Log.warn('Not setting growth increment on contacts.sqlite because the'
               + ' available disk space is limited.');
    }

    let failed = function(aError) {
      // We'll ignore the uninit's status right now - we just want to tell
      // the caller that something went wrong.
      this._initting = false;
      this._initted = false;
      aCallback(aError);
    }.bind(this);


    try {
      // Ok, hold a reference to the db now. Even if we don't complete our
      // migrations, we still need to hold on to tear down.
      this._db = db;

      let q = new JobQueue();

      // Do we need to bump the db schema?
      if (this._needsMigration(db.schemaVersion)) {
        // Yep! Migrate, then run the finished function.
        Log.info(kDbFile + ' is at outdated schema version '
                 + db.schemaVersion + '. Migrating...');
        q.addJob(function(aJobFinished) {
          this._migrate(db, aJobFinished);
        }.bind(this));
      }
      else {
        Log.info(kDbFile + ' is up to date and requires no migration. Nice!');
      }

      // If migrations went well, we need to get the next insert IDs for each
      // table where we manage that...
      q.addJob(this._updateNextInsertIDs.bind(this));

      q.start(function(aResult) {
        if (aResult === Cr.NS_OK) {
          // Hooray! We're set up.
          Log.info("SQLiteContactStore initialized.");
          this._initting = false;
          this._initted = true;
          aCallback(aResult);
        } else {
          Log.error("Initialization failed with status: " + aResult);
          this.uninit(function(aStatus) {
            failed(aResult)
          });
        }
      }.bind(this));

    } catch(aError) {
      // Something went really wrong. Uninit and return an error.
      this.uninit(function(aStatus) {
        failed(aError);
      });
    }
  },

  uninit: function SQLiteCS_uninit(aCallback) {
    // Uninit'ing - we're either fully initted, or we failed during the initting
    // stage and are trying to clean up.
    if (!this._initted && !this._initting) {
      Log.warn("Uninitialize called on SQLiteContactStore that was not yet"
               + " initialized.");
      return;
    }

    Log.info("Uninitializing SQLiteContactStore.");

    // Finalize any of our built-in statements
    this._getAllTagsStatement.finalize();
    this._insertTagStatement.finalize();

    if (this._db) {
      // Close the db connection.
      this._db.asyncClose({
        complete: function() {
          Log.info("SQLiteContactStore db connection closed.");
          this._initting = false;
          this._initted = false;
          // If we were passed a callback, fire back the all green.
          if (aCallback) {
            aCallback(Cr.NS_OK);
          }
        }.bind(this)
      });
      this._db = null;
    }
  },

  _nextInsertID: {},

  /**
   * According to MDN, we cannot trust lastInsertRowID on this._db if we're
   * using multiple threads or asynchronous statements. We're aggressively
   * using asynchronous statements, so lastInsertRowID is out.
   *
   * Instead, during initialization, we calculate what the next insert IDs
   * are for each table that uses IDs, and store those in a dictionary.
   * SQLiteContactStore will manage all insertions to the database, so I think
   * it can safely manage the next insert IDs as well.
   */
  _updateNextInsertIDs: function SQLiteCS__updateNextInsertIDs(aJobFinished) {
    let kIDManagedTables = ["contacts", "contact_records", "contact_data",
                            "categories"];
    // Let's create the async queries needed to get those nextInsertIDs.
    let q = new JobQueue();
    let outerJobFinished = aJobFinished;

    for (let [, tableName] in Iterator(kIDManagedTables)) {
      // For each table that uses IDs, schedule a job to calculate the next
      // inserted ID value.

      q.addJob(function(aInnerJobFinished) {
        // I'm not dealing with user input, so I'm not worried about
        // SQL injection here - plus, it doesn't appear as if mozStorage
        // will let me bind a table name as a parameter anyway.
        let statement = this._db.createStatement(
          "SELECT MAX(id) from " + tableName);

        statement.executeAsync({
          handleResult: function(aResultSet) {
            let row, id = 0;

            while ((row = aResultSet.getNextRow())) {
              // If the table is empty, we get null.
              if (!row.getIsNull(0))
                id = row.getInt64(0);
            }

            this._nextInsertID[tableName] = id + 1;
          }.bind(this),

          handleError: function(aError) {
            let e = new Error("Could get MAX(id)! error #: " + aError);
            aInnerJobFinished(e);
          },

          handleCompletion: function(aReason) {
            if (aReason === kSQLCallbacks.REASON_FINISHED)
              aInnerJobFinished(Cr.NS_OK);
            else if (aReason === kSQLCallbacks.REASON_CANCELLED) {
              aInnerJobFinished(new Error("Getting MAX(id) was cancelled!"));
            }
            // We don't handle errors on completion, only in handleError.
          },
        });

        // We're not using this again, so go ahead and finalize.
        statement.finalize();

      }.bind(this));
    }

    q.start(outerJobFinished);
  },

  _needsMigration: function SQLiteCS__needsMigration(aDbVersion) {
    return (aDbVersion < kDbCurrentVersion);
  },

  _migrate: function SQLiteCS__migrate(aDb, aCallback) {
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

    let trans = new SQLiteMultistepTransaction(aDb);

    // Schema 1
    if (dbVersion == 0) {
      trans.steps.push(function(aDb, aStorageCallback) {
        let stmtStrings = [
          "CREATE TABLE IF NOT EXISTS contacts (" +
            "id INTEGER PRIMARY KEY NOT NULL UNIQUE, " +
            "popularity INTEGER NOT NULL DEFAULT (0), " +
            "default_email TEXT, " +
            "default_impp TEXT, " +
            "default_tel TEXT, " +
            "display_name_family_given TEXT NOT NULL DEFAULT (''), " +
            "display_name_given_family TEXT NOT NULL DEFAULT (''), " +
            "created DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), " +
            "modified DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), " +
            "FOREIGN KEY (default_email) REFERENCES contact_data(id))",

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
            "mime_type TEXT NOT NULL DEFAULT ('text/plain'), " +
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
        let stmtString = [
          "CREATE UNIQUE INDEX IF NOT EXISTS categorization_index " +
            "ON categorizations (" +
            "category_id ASC, " +
            "contact_id ASC)",
        ].join('\n');

        let stmt = aDb.createStatement(stmtString);
        aDb.executeAsync([stmt], 1, aStorageCallback);
        stmt.finalize();
      });
    }

    trans.run(function(aResult) {
      if (aResult === Cr.NS_OK) {
        // Bump the dbVersion to current
        aDb.schemaVersion = kDbCurrentVersion;
        Log.info("Successfully migrated to schema version "
                 + kDbCurrentVersion);
      }
      aCallback(aResult);
    });
  },

  save: function SQLiteCS_save(aContactRecord, aCallback) {

  },

  get _getAllTagsStatement() {
    // A little trick I learned from gloda/modules/datastore.js.
    let statement = this._db.createAsyncStatement(
      "SELECT export_name, display_name FROM categories");
    this.__defineGetter__("_getAllTagsStatement", function () statement);
    return this._getAllTagsStatement;
  },

  getAllTags: function SQLiteCS_getAllTags(aCallback) {
    let allTags = {};
    this._getAllTagsStatement.executeAsync({
      handleResult: function(aResultSet) {
        while ((row = aResultSet.getNextRow())) {
          let tagID = row.getString(0);
          let tagPrettyName = row.getString(1);
          allTags[tagID] = tagPrettyName;
        }
      },

      handleError: function(aError) {
        aCallback(new Error("Could not get tags - got error: " + aError));
      },

      handleCompletion: function(aReason) {
        if (aReason === kSQLCallbacks.REASON_FINISHED)
          aCallback(Cr.NS_OK, {tags: allTags});
        else if (aReason === kSQLCallbacks.REASON_CANCELLED) {
          aCallback(new Error("Getting all tags was cancelled!"));
        }
      },
    });
  },

  get _insertTagStatement() {
    let statement = this._db.createAsyncStatement(
      "INSERT INTO categories (id, export_name, display_name, originator) " +
        "VALUES (?1, ?2, ?3, ?4)");
    this.__defineGetter__("_insertTagStatement", function () statement);
    return this._insertTagStatement;
  },

  insertTag: function SQLiteCS_insertTag(aTagID, aTagName, aOriginator,
                                         aCallback) {
    let statement = this._insertTagStatement;
    statement.bindInt64Parameter(0, this._nextInsertID['categories']);
    statement.bindStringParameter(1, aTagID);
    statement.bindStringParameter(2, aTagName);
    statement.bindStringParameter(3, aOriginator);

    statement.executeAsync({
      handleResult: function(aResultSet) {},
      handleError: function(aError) {
        aCallback(new Error("Could not insert tag with ID " + aTagID +
                            " received error: " + aError));
      },
      handleCompletion: function(aReason) {
        if (aReason === kSQLCallbacks.REASON_FINISHED) {
          this._nextInsertID['categories']++;
          aCallback(Cr.NS_OK);
        }
        else if (aReason === kSQLCallbacks.REASON_CANCELLED) {
          aCallback(new Error("Inserting tag with ID " + aTagID +
                              " was cancelled!"));
        }
      }.bind(this),
    });
  },

};


/**
 * SQLiteMultistepTransaction
 *
 * A handy class for doing sequential asynchronous interactions on an
 * SQLite database where each step *must* be completed before the next.
 * We open a transaction before all steps are run, and commit if they are
 * completed successfully. We automatically rollback on failure.
 *
 * Note that this gives us a little more flexibility than just using
 * executeAsync([big collection of statements]) for a few reasons. For one,
 * we can't create a statement for CREATE INDEX unless the tables that the
 * index refers to has already been created. In this case, the tables could
 * be created in the first step (using executeAsync([big collection of
 * CREATE TABLE statements]), and then a second step to create indices.
 *
 * Simply instantiate an SQLiteMultistepTransaction, append functions to
 * the instance's steps Array in the desired order, and call run.
 *
 * Each step function gets two arguments when called - the first argument
 * is a reference to the SQLite database. The second is the object that must
 * be passed to executeAsync as the callback function. Without passing this,
 * SQLiteMultistepTransaction does not know when to progress to the next
 * step.
 *
 * NOTE: Each step is responsible for finalizing their own statements!
 *
 * @param aDb the SQLite database to interact with.
 */
function SQLiteMultistepTransaction(aDb) {
  this._db = aDb;
  this.steps = [];
}

SQLiteMultistepTransaction.prototype = {

  /**
   * Open a transaction, and then execute each step, one after another,
   * ensuring that each step executes correctly. If so, commit. If not,
   * rollback.
   *
   * @param aCallback a callback function that receives a single argument,
   *                  which is either Cr.NS_OK, or an Error explaining what
   *                  went wrong.
   */
  run: function(aCallback) {
    Log.info("Starting SQLiteMultistepTransaction");
    this._db.beginTransaction();
    this._callback = aCallback;
    this._tick();
  },

  // Private functions

  // Move forward a step (or commit, if we've run out of steps).
  _tick: function() {
    // Base case - we've run out of steps.
    if (this.steps.length == 0) {
      this._commitAndFinish();
      return;
    }

    let step = this.steps.shift(1);
    try {
      step(this._db, this);
    } catch(e) {
      let err = new Error("Got error: " + e + " for step " + step);
      err.code = Common.Errors.TRANSACTION_FAILED;
      this._rollbackAndFinish(err);
    }
  },

  // We're done here, commit the transaction and call the callback with
  // NS_OK
  _commitAndFinish: function() {
    Log.info("Committing transaction.");
    this._db.commitTransaction();
    delete this._db;
    this._callback(Cr.NS_OK);
  },

  // Something screwed up. Rollback the transaction, and report the error
  // to the callback.
  _rollbackAndFinish: function(aError) {
    Log.info("Rolling back transaction.");
    this._db.rollbackTransaction();
    delete this._db;
    this._callback(aError);
  },

  // mozIStorageCompletionCallback functions
  handleResult: function(aResult) {},
  handleError: function(aError) {
    Log.error(aError.message);
    let err = new Error(aError.message + " -- (" + aError.result + ")");
    err.code = Common.Errors.TRANSACTION_FAILED;
    this._rollbackAndFinish(err);
  },

  handleCompletion: function(aReason) {
    // Three possible reasons - REASON_FINISHED,
    // REASON_CANCELED, REASON_ERROR.
    if (aReason === kSQLCallbacks.REASON_FINISHED) {
      this._tick();
      return;
    }
    else if (aReason === kSQLCallbacks.REASON_CANCELED) {
      let err = new Error("Transaction was cancelled");
      err.code = Common.Errors.TRANSACTION_CANCELLED;
      this._rollbackAndFinish(err);
    }
    Log.error("SQLiteMultistepTransaction failed with reason: "
              + aReason);
  },
}
