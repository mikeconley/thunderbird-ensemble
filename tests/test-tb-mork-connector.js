/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-tb-mork-connector';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers',
                         'address-book-helpers'];

const Cr = Components.results;

Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://ensemble/connectors/TBMorkConnector.jsm");

let gPAB, gCAB, gBonevilleAB, gValleyAB, gHarvestarsML, gBarrelhavenML;

const kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";
const kCollectedAddressbookURI = "moz-abmdbdirectory://history.mab";

const kPersonalTagID = "system:personal";
const kCollectedTagID = "system:collected";

// We need some fake contacts. What better universe than Jeff Smith's
// Bone comics?

const kFoneBone = {
  map: {
    DisplayName: "Fone Bone",
    FirstName: "Fone",
    LastName: "Bone",
    NickName: "The Fonz",
    PrimaryEmail: "fone.bone@boneville.com",
  },

  nameForError: "Fone Bone",
  queryBy: "name",
  queryFor: "Fone Bone",
};

const kPhoneyBone = {
  map: {
    FirstName: "Phoney",
    LastName: "Bone",
    PrimaryEmail: "phoney.bone@boneville.com",
    Notes: "This guy looooooves money.",
    _GoogleTalk: "moneylover101@gmail.com",
  },

  nameForError: "Phoney Bone",
  queryBy: "givenName",
  queryFor: "Phoney",
};

const kSmileyBone = {
  map: {
    DisplayName: "Smiley Bone",
    FirstName: "Smiley",
    LastName: "Bone",
    PrimaryEmail: "smiley.bone@boneville.com",
    SecondEmail: "sandwich.man@boneville.com",
    HomeAddress: "106 Rock Rd.",
    HomeAddress2: "Apartment #3",
    HomeCity: "Boneville",
    HomeState: "Carton",
    HomeCountry: "Jeffsmith",
    HomePhone: "0152-233-1312",
    HomePhoneType: "Home",
    WorkPhone: "0691-125-1511",
    WebPage1: "http://www.example.com/sandwich-man",
    BirthYear: "1980",
    BirthMonth: "1",
    BirthDay: "23",
  },

  nameForError: "Smiley Bone",
  queryBy: "name",
  queryFor: "Smiley Bone",
};

const kBones = [kFoneBone, kPhoneyBone, kSmileyBone];
const kBonevilleABName = "Boneville";

const kThorn = {
  map: {
    DisplayName: "Thorn",
    FirstName: "Thorn",
    LastName: "Harvestar",
    HomePhone: "515-215-2121",
    PrimaryEmail: "thorn@harvestar.com",
  },

  nameForError: "Thorn Harvestar",
  queryBy: "name",
  queryFor: "Thorn",
};

const kGranma = {
  map: {
    DisplayName: "Gran'ma",
    FirstName: "Rose",
    LastName: "Harvestar",
    NickName: "Gran'ma Ben",
    PrimaryEmail: "rose@harvestar.com",
  },

  nameForError: "Gran'ma Ben",
  queryBy: "name",
  queryFor: "Gran'ma",
};

const kBriar = {
  map: {
    DisplayName: "Briar Harvestar",
    FirstName: "Briar",
    LastName: "Harvestar",
    PrimaryEmail: "briar@harvestar.com"
  },

  nameForError: "Briar Harvestar",
  queryBy: "name",
  queryFor: "Briar Harvestar",
};

const kHarvestars = [kThorn, kGranma, kBriar];
const kHarvestarsMLName = "Harvestars";

const kLucious = {
  map: {
    FirstName: "Lucious",
    LastName: "Down",
    PrimaryEmail: "lucious@barrelhaven.com",
    WebPage1: "http://www.example.com/barrelhaven-tavern",
  },

  nameForError: "Lucious Down",
  queryBy: "givenName",
  queryFor: "Lucious",
};

const kJonathan = {
  map: {
    FirstName: "Jonathan",
    LastName: "Oaks",
    NickName: "Jon",
    PrimaryEmail: "jonathan@barrelhaven.com",
  },

  nameForError: "Jonathan Oaks",
  queryBy: "givenName",
  queryFor: "Jonathan",
};

const kWendell = {
  map: {
    DisplayName: "Wendell",
    FirstName: "Wendell",
    NickName: "Wendell",
    PrimaryEmail: "wendell@barrelhaven.com",
    JobTitle: "Tin Smith",
  },

  nameForError: "Wendell",
  queryBy: "name",
  queryFor: "Wendell",
};

const kEuclid = {
  map: {
    DisplayName: "Euclid",
    FirstName: "Euclid",
    PrimaryEmail: "euclid@barrelhaven.com",
  },

  nameForError: "Euclid",
  queryBy: "name",
  queryFor: "Euclid",
};

const kRory = {
  map: {
    DisplayName: "Rory",
    PrimaryEmail: "rory@barrelhaven.com",
    SecondEmail: "roryman105@gmail.com",
    _GoogleTalk: "roryman105@gmail.com",
    _ICQ: "1502512"
  },

  nameForError: "Rory",
  queryBy: "name",
  queryFor: "Rory",
};

const kBarrelhaven = [kLucious, kJonathan, kWendell, kEuclid, kRory];
const kBarrelhavenMLName = "Barrelhaven";

// Other beings that I'll put in the Personal Address Book and the
// Collected Address Book

const kDragon = {
  map: {
    DisplayName: "Great Red Dragon",
    PrimaryEmail: "red@dragons.com",
    _GoogleTalk: "red.dragon@gmail.com",
    HomeAddress: "Daren Gard",
  },

  nameForError: "Great Red Dragon",
  queryBy: "name",
  queryFor: "Great Red Dragon",
};

const kKingdok = {
  map: {
    FirstName: "Kingdok",
    SecondEmail: "kingdok@ratpeople.com",
  },

  nameForError: "Kingdok",
  queryBy: "givenName",
  queryFor: "Kingdok",
};

const kRoqueJa = {
  map: {
    FirstName: "Roque",
    LastName: "Ja",
  },
  nameForError: "Roque Ja",
  queryBy: "givenName",
  queryFor: "Roque"
};

const kBeings = [kDragon, kKingdok, kRoqueJa];

const kTarsil = {
  map: {
    FirstName: "Tarsil",
    LastName: "Usurper",
    HomeAddress: "Main Castle",
    HomeAddress2: "Master Wing",
    HomeCity: "Atheia",
    HomeState: "The Valley",
    HomeCountry: "Jeffsmith",
    JobTitle: "Leader",
    Department: "Royal Guard"
  },

  nameForError: "Tarsil",
  queryBy: "givenName",
  queryFor: "Tarsil",
};

const kOthers = [kTarsil];

const kValley = kHarvestars.concat(kBarrelhaven);
const kValleyABName = "The Valley";

function setupModule(module) {
  collector.getModule("folder-display-helpers").installInto(module);
  collector.getModule("address-book-helpers").installInto(module);

  gPAB = MailServices.ab.getDirectory(kPersonalAddressbookURI);
  inject_contacts(gPAB, kBeings);

  gCAB = MailServices.ab.getDirectory(kCollectedAddressbookURI);
  inject_contacts(gCAB, kOthers);

  gBonevilleAB = create_mork_address_book(kBonevilleABName);
  inject_contacts(gBonevilleAB, kBones);

  gValleyAB = create_mork_address_book(kValleyABName);

  // Add the Harvestars...
  gHarvestarsML = create_mailing_list(kHarvestarsMLName);
  inject_contacts(gValleyAB, kHarvestars, gHarvestarsML);
  gHarvestarsML = gValleyAB.addMailList(gHarvestarsML);

  // And now Barrelhaven...
  gBarrelhavenML = create_mailing_list(kBarrelhavenMLName);
  inject_contacts(gValleyAB, kBarrelhaven, gBarrelhavenML);
  gBarrelhavenML = gValleyAB.addMailList(gBarrelhavenML);
}

// -- Helper functions --

/**
 * Given some address book, and a collection of objects representing
 * contacts, inject those contacts into the address book. You can optionally
 * pass a mailing list to add these contacts to as well.
 *
 * @param aAB the nsIAbDirectory to populate
 * @param aContacts an array of objects with a .map property that can be
 *                  used by inject_map_values.
 * @param aMailList the (optional) mailing list to also populate.
 */
function inject_contacts(aAB, aContacts, aMailList) {
  for each (let [i, person] in Iterator(aContacts)) {
    let card = create_contact("", "", "");
    card = inject_map_values(card, person.map);
    aAB.addCard(card);

    if (aMailList)
      aMailList.addressLists.appendElement(card, false);
  }
}

/**
 * Given some nsIAbCard, and a map of properties to values, iterate
 * through the properties, setting them in the nsIAbCard to the mapped
 * values, and returning the updated nsIAbCard.
 *
 * @param aCard the nsIAbCard to inject values into
 * @param aMap the map of properties and values
 * @return the updated nsIAbCard
 */
function inject_map_values(aCard, aMap) {
  for each (let [key, value] in Iterator(aMap)) {
    aCard.setProperty(key, value);
  }
  return aCard;
}

/**
 * When calling _processDirectory or _processDirectories, TBMorkConnector
 * returns an array of results. Each item in the results array represents
 * a single contact, and has to properties - "fields" and "meta". This
 * function takes an array returned by TBMorkConnector, and searches each
 * item's fields property for a field matching aField that has a value of
 * aValue. Each field is converted to a String before comparison, so if
 * you're looking for a contact with a field like this:
 *
 * name: ["Charles Brown", "Charlie Brown"]
 *
 * You would use:
 *
 * let c = query_collection_fields(contactArray, "name",
 *                                 "Charles Brown, Charlie Brown");
 *
 * @param aCollection a result collection returned by TBMorkConnector when
 *                    running _processDirectory or _processDirectories.
 * @param aField a field name to look for in each result's fields property.
 * @param aValue the string to compare with
 * @return the result (with the fields and meta properties) that matches the
 *         search parameters. Returns null if we can't find anything.
 */
function query_collection_fields(aCollection, aField, aValue) {
  for each (let [, item] in Iterator(aCollection)) {
    let fields = item.fields;
    if (fields.hasOwnProperty(aField)) {
      if (String(fields[aField]) == aValue)
        return item;
    }
  }
  return null;
}

/**
 * Throws if aThing is null.
 *
 * @param aThing the thing to check for nullity.
 * @param aMsg the message to display in the error message if aThing is indeed
 *             null. Defaults to "Unepxected null."
 */
function assert_not_null(aThing, aMsg) {
  if (!aMsg)
    aMsg = "Unexpected null.";

  if (aThing === null)
    throw new Error(aMsg);
}

function assert_any_field_has_value(aCollection, aValue) {
  let matches = [item for each (item in aCollection)
                 if (item.value == aValue)]
  if (matches.length > 0)
    return matches;

  throw new Error("Expected a collection to contain a value: " + aValue);
}

function assert_any_field_has_type(aCollection, aType) {
  let matches = [item for each (item in aCollection)
                 if (item.type == aType)];
  if (matches.length > 0)
    return matches;

  throw new Error("Expected a collection to contain a type: " + aValue);
}

function assert_any_field_has_type_and_value(aCollection, aType, aValue) {
  let matches = [item for each (item in aCollection)
                 if (item.type == aType)];

  for each (let [, field] in Iterator(matches)) {
    if (field.value == aValue)
      return field;
  }
  throw new Error("Expected a collection to contain a type " + aType +
                  " with value: " + aValue);
}

// TODO: Use Harmony's startsWith instead
function string_has_prefix(aTarget, aPrefix) {
  return (aTarget.substring(0, aPrefix.length) == aPrefix);
}

function assert_prefix(aTarget, aPrefix) {
  assert_true(string_has_prefix(aTarget, aPrefix));
}

// TODO: Use Harmony's endsWith instead
function string_has_suffix(aTarget, aSuffix) {
  return (aTarget.substring(aTarget.length - aSuffix.length) == aSuffix);
}

function assert_suffix(aTarget, aSuffix) {
  assert_true(string_has_suffix(aTarget, aSuffix));
}

function assert_contacts_exist_and_match(aCollection, aContacts) {
  let matches = [];
  for each (let [name, properties] in Iterator(aContacts)) {
    let contact = query_collection_fields(aCollection, properties.queryBy,
                                          properties.queryFor);
    assert_not_null(contact, "Should have found " + properties.nameForError);
    assert_contact_matches_map(contact, properties.map);
    matches.push(contact);
  }
  return matches;
}

function assert_all_contacts_have_tags(aResults, aTags) {
  for each (let [, result] in Iterator(aResults)) {
    for each (let [, tag] in Iterator(aTags)) {
      if (result.fields.category.indexOf(tag) == -1)
        throw new Error("Expected contact to have tag " + tag);
    }
  }
}

function assert_has_n_tags(aTags, aNum) {
  assert_equals(Object.keys(aTags).length, aNum,
                "Should have " + aNum + " tags");

}

function assert_tags_contain(aTags, aTagIDs) {
  for each (let [, tagID] in Iterator(aTagIDs)) {
    if (!(tagID in aTags))
      throw new Error("Expected tags to contain tag with ID " + tagID);
  }
}

function assert_has_n_contacts(aResults, aNum) {
  assert_equals(aResults.length, aNum,
                "Should have " + aNum + " contacts.");
}

function call_process_directory_and_wait(aAddressBook) {
  let results = [];
  let tags = {};
  let done = false;

  let onFinished = function(aResult) {
    done = true;
  };

  let connector = new TBMorkConnector();
  connector._processDirectory(aAddressBook, results, tags, onFinished);

  mc.waitFor(function() done);
  return [results, tags];
}

function call_getAllRecords_and_wait(aAddressBook) {
  let results = [];
  let tags = {};
  let done = false;

  let onFinished = function(aResults, aTags) {
    results = aResults;
    tags = aTags;
    done = true;
  };

  let connector = new TBMorkConnector();
  connector.getAllRecords(onFinished);

  mc.waitFor(function() done);
  return [results, tags];
}


function assert_contact_matches_map(aContact, aMap) {
  const kStringsMap = {
    "FirstName": "givenName",
    "LastName": "familyName",
    "DisplayName": "name",
    "NickName": "nickname",
    "JobTitle": "jobTitle",
    "Department": "department",
    "Company": "org",
    "Notes": "note",
  };

  const kEmails = ["PrimaryEmail", "SecondEmail"];
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

  const kAddresses = ["HomeAddress", "HomeAddress2", "HomeCity", "HomeState",
                      "HomeZipCode", "HomeCountry",  "WorkAddress",
                      "WorkAddress2", "WorkCity", "WorkState", "WorkZipCode",
                      "WorkCountry"];

  const kAddressSuffixMap = {
    "Address": "streetAddress",
    "Address2": "streetAddress",
    "City": "locality",
    "State": "region",
    "ZipCode": "postalCode",
    "Country": "countryName",
  };

  const kPhonesMap = {
    "HomePhone": "Home",
    "HomePhoneType": "Home",
    "WorkPhone": "Work",
    "WorkPhoneType": "Work",
    "FaxNumber": "Fax",
    "FaxNumberType": "Fax",
    "PagerNumber": "Pager",
    "PagerNumberType": "Pager",
    "CellularNumber": "Cellular",
    "CellularNumberType": "Cellular"
  };

  const kWebsites = ["WebPage1", "WebPage2"];

  const kDatesMap = {
    "BirthDay": "bday",
    "BirthMonth": "bday",
    "BirthYear": "bday",
    "AnniversaryDay": "anniversary",
    "AnniversaryMonth": "anniversary",
    "AnniversaryYear": "anniversary",
  };

  for each (let [property, value] in Iterator(aMap)) {

    // Basic strings
    if (property in kStringsMap) {
      let mapping = kStringsMap[property];
      if (aContact.fields[mapping][0] != value)
        throw new Error("Contact did not match map - property " + property +
                        " should have been " + value +
                        " but was " + aContact.fields[mapping][0]);
      continue;
    }

    // Emails...
    if (kEmails.indexOf(property) != -1) {
      assert_any_field_has_value(aContact.fields.email, value);
      continue;
    }

    // IMs...
    if (property in kIMMap) {
      assert_any_field_has_type_and_value(aContact.fields.impp, kIMMap[property],
                                          value);
      continue;
    }

    // Addresses...
    if (kAddresses.indexOf(property) != -1) {
      let type = property.substring(0, 4);
      let suffix = property.substring(4);
      let matches = assert_any_field_has_type(aContact.fields.adr, type);
      assert_equals(matches.length, 1);
      let mapping = kAddressSuffixMap[suffix];

      if (suffix == "Address")
        assert_prefix(matches[0][mapping], value);
      else if (suffix == "Address2")
        assert_suffix(matches[0][mapping], value);
      else
        assert_equals(matches[0][mapping], value);
      continue;
    }

    // Phones...
    if (property in kPhonesMap) {
      let type = kPhonesMap[property];
      if (string_has_suffix(property, "Type"))
        assert_any_field_has_type(aContact.fields.tel, type);
      else
        assert_any_field_has_type_and_value(aContact.fields.tel,
                                            type, value);
      continue;
    }

    // Websites
    if (kWebsites.indexOf(property) != -1) {
      assert_any_field_has_value(aContact.fields.url, value);
      continue;
    }

    // Birthday and Anniversary
    if (property in kDatesMap) {
      let mapping = kDatesMap[property];
      assert_not_null(aContact.fields[mapping]);
      let someDate = new Date(aContact.fields[mapping]);
      if (string_has_suffix(property, "Day"))
        assert_equals(String(someDate.getDate()), value);
      else if (string_has_suffix(property, "Month")) {
        // Remember that Date's month is 0 indexed...
        assert_equals(String(someDate.getMonth() + 1), value);
      }
      else if (string_has_suffix(property, "Year"))
        assert_equals(String(someDate.getFullYear()), value);
      continue;
    }

    throw new Error("Not prepared to handle property " + property);
  }
}

// -- Here's where the actual testing begins --

/**
 * Test processing the entire address book.
 */
function test_process_entire_ab() {
  let [results, tags] = call_getAllRecords_and_wait();

  const kEverybody = kBones.concat(kHarvestars)
                           .concat(kBarrelhaven)
                           .concat(kBeings)
                           .concat(kOthers);

  assert_contacts_exist_and_match(results, kEverybody);
  // There should be 4 tags - Boneville, The Valley, Barrelhaven,
  // and Harvestars.
  assert_has_n_tags(tags, 4);
  assert_tags_contain(tags, [kBonevilleABName, kValleyABName,
                             kHarvestarsMLName, kBarrelhavenMLName]);
  const kTagMap = {};
  kTagMap[kBonevilleABName] = kBones;
  kTagMap[kValleyABName] = kValley;
  kTagMap[kHarvestarsMLName] = kHarvestars;
  kTagMap[kBarrelhavenMLName] = kBarrelhaven;

  for each (let [tagID, contactsToQuery] in Iterator(kTagMap)) {
    let contacts = assert_contacts_exist_and_match(results, contactsToQuery);
    assert_all_contacts_have_tags(contacts, [tagID]);
  }
}

// -- Private Function Tests --
//
// I know it's not very OOP to poke at an object's private methods
// externally, but TBMorkConnector is complicated, and exposes
// very little, and I want to test all the moving bits. If that
// means my tests are fragile, well, so be it.

/**
 * Test processing a single address book with some contacts in it.
 * Calls the _processDirectory private method of a TBMorkConnector
 * instance.
 */
function test_process_single_directory() {
  let [results, tags] = call_process_directory_and_wait(gBonevilleAB);
  assert_has_n_tags(tags, 1);
  assert_tags_contain(tags, [kBonevilleABName]);
  assert_equals(tags[kBonevilleABName], kBonevilleABName);
  assert_has_n_contacts(results, kBones.length);
  assert_contacts_exist_and_match(results, kBones);
  assert_all_contacts_have_tags(results, [kBonevilleABName]);
}

/**
 * Test processing a single address book with some contacts and populated
 * mailing lists in it. Calls the _processDirectory private method of a
 * TBMorkConnector instance.
 */
function test_process_mailing_list_directory() {
  let [results, tags] = call_process_directory_and_wait(gValleyAB);
  assert_has_n_tags(tags, 3);
  assert_tags_contain(tags, [kValleyABName, kBarrelhavenMLName,
                             kHarvestarsMLName]);
  assert_equals(tags[kValleyABName], kValleyABName);
  assert_equals(tags[kBarrelhavenMLName], kBarrelhavenMLName);
  assert_equals(tags[kHarvestarsMLName], kHarvestarsMLName);

  assert_has_n_contacts(results, kValley.length);

  const kContacts = [kThorn, kGranma, kBriar, kLucious, kJonathan,
                     kWendell, kEuclid, kRory];

  assert_contacts_exist_and_match(results, kContacts);
}

/**
 * Test processing the Personal Address Book.
 */
function test_process_pab() {
  let [results, tags] = call_process_directory_and_wait(gPAB);
  assert_has_n_tags(tags, 0);
  assert_has_n_contacts(results, kBeings.length);
  assert_contacts_exist_and_match(results, kBeings);
  assert_all_contacts_have_tags(results, [kPersonalTagID]);
}

/**
 * Test processing the Collected Address Book.
 */
function test_process_cab() {
  let [results, tags] = call_process_directory_and_wait(gCAB);
  assert_has_n_tags(tags, 0);
  assert_has_n_contacts(results, kOthers.length);
  assert_contacts_exist_and_match(results, kOthers);
  assert_all_contacts_have_tags(results, [kCollectedTagID]);
}
