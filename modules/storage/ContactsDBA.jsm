/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Ci = Components.interfaces;
const Cr = Components.results;
const kSQLCallbacks = Ci.mozIStorageStatementCallback;

let EXPORTED_SYMBOLS = ["ContactsDBA"];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let ContactsDBA = {
};
