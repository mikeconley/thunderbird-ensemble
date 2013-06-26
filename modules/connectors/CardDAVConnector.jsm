/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

let EXPORTED_SYMBOLS = ['CardDAVConnector'];
let Common = {};

Cu.import("resource://ensemble/Common.jsm", Common);
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://ensemble/Record.jsm");
Cu.import("resource://ensemble/Tag.jsm");

let CardDAVConnector = function(aAccountKey, aRecordChangesCbObj) {};

CardDAVConnector.prototype = {

  // Testing a server connection by OPTIONS requesting a given URI.
  // An example for a successful OPTIONS response would look like:
  // 
  // Allow: DELETE, HEAD, GET, MKCALENDAR, MKCOL, MOVE, OPTIONS, PROPFIND, PROPPATCH, PUT, REPORT
  // Content-Length: 0
  // DAV: 1, 2, 3, calendar-access, addressbook, extended-mkcol
  // Date: Fri, 14 Jun 2013 18:54:46 GMT
  // Server: WSGIServer/0.1 Python/2.7.3
  //
  // This would produce a response status of 200. 

  testServerConnection: function connect(url) {
    let promise = Promise.defer();
    let http = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
    http.open("OPTIONS", url, true);

    http.onload = function(event){
      if (http.readyState === 4) {
        if (http.status === 200) {
          promise.resolve();
        } else {
          let e = new Error("There is something wrong with the connection!");
          promise.reject(e);
        }
      }
    }
    
    http.onerror = function(event){
      let e = new Error("There is something wrong!");
      promise.reject(e);
    }

    http.send(null);
    return promise.promise;
  },

}
