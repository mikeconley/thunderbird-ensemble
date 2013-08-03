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
Cu.import("resource://ensemble/connectors/Cache.jsm");

let CardDAVConnector = function(aAccountKey, aListener, aCache) {
    this._accountKey = aAccountKey;
    this._listener = aListener;
    this._cache = aCache;
};

CardDAVConnector.prototype = {
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

    if(this._cache.isEmpty()) {
      promise = this.read();
      deferred.resolve(promise);
    } else {
      let e = new Error("The cache is not empty and therefore" + 
                        "the cache does not need to be initiated.");
      deferred.reject(e);
    }

    this._initialized = true;
    return deferred.promise;
  },


  read: function() {
    let properties = new Array('N', 'FN', 'ORG', 'EMAIL',
                               'TEL', 'ADR', 'URL', 'NOTE', 
                               'CATEGORIES', 'UID', 'REV');
    let promise = this._read(true, properties);
    return promise;
  },


  poll: function() {
    return Cr.NS_ERROR_NOT_IMPLEMENTED;
  },


  _read: function(getETag, properties) {
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
                       '<D:prop>';
    
    if (getETag === true) {                  
      requestXML = requestXML + '<D:getetag/>';
    }

    requestXML = requestXML + '<C:address-data>';

    for (let i = 0; i < properties.length; i++) {
      requestXML = requestXML + '<C:prop name="' + properties[i] + '"/>';
    }

    requestXML = requestXML + '</D:prop></C:addressbook-query>';

    http.onload = function(aEvent) {
      if (http.readyState === 4) {
        if (http.status === 207) {
          let XMLresponse = http.response;
          let parser = new VCardParser();
          let etag = null;
          // this._cache = new Cache();

          // To grab the imported ETags before they are removed, 
          // each is stripped using RegExp. However, because JS
          // does not support RegExp Look-behind, each ETag must
          // also have its opening tag removed manually.
          if (getETag === true) {
            etag = XMLresponse.match(/<D:getetag>(.*?)(?=<\/D:getetag>)/g);
            for (let i = 0; i < etag.length; i++) {
              etag[i] = etag[i].replace(/<D:getetag>/, "");
            }
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
            if (getETag === true) {
              tempJSONvCard.ETAG = etag[i];
            }

            let tempRecord = new Record(tempJSONvCard);
            
            vCardArray[i] = tempRecord;
            this._cache.setRecord(tempJSONvCard["UID"], tempRecord);
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
};

CardDAVConnector.isSingleton = true;
CardDAVConnector.iconURL = "TBD!";
CardDAVConnector.serviceName = "CardDAV Connector";
CardDAVConnector.createConnectionURI = "TBD!";
CardDAVConnector.managementURI = "TBD!";
CardDAVConnector.defaultPrefs = {};
CardDAVConnector.uniqueID = "carddav-connector";