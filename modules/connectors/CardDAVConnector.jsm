/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

let EXPORTED_SYMBOLS = ['CardDAVConnector'];
let Common = {};
let http = null;

// allow for JS modules to access XMLHttpRequest
// See: http://mdn.beonex.com/en/DOM/XMLHttpRequest/Using_XMLHttpRequest.html
//      #Using_XMLHttpRequest_from_JavaScript_modules_.2F_XPCOM.C2.A0components
let XMLHttpRequest = Components.classes["@mozilla.org/appshell/appShellService;1"]
                               .getService(Components.interfaces.nsIAppShellService)
                               .hiddenDOMWindow.XMLHttpRequest;

Cu.import("resource://ensemble/Common.jsm", Common);
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://ensemble/Record.jsm");
Cu.import("resource://ensemble/Tag.jsm");

const kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";
const kCollectedAddressbookURI = "moz-abmdbdirectory://history.mab";
const kStrings = ["FirstName", "LastName", "DisplayName", "NickName",
                  "JobTitle", "Department", "Company", "Notes"];
const kEmails = ["PrimaryEmail", "SecondEmail"]; 
const kAddresses = ["HomeAddress", "HomeAddress2", "HomeCity", "HomeState",
                    "HomeZipCode", "HomeCountry",  "WorkAddress",
                    "WorkAddress2", "WorkCity", "WorkState", "WorkZipCode",
                    "WorkCountry"];
const kTels = ["HomePhone", "HomePhoneType", "WorkPhone", "WorkPhoneType",
               "FaxNumber", "FaxNumberType", "PagerNumber",
               "PagerNumberType", "CellularNumber", "CellularNumberType"];
const kIMs = ["_GoogleTalk", "_AimScreenName", "_Yahoo", "_Skype", "_QQ",
              "_MSN", "_ICQ", "_JabberId"];
const kWebsites = ["WebPage1", "WebPage2"];
const kDates = ["AnniversaryYear", "AnniversaryMonth", "AnniversaryDay",
                "BirthYear", "BirthMonth", "BirthDay"];
const kOthers = ["PhoneticFirstName", "PhoneticLastName", "SpouseName",
                 "FamilyName", "Custom1", "Custom2", "Custom3", "Custom4"];
const kPhotos = ["PhotoName"];
const kBooleanTags = ["AllowRemoteContent"];
const kMeta = ["PopularityIndex", "PreferMailFormat", "PreferDisplayName"];
const kDiscards = ["RecordKey", "DbRowID", "LowercasePrimaryEmail",
                   "LastModifiedDate", "PhotoType", "PhotoURI"];

let CardDAVConnector = function(aAccountKey, aRecordChangesCbObj) {};

CardDAVConnector.prototype = {

testConnection: function CardDAV_testConnection() {
    let promise = Promise.defer();
    let task = Common.Utils.executeSoon(function() {
      let enumerator = MailServices.ab.directories;
      if (enumerator.hasMoreElements()) {
        promise.resolve();
      } else {
        let e = new Error("There are no directories in the address book!");
        promise.reject(e);
      }
    });
    return promise.promise;
  },

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

    http = new XMLHttpRequest();
    http.open("OPTIONS", url, true); // (method, url, async, user, password)

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
