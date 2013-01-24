/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Ci = Components.interfaces;
const Cr = Components.results;

const EXPORTED_SYMBOLS = ["ContactDBA"];

Cu.import("resource://gre/modules/commonjs/promise/core.js");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://ensemble/Contact.jsm");

const kCreateContact =
  "INSERT INTO contacts (" +
    "id, attributes, popularity, display_name_family_given," +
    "display_name_given_family" +
  ") VALUES (" +
    ":id, :attributes, :popularity, :display_name_family_given, " +
    ":display_name_given_family" +
  ")";

const kCreateContactData =
  "INSERT INTO contact_data (" +
    "id, contact_id, data1, data2, data3, field_type" +
  ") VALUES (" +
    ":id, :contact_id, :data1, :data2, :data3, :field_type" +
  ")";

const kClearContactData =
  "DELETE FROM contact_data WHERE contact_id = :contact_id";

const kUpdateContact =
  "UPDATE contacts SET " +
    "attributes = :attributes, " +
    "popularity = :popularity, " +
    "display_name_family_given = :display_name_family_given, " +
    "display_name_given_family = :display_name_given_family " +
  "WHERE id = :id";

/**
 * ContactDBA is the abstraction layer between Contacts (Contact.jsm) and
 * SQLiteContactStore.jsm. This layer takes care of forming and
 * executing the SQLite statements that get run by SQLiteContactStore.
 *
 */
const ContactDBA = {
  _datastore: null,
  _db: null,
  _nextInsertID: {},

  /**
   * Initializes the abstraction layer - unless you're testing / mocking,
   * don't use ContactDBA or Contact without initializing this first!
   *
   * @param aDB the initalized SQLiteContactStore to read from and write to
   * @returns a Promise that resolves once the DBA is initted.
   */
  init: function(aDatastore) {
    // It's OK for the DBAs to reach into SQLiteContactStore like this -
    // these are expected to be tightly coupled.
    this._datastore = aDatastore;
    this._db = this._datastore._db;

    // We need to get the nextInsertIDs for both the contacts
    // table and the contact_data table.
    const kIDManagedTables = ["contacts", "contact_data"];

    let self = this;

    return Task.spawn(function() {
      for (let managedTable of kIDManagedTables) {
        // So this is kind of lame, but we have to do an extra let-binding
        // here, or else the closure for the job gets contaminated with
        // subsequent iterations. Grrr...
        let tableName = managedTable;
        // For each table that uses IDs, schedule a job to calculate the next
        // inserted ID value.
        let nextId = yield self._getNextInsertID(tableName);
        self._nextInsertID[tableName] = nextId;
      }
    });
  },

  _getNextInsertID: function(aTableName) {
    // I'm not dealing with user input, so I'm not worried about
    // SQL injection here - plus, it doesn't appear as if mozStorage
    // will let me bind a table name as a parameter anyway.
    let self = this;
    return Task.spawn(function() {
      let rows = yield self._db.execute("SELECT MAX(id) AS max from " + aTableName);
      let max = rows[0].getResultByName("max");
      if (max === null) {
        throw new Task.Result(1);
      }
      throw new Task.Result(max + 1);
    });
  },

  /**
   * Shuts this abstraction layer down, finalizes any statements, frees
   * memory, etc.
   *
   * @returns a Promise that is resolved upon completion.
   */
  uninit: function() {
    return Promise.resolve();
  },

  create: function(aContact) {
    let self = this;
    return Task.spawn(function() {
      let contactID = yield self._createContactRow(aContact);
      yield self._createContactDataRows(contactID, aContact);
      aContact.id = contactID;
      throw new Task.Result(aContact);
    });
  },

  update: function(aContact) {
    let self = this;
    return Task.spawn(function() {
      if (aContact.id === undefined) {
        throw new Error("Cannot update a contact with no ID");
      }
      yield self._datastore.ensureTransaction(function(aConn) {
        yield aConn.executeCached(kUpdateContact, {
          id: aContact.id,
          attributes: JSON.stringify(aContact),
          popularity: aContact.get("popularity"),
          display_name_family_given: "", // TODO
          display_name_given_family: ""
        });
      });
      yield self._createContactDataRows(aContact.id, aContact);
      throw new Task.Result(aContact);
    });
  },

  _createContactRow: function(aContact) {
    let self = this;
    return Task.spawn(function() {
      // The new row will have the ID we're storing in _nextInsertID.contacts.
      let contactID = self._nextInsertID.contacts;
      yield self._datastore.ensureTransaction(function(aConn) {
        yield aConn.executeCached(kCreateContact, {
          id: contactID,
          attributes: JSON.stringify(aContact),
          popularity: aContact.get("popularity"),
          display_name_family_given: "", // TODO
          display_name_given_family: "" // TODO
        });
        self._nextInsertID.contacts++;
      });
      throw new Task.Result(contactID);
    });
  },

  _createContactDataRows: function(aContactID, aContact) {
    let self = this;
    return Task.spawn(function() {
      // We'll start simple - we'll just store the name.
      let dataID = self._nextInsertID.contact_data;
      yield self._datastore.ensureTransaction(function(aConn) {
        yield aConn.executeCached(kClearContactData, {
          contact_id: aContactID
        });

        for (let name of aContact.fields.get("name")) {
          yield aConn.executeCached(kCreateContactData, {
            id: dataID,
            contact_id: aContactID,
            field_type: "name",
            data1: name,
            data2: "",
            data3: ""
          });
          dataID++;
        }

        self._nextInsertID.contact_data = dataID;
      });
    });
  }
};
