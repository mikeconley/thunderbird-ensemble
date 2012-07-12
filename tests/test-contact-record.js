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

  photo: [''],
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

  photo: [''],
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
  bday: new Date('Sun Apr 13 1980 00:00:00 GMT-0500 (EST)'),
  note: ['Sharp as a tack', 'Not exactly the king of bedside manor.'],

  anniversary: null,
  sex: 'Male',
  genderIdentity: 'Male',
};

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
    assert_true(itemsEqual(r.fields[fieldName], kResultingFields[fieldName]),
                "Field " + fieldName + " not equal: " + r.fields[fieldName]
                + " -- "
                + kResultingFields[fieldName]);
  }
}


// Diff tests
function test_can_produce_diff_with_adds() {
  let a = new ContactRecord('foo', {
    name: 'Captain Haddock',
  });

  let b = new ContactRecord('foo', {
    name: 'Captain Haddock',
    givenName: 'Archibald',
    familyName: 'Haddock'
  });

  const kExpectedDiff = {
    added: {
      givenName: ['Archibald'],
      familyName: ['Haddock']
    },
    removed: {},
    changed: {},
  };

  let diff = a.diff(b);
  assert_equals(diff, kExpectedDiff);
}
// Merging tests

// Equivalence tests
