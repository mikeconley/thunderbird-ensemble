/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-contact-dba';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

const Cr = Components.results;

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Contact.jsm");
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
 * @returns Promise that simply resolves if the row count
 *          matches expectations.
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
 *
 * @param aTableName the table to get all rows from.
 * @returns Promise that resolves to the rows.
 */
function get_all_rows(aTableName) {
  return Task.spawn(function() {
    let rows = yield SQLiteContactStore._db.execute(
      "SELECT * FROM " + aTableName);
    throw new Task.Result(rows);
  });
}

function fields_from_contact_row(aRow) {
  return JSON.parse(aRow.getResultByName("fields"));
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
  let contact = new Contact(kTestFields);

  tasks.addTask("Test creating and saving a contact", function() {
    contact = yield ContactDBA._create(contact);
    yield assert_row_count("contacts", 1);
  });

  tasks.addTask("Test that the contact rows were created properly.", function() {
    let rows = yield get_all_rows("contacts");
    assert_equals(1, rows.length,
                  "Should only be 1 row in the contacts table.");
    let contactRow = rows[0];
    assert_items_equal(contactRow.getResultByName("fields"),
                       JSON.stringify(new Contact(kTestFields).fields));
  });

  tasks.addTask("Test that the contact data rows were created properly.", function() {
    let rows = yield get_all_rows("contact_data");
    // We don't care about IDs, so strip those out.
    rows = _.map(rows, function(row) {
      assert_equals(row.getResultByName("contact_id"), contact.id);
      return {
        data1: row.getResultByName("data1"),
        data2: row.getResultByName("data2"),
        field_type: row.getResultByName("field_type")
      }
    });

    yield assert_row_count("contact_data", kExpectedRows.length);
    for (let expectedRow of kExpectedRows) {
      assert_true(_.objInclude(rows, expectedRow));
    }
  });

  tasks.runTasks();
}

function test_updating() {
  const kNewName = ["Chase"];
  let tasks = new TaskTest();

  let contact = new Contact(kTestFields);
  tasks.addTask("Creating a contact to update.", function() {
    contact = yield ContactDBA._create(contact);
    assert_not_equals(contact.id, undefined,
                      "Should have been assigned an id.");
  });

  tasks.addTask("Updating the newly inserted contact.", function() {
    contact.fields.set("name", kNewName);
    contact = yield ContactDBA._update(contact);
    let rows = yield get_all_rows("contacts");
    assert_equals(1, rows.length,
                  "Should only be 1 row in the contacts table.");
    let contactRow = rows[0];
    let fields = fields_from_contact_row(contactRow);
    assert_items_equal(fields.name, kNewName);
  });

  tasks.addTask("Make sure the contact data was updated.", function() {
    let rows = yield get_all_rows("contact_data");
    // We don't care about IDs, so strip those out.
    rows = _.map(rows, function(row) {
      assert_equals(row.getResultByName("contact_id"), contact.id);
      return {
        data1: row.getResultByName("data1"),
        data2: row.getResultByName("data2"),
        field_type: row.getResultByName("field_type")
      }
    });

    // Linear search isn't the greatest right now, but it'll
    // do until I start fleshing this test out more.
    for (let row of rows) {
      if (row.field_type == "name") {
        assert_items_equal(row.data1, kNewName[0]);
      }
    }
  });

  tasks.runTasks();
}

function test_get_one() {
  let tasks = new TaskTest();
  let contact = new Contact(kTestFields);
  tasks.addTask("Creating and saving a contact.", function() {
    contact = yield ContactDBA._create(contact);
  });

  tasks.addTask("Retrieving all contacts.", function() {
    let contacts = yield ContactDBA.all();
    let gottenContact = contacts.next();
    assert_items_equal(JSON.stringify(gottenContact),
                       JSON.stringify(contact));
  });

  tasks.runTasks();
}
