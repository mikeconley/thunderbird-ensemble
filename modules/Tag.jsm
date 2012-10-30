/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Tag"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/Contact.jsm");

let Tag = Backbone.Model.extend({
  defaults: function() {
    return {
      displayName: "",
      originator: "user",
      exportName: "",
      idCollection: [],
    };
  },

  initialize: function() {
    this.__defineGetter__("idCollection", function() this.get("idCollection"));
    this.__defineSetter__("idCollection", function(aValue) {
      this.set("idCollection", aValue);
      return aValue;
    });
  },
});
