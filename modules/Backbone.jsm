/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ["Backbone"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

let loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
               .getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript("resource://ensemble/lib/underscore-1.3.3.js");
loader.loadSubScript("resource://ensemble/lib/backbone-0.9.2.js");

Backbone.sync = function(aMethod, aModelOrCollection, aOptions) {
  // Delegate to the database abstraction (DBA) of the model or collection.
  aModelOrCollection.dba.handleSync(aMethod, aModelOrCollection, aOptions);
};
