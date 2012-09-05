/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ["Ensemble"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://ensemble/Logging.jsm");
Cu.import("resource://ensemble/JobQueue.jsm");
let Common = {};
Cu.import("resource://ensemble/Common.jsm", Common);

let Ensemble = {
  _initted: false,
  _initting: false,
  _datastore: null,
  _tagsCache: {},

  init: function Ensemble_init(aDatastore, aCallback) {
    if (this._initted || this._initting)
      return;

    Log.info("Starting up.");
    this._initting = true;

    this._datastore = aDatastore;

    let q = new JobQueue();
    q.addJob(this._datastore.init.bind(this._datastore));
    q.addJob(this._fillCaches.bind(this));

    q.start(function(aResult) {
      if (aResult === Cr.NS_OK) {
        this._initting = false;
        this._initted = true;
        Log.info("Startup complete.");
      } else {
        Log.error("Init failed with message: " + aResult.message);
      }

      aCallback(aResult);
    }.bind(this));
  },

  uninit: function Ensemble_uninit(aCallback) {
    if (!this._initted)
      return;

    Log.info("Shutting down.");
    this._datastore.uninit(function(aResult) {
      if (aResult === Cr.NS_OK) {
        this._initted = false;
        Log.info("Shutdown complete.");
      } else {
        Log.error("Uninit failed with message: " + aResult.message);
      }

      aCallback(aResult);
    }.bind(this));
  },

  openDebugTab: function Ensemble_openOrFocusDebugTab() {
    Log.info("Opening or focusing debug tab");
    let mail3Pane = Services.wm.getMostRecentWindow("mail:3pane");
    if (!mail3Pane) {
      Log.error("No mail3pane found - bailing!");
      return;
    }

    let tabmail = mail3Pane.document.getElementById('tabmail');

    if (!tabmail) {
      Log.error("No tabmail found in the top-most 3pane. Bailing!");
      return;
    }

    Log.info("Opening debug tab");

    tabmail.openTab("chromeTab", {
      chromePage: "chrome://ensemble/content/debugTab.xhtml",
    });

    Log.info("Debug tab should be open now.");
  },

  hasTag: function Ensemble_hasTag(aTagID) {
    return (aTagID in this._tagsCache);
  },

  addTags: function Ensemble_addTag(aTags, aOriginator, aCallback) {
    let tagsToInsert = {};
    for each (let [tagID, tag] in Iterator(aTags)) {
      if (!this.hasTag(tagID))
        tagsToInsert[tagID] = tag;
    }
    if (Object.keys(tagsToInsert).length == 0)
      return aCallback(Cr.NS_OK);
    this._datastore.insertTags(tagsToInsert, aOriginator, aCallback);
  },

  _fillCaches: function Ensemble_fillCaches(aJobFinished) {
    this._datastore.getAllTags(function(aResult, aPayload) {
      if (aResult === Cr.NS_OK)
        this._tagsCache = aPayload.tags;

      aJobFinished(aResult);
    }.bind(this));
  },

  saveContact: function(aContact, aServiceIDs, aCallback) {
    // First thing's first - we need to save what we have to our datastore,
    // locally - that includes the subrecords cache.
    //
    // If the contact does not already exist in the database, it will be
    // created, and the resulting contact will be assigned an ID.
    let q = new JobQueue();
    q.addJob(function(aJobFinished) {
      this._datastore.saveContact(aContact, aJobFinished);
    }.bind(this));


    // TODO: And then we need to try to save the changes to the services
    // associated with the IDs passed in aServiceIDs.

    // Ok, fire it off.
    q.start(aCallback);
  },
}
