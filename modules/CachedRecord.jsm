const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["CachedRecord"];

Cu.import("resource://ensemble/Backbone.jsm");

let CachedRecord = Backbone.Model.extend({
  initialize: function CachedRecord_initialize() {
  },

  toContact: function CachedRecord_toContact() {
  },

  fromContact: function CachedRecord_fromContact(aContact) {
  }
});
