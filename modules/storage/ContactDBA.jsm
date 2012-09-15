/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["ContactDBA"];

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
  init: function(aDB, aCallback) {
    this._db = aDB;
    // We need to get the nextInsertIDs for both the contacts
    // table and the contact_data table.
    const kIDManagedTables = ["contacts", "contact_data"];
    let q = new JobQueue();

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
    aContact.id = 1;
    return aContact;
  },
};
