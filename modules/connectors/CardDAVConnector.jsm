/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

let EXPORTED_SYMBOLS = ['CardDAVConnector'];

Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://ensemble/lib/VCardParser.jsm");
Cu.import("resource://ensemble/Record.jsm");

let CardDAVConnector = function(aAccountKey, aListener, aCache) {
  if(aAccountKey != null) {
    this._accountKey = aAccountKey;
  }

  if(aListener != null) {
    this._listener = aListener;
  }

  if(aCache != null) {
    this._cache = aCache;
  }
};

CardDAVConnector.prototype = {
  _accountKey: "",
  _listener: null,
  _cache: null,

  _prefs: null,
  _isSyncable: false,
  _isWritable: false,
  _shouldPoll: true,
  _displayName: "",
  _initialized: false,
  _initializing: false,

  getAccountKey: function() {
    return this._accountKey;
  },


  getIsSyncable: function() {
    return this._isSyncable;
  },


  getIsWritable: function() {
    return this._isWritable;
  },


  getShouldPoll: function() {
    return this._shouldPoll;
  },


  getDisplayName: function() {
    return this._displayName;
  },


  getPrefs: function() { 
    return this._prefs;
  },


  setPrefs: function(aValue) {
    this._prefs = aValue;
  },


  getInitialized: function() {
    return this._initialized;
  },


  getInitializing: function() {
    return this._initializing;
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


  init: function() {
    if (this._cache == null) { // if there's no previous cache
      this.read();
    } else {

    }
  },


  read: function() {
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
    let host = Services.io.newURI(url, null, null).hostPort;
    let requestXML = null;

    http.setRequestHeader('Host', host);
    http.setRequestHeader('Depth', '1');
    http.setRequestHeader('Content-Type', 'text/xml; charset="utf-8"');

    requestXML = '<?xml version="1.0" encoding="utf-8" ?>' +
                   '<C:addressbook-query xmlns:D="DAV:" ' + 
                   'xmlns:C="urn:ietf:params:xml:ns:carddav">' +
                       '<D:prop>' +
                         '<C:address-data>' +
                           '<C:prop name="N"/>' +                        
                           '<C:prop name="FN"/>' +
                           '<C:prop name="ORG"/>' +
                           '<C:prop name="EMAIL"/>' +
                           '<C:prop name="TEL"/>' +
                           '<C:prop name="ADR"/>' +
                           '<C:prop name="URL"/>' +
                           '<C:prop name="NOTE"/>' +
                           '<C:prop name="CATEGORIES"/>' +
                           '<C:prop name="UID"/>' +
                           '<C:prop name="REV"/>' +
                         '</C:address-data>' +
                       '</D:prop>' +
                   '</C:addressbook-query>';

    http.onload = function(aEvent) {
      if (http.readyState === 4) {
        if (http.status === 207) { // Status 207 is "multi-status"
          let XMLresponse = http.response;
          let parser = new VCardParser();

          XMLresponse = XMLresponse.replace(/<(.*)>/gm, '').trim();
          vCardArray = XMLresponse.split(/\s{2,}/);

          for (let i = 0; i < vCardArray.length; i++) {
            let tempJSONvCard = parser.fromVCard(vCardArray[i]);
            vCardArray[i] = new Record(tempJSONvCard);
          }

          deferred.resolve(vCardArray);
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


  poll: function() {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


}