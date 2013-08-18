/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

let EXPORTED_SYMBOLS = ['CardDAVConnector'];

Cu.import("resource://gre/modules/Promise.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://ensemble/lib/VCardParser.jsm");
Cu.import("resource://ensemble/Record.jsm");
Cu.import("resource://ensemble/connectors/MemoryRecordCache.jsm");

let CardDAVConnector = function(aAccountKey, aListener, aCache) {
  this._accountKey = aAccountKey;
  this._listener = aListener;
  this._cache = aCache;
};

CardDAVConnector.prototype = {
  _prefs: null,
  _displayName: "",
  _initialized: false,
  _initializing: false,

  get accountKey() this._accountKey,
  get isSyncable() true,
  get isWritable() false,
  get shouldPoll() true,
  get displayName() this._displayName,
  get initializing() this._initializing,
  get initialized() this._initialized,

  testConnection: function() {
    let deferred = Promise.defer();
    let http = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Ci.nsIXMLHttpRequest);

    let prefs = this._prefs;
    if (prefs.address === null) {
      let e = new Error("The connector function requires an Address preference to be set.");
      return deferred.reject(e);
    }
    let url = prefs.address;

    if (Services.io.newURI(url, null, null).scheme === "https") {
      Task.spawn(function () {
        let authPromise = this.authorize(); // get Base64 user:pass
        let authString = yield authPromise;
        http.setRequestHeader('Authorization', 'Basic ' + authString);
        // See http://en.wikipedia.org/wiki/Basic_access_authentication
      });
    }

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

  /*
  This should return a promise that holds a string value of a Base64
  conversion of the following pattern 'username:password', where 
  'username is the client's inputted username and 'password' is
  the clients inputted password. Both these values are seperated by 
  a colon ':'.
  */
  authorize: function() {
    let deferred = Promise.defer();
    let username = "";
    let password = "";
    // TODO: get username and password from UI.
    let authString = username + ":" + password;
    deferred.resolve(btoa(authString));
    return deferred.promise;
  },

  init: function() {
    return Task.spawn(function() {
      this._initializing = true;
      yield this.read();
      this._initialized = true;
    }.bind(this));
  },

  read: function() {
    return Task.spawn(function () {
      let getPromise = this._getvCardsFromServer(true, null);
      let aRecordArray = yield getPromise;

      for (let i = 0; i < aRecordArray.length; i++) {
        let tempRecord = aRecordArray[i];
        let tempUID = tempRecord.fields.get("UID");

        this._cache.setRecord(tempUID, tempRecord);
        this._listener.onImport(tempRecord);
      }
    }.bind(this));
  },

  poll: function() {
    return Task.spawn(function () {
      let getPromise = this._getvCardsFromServer(true, null);
      let tempRecordArray = yield getPromise;

      let cacheMapPromise = this._cache.getAllRecords();
      let map = yield cacheMapPromise;

      for (let i = 0; i < tempRecordArray.length; i++) { // Handle Added and Changed
        let tempRecord = tempRecordArray[i];
        let tempUID = tempRecord.fields.get("UID");
        let tempETag = tempRecord.fields.get("ETAG");
        let filter = new Map();
        filter.set("UID", tempUID);

        let getPromise = this._getvCardsFromServer(true, filter);
        let aRecordArray = yield getPromise;

        if(!map.has(tempUID)) { // New Record
          this._listener.onAdded(aRecordArray[0]);
          this._cache.setRecord(tempUID, aRecordArray[0]);       
        } else if(map.get(tempUID).fields.get("ETAG") != tempETag) { // Changed Record
          let diff = aRecordArray[0].fields.diff(tempRecord.fields);
          this._listener.onChanged(tempUID, diff);
          this._cache.setRecord(tempUID, aRecordArray[0]); 
        }
      }

      for (let [key, value] of map) { // Handle Deleted
        let found = false;
        for (let i = 0; i < tempRecordArray.length; i++) { 
          let tempRecord = tempRecordArray[i];
          let tempUID = tempRecord.fields.get("UID");

          if(tempUID === key) {
            found = true;
            break;
          }
        }

        if(!found) { // Deleted Record
          this._listener.onRemoved(key);
          this._cache.removeRecord(key);
        }
      }
    }.bind(this));
  },

  // This function collects all vCards off a server and returns them as an array of
  // Records. 
  //
  // getETag parameter determines if the request wants ETags to be collected. (bool).
  //
  // properties are an array of the vCard data types needed in each cardDAV request. 
  //
  // filter is used to allow for filtering of CardDAV requests. If filter is null, 
  // then the function assumes no filtering, otherwise, the parameter is a Map with 
  // the key being the filter type, and the value being the content. 
  // I.e. {"EMAIL":"test@test.com"} would filter for the EMAIL property of test@test.com, 
  // whereas in {"EMAIL":test@test.com, "UID":123} would do the same, but also include 
  // an additonal filter of the UID being 123.
  _getvCardsFromServer: function(aGetETag, aFilter) {
    let deferred = Promise.defer();
    let http = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Ci.nsIXMLHttpRequest);

    let prefs = this._prefs;
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

    if (Services.io.newURI(url, null, null).scheme === "https") {
      Task.spawn(function () {
        let authPromise = this.authorize(); // get Base64 user:pass
        let authString = yield authPromise;
        http.setRequestHeader('Authorization', 'Basic ' + authString);
        // See http://en.wikipedia.org/wiki/Basic_access_authentication
      });
    }

    requestXML = '<?xml version="1.0" encoding="utf-8" ?>' +
                   '<C:addressbook-query xmlns:D="DAV:" ' + 
                   'xmlns:C="urn:ietf:params:xml:ns:carddav">' +
                       '<D:prop>';

    if (aGetETag) {                  
      requestXML += '<D:getetag/>';
    }

    requestXML += '<C:address-data></C:address-data></D:prop>';

    if (aFilter) {
      requestXML += '<C:filter test="anyof">';

      for (let [key, value] of aFilter) {
        requestXML += '<C:prop-filter name="'+ key +'">' +
            '<C:text-match collation="i;unicode-casemap"' +
              'match-type="contains">' +
                       value + 
            '</C:text-match>' +
         '</C:prop-filter>';
      }

      requestXML += '</C:filter>';
    }

    requestXML += '</C:addressbook-query>';

    http.onload = function(aEvent) {
      if (http.readyState === 4) {
        if (http.status === 207) {
          let XMLresponse = http.response;
          let parser = new VCardParser();
          let etag = null;

          // To grab the imported ETags before they are removed, 
          // each is stripped using RegExp. However, because JS
          // does not support RegExp Look-behind, each ETag must
          // also have its opening tag removed manually.
          if (aGetETag) {
            etag = XMLresponse.match(/<getetag>(.*?)(?=<\/getetag>)/g);

            for (let i = 0; i < etag.length; i++) {
              etag[i] = etag[i].replace(/<getetag>/, "");
            }
          } 

          // Remove unneeded XML buffers and trim whitespace, 
          // then split each vCard into a seperate array position.
          XMLresponse = XMLresponse.replace(/<(.*)>/gm, '').trim();
          let vCardArray = XMLresponse.split(/\s{2,}/);

          // For each of the produced vCards, convert them into
          // a usable JSON object to build a Record object.
          for (let i = 0; i < vCardArray.length; i++) {
            let tempJSONvCard = parser.fromVCard(vCardArray[i]);
            if (aGetETag) {
              tempJSONvCard.ETAG = etag[i];
            }
            vCardArray[i] = new Record(tempJSONvCard);
          }
          // Resolve the promise as an array collection of Records.
          deferred.resolve(vCardArray);
        } else {
          let e = new Error("The _getvCardsFromServer attempt errored with status " + 
                            http.status + " during the onload event");
          deferred.reject(e);
        } 
      }
    }.bind(this);
    
    http.onerror = function(aEvent) {
      let e = new Error("The _getvCardsFromServer attempt errored with status " + 
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