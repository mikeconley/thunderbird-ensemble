/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contacts"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/Contact.jsm");
Cu.import("resource://ensemble/storage/ContactsDBA.jsm");

let Contacts = Backbone.Collection.extend({
  model: Contact,
  dba: ContactsDBA,
});
