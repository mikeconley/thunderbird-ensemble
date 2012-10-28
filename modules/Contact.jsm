/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/BaseRecord.jsm");
Cu.import("resource://ensemble/storage/ContactDBA.jsm");

let Contact = BaseRecord.extend({
  dba: ContactDBA,
  defaults: function() {
    return _.defaults({
      popularity: 0,
    }, BaseRecord.prototype.defaults);
  },
});
