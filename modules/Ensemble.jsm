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

  init: function(aDatastore) {
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

  uninit: function() {
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

  _get3PaneTabmail: function() {
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

  openDebugTab: function() {
    Log.info("Opening or focusing debug tab");
    let tabmail = this._get3PaneTabmail();
    if (tabmail) {
      tabmail.openTab("chromeTab", {
        chromePage: "chrome://ensemble/content/debugTab.xhtml",
      });
    }
    Log.info("Debug tab should be open now.");
  },

  openContactsTab: function() {
    Log.info("Opening or focusing contact list tab");

    let tabmail = this._get3PaneTabmail();
    if (tabmail) {
      tabmail.openTab("contactsTab", {});
    }
    Log.info("Contact list tab should be open now.");
  },

  _initDBAs: function() {
    let self = this;
    Task.spawn(function() {
      for (let dba of kDBAs) {
        yield dba.init(self.datastore);
      }
    });
  },

  _uninitDBAs: function() {
    let self = this;
    Task.spawn(function() {
      for (let dba of kDBAs) {
        yield dba.uninit();
      }
    });
  },

  get contacts() ContactsStorage
}

const ContactsStorage = {
  save: function(aContacts) {
    if (!Array.isArray(aContacts)) {
      aContacts = [aContacts];
    }

    return Task.spawn(function() {
      for (let contact of aContacts) {
        if (contact.id !== undefined) {
          yield ContactDBA.update(contact);
        } else {
          yield ContactDBA.create(contact);
        }
      }
    });
  },

  all: function () {
  }
}
