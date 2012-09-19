/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-contact';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Contact.jsm");

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
  popularity: 250,
  defaultEmail: {
    type: 'Work',
    value: 'house@example.com',
  },
  defaultImpp: {
    type: 'ICQ',
    value: '15215125',
  },
  defaultTel: null,
  defaultPhoto: null,
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
  jobTitle: ['Diagnostician'],
  department: ['Diagnostics'],
  bday: new Date('Sun Apr 13 1980 00:00:00 GMT-0500 (EST)').toJSON(),
  note: ['Sharp as a tack', 'Not exactly the king of bedside manor.'],

  anniversary: null,
  sex: 'Male',
  genderIdentity: 'Male',
  popularity: 250,

  defaultEmail: {
    type: 'Work',
    value: 'house@example.com',
  },
  defaultImpp: {
    type: 'ICQ',
    value: '15215125',
  },
  defaultTel: null,
  defaultPhoto: null,
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

const kFieldsForDiff = {
  name: 'Wilson',
  honorificPrefix: 'Dr.',
  givenName: 'James',
  additionalName: ['Coleman', 'Ryan'],
  familyName: 'Wilson',
  nickname: 'Robert',
  email: [{
    type: 'Work',
    value: 'wilson@example.com',
  }, {
    type: 'Copy',
    value: 'house@example.com',
  }, {
    type: 'Home',
    value: 'houseOther@example.com'
  }],
  photo: ['somedata'],
  impp: [{
    type: 'ICQ',
    value: '15215125'
  }],
  bday: 'Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)',
};

const kResultingDiff = {
  added: {
    name: ['House'],
    givenName: ['Gregory'],
    additionalName: ['Berton', 'Ryan'],
    familyName: ['House'],
    honorificSuffix: ['Junior'],
    nickname: ['Hugh'],
    email: [{
      type: 'Work',
      value: 'house@example.com',
    }, {
      type: 'Home',
      value: 'houseOther@example.com',
    }],
    url: [{
      type: 'Homepage',
      value: 'https://www.example.com'
    }],
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
    org: ['Princeton-Plainsboro Teaching Hospital'],
    jobTitle: ['Diagnostician'],
    department: ['Diagnostics'],
    note: ['Sharp as a tack',
           'Not exactly the king of bedside manor.'],
  },
  removed: {
    name: ['Wilson'],
    givenName: ['James'],
    additionalName: ['Coleman', 'Ryan'],
    familyName: ['Wilson'],
    nickname: ['Robert'],
    email: [{
      type: 'Work',
      value: 'wilson@example.com',
    }, {
      type: 'Copy',
      value: 'house@example.com',
    }, {
      type: 'Home',
      value: 'houseOther@example.com',
    }],
    photo: ['somedata'],
  },
  changed: {
    bday: new Date('Sun Apr 13 1980 00:00:00 GMT-0500 (EST)').toJSON(),
    sex: 'Male',
    genderIdentity: 'Male',
    popularity: 250,
    defaultEmail: {
      type: 'Work',
      value: 'house@example.com',
    },
    defaultImpp: {
      type: 'ICQ',
      value: '15215125',
    },
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

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
}

/**
 * Test that we can access fields object correctly after passing in an
 * appropriately formed fields object on construction.
 */
function test_can_access_fields_object() {
  let r = new Contact(kTestFields);
  assert_not_equals(r.attributes, null);

  for (let fieldName in kResultingFields) {
    assert_items_equal(r.attributes[fieldName], kResultingFields[fieldName],
                "Field " + fieldName + " not equal: " + JSON.stringify(r.attributes[fieldName])
                + " -- "
                + JSON.stringify(kResultingFields[fieldName]));
  }
}


// Diff tests
function test_can_produce_simple_diff_with_adds() {
  let a = new Contact(kTestFields2);

  let b = new Contact({
    name: 'Captain Haddock',
  });

  const kExpectedDiff = {
    added: {
      givenName: ['Archibald'],
      familyName: ['Haddock'],
      tel: [{
        type: 'Home',
        value: '555-125-1512'
      }, {
        type: 'Cell',
        value: '555-555-1555'
      }],
      email: [{
        type: 'Work',
        value: 'captain.haddock@example.com'
      }],
      adr: [{
        type: 'Work',
        streetAddress: '123 Fake St.',
        locality: 'Toronto',
        region: 'Ontario',
        postalCode: 'L5T2R1',
        countryName: 'Canada',
      }],
      impp: [{
        type: 'ICQ',
        value: '15215125'
      }],
    },
    removed: {},
    changed: {},
  };

  let diff = a.diff(b);

  assert_items_equal(diff, kExpectedDiff);
}

function test_can_produce_simple_diff_with_removes() {
  let a = new Contact(kTestFields2);

  let b = new Contact({
    name: 'Captain Haddock',
  });

  const kExpectedDiff = {
    added: {},
    removed: {
      givenName: ['Archibald'],
      familyName: ['Haddock'],
      tel: [{
        type: 'Home',
        value: '555-125-1512'
      }, {
        type: 'Cell',
        value: '555-555-1555'
      }],
      email: [{
        type: 'Work',
        value: 'captain.haddock@example.com'
      }],
      adr: [{
        type: 'Work',
        streetAddress: '123 Fake St.',
        locality: 'Toronto',
        region: 'Ontario',
        postalCode: 'L5T2R1',
        countryName: 'Canada',
      }],
      impp: [{
        type: 'ICQ',
        value: '15215125'
      }],
    },
    changed: {},
  };

  let diff = b.diff(a);

  assert_items_equal(diff, kExpectedDiff);
}

function test_can_produce_simple_diff_with_changes() {
  let a = new Contact({
    genderIdentity: 'Male',
    sex: 'Female',
    bday: 'Sun Apr 13 1980 00:00:00 GMT-0500 (EST)',
    anniversary: 'Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)',
  });

  let b = new Contact({
    sex: 'Male',
    genderIdentity: 'Female',
    anniversary: 'Sun Apr 13 1980 00:00:00 GMT-0500 (EST)',
  });

  const kExpectedDiff = {
    added: {},
    removed: {},
    changed: {
      sex: 'Female',
      genderIdentity: 'Male',
      bday: new Date('Sun Apr 13 1980 00:00:00 GMT-0500 (EST)').toJSON(),
      anniversary: new Date('Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)').toJSON(),
    },
  };

  let diff = a.diff(b);

  assert_items_equal(diff, kExpectedDiff);
}

function test_can_produce_diff_mixed() {
  let a = new Contact(kTestFields);
  let b = new Contact(kFieldsForDiff);

  let diff = a.diff(b);

  assert_items_equal(diff, kResultingDiff);
}


function test_can_apply_diff() {
  let house = new Contact(kTestFields);
  let wilson = new Contact(kFieldsForDiff);

  wilson.applyDiff(kResultingDiff, {silent: true});
  assert_items_equal(wilson.attributes, house.attributes);
}

// Merging tests
function test_can_do_simple_merge() {
  const kExpectedMerge = {
    name: ['Captain Haddock', 'Wilson'],
    honorificPrefix: ['Dr.'],
    givenName: ['Archibald', 'James'],
    additionalName: ['Coleman', 'Ryan'],
    familyName: ['Haddock', 'Wilson'],
    honorificSuffix: [],
    nickname: ['Robert'],
    email: [{
      type: 'Work',
      value: 'captain.haddock@example.com',
    }, {
      type: 'Work',
      value: 'wilson@example.com',
    }, {
      type: 'Copy',
      value: 'house@example.com',
    }, {
      type: 'Home',
      value: 'houseOther@example.com',
    }],
    photo: ['somedata'],
    url: [],
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
      type: 'Home',
      value: '555-125-1512',
    }, {
      type: 'Cell',
      value: '555-555-1555',
    }],
    impp: [{
      type: 'ICQ',
      value: '15215125'
    }],
    other: [],
    org: [],
    jobTitle: [],
    department: [],
    bday: new Date('Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)').toJSON(),
    note: [],
    anniversary: null,
    sex: null,
    genderIdentity: null,
    popularity: 0,
    defaultEmail: null,
    defaultImpp: null,
    defaultTel: null,
    defaultPhoto: null,
  }

  let haddock = new Contact(kTestFields2);
  let wilson = new Contact(kFieldsForDiff);
  haddock.merge(wilson);

  // We have to to the JSON stringify / parse dance in order to strip
  // the contact of some metadata that Backbone tosses in to mark changes
  // when we do things like merge into an existing contact.
  assert_items_equal(JSON.parse(JSON.stringify(haddock)), kExpectedMerge);
}

// Database Abstraction tests

/**
 * Test that when we save a contact, that the DBA receives the right
 * method and model attributes in the handleSync function.
 */
function test_saving_contact() {
  let done = false;
  let contact = new Contact(kTestFields);
  contact.dba = {
    handleSync: function(aMethod, aModel, aOptions) {
      aModel.id = 1; // Simulating we inserted a contact at row 1.
      assert_equals(aMethod, "create");
      assert_items_equal(aModel.attributes, kResultingFields);
      done = true;
    }
  };

  contact.save();
  mc.waitFor(function() done);

  done = false;
  // Ok, now let's try updating that contact.
  const kUpdatedName = ["Something else"];
  let updatedFields = _.extend({}, kResultingFields);
  updatedFields.name = kUpdatedName;

  contact.dba = {
    handleSync: function(aMethod, aModel, aOptions) {
      assert_equals(aMethod, "update");
      assert_items_equal(aModel.attributes, updatedFields);
      done = true;
    }
  };

  contact.save({name: kUpdatedName});
  mc.waitFor(function() done);
}

/**
 * Test that we can retrieve an individual contact.
 */
function test_read_contact() {
  const kSomeID = 905;
  let contact = new Contact();
  contact.id = kSomeID;

  let done = false;
  contact.dba = {
    handleSync: function(aMethod, aModel, aOptions) {
      assert_equals(aMethod, "read");
      assert_equals(aModel.id, kSomeID);

      let retrieved = new Contact(kTestFields);
      aOptions.success(retrieved);
      done = true;
    },
  };

  contact.fetch();

  mc.waitFor(function() done);

  // Because the contact has been updated, we have to stringify, parse
  // and then grab the attributes like this. Lame, I know.
  assert_items_equal(JSON.parse(JSON.stringify(contact)).attributes,
                     kResultingFields);
}

/**
 * Test that our getters for default fields work.
 */
function test_default_name_getters() {
  let contact = new Contact(kTestFields);

  // name field overrides givenName and familyName.
  assert_equals(contact.displayNameFamilyGiven, "House");
  assert_equals(contact.displayNameGivenFamily, "House");
  // Now blank the name field.
  contact.set("name", []);
  assert_equals(contact.displayNameFamilyGiven, "House, Gregory");
  assert_equals(contact.displayNameGivenFamily, "Gregory House");

  // What about the weird ones, with double names?
  contact.set("familyName", ["House", "Jones"]);
  contact.set("givenName", ["Gregory", "Neil"]);
  assert_equals(contact.displayNameFamilyGiven, "House Jones, Gregory Neil");
  assert_equals(contact.displayNameGivenFamily, "Gregory Neil House Jones");
}

/**
 * Test that our getters for default email, impp, tel and photos work.
 */
/*
function test_default_field_getters() {
  let contact = new Contact(kTestFields);
  assert_equals(contact.defaultEmail, "house@example.com");
  assert_equals(contact.defaultImpp, "15215125");
  assert_equals(contact.defaultTel, "");
  assert_equals(contact.defaultPhoto, "");

  let defaults = contact.get("defaultFields");
  defaults.tel = {
    type: "Home",
    value: "123456789",
  }
  defaults.photo = "some data URL";

  contact.set("defaultFields", defaults);
  assert_equals(contact.defaultTel, "123456789");
  assert_equals(contact.defaultPhoto, "some data URL");
}*/
