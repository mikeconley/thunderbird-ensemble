/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Ci = Components.interfaces;
const Cr = Components.results;
const kSQLCallbacks = Ci.mozIStorageStatementCallback;

let EXPORTED_SYMBOLS = ["ContactDBA"];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://ensemble/JobQueue.jsm");

/**
 * ContactDBA is the abstraction layer between Contact.jsm and
 * SQLiteContactStore.jsm. This layer takes care of forming and
 * executing the SQLite statements that get run by SQLiteContactStore.
 *
 */
let ContactDBA = {
  _db: null,
  _nextInsertID: {},

  /**
   * Initializes the abstraction layer - unless you're testing / mocking,
   * don't use ContactDBA or Contact without initializing this first!
   *
   * @param aDB the initalized SQLiteContactStore to read from and write to
   * @param aCallback the callback to be fired upon completion.
   */
  init: function(aDatastore, aCallback) {
    // It's OK for the DBAs to reach into SQLiteContactStore like this -
    // these are expected to be tightly coupled.
    this._datastore = aDatastore;
    this._db = this._datastore._db;

    // We need to get the nextInsertIDs for both the contacts
    // table and the contact_data table.
    const kIDManagedTables = ["contacts", "contact_data"];
    let q = new JobQueue();

    for (let managedTable of kIDManagedTables) {
      // So this is kind of lame, but we have to do an extra let-binding
      // here, or else the closure for the job gets contaminated with
      // subsequent iterations. Grrr...
      let tableName = managedTable;
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
            let e = new Error("Could not get MAX(id)! error #: " + aError);
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

    q.addJob(function(aJobFinished) {
      this._defineStatements();
      aJobFinished(Cr.NS_OK);
    }.bind(this));

    q.start(aCallback);
  },

  /**
   * Shuts this abstraction layer down, finalizes any statements, frees
   * memory, etc.
   *
   * @param aCallback the callback to be fired upon completion.
   */
  uninit: function(aCallback) {
  },

  /**
   * Handle a sync call (like save or fetch) for a Contact. Called by
   * Backbone.jsm. This function is asynchronous.
   *
   * @param aMethod a string - either "create", "read", "update" or "delete.
   * @param aContact the Contact model that's being operated upon.
   * @param aOptions the options passed to the original sync call.
   */
  handleSync: function(aMethod, aContact, aOptions) {
    try {
      switch (aMethod) {
        case "create":
          this._create(aContact, aOptions);
          break;
        // read
        // update
        // delete
        default:
          throw("Didn't recognize method: " + aMethod);
      }
    } catch(e) {
      aOptions.error(aContact, e);
    }
  },

  _create: function(aContact, aOptions) {
    // Jam that Contact into the contact DB.
    aContact.id = 1;
  },

  // Statements
  _finalizeStatements: function() {
    const kStatements = [this._createContactStatement];
    for (let statement of kStatements)
      statement.finalize();
  },

  _defineStatements: function() {
    XPCOMUtils.defineLazyGetter(this,
                                "_createContactStatement",
                                function(aItem) {
      return this._db.createAsyncStatement(
        "INSERT INTO contacts (id, popularity, default_email, "
        + "default_impp, default_tel, default_name_family_given, "
        + "default_name_given_family) VALUES (:id, :popularity, "
        +   ":default_email, :default_impp, :default_tel, "
        +   ":default_name_family_given, :default_name_given_family)");
    }.bind(this));
  },
};
