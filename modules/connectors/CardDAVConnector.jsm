/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

let EXPORTED_SYMBOLS = ['CardDAVConnector'];

Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let CardDAVConnector = function(aAccountKey, aRecordChangesCbObj) {};

CardDAVConnector.prototype = {
  _prefs: null,

  get accountKey() "", // Will this be given in constructor?
  get supportsTags() false, // I don't believe CardDAV supports tags in the needed context
  get isSyncable() false, 
  get isWritable() false,
  get shouldPoll() true, 
  get displayName() "CardDAV Address Book",


  getPrefs: function() { 
    return this._prefs
  },


  setPrefs: function(aValue) {
    this._prefs = aValue;
  },


  testConnection: function() {
    let deferred = Promise.defer();
    let http = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Ci.nsIXMLHttpRequest);

    let prefs = this.getPrefs();
    if (prefs.address === null) {
      let e = new Error("The connector function requires an Address preference to be set.");
      return deferred.reject(e);
    }
    let url = prefs.address;

    http.open("OPTIONS", url, true);

    http.onload = function(aEvent) {
      if (http.readyState === 4) {
        if (http.status === 200 && 
            http.getAllResponseHeaders() !== null && 
            http.getAllResponseHeaders().indexOf('addressbook') > -1) {
          deferred.resolve();
        } else {
          let e = new Error("The connection errored with status " + 
                            http.status + " during the onload event");
          deferred.reject(e);
        }
      }
    }
    
    http.onerror = function(aEvent) {
      let e = new Error("The connection errored with status " + 
                        http.status + " during the onerror event");
      deferred.reject(e);
    }

    http.send(null);
    return deferred.promise;
  },


  authorize: function() {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  poll: function() {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  createRecords: function(aRecordsCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  readRecords: function() {
    let deferred = Promise.defer();
    let http = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Ci.nsIXMLHttpRequest);

    let prefs = this.getPrefs();
    if (prefs.address === null) {
      let e = new Error("The connector function requires an Address preference to be set.");
      return deferred.reject(e);
    }
    let url = prefs.address;


    http.open('REPORT', url, true);
    // http.responseType = 'json';
    let host = Services.io.newURI(url, null, null).hostPort;

    http.setRequestHeader('Host', host);
    http.setRequestHeader('Depth', '1');
    http.setRequestHeader('Content-Type', 'text/xml; charset="utf-8"');
    // http.setRequestHeader('Content-Length', 'xxxx');

    let requestXML = '<?xml version="1.0" encoding="utf-8" ?>' +
                     '<C:addressbook-query xmlns:D="DAV:" ' + 
                     'xmlns:C="urn:ietf:params:xml:ns:carddav">' +
                         '<D:prop>' +
                           '<C:address-data>' +
                             '<C:prop name="VERSION"/>' +
                             '<C:prop name="UID"/>' +
                             '<C:prop name="NICKNAME"/>' +
                             '<C:prop name="EMAIL"/>' +
                             '<C:prop name="FN"/>' +
                           '</C:address-data>' +
                         '</D:prop>' +
                     '</C:addressbook-query>';

    http.onload = function(aEvent) {
      if (http.readyState === 4) {
        if (http.status === 207) { // Status 207 is "multi-status"
          deferred.resolve(http.response);
        } else {
          let e = new Error("The readRecord attempt errored with status " + 
                            http.status + " during the onload event");
          deferred.reject(e);
        }
      }
    }
    
    http.onerror = function(aEvent) {
      let e = new Error("The readRecord attempt errored with status " + 
                        http.status + " during the onerror event");
      deferred.reject(e);
    }

    http.send(requestXML);
    return deferred.promise;
  },


  // readRecords: function(aIDCollection) {
  //   return Cr.NS_ERROR_NOT_IMPLEMENTED;
  // },


  updateRecords: function(aRecordsCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  deleteRecords: function(aIDCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  createTags: function(aTagsCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  readTags: function() {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  readTags: function(aTagsCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  updateTags: function(aTagsCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  deleteTags: function(aTagsCollection) {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
}