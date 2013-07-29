/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ['Cache'];

let Cache = function() {};

Cache.prototype = {
  aCache: new Object(),

  setRecord: function(aUID, aRecord) {
    this.aCache[aUID] = aRecord;
  },

  getRecord: function(aUID) {
    return this.aCache[aUID];
  },

  getAllRecords: function() {
    return this.aCache;
  },

  removeRecord: function(aUID){
    delete this.Cache[aUID];
  },
  
}