/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-contact-dba';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

const Cr = Components.results;

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Contact.jsm");
Cu.import("resource://ensemble/storage/ContactDBA.jsm");
Cu.import("resource://ensemble/storage/SQLiteContactStore.jsm");

const kTestFields = {
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
  defaultEmail: {
    type: 'Work',
    value: 'house@example.com',
  },
  defaultImpp: {
    type: 'ICQ',
    value: '15215125',
  },
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

/**
 * Helper function that asserts the row count for a table in the
 * SQLiteContactStore. Operates on the DB synchronously for simplicity.
 *
 * @param aTableName the table to get the row count from
 * @param aCount the row count that we expect.
 */
function assert_row_count(aTableName, aCount) {
  let statement = SQLiteContactStore._db.createStatement(
    "SELECT COUNT(*) FROM " + aTableName);
  let count;
  statement.executeStep();
  count = statement.getInt64(0);
  statement.finalize();
  assert_equals(count, aCount);
}

/**
 * Retrieves all rows for a table and returns them.
 */
function get_all_rows(aTableName) {
  let statement = SQLiteContactStore._db.createStatement(
    "SELECT * FROM " + aTableName);
  let results = [];
  while (statement.executeStep()) {
    let item = {};
    for (let i = 0; i < statement.numEntries; ++i) {
      let type = statement.getTypeOfIndex(i);
      let name = statement.getColumnName(i);
      switch(type) {
        case Ci.mozIStorageStatement.VALUE_TYPE_INTEGER:
          item[name] = statement.getInt64(i);
          break;
        case Ci.mozIStorageStatement.VALUE_TYPE_FLOAT:
          item[name] = statement.getDouble(i);
          break;
        case Ci.mozIStorageStatement.VALUE_TYPE_TEXT:
          item[name] = statement.getString(i);
          break;
        case Ci.mozIStorageStatement.VALUE_TYPE_BLOB:
          item[name] = statement.getBlob(i);
          break;
      }
    }
    results.push(item);
  }
  statement.finalize();
  return results;
}

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
  let done = false;
  SQLiteContactStore.init(function(aResult) {
    assert_equals(aResult, Cr.NS_OK);
    ContactDBA.init(SQLiteContactStore, function(aResult) {
      assert_equals(aResult, Cr.NS_OK);
      done = true;
    });
  });
  mc.waitFor(function() done);
}

function teardownModule(module) {
  let done = false;
  ContactDBA.uninit(function(aResult) {
    assert_equals(aResult, Cr.NS_OK);
    SQLiteContactStore.uninit(function(aResult) {
      assert_equals(aResult, Cr.NS_OK);
      done = true;
    });
  });
  mc.waitFor(function() done);

  // Nuke the contacts.sqlite DB so that other tests can
  // start fresh.
  let dbFile = Services.dirsvc.get("ProfD", Ci.nsIFile);
  dbFile.append("contacts.sqlite");
  dbFile.remove(false);
}

function test_saves_contact() {
  let done = false, error;
  let contact = new Contact(kTestFields);
  contact.save(null, {
    success: function(aModel) {
      done = true;
    },
    error: function(aModel, aResponse) {
      done = true;
      error = aResponse;
    },
  });

  mc.waitFor(function() done);
  if (error)
    throw new Error(error);

  assert_row_count("contacts", 1);
  let rows = get_all_rows("contacts");
  let contactRow = rows[0];
  assert_items_equal(contactRow.attributes,
                     JSON.stringify(new Contact(kTestFields)));

  assert_row_count("contact_data", 21);
  rows = get_all_rows("contact_data");

}
