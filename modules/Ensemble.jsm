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
Cu.import("resource://ensemble/Backbone.jsm");

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

  addTag: function Ensemble_addTag(aTagID, aTagPrettyName,
                                   aOriginator, aCallback) {
    this._datastore.insertTag(aTagID, aTagPrettyName, aOriginator, aCallback);
  },

  _fillCaches: function Ensemble_fillCaches(aJobFinished) {
    this._datastore.getAllTags(function(aResult, aPayload) {
      if (aResult === Cr.NS_OK)
        this._tagsCache = aPayload.tags;

      aJobFinished(aResult);
    }.bind(this));
  },

}
