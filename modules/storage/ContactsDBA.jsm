/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Ci = Components.interfaces;
const Cr = Components.results;
const kSQLCallbacks = Ci.mozIStorageStatementCallback;

let EXPORTED_SYMBOLS = ["ContactsDBA"];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://ensemble/JobQueue.jsm");

let ContactsDBA = {
  _db: null,

  init: function(aDatastore, aCallback) {
    this._db = aDatastore._db;
    this._defineStatements();
    aCallback(Cr.NS_OK);
  },

  uninit: function(aCallback) {
    this._finalizeStatements();
    aCallback(Cr.NS_OK);
  },

  /**
   *
   * @param aMethod a string - either "create", "read", "update" or "delete.
   * @param aContact the Contacts collection that's being operated upon.
   * @param aOptions the options passed to the original sync call.
   */
  handleSync: function(aMethod, aContactsCollection, aOptions) {
    try {
      switch (aMethod) {
        case "read":
          this._read(aContactsCollection, aOptions);
          break;
        // read
        // update
        // delete
        default:
          throw("Didn't recognize method: " + aMethod);
      }
    } catch(e) {
      aOptions.error(aContactsCollection, e);
    }
  },

  _read: function(aCollection, aOptions) {
    let orderBy = aCollection.orderBy ? aCollection.orderBy
                                      : "display_name_given_family";
    // Since orderBy can change from time to time, and we can't for some
    // reason bind to ORDER BY clauses. So we have to create the statement
    // each time we do this. Lame.
    let statement = this._db.createAsyncStatement(
        "SELECT id, attributes FROM contacts ORDER BY " + orderBy);

    let results = {};
    statement.executeAsync({
     handleResult: function(aResultSet) {
       while (row = aResultSet.getNextRow()) {
         let id = row.getInt64(0);
         let attributes = row.getString(1);
         results[id] = JSON.parse(attributes);
       }
     },
     handleError: function(aError) {
       aOptions.error(new Error("Could not retrieve all contacts: " +
                                aError.message));
     },
     handleCompletion: function(aReason) {
       if (aReason === kSQLCallbacks.REASON_FINISHED)
         aOptions.success(results);
       else if (aReason === kSQLCallbacks.REASON_CANCELLED) {
         aOptions.error(new Error("Retrieving contacts was cancelled."));
       }
       // We don't handle errors on completion, only in handleError.
     },
    });

    statement.finalize();
  },

  _defineStatements: function() {
  },

  _finalizeStatements: function() {
    const kStatements = [];
    for (let statement of kStatements)
      statement.finalize();
  },
};
