/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-contacts';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Contact.jsm");
Cu.import("resource://ensemble/storage/SQLiteContactStore.jsm");

let kTestFields = {
  name: 'House',
  honorificPrefix: 'Dr.',
  givenName: 'Gregory',
  additionalName: ['Berton', 'Ryan'],
  familyName: 'House',
  honorificSuffix: 'Junior',
  nickname: 'Hugh',
  email: [{
    type: 'Work',
    value: 'house@example.com',
  }, {
    type: 'Home',
    value: 'houseOther@example.com'
  }],

  photo: [],
  url: [{
    type: 'Homepage',
    value: 'https://www.example.com'
  }],
  category: [],
  adr: [{
    type: 'Work',
    streetAddress: '123 Fake St.',
    locality: 'Toronto',
    region: 'Ontario',
    postalCode: 'L5T2R1',
    countryName: 'Canada',
  }],

  tel: [{
    type: 'Work',
    value: '5553125123'
  }, {
    type: 'Cell',
    value: '5124241521'
  }],

  impp: [{
    type: 'ICQ',
    value: '15215125'
  }],

  other: [],
  org: ['Princeton-Plainsboro Teaching Hospital'],
  jobTitle: 'Diagnostician',
  department: 'Diagnostics',
  bday: 'Sun Apr 13 1980 00:00:00 GMT-0500 (EST)',
  note: ['Sharp as a tack', 'Not exactly the king of bedside manor.'],

  anniversary: null,
  sex: 'Male',
  genderIdentity: 'Male',
};

let kResultingFields = {
  name: ['House'],
  honorificPrefix: ['Dr.'],
  givenName: ['Gregory'],
  additionalName: ['Berton', 'Ryan'],
  familyName: ['House'],
  honorificSuffix: ['Junior'],
  nickname: ['Hugh'],
  email: [{
    type: ['Work'],
    value: 'house@example.com',
  }, {
    type: ['Home'],
    value: 'houseOther@example.com'
  }],

  photo: [],
  url: [{
    type: ['Homepage'],
    value: 'https://www.example.com'
  }],
  category: [],
  adr: [{
    type: ['Work'],
    streetAddress: '123 Fake St.',
    locality: 'Toronto',
    region: 'Ontario',
    postalCode: 'L5T2R1',
    countryName: 'Canada',
  }],

  tel: [{
    type: ['Work'],
    value: '5553125123'
  }, {
    type: ['Cell'],
    value: '5124241521'
  }],

  impp: [{
    type: ['ICQ'],
    value: '15215125'
  }],

  other: [],
  org: ['Princeton-Plainsboro Teaching Hospital'],
  jobTitle: ['Diagnostician'],
  department: ['Diagnostics'],
  bday: new Date('Sun Apr 13 1980 00:00:00 GMT-0500 (EST)').toJSON(),
  note: ['Sharp as a tack', 'Not exactly the king of bedside manor.'],

  anniversary: null,
  sex: 'Male',
  genderIdentity: 'Male',
};

const kTestFields2 = {
  name: 'Captain Haddock',
  givenName: 'Archibald',
  familyName: 'Haddock',
  tel: [{
    type: 'Home',
    value: '555-125-1512'
  }, {
    type: 'Cell',
    value: '555-555-1555'
  }],
  email: {
    type: 'Work',
    value: 'captain.haddock@example.com',
  },
  adr: [{
    type: 'Work',
    streetAddress: '123 Fake St.',
    locality: 'Toronto',
    region: 'Ontario',
    postalCode: 'L5T2R1',
    countryName: 'Canada',
  }],
  impp: {
    type: 'ICQ',
    value: '15215125'
  }
};

function assert_items_equal(aItemA, aItemB, aMsg) {
  if (!aMsg) {
    aMsg = JSON.stringify(aItemA, null, " ")
           + " != "
           + JSON.stringify(aItemB, null, " ");
  }

  if (!_.safeIsEqual(aItemA, aItemB))
    throw new Error(aMsg);
}

function initUtils() {
  const kUtils = "./test-utils.js";
  let utils = os.abspath(kUtils, os.getFileForPath(__file__));
  collector.initTestModule(utils);
}

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
  initUtils();
  collector.getModule('ensemble-test-utils').installInto(module);
}

function setupTest() {
  let tasks = new TaskTest();
  tasks.addTask("Setup clear contact store", function() {
    yield SQLiteContactStore.init();
    yield ContactDBA.init(SQLiteContactStore);
  });
  tasks.runTasks();
}

function teardownTest() {
  let tasks = new TaskTest();
  tasks.addTask("Destroy contact store", function() {
    yield ContactDBA.uninit();
    yield SQLiteContactStore.uninit();
    yield SQLiteContactStore.destroy();
  });
  tasks.runTasks();
}

function test_retrieve_one() {
  let tasks = new TaskTest();

  const kName = "Test Contact";
  const kEmail = "test@example.invalid";

  let contact = new Contact({
    name: kName,
    email: [{
      value: kEmail
    }]
  });

  tasks.addTask("Save a contact", function() {
    contact = yield contact.save();
  });

  tasks.addTask("Retrieve the contact", function() {
    let contacts = new Contacts();
    yield contacts.fetch();

    assert_equals(1, contacts.length,
                  "Only one contact should be created.");
    let contact = contacts.at(0);
    assert_equals(contact.fields.get("name"),
                  kName);
    assert_equals(contact.fields.get("email").at(0).value,
                  kEmail);
  });

  tasks.runTasks();
}
