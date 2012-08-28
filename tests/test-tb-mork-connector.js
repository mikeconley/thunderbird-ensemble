/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-tb-mork-connector';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers',
                         'address-book-helpers'];

const Cr = Components.results;

Cu.import('resource://ensemble/connectors/TBMorkConnector.jsm');

let gBonevilleAB, gValleyAB, gHarvestarsML, gBarrelhavenML;

const kFoneBoneMap = {
  DisplayName: "Fone Bone",
  FirstName: "Fone",
  LastName: "Bone",
  NickName: "The Fonz",
  PrimaryEmail: "fone.bone@boneville.com",
};

const kPhoneyBoneMap = {
  FirstName: "Phoney",
  LastName: "Bone",
  PrimaryEmail: "phoney.bone@boneville.com",
  Notes: "This guy looooooves money.",
  _GoogleTalk: "moneylover101@gmail.com",
};

const kSmileyBoneMap = {
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
};

const kBones = [kFoneBoneMap, kPhoneyBoneMap, kSmileyBoneMap];
const kBonevilleABName = "Boneville";

const kThornMap = {
  DisplayName: "Thorn",
  FirstName: "Thorn",
  LastName: "Harvestar",
  HomePhone: "515-215-2121",
  PrimaryEmail: "thorn@harvestar.com",
};

const kGranmaMap = {
  DisplayName: "Gran'ma",
  FirstName: "Rose",
  LastName: "Harvestar",
  NickName: "Gran'ma Ben",
  PrimaryEmail: "rose@harvestar.com",
};

const kBriarMap = {
  DisplayName: "Briar Harvestar",
  FirstName: "Briar",
  LastName: "Harvestar",
  PrimaryEmail: "briar@harvestar.com"
};

const kHarvestars = [kThornMap, kGranmaMap, kBriarMap];
const kHarvestarsMLName = "Harvestars";

const kLuciousMap = {
  FirstName: "Lucious",
  LastName: "Down",
  PrimaryEmail: "lucious@barrelhaven.com",
  WebPage1: "http://www.example.com/barrelhaven-tavern",
};

const kJonathanMap = {
  FirstName: "Jonathan",
  LastName: "Oaks",
  NickName: "Jon",
  PrimaryEmail: "jonathan@barrelhaven.com",
};

const kWendellMap = {
  DisplayName: "Wendell",
  FirstName: "Wendell",
  NickName: "Wendell",
  PrimaryEmail: "wendell@barrelhaven.com",
  JobTitle: "Tin Smith",
};

const kEuclidMap = {
  DisplayName: "Euclid",
  FirstName: "Euclid",
  PrimaryEmail: "euclid@barrelhaven.com",
};

const kRoryMap = {
  DisplayName: "Rory",
  PrimaryEmail: "rory@barrelhaven.com",
  SecondEmail: "roryman105@gmail.com",
  _GoogleTalk: "roryman105@gmail.com",
  _ICQ: "1502512"
};

const kBarrelhaven = [kLuciousMap, kJonathanMap, kWendellMap, kEuclidMap,
                      kRoryMap];
const kBarrelhavenMLName = "Barrelhaven";

const kValley = kHarvestars.concat(kBarrelhaven);
const kValleyABName = "The Valley";

function setupModule(module) {
  collector.getModule("folder-display-helpers").installInto(module);
  collector.getModule("address-book-helpers").installInto(module);

  gBonevilleAB = create_mork_address_book(kBonevilleABName);

  for each (let [i, map] in Iterator(kBones)) {
    let card = create_contact("", "", "");
    card = inject_map_values(card, map);
    gBonevilleAB.addCard(card);
  }

  gValleyAB = create_mork_address_book(kValleyABName);

  // And now Barrelhaven...

  gBarrelhavenML = create_mailing_list(kBarrelhavenMLName);

  for each (let [i, map] in Iterator(kBarrelhaven)) {
    let card = create_contact("", "", "");
    card = inject_map_values(card, map);
    gValleyAB.addCard(card);
    gBarrelhavenML.addressLists.appendElement(card, false);
  }

  gBarrelhavenML = gValleyAB.addMailList(gBarrelhavenML);

  // Add the Harvestars...
  gHarvestarsML = create_mailing_list(kHarvestarsMLName);

  for each (let [i, map] in Iterator(kHarvestars)) {
    let card = create_contact("", "", "");
    card = inject_map_values(card, map);
    gValleyAB.addCard(card);
    gHarvestarsML.addressLists.appendElement(card, false);
  }

  gHarvestarsML = gValleyAB.addMailList(gHarvestarsML);
}

// -- Helper functions --

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

function string_has_prefix(aTarget, aPrefix) {
  return (aTarget.substring(0, aPrefix.length) == aPrefix);
}

function assert_prefix(aTarget, aPrefix) {
  assert_true(string_has_prefix(aTarget, aPrefix));
}

function string_has_suffix(aTarget, aSuffix) {
  return (aTarget.substring(aTarget.length - aSuffix.length) == aSuffix);
}

function assert_suffix(aTarget, aSuffix) {
  assert_true(string_has_suffix(aTarget, aSuffix));
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
      else if (string_has_suffix(property, "Month"))
        assert_equals(String(someDate.getMonth()), value);
      else if (string_has_suffix(property, "Year"))
        assert_equals(String(someDate.getFullYear()), value);
      continue;
    }

    throw new Error("Uh..." + property);
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
  let results = [];
  let tags = {};

  let done = false;

  let onFinished = function(aResult) {
    done = true;
  };

  let connector = new TBMorkConnector();
  connector._processDirectory(gBonevilleAB, results, tags, onFinished);

  mc.waitFor(function() done);

  assert_equals(Object.keys(tags).length, 1, "Should only return 1 tag");
  assert_true(kBonevilleABName in tags);
  assert_equals(tags[kBonevilleABName], kBonevilleABName);

  assert_equals(results.length, 3, "Should have 3 contacts");

  // We should have Fone Bone...
  let fone = query_collection_fields(results, "name", "Fone Bone");
  assert_not_null(fone, "Should have found Fone Bone.");
  assert_contact_matches_map(fone, kFoneBoneMap);

  let phoney = query_collection_fields(results, "givenName", "Phoney");
  assert_not_null(phoney, "Should have found Phoney Bone.");
  assert_contact_matches_map(phoney, kPhoneyBoneMap);

  let phoney = query_collection_fields(results, "name", "Smiley Bone");
  assert_not_null(phoney, "Should have found Phoney Bone.");
  assert_contact_matches_map(phoney, kSmileyBoneMap);
}
