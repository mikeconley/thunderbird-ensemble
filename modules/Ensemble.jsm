/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ["Ensemble"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://ensemble/Logging.jsm");
let Common = {};
Cu.import("resource://ensemble/Common.jsm", Common);
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/storage/ContactDBA.jsm");
Cu.import("resource://ensemble/storage/ContactsDBA.jsm");
Cu.import("resource://gre/modules/Task.jsm");

const kDBAs = [ContactDBA];

const Ensemble = {
  _initted: false,
  _initting: false,
  datastore: null,

  init: function Ensemble_init(aDatastore) {
    if (this._initted || this._initting)
      return;

    Log.info("Starting up.");
    this._initting = true;
    this.datastore = aDatastore;

    let self = this;
    return Task.spawn(function() {
      yield self.datastore.init();
      yield self._initDBAs();
      self._initting = false;
      self._initted = true;
      Log.info("Startup complete.");
    });
  },

  uninit: function Ensemble_uninit() {
    if (!this._initted && !this._initting) {
      Log.warn("Attempted to shutdown an uninitted Ensemble.");
      return Promise.resolve();
    }

    Log.info("Shutting down.");

    let self = this;
    return Task.spawn(function() {
      yield self._uninitDBAs();
      yield self.datastore.uninit();
      Log.info("Shutdown complete.");
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
      tabmail.openTab("contactsTab", {});
    }
    Log.info("Contact list tab should be open now.");
  },

  _initDBAs: function Ensemble__initDBAs() {
    let self = this;
    Task.spawn(function() {
      for (let dba of kDBAs) {
        yield dba.init(self.datastore);
      }
    });
  },

  _uninitDBAs: function Ensemble__uninitDBAs() {
    let self = this;
    Task.spawn(function() {
      for (let dba of kDBAs) {
        yield dba.uninit();
      }
    });
  }
}
