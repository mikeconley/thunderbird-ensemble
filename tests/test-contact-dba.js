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
  return Task.spawn(function() {
    let rows = yield SQLiteContactStore._db.execute(
      "SELECT COUNT(*) AS count FROM " + aTableName);
    let count = rows[0].getResultByName("count");
    assert_equals(count, aCount);
  });
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

function initUtils() {
  const kUtils = "./test-utils.js";
  let utils = os.abspath(kUtils, os.getFileForPath(__file__));
  collector.initTestModule(utils);
}

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
  initUtils();
  collector.getModule('ensemble-test-utils').installInto(module);

  let tasks = new TaskTest();
  tasks.addTask("Setup test module", function() {
    yield SQLiteContactStore.init();
    yield ContactDBA.init(SQLiteContactStore);
  });

  tasks.runTasks();
}

function teardownModule(module) {
  let tasks = new TaskTest();
  tasks.addTask("Teardown test module", function() {
    yield ContactDBA.uninit();
    yield SQLiteContactStore.uninit();
    yield SQLiteContactStore.destroy();
  });
  tasks.runTasks();
}

function test_saves_contact() {
  const kExpectedRows = [
    {
      data1: "House",
      data2: "",
      field_type: "name",
    }];
/*
    {
      data1: "Dr.",
      data2: "",
      field_type: "honorificPrefix",
    },
    {
      data1: "Gregory",
      data2: "",
      field_type: "givenName",
    },
    {
      data1: "Berton",
      data2: "",
      field_type: "additionalName",
    },
    {
      data1: "Ryan",
      data2: "",
      field_type: "additionalName",
    },
    {
      data1: "House",
      data2: "",
      field_type: "familyName",
    },
    {
      data1: "Junior",
      data2: "",
      field_type: "honorificSuffix",
    },
    {
      data1: "Hugh",
      data2: "",
      field_type: "nickname",
    },
    {
      data1: "house@example.com",
      data2: "Work",
      field_type: "email",
    },
    {
      data1: "houseOther@example.com",
      data2: "Home",
      field_type: "email",
    },
    {
      data1: "https://www.example.com",
      data2: "Homepage",
      field_type: "url",
    },
    {
      data1: "5553125123",
      data2: "Work",
      field_type: "tel",
    },
    {
      data1: "5124241521",
      data2: "Cell",
      field_type: "tel",
    },
    {
      data1: "15215125",
      data2: "ICQ",
      field_type: "impp",
    },
    {
      data1: "Princeton-Plainsboro Teaching Hospital",
      data2: "",
      field_type: "org",
    },
    {
      data1: "Diagnostician",
      data2: "",
      field_type: "jobTitle",
    },
    {
      data1: "Diagnostics",
      data2: "",
      field_type: "department",
    },
    {
      data1: "Sharp as a tack",
      data2: "",
      field_type: "note",
    },
    {
      data1: "Not exactly the king of bedside manor.",
      data2: "",
      field_type: "note",
    },
    {
      data1: "house@example.com",
      data2: "Work",
      field_type: "email",
    },
    {
      data1: "15215125",
      data2: "ICQ",
      field_type: "impp",
    },
  ]*/

  let tasks = new TaskTest();
  tasks.addTask("Test creating and saving a contact", function() {
    let contact = new Contact(kTestFields);
    let contactId = yield ContactDBA.createContact(contact);
    yield assert_row_count("contacts", 1);
  });

  tasks.runTasks();

/*
  mc.waitFor(function() done);
  if (error)
    throw new Error(error);

  let rows = get_all_rows("contacts");
  let contactRow = rows[0];
  assert_items_equal(contactRow.attributes,
                     JSON.stringify(new Contact(kTestFields)));

  rows = get_all_rows("contact_data");

  // We don't care about IDs, so strip those out.
  rows = _.map(rows, function(row) {
    assert_equals(row.contact_id, contact.id);
    delete row.id;
    delete row.contact_id;
    // Not sure if we even need data3 in the table - this might get axed.
    delete row.data3;
    return row;
  });

  assert_row_count("contact_data", kExpectedRows.length);

  for (let expectedRow of kExpectedRows) {
    assert_true(_.objInclude(rows, expectedRow));
  }*/
}
