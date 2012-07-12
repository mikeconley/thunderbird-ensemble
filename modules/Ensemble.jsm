/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ["Ensemble"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://ensemble/Logging.jsm");

let Ensemble = {
  _initted: false,

  init: function Ensemble_init() {
    Log.info("Starting up.");
    this._initted = true;
    Log.info("Startup complete.");
  },

  uninit: function Ensemble_uninit() {
    Log.info("Shutting down.");
    this._initted = false;
    Log.info("Shutdown complete.");
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
}
