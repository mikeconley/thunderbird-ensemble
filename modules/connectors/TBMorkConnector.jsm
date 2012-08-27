/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// TODO: There are some fields from various address book add-ons that we
// might want to look for and do something smart with. Down the line, it
// might be advantageous to do a survey of the more popular address book
// add-ons, and see what fields they add and what if anything we can do
// with them.

let EXPORTED_SYMBOLS = ['TBMorkConnector'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";
const kCollectedAddressbookURI = "moz-abmdbdirectory://history.mab";

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://ensemble/EnsembleUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://ensemble/JobQueue.jsm");

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

// Photos
const kPhotos = ["PhotoName"];

// More complex tags that we handle specially
const kPreferMailFormat = ["PreferMailFormat"];

// Simple boolean tags...
const kBooleanTags = ["AllowRemoteContent", "PreferDisplayName"];

// Meta stuff
const kMeta = ["PopularityIndex"];

// Stuff we don't need
const kDiscards = ["RecordKey", "DbRowID", "LowercasePrimaryEmail",
                   "LastModifiedDate", "PhotoType", "PhotoURI"];

let TBMorkConnector = function(aParams) {
  this._params = aParams;
}

TBMorkConnector.prototype = {
  writable: false,
  syncable: false,

  _processDirectories: function TBMC__processDirectories(aEnumerator,
                                                         aResult,
                                                         aTags,
                                                         aCallback) {
    let q = new JobQueue();

    while (aEnumerator.hasMoreElements()) {
      let ab = aEnumerator.getNext();

      q.addJob(function(aJobFinished) {
        this._processDirectory(ab, aResult, aTags, aJobFinished);
      }.bind(this));
    }

    let outerResult = aResult;
    q.start(function(aInnerResult) {
      if (aInnerResult === Cr.NS_OK) {
        aCallback(outerResult, aTags);
      } else {
        aCallback(aInnerResult);
      }
    });
  },

  _processDirectory: function TBMC__processDirectory(aDirectory, aResult,
                                                     aTags, aJobFinished) {
    if (!(aDirectory instanceof Ci.nsIAbDirectory)) {
      let e = new Error("_processDirectory was passed something that wasn't "
                        + "an nsIAbDirectory.");
      aJobFinished(e);
      return;
    }


    // What kind of directory do we have here? An LDAP directory? If so,
    // skip it - we'll want to use the LDAP Connector to get those contacts.
    // Same with the OSX address book.
    if (aDirectory instanceof Ci.nsIAbLDAPDirectory ||
        aDirectory.URI.indexOf("moz-abosxdirectory") != -1) {
      aJobFinished(Cr.NS_OK);
      return;
    }

    // Handle the Collected AB and Personal AB differently.
    let isPersonal = (aDirectory.URI == kPersonalAddressbookURI);
    let isCollected = (aDirectory.URI == kCollectedAddressbookURI);

    let mailingLists = [];
    let cache = {};
    let cards = aDirectory.childCards;
    while (cards.hasMoreElements()) {
      let card = cards.getNext();
      if (card instanceof Ci.nsIAbCard) {

        // Or wait, is this a mailing list? If so, stash this for
        // processing at the end.
        if (card.isMailList) {
          mailingLists.push(MailServices.ab
                                        .getDirectory(card.mailListURI));
          continue;
        }

        let mapping = new CardMapping(card.localId);
        for (let property in fixIterator(card.properties,
                                         Ci.nsIProperty)) {
          mapping.handle(property.name, property.value);
        }

        // Now put it in the right categories...
        if (isPersonal)
          mapping.addCategory("system:personal");
        else if (isCollected)
          mapping.addCategory("system:collected");
        else {
          // Or were we part of some other, user-defined address book?
          mapping.addCategory(aDirectory.dirName);
          aTags[aDirectory.dirName] = aDirectory.dirName;
        }

        // Cache the result. We'll extract later once we've done
        // the mailing lists.
        cache[card.localId] = mapping;
      }
    }

    // Now for the mailing lists.
    for each (let [, list] in Iterator(mailingLists)) {
      if (list instanceof Ci.nsIAbDirectory) {
        let cards = list.childCards;
        while (cards.hasMoreElements()) {
          let card = cards.getNext();
          if (card instanceof Ci.nsIAbCard) {
            if (card.localId in cache) {
              let mapping = cache[card.localId];
              mapping.addCategory(list.dirName);
              aTags[list.dirName] = list.dirName;
            }
          }
        }
      }
    }

    let q = new JobQueue();

    // Ok, extract to results.
    for each (let [, mapping] in Iterator(cache)) {
      q.addJob(function(aJobFinished) {
        mapping.deriveRecord(function(aFields, aMeta) {
          aResult.push({
            fields: aFields,
            meta: aMeta,
          });
          aJobFinished(Cr.NS_OK);
        });
      });
    }

    q.start(function(aResult) {
      aJobFinished(aResult);
    });

  },

  getAllRecords: function TBMC_getAllRecords(aCallback) {
    let result = [];
    let tags = {};
    this._processDirectories(MailServices.ab.directories, result, tags,
                             aCallback);
  },
};


function CardMapping() {
  this._fields = getEmptyRecord();
  this._meta = {};

  this._handlers = new Map();
  this._handlers.set(kStrings, this._handleString);
  this._handlers.set(kEmails, this._handleEmail);
  this._handlers.set(kAddresses, this._handleAddress);
  this._handlers.set(kTels, this._handleTel);
  this._handlers.set(kIMs, this._handleIM);
  this._handlers.set(kWebsites, this._handleWebsite);
  this._handlers.set(kDates, this._handleDate);
  this._handlers.set(kOthers, this._handleOther);
  this._handlers.set(kPhotos, this._handlePhoto);
  this._handlers.set(kPreferMailFormat, this._handlePreferMailFormat);
  this._handlers.set(kBooleanTags, this._handleBooleanTags);
  this._handlers.set(kMeta, this._handleMeta);
  this._handlers.set(kDiscards, this._handleDiscard);

  this._asyncOps = 0;
}

CardMapping.prototype = {
  get asyncOps() {
    return this._asyncOps;
  },

  set asyncOps(aVal) {
    this._asyncOps = aVal;

    if (this._asyncOps == 0)
      this._finish();
  },

  handle: function CardMapping_handle(aName, aValue) {
    for (let [names, handler] of this._handlers) {
      if (names.indexOf(aName) != -1) {
        handler.call(this, aName, aValue);
        return;
      }
    }

    // If all else fails, it's other.
    this._handleOther(aName, aValue);
  },

  deriveRecord: function CardMapping_deriveRecord(aCallback) {
    this._finishDerivationCb = aCallback;
    if (this.asyncOps == 0)
      this._finish();
  },

  addCategory: function CardMapping_addCategory(aCategory) {
    this._fields.category.push(aCategory);
  },

  _finish: function CardMapping__finish() {
    if (!this._finishDerivationCb)
      return;

    // Process the fields, scrunching down any empty spaces in the Arrays,
    // and converting the Dates to JSON dates.
    let result = getEmptyRecord();
    for (let field in result) {
      // Arrays...
      if (Array.isArray(this._fields[field])) {
        for (let i = 0; i < this._fields[field].length; ++i)
          if (this._fields[field][i])
            result[field].push(this._fields[field][i]);
      }
      else if (this._fields[field] instanceof Date)
        result[field] = this._fields[field].toJSON();
      else if (typeof(this._fields[field]) == "string")
        result[field] = this._fields[field];
    }

    this._finishDerivationCb(result, this._meta);
  },

  _handleString: function CardMapping__handleString(aName, aValue) {
    const kStringMap = {
      "FirstName": "givenName",
      "LastName": "familyName",
      "DisplayName": "name",
      "NickName": "nickname",
      "JobTitle": "jobTitle",
      "Department": "department",
      "Company": "org",
      "Notes": "note",
    };

    let key = kStringMap[aName];
    this._fields[key] = [aValue];
  },

  _handleEmail: function CardMapping__handleEmail(aName, aValue) {
    // The indices map to where we're going to put the values in the
    // resulting emails array being sent back as the total fields.
    const kEmailIndexMap = ["PrimaryEmail", "SecondEmail"];
    let index = kEmailIndexMap.indexOf(aName);
    this._fields.email[index] = {type: "", value: aValue};
  },

  _handleAddress: function CardMapping__handleAddress(aName, aValue) {
    const kAddressIndexMap = ["Home", "Work"];
    const kSuffixMap = {
      "Address": "streetAddress",
      "Address2": "streetAddress",
      "City": "locality",
      "State": "region",
      "ZipCode": "postalCode",
      "Country": "countryName",
    };

    // The first 4 characters will tell us the type - either Home or Work.
    let type = aName.substring(0, 4);
    let suffix = aName.substring(4);
    let index = kAddressIndexMap.indexOf(type);

    if (index == -1)
      throw new Error("Somehow, we didn't get an address field that " +
                      "started with Home or Work. Probably shouldn't be " +
                      "possible, but checking just in case.");
    if (!(suffix in kSuffixMap))
      throw new Error("Got unexpected Address suffix: " + suffix);

    let valueType = kSuffixMap[suffix];

    if (!this._fields.adr[index])
      this._fields.adr[index] = {
        type: '',
        streetAddress: '',
        locality: '',
        region: '',
        postalCode: '',
        countryName: '',
      };

    if (!this._fields.adr[index][valueType])
      this._fields.adr[index][valueType] = aValue;
    else {
      // This might be naive...we'll see.
      // We must be processing either Address or Address2. If we've got
      // Address, prepend the current value with aValue. Otherwise, append
      // the value.
      let orig = this._fields.adr[index][valueType];
      if (aName == "Address")
        this._fields.adr[index][valueType] = aValue + " " + orig;
      else
        this._fields.adr[index][valueType] = orig + " " + aValue;
    }
  },

  _handleTel: function CardMapping__handleTel(aName, aValue) {
    const kTelIndexMap = ["Home", "Work", "Cellular", "Fax", "Pager"];

    let index = -1, telPrefix = "";

    for each (let [i, prefix] in Iterator(kTelIndexMap)) {
      if (aName.indexOf(prefix) != -1) {
        telPrefix = prefix;
        index = i;
        break;
      }
    }

    if (index == -1 || telPrefix == "")
      throw new Error("Couldn't find mapping for property named " + aName);

    if (!this._fields.tel[index])
      this._fields.tel[index] = {type: '', value: ''};

    let suffix = aName.substring(aName.length, aName.length - 4);
    if (suffix == "Type")
      this._fields.tel[index].type = aValue;
    else
      this._fields.tel[index].value = aValue;
  },

  _handleIM: function CardMapping__handleIM(aName, aValue) {
    const kIMMap = {
      "_GoogleTalk": "GTalk",
      "_AimScreenName": "AIM",
      "_Yahoo": "Yahoo",
      "_Skype": "Skype",
      "_QQ": "QQ",
      "_MSN": "MSN",
      "_ICQ": "ICQ",
      "_JabberId": "Jabber",
    };
    if (!(aName in kIMMap))
      throw new Error("Got an unexpected IM type: " + aName);

    let index = Object.keys(kIMMap).indexOf(aName);
    this._fields.impp[index] = {type: kIMMap[aName], value: aValue};
  },

  _handleWebsite: function CardMapping__handleWebsite(aName, aValue) {
    const kWebsiteMap = ["WebPage1", "WebPage2"];
    let index = kWebsiteMap.indexOf(aName);

    if (index == -1)
      throw new Error("Unexpected website type: " + aName);

    this._fields.url[index] = {
      type: '',
      value: aValue,
    };
  },

  _handleDate: function CardMapping__handleDate(aName, aValue) {
    const kDatePrefix = {
      "Anniversary": "anniversary",
      "Birth": "bday",
    };

    let mapping;
    for (let key in kDatePrefix) {
      if (aName.indexOf(key) != -1) {
        mapping = kDatePrefix[key];
        break;
      }
    }
    if (!mapping)
      throw new Error("Unexpected date type: " + aName);

    if (!this._fields[mapping])
      this._fields[mapping] = new Date();

    if (aName.indexOf("Day") != -1) {
      this._fields[mapping].setDate(aValue);
    }
    else if (aName.indexOf("Month") != -1) {
      // Strangely, month is 0-indexed...
      this._fields[mapping].setMonth(parseInt(aValue) - 1);
    }
    else if (aName.indexOf("Year") != -1) {
      this._fields[mapping].setFullYear(aValue);
    }
  },

  _handleOther: function CardMapping__handleOther(aName, aValue) {
    this._fields.other.push({
      type: aName,
      value: aValue,
    });
  },

  _handleDiscard: function CardMapping__handleDiscard(aName, aValue) {
    // This one's easy...we just don't add it.
  },

  _handlePreferMailFormat: function CardMapping__handlePrefMailFormat
    (aName, aValue) {
    if (parseInt(aValue) == Ci.nsIAbPreferMailFormat.plaintext)
      this.addCategory("system:receive-in-plaintext");
    else if (parseInt(aValue) == Ci.nsIAbPreferMailFormat.html)
      this.addCategory("system:receive-in-html");
  },

  _handleBooleanTags: function CardMapping__handleBooleanTags
    (aName, aValue) {

    const kTagMap = {
      "AllowRemoteContent": "system:allow-remote-content",
      "PreferDisplayName": "system:prefers-display-name",
    };

    if (!(aName in kTagMap))
      throw new Error("Unexpected tag name: " + aName);

    if (aValue)
      this.addCategory(kTagMap[aName]);
  },

  _handleMeta: function CardMapping__handleMeta(aName, aValue) {
    const kMetaMap = {
      "PopularityIndex": "popularityIndex",
    };

    if (!(aName in kMetaMap))
      throw new Error("Unexpected Meta value: " + aName);

    this._meta[kMetaMap[aName]] = aValue;
  },

  _handlePhoto: function CardMapping__handlePhoto(aName, aValue) {
    if (aName != "PhotoName")
      throw new Error("Unexpected photo value: " + aName);

    // Ok, the contact has a photo. The old TB address book stashes
    // this photo in a Photos subdirectory under the profile directory
    // using the filename stored in PhotoName.  Let's get that.
    let photoFile = Services.dirsvc.get("ProfD", Ci.nsILocalFile);
    photoFile.append("Photos");
    if (!photoFile.exists() || !photoFile.isDirectory())
      throw new Error("Could not find Photos directory under current "
                      + "profile");

    photoFile.append(aValue);
    if (!photoFile.exists())
      throw new Error("Could not find photo file for contact.");

    // We'll want the MIME type, since we're storing as a data URL.
    let mimeSvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
    let mimeType = mimeSvc.getTypeFromFile(photoFile);

    this.asyncOps++;

    NetUtil.asyncFetch(photoFile, function(aInputStream, aStatus) {
      if (!Components.isSuccessCode(aStatus))
        throw new Error("Couldn't get data from photo file " + aValue);

      let data = NetUtil.readInputStreamToString(aInputStream,
                                                 aInputStream.available());

      let dataURI = "data:" + mimeType + ";base64," + btoa(data);
      this._fields.photo.push(dataURI);
      this.asyncOps--;
    }.bind(this));

  },
};

function getEmptyRecord() {
  return {
    name: [],
    honorificPrefix: [],
    givenName: [],
    additionalName: [],
    familyName: [],
    honorificSuffix: [],
    nickname: [],
    email: [],
    photo: [],
    url: [],
    category: [],
    adr: [],
    tel: [],
    impp: [],
    org: [],
    other: [],
    jobTitle: [],
    department: [],
    bday: null,
    note: [],
    anniversary: null,
    sex: null,
    genderIdentity: null,
  };
}
