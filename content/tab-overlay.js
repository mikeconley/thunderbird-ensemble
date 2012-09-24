/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let contactsTabType = {
  name: "contactsTab",
  perTabPanel: "vbox",
  lastTabID: 0,
  modes: {
    contactsTab: {
      type: "contactsTab",
    },
  },

  openTab: function(aTab, aArgs) {
    // First clone the page and set up the basics.
    let clone = document.getElementById("contactsTab")
                        .firstChild
                        .cloneNode(true);

    clone.setAttribute("id", "contactsTab" + this.lastBrowserId);
    clone.setAttribute("collapsed", false);

    let toolbox = clone.firstChild;
    toolbox.setAttribute("id",
                         "contactsTabToolbox" + this.lastBrowserId);
    toolbox.firstChild
           .setAttribute("id",
                         "contactsTabToolbar" + this.lastBrowserId);

    aTab.panel.appendChild(clone);
    aTab.root = clone;

    // Start setting up the browser.
    aTab.browser = aTab.panel.getElementsByTagName("browser")[0];
    aTab.toolbar = aTab.panel
                       .getElementsByClassName("contactsTabToolbar")[0];

    // As we're opening this tab, showTab may not get called, so set
    // the type according to if we're opening in background or not.
    let background = ("background" in aArgs) && aArgs.background;
    aTab.browser.setAttribute("type", background ? "content-targetable" :
                                                   "content-primary");

    aTab.browser.setAttribute("id", "contactsTabBrowser" + this.lastBrowserId);
    if ("onLoad" in aArgs) {
      aTab.browser.addEventListener("load", function _contactsTab_onLoad (event) {
        aArgs.onLoad(event, aTab.browser);
        aTab.browser.removeEventListener("load", _contactsTab_onLoad, true);
      }, true);
    }

    // TODO: l10n
    aTab.title = "Contacts";
    aTab.browser.loadURI("chrome://ensemble/content/contactsTab.xhtml");

    this.lastBrowserId++;
  },
  closeTab: function(aTab) {
  },
  saveTabState: function(aTab) {
  },
  showTab: function(aTab) {
  },
  persistTab: function(aTab) {
  },
  restoreTab: function(aTab) {
  },
  onTitleChanged: function(aTab) {
  },
  supportsCommand: function(aCommand, aTab) {
  },
  isCommandEnabled: function(aCommand, aTab) {
  },
  doCommand: function(aCommand, aTab) {
  },
  getBrowser: function(aTab) {
  },
};

window.addEventListener("load", function(e) {
  dump("\n\nRegistering contacts tab.\n\n");
  let tabmail = document.getElementById("tabmail");
  tabmail.registerTabType(contactsTabType);
  dump("\n\nAll done!\n\n");
}, false);
