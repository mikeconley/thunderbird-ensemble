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

function inject_map_values(aCard, aMap) {
  for each (let [key, value] in Iterator(aMap)) {
    aCard.setProperty(key, value);
  }
  return aCard;
}

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
}
