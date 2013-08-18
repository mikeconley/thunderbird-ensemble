/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ['MemoryRecordCache'];

Cu.import("resource://gre/modules/Promise.jsm");

let MemoryRecordCache = function() {
  this._cache = new Map();
};

MemoryRecordCache.prototype = {
  _cache: null,

  setRecord: function(aUID, aRecord) {
    let deferred = Promise.defer();
    this._cache.set(aUID, aRecord);
    deferred.resolve();
    return deferred.promise;
  },

  getRecord: function(aUID) {
    let deferred = Promise.defer();
    deferred.resolve(this._cache.get(aUID));
    return deferred.promise;
  },

  getAllRecords: function() {
    let deferred = Promise.defer();
    deferred.resolve(this._cache);
    return deferred.promise;
  },

  hasRecord: function(aUID) {
    let deferred = Promise.defer();
    deferred.resolve(this._cache.has(aUID));
    return deferred.promise;
  },

  removeRecord: function(aUID) {
    let deferred = Promise.defer();
    if(this._cache.has(aUID) !== false) {
      this._cache.delete(aUID);
      deferred.resolve();
    } else {
      let e = new Error("The record does not exist and therefore" + 
                        "the record could not be removed by the service.");
      deferred.reject(e);
    }

    return deferred.promise;
  },

}