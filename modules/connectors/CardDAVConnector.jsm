/* This Source Code Form is subject to the terms of the Mozilla Public
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

// Etag is used to compare with server-side ETag for changes, 
// because if the server ETag is different, that signals that there 
// has been a change to the vCard's content, and a sync is needed. 
// Therefore, the ETag is both used to find the proper cache Record 
// to compare, as well as the state of the server-side vCard. 
//
// Server Location is the server path of the vCard in question.

let CardDAVCacheObj = function(etag, location) {
  this._etag = etag;
  this._serverLocation = location;
};

CardDAVCacheObj.prototype = {
  _etag: "",
  _serverLocation: "",
}


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
    let deferred = Promise.defer();
    let promise = null;
    this._initializing = true;

    if (this._cache == null) {
      promise = this.read();
    } 
    this._initialized = true;

    deferred.resolve(promise);
    return deferred.promise;
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
                       '<D:getetag/>' + 
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
        if (http.status === 207) {
          let XMLresponse = http.response;
          let parser = new VCardParser();
          this._cache = new Array();

          // To grab the imported ETags before they are removed, 
          // each is stripped using RegExp. However, because JS
          // does not support RegExp Look-behind, each ETag must
          // also have its opening tag removed manually.
          let etag = XMLresponse.match(/<D:getetag>(.*?)(?=<\/D:getetag>)/g);
          for (let i = 0; i < etag.length; i++) {
            etag[i] = etag[i].replace(/<D:getetag>/, "");
          }

          // The same is done for each of the vCard server locations.
          let href = XMLresponse.match(/<D:href>(.*?)(?=<\/D:href>)/g);
          for (let i = 0; i < href.length; i++) {
            href[i] = href[i].replace(/<D:href>/, "");
          }

          // Remove unneeded XML buffers and trim whitespace, 
          // then split each vCard into a seperate array position.
          XMLresponse = XMLresponse.replace(/<(.*)>/gm, '').trim();
          vCardArray = XMLresponse.split(/\s{2,}/);

          // For each of the produced vCards, convert them into
          // a usable JSON object to build a Record object. Also,
          // each creation is tracked in the cache. 
          for (let i = 0; i < vCardArray.length; i++) {
            let tempJSONvCard = parser.fromVCard(vCardArray[i]);
            vCardArray[i] = new Record(tempJSONvCard);

            this._cache.push(new CardDAVCacheObj(etag[i], href[i]));
          }

          // Resolve the promise as an array collection of Records.
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