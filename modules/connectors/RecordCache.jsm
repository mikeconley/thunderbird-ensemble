/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ['RecordCache'];

Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

let RecordCache = function() {};

RecordCache.prototype = {
  aCache: new Map(),

  setRecord: function(aUID, aRecord) {
    let deferred = Promise.defer();

    if(this.aCache !== null) {
      this.aCache.set(aUID, aRecord);
      deferred.resolve();
    } else {
      let e = new Error("The cache does not exist and therefore" + 
                        "the record could not be set by the service.");
      deferred.reject(e);
    }

    return deferred.promise;
  },


  getRecord: function(aUID) {
    let deferred = Promise.defer();

    if(this.aCache !== null) {
      deferred.resolve(this.aCache.get(aUID));
    } else {
      let e = new Error("The cache does not exist and therefore" + 
                        "the service could not retrieve the record.");
      deferred.reject(e);
    }

    return deferred.promise;
  },


  getAllRecords: function() {
    let deferred = Promise.defer();

    if(this.aCache !== null) {
      deferred.resolve(this.aCache);
    } else {
      let e = new Error("The cache does not exist and therefore" + 
                        "the service could not retrieve the records.");
      deferred.reject(e);
    }

    return deferred.promise;
  },


  hasRecord: function(aUID) {
    let deferred = Promise.defer();

    if(this.aCache !== null) {
      deferred.resolve(this.aCache.has(aUID));
    } else {
      let e = new Error("The cache does not exist and therefore" + 
                        "the service could not retrieve the records.");
      deferred.reject(e);
    }
  },

  removeRecord: function(aUID) {
    let deferred = Promise.defer();

    if(this.aCache !== null) {
      if(this.aCache.has(aUID) !== false) {
        this.aCache.delete(aUID);
        deferred.resolve();
      } else {
        let e = new Error("The record does not exist and therefore" + 
                          "the record could not be removed by the service.");
        deferred.reject(e);
      }
    } else {
      let e = new Error("The cache does not exist and therefore" + 
                        "the record could not be removed by the service.");
      deferred.reject(e);
    }

    return deferred.promise;
  },
  

  isEmpty: function() {
    for(let i in this) {
      if(this.hasOwnProperty(i))
        return false;
    }
    return true;
  },

}