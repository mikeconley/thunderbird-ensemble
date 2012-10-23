/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-base-record';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/BaseRecord.jsm");

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
  popularity: 250,

  defaultEmail: {
    type: ['Work'],
    value: 'house@example.com',
  },
  defaultImpp: {
    type: ['ICQ'],
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

function assert_serializations_equal(aObjA, aObjB, aMsg) {
  assert_items_equal(JSON.parse(JSON.stringify(aObjA)),
                     JSON.parse(JSON.stringify(aObjB)),
                     aMsg);
}

function is_typed_default(aFieldName) {
  return (BaseRecordsCommon.TypedDefaultFields.indexOf(aFieldName) != -1);
}

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
}

/**
 * Test that we can access fields object correctly after passing in an
 * appropriately formed fields object on construction.
 */
function test_can_access_fields_object() {
  let r = new BaseRecord(kTestFields);
  assert_not_equals(r.attributes, null);

  for (let fieldName in kResultingFields) {
    assert_serializations_equal(r.get(fieldName), kResultingFields[fieldName])
  }
}


// Diff tests
function xtest_can_produce_simple_diff_with_adds() {
  let a = new BaseRecord(kTestFields2);

  let b = new BaseRecord({
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

function xtest_can_produce_simple_diff_with_removes() {
  let a = new BaseRecord(kTestFields2);

  let b = new BaseRecord({
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

function xtest_can_produce_simple_diff_with_changes() {
  let a = new BaseRecord({
    genderIdentity: 'Male',
    sex: 'Female',
    bday: 'Sun Apr 13 1980 00:00:00 GMT-0500 (EST)',
    anniversary: 'Fri Jul 13 2012 15:13:53 GMT-0400 (EDT)',
  });

  let b = new BaseRecord({
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

function xtest_can_produce_diff_mixed() {
  let a = new BaseRecord(kTestFields);
  let b = new BaseRecord(kFieldsForDiff);

  let diff = a.diff(b);

  assert_serializations_equal(diff, kResultingDiff);
}


function xtest_can_apply_diff() {
  let house = new BaseRecord(kTestFields);
  let wilson = new BaseRecord(kFieldsForDiff);
  wilson.applyDiff(kResultingDiff);
  assert_serializations_equal(wilson, house);
}

// Merging tests
function xtest_can_do_simple_merge() {
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

  let haddock = new BaseRecord(kTestFields2);
  let wilson = new BaseRecord(kFieldsForDiff);
  haddock.merge(wilson);

  assert_items_equal(JSON.parse(JSON.stringify(haddock)), kExpectedMerge);
}
