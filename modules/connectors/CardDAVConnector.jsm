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


testServerConnection: function connect(url) {
  let http = null;
  let promise = Promise.defer();
  let task = Common.Utils.executeSoon(function() {
    http = new XMLHttpRequest();
    http.open("HEAD", url, false);
    http.send(null);
    promise.resolve();
    if (http.responseText !== null) {
        promise.resolve();
      } else {
        let e = new Error("The server cannot connect!");
        promise.reject(e);
      }
  });
  return promise.promise;
},

}
