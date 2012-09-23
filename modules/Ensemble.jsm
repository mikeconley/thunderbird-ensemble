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
Cu.import("resource://ensemble/storage/ContactDBA.jsm");
Cu.import("resource://ensemble/storage/ContactsDBA.jsm");

let Ensemble = {
  _initted: false,
  _initting: false,
  _datastore: null,

  init: function Ensemble_init(aDatastore, aJobFinished) {
    if (this._initted || this._initting)
      return;

    Log.info("Starting up.");
    this._initting = true;

    this._datastore = aDatastore;

    let q = new JobQueue();
    q.addJob(this._datastore.init.bind(this._datastore));
    q.addJob(this._initDBAs.bind(this));

    let self = this;
    q.start({
      success: function(aResult) {
        self._initting = false;
        self._initted = true;
        Log.info("Startup complete.");
        aJobFinished.jobSuccess(aResult);
      },
      error: function(aError) {
        Log.error("Init failed with message: " + aResult.message);
        self.uninit();
        aJobFinished.jobError(aError);
      },
      complete: function() {},
    });
  },

  uninit: function Ensemble_uninit(aJobFinished) {
    if (!this._initted && !this._initting) {
      Log.warn("Attempted to shutdown an uninitted Ensemble.");
      aJobFinished.jobSuccess(Cr.NS_OK);
      return;
    }

    Log.info("Shutting down.");

    let self = this;
    this._datastore.uninit({
      jobSuccess: function(aResult) {
        self._initted = false;
        Log.info("Shutdown complete.");
        aJobFinished.jobSuccess(aResult);
      },
      jobError: function(aError) {
        Log.error("Uninit failed with message: " + aResult.message);
        aJobFinished.jobError(aError);
      },
    });
  },

  _get3PaneTabmail: function Ensemble__get3Pane() {
    let mail3Pane = Services.wm.getMostRecentWindow("mail:3pane");
    if (!mail3Pane) {
      Log.error("No mail3pane found - bailing!");
      return false;
    }

    let tabmail = mail3Pane.document.getElementById('tabmail');

    if (!tabmail) {
      Log.error("No tabmail found in the top-most 3pane. Bailing!");
      return false;
    }
    return tabmail;
  },

  openDebugTab: function Ensemble_openOrFocusDebugTab() {
    Log.info("Opening or focusing debug tab");
    let tabmail = this._get3PaneTabmail();
    if (tabmail) {
      tabmail.openTab("chromeTab", {
        chromePage: "chrome://ensemble/content/debugTab.xhtml",
      });
    }
    Log.info("Debug tab should be open now.");
  },

  openContactsTab: function Ensemble_openContactsTab() {
    Log.info("Opening or focusing contact list tab");

    let tabmail = this._get3PaneTabmail();
    if (tabmail) {
      tabmail.openTab("chromeTab", {
        chromePage: "chrome://ensemble/content/contactsTab.xhtml",
      });
    }
    Log.info("Contact list tab should be open now.");
  },

  _initDBAs: function Ensemble_fillCaches(aOuterJobFinished) {
    const kDBAs = [ContactDBA, ContactsDBA];
    let q = new JobQueue();
    let self = this;

    kDBAs.forEach(function(aDBA) {
      q.addJob(function(aJobFinished) {
        aDBA.init(self._datastore, aJobFinished);
      });
    });

    q.start({
      success: aOuterJobFinished.jobSuccess,
      error: aOuterJobFinished.jobError,
      complete: function() {},
    });
  },

}
