let Cu = Components.utils;

const MODULE_NAME = 'test-contact-record';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import('resource://ensemble/EnsembleUtils.jsm');
Cu.import('resource://ensemble/ContactRecord.jsm');

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
    address: 'house@example.com',
  }, {
    type: 'Home',
    address: 'houseOther@example.com'
  }],

  photo: [],
  url: ['https://www.example.com'],
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
    number: '5553125123'
  }, {
    type: 'Cell',
    number: '5124241521'
  }],

  impp: [{
    type: 'ICQ',
    handle: '15215125'
  }],

  org: ['Princeton-Plainsboro Teaching Hospital'],
  jobTitle: 'Diagnostician',
  bday: 'Sun Apr 13 1980 00:00:00 GMT-0500 (EST)',
  note: ['Sharp as a tack', 'Not exactly the king of bedside manor.'],

  anniversary: '',
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
    type: 'Work',
    address: 'house@example.com',
  }, {
    type: 'Home',
    address: 'houseOther@example.com'
  }],

  photo: [],
  url: ['https://www.example.com'],
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
    number: '5553125123'
  }, {
    type: 'Cell',
    number: '5124241521'
  }],

  impp: [{
    type: 'ICQ',
    handle: '15215125'
  }],

  org: ['Princeton-Plainsboro Teaching Hospital'],
  jobTitle: ['Diagnostician'],
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
    number: '555-125-1512'
  }, {
    type: 'Cell',
    number: '555-555-1555'
  }],
  email: {
    type: 'Work',
    address: 'captain.haddock@example.com',
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
    handle: '15215125'
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
    address: 'wilson@example.com',
  }, {
    type: 'Copy',
    address: 'house@example.com',
  }, {
    type: 'Home',
    address: 'houseOther@example.com'
  }],
  photo: ['somedata'],
  impp: [{
    type: 'ICQ',
    handle: '15215125'
  }],
  bday: 'Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)',
};

const kResultingDiff = {
  added: {
    name: ['House'],
    givenName: ['Gregory'],
    additionalName: ['Berton'],
    familyName: ['House'],
    honorificSuffix: ['Junior'],
    nickname: ['Hugh'],
    email: [{
      type: 'Work',
      address: 'house@example.com',
    }],
    url: ['https://www.example.com'],
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
      number: '5553125123'
    }, {
      type: 'Cell',
      number: '5124241521'
    }],
    org: ['Princeton-Plainsboro Teaching Hospital'],
    jobTitle: ['Diagnostician'],
    note: ['Sharp as a tack',
           'Not exactly the king of bedside manor.'],
  },
  removed: {
    name: ['Wilson'],
    givenName: ['James'],
    additionalName: ['Coleman'],
    familyName: ['Wilson'],
    nickname: ['Robert'],
    email: [{
      type: 'Work',
      address: 'wilson@example.com',
    }, {
      type: 'Copy',
      address: 'house@example.com',
    }],
    photo: ['somedata'],
  },
  changed: {
    bday: new Date('Sun Apr 13 1980 00:00:00 GMT-0500 (EST)').toJSON(),
    sex: 'Male',
    genderIdentity: 'Male',
  }
};

function assert_items_equal(aItemA, aItemB, aMsg) {
  if (!aMsg) {
    aMsg = JSON.stringify(aItemA, null, " ")
           + " != "
           + JSON.stringify(aItemB, null, " ");
  }

  if (!itemsEqual(aItemA, aItemB))
    throw new Error(aMsg);
}

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
}

// Construction tests

/**
 * Test that constructing a ContactRecord without passing in a service ID
 * results in an error.
 */
function test_construction_fails_without_service_id() {
  try {
    new ContactRecord();
    throw new Error('We should have failed without the service ID.');
  } catch(e) {
    assert_true(true);
  }

  try {
    new ContactRecord('');
    throw new Error('We should have failed with and empty service ID.');
  } catch(e) {
    assert_true(true);
  }

}

// Fields accessor tests

/**
 * Test that we can access fields object correctly after passing in an
 * appropriately formed fields object on construction.
 */
function test_can_access_fields_object() {
  let r = new ContactRecord('foo', kTestFields);
  assert_not_equals(r.fields, null);

  for (let fieldName in kResultingFields) {
    assert_items_equal(r.fields[fieldName], kResultingFields[fieldName],
                "Field " + fieldName + " not equal: " + r.fields[fieldName]
                + " -- "
                + kResultingFields[fieldName]);
  }
}


// Diff tests
function test_can_produce_simple_diff_with_adds() {
  let a = new ContactRecord('foo', kTestFields2);

  let b = new ContactRecord('foo', {
    name: 'Captain Haddock',
  });

  const kExpectedDiff = {
    added: {
      givenName: ['Archibald'],
      familyName: ['Haddock'],
      tel: [{
        type: 'Home',
        number: '555-125-1512'
      }, {
        type: 'Cell',
        number: '555-555-1555'
      }],
      email: [{
        type: 'Work',
        address: 'captain.haddock@example.com'
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
        handle: '15215125'
      }],
    },
    removed: {},
    changed: {},
  };

  let diff = a.diff(b);

  assert_items_equal(diff, kExpectedDiff);
}

function test_can_produce_simple_diff_with_removes() {
  let a = new ContactRecord('foo', kTestFields2);

  let b = new ContactRecord('foo', {
    name: 'Captain Haddock',
  });

  const kExpectedDiff = {
    added: {},
    removed: {
      givenName: ['Archibald'],
      familyName: ['Haddock'],
      tel: [{
        type: 'Home',
        number: '555-125-1512'
      }, {
        type: 'Cell',
        number: '555-555-1555'
      }],
      email: [{
        type: 'Work',
        address: 'captain.haddock@example.com'
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
        handle: '15215125'
      }],
    },
    changed: {},
  };

  let diff = b.diff(a);

  assert_items_equal(diff, kExpectedDiff);
}

function test_can_produce_simple_diff_with_changes() {
  let a = new ContactRecord('foo', {
    genderIdentity: 'Male',
    sex: 'Female',
    bday: 'Sun Apr 13 1980 00:00:00 GMT-0500 (EST)',
    anniversary: 'Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)',
  });

  let b = new ContactRecord('foo', {
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
  let a = new ContactRecord('foo', kTestFields);
  let b = new ContactRecord('foo', kFieldsForDiff);

  let diff = a.diff(b);

  assert_items_equal(diff, kResultingDiff);
}

function test_can_apply_diff() {
  let house = new ContactRecord('foo', kTestFields);
  let wilson = new ContactRecord('foo', kFieldsForDiff);

  wilson.applyDiff(kResultingDiff);

  assert_items_equal(wilson.fields, house.fields);
}

// Merging tests

// Equivalence tests
