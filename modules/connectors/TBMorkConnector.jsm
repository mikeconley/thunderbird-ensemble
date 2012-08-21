/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ['TBMorkConnector'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";
const kCollectedAddressbookURI = "moz-abmdbdirectory://history.mab";

Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://ensemble/EnsembleUtils.jsm");

const kStrings = ["FirstName", "LastName", "DisplayName", "NickName",
                  "JobTitle", "Department", "Company", "Notes"];
const kStringMap = {
  FirstName: "givenName",
  LastName: "familyName",
  DisplayName: "name",
  NickName: "nickname",
  JobTitle: "jobTitle",
  Department: "department",
  Company: "org",
  Notes: "note",
}

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
const kIMMap = {
  "_GoogleTalk": "GTalk",
  "_AimScreenName": "AIM",
  "_Yahoo': 'Yahoo",
  "_Skype': 'Skype",
  "_QQ': 'QQ",
  "_MSN': 'MSN",
  "_ICQ': 'ICQ",
  "_JabberId': 'Jabber",
};

const kWebsites = ["WebPage1", "WebPage2"];
const kDates = ["Anniversary", "Birth"];

const kOthers = ["PhoneticFirstName", "PhoneticLastName", "SpouseName",
                 "FamilyName", "Custom1", "Custom2", "Custom3", "Custom4"];

const kOthersMap = {
  PhoneticFirstName: "Phonetic first name",
  PhoneticLastName: "Phonetic last name",
  SpouseName: "Spouse name",
  FamilyName: "Family name",
  Custom1: "Custom",
  Custom2: "Custom",
  Custom3: "Custom",
  Custom4: "Custom",
}

const kPopularity = "PopularityIndex";

// Tags
const kPreferMailFormat = ["PreferMailFormat"];
const kPreferMailFormatMap = {
  plaintext: "Receive in plaintext",
  html: "Receive in HTML",
}

const kAllowRemoteContent = ["AllowRemoteContent"];

// LastModifiedDate?

let TBMorkConnector = function(aParams) {
  this._params = aParams;
}

TBMorkConnector.prototype = {
  writable: false,
  syncable: false,

  getAllRecordFields: function TBMC_getAllRecordFields(aCallback) {
    let result = [];

    let abs = MailServices.ab.directories;

    while (abs.hasMoreElements()) {
      let ab = abs.getNext();
      if (ab instanceof Ci.nsIAbDirectory) {
        // What kind of directory do we have here? An LDAP directory? If so,
        // skip it - we'll want to use the LDAP Connector to get those contacts.
        // Same with the OSX address book.
        if (ab instanceof Ci.nsIAbLDAPDirectory ||
            ab.URI.indexOf("moz-abosxdirectory") != -1) {
          continue;
        }

        // Handle the Collected AB and Personal AB differently.
        let isPersonal = (ab.URI == kPersonalAddressbookURI);
        let isCollected = (ab.URI == kCollectedAddressbookURI);

        if (isPersonal)
          dump("\nNow it's personal!\n");
        else if (isCollected)
          dump("\nCollected, beeyotches!\n");

        // Or are we in some kind of other address book?

        // Or wait, is this a mailing list?

        let cards = ab.childCards;
        while (cards.hasMoreElements()) {
          let card = cards.getNext();
          if (card instanceof Ci.nsIAbCard) {
            let mapping = new CardMapping();
            for (let property in fixIterator(card.properties,
                                             Ci.nsIProperty)) {
              mapping.handle(property.name, property.value);
            }

            // TODO: Now put it in the right categories...


            // And add it to our result.
            result.push(mapping.fields);
          }
        }
      }
    }

    return result;
  },
};

function CardMapping() {
  this._fields = getEmptyRecord();
  this._emails = [];
};

CardMapping.prototype = {
  _handlers: {
    kStrings: this._handleString,
    kEmails: this._handleEmail,
    kAddresses: this._handleAddress,
    kTels: this._handleTel,
    kIMs: this._handleIM,
    kWebsites: this._handleWebsite,
    kDates: this._handleDate,
    kOthers: this._handleOther,
    kPreferMailFormat: this._handlePreferMailFormat,
    kAllowRemoteContent: this._handleAllowRemoteContent,
  },

  _handleString: function CardMapping__handleString(aName, aValue) {
    let key = kStringMap[aName];
    this._fields[key] = [aValue];
  },

  _handleEmail: function CardMapping__handleEmail(aName, aValue) {
    // The indices map to where we're going to put the values in the
    // resulting emails array being sent back as the total fields.
    const kEmailIndexMap = ["PrimaryEmail", "SecondEmail"];
    let index = kEmailIndexMap.indexOf(aName);
    this._emails[index] = {type: '', address: aValue};
  },

  _handleAddress: function CardMapping__handleAddress(aName, aValue) {
    const kAddressPrefixIndexMap = ["Home", "Work"];

  },

  _handleTel: function CardMapping__handleTel(aName, aValue) {
  },

  _handleIM: function CardMapping__handleIM(aName, aValue) {
  },

  _handleWebsite: function CardMapping__handleWebsite(aName, aValue) {
  },

  _handleDate: function CardMapping__handleDate(aName, aValue) {
  },

  _handleOther: function CardMapping__handleOther(aName, aValue) {
  },

  _handlePreferMailFormat: function CardMapping__handlePrefMailFormat
    (aName, aValue) {
  },

  _handleAllowRemoteContent: function CardMapping__handleAllowRemoteContent
    (aName, aValue) {
  }

  handle: function CardMapping_handle(aName, aValue) {
    for (let [names, handler] in Iterator(this._handlers)) {
      if (names.indexOf(aName) != -1)
        handler(aName, aValue);
    }

    // If all else fails, it's other.
    this._handleOther(aName, aValue);
  },
};
