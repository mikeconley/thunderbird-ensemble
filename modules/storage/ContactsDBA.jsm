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
    aCallback(Cr.NS_OK);
  },

  uninit: function(aCallback) {
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
      aOptions.error(aContact, e);
    }
  },

  _read: function(aCollection, aOptions) {
    dump("\n\nHIYO\n\n");
  },

};
