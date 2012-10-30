/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/BaseRecord.jsm");
Cu.import("resource://ensemble/storage/ContactDBA.jsm");

let Contact = Backbone.Model.extend({
  dba: ContactDBA,

  defaults: function() {
    return {
      popularity: 0,
      fields: new BaseRecord()
    };
  },

  initialize: function() {
    this.__defineGetter__("fields", function() this.get("fields"));
    this.__defineSetter__("fields", function(aValue) {
      this.set("fields", aValue);
      return aValue;
    });
  },

  constructor: function(aFields, aMeta) {
    Backbone.Model.prototype.constructor.call(this, aMeta);
    this.set("fields", new BaseRecord(aFields));
  },
});
