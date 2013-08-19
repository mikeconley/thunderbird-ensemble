/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact", "Contacts", "ContactDBA"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/Record.jsm");
Cu.import("resource://ensemble/BaseRecord.jsm");
Cu.import("resource://gre/modules/Promise.jsm");
Cu.import("resource://gre/modules/Task.jsm");
let Common = {};
Cu.import("resource://ensemble/Common.jsm", Common);

const kCreateContact =
  "INSERT INTO contacts (" +
    "id, fields, meta, popularity, display_name_family_given," +
    "display_name_given_family" +
  ") VALUES (" +
    ":id, :fields, :meta, :popularity, :display_name_family_given, " +
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
    "fields = :fields, " +
    "meta = :meta, " +
    "popularity = :popularity, " +
    "display_name_family_given = :display_name_family_given, " +
    "display_name_given_family = :display_name_given_family " +
  "WHERE id = :id";

const kAllContacts =
  "SELECT * from contacts ORDER BY :order_by";

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

  all: function(aOrderBy="id") {
  },

  handleSync: function(aMethod, aContact, aOptions) {
    let resp;
    try {
      switch(aMethod) {
        case "create":
          return this._create(aContact, aOptions);
        case "update":
          return this._update(aContact, aOptions);
        case "read":
          return this._read(aContact, aOptions);
        case "delete":
          return this._delete(aContact, aOptions);
        default:
          throw new Error("Did not recognize method: " + aMethod);
      }
    } catch(e) {
      aOptions.error(e);
    }
  },

  _read: function(aContactOrCollection, aOptions) {
    let aOrderBy = "id";

    let self = this;
    return Task.spawn(function() {
      let rows = yield self._db.executeCached(kAllContacts, {
        order_by: aOrderBy
      });

      let contacts = [];
      for (let row of rows) {
        let fields = JSON.parse(row.getResultByName("fields"));
        let meta = JSON.parse(row.getResultByName("meta"));
        let contact = yield self._create_contact(fields, meta);
        contacts.push(contact);
      }
      aOptions.success(contacts);
    });
  },

  _create_contact: function(aFields, aMeta) {
    let promise = Promise.defer();
    Common.Utils.executeSoon(function() {
      promise.resolve(new Contact(aFields, aMeta));
    });
    return promise.promise;
  },

  _delete: function(aContact) {
    throw new Error("Not yet implemented.");
  },

  _create: function(aContact) {
    let self = this;
    return Task.spawn(function() {
      let contactID = yield self._createContactRow(aContact);
      yield self._createContactDataRows(contactID, aContact);
      aContact.id = contactID;
      throw new Task.Result(aContact);
    });
  },

  _update: function(aContact) {
    let self = this;
    return Task.spawn(function() {
      if (aContact.id === undefined) {
        throw new Error("Cannot update a contact with no ID");
      }
      yield self._datastore.ensureTransaction(function(aConn) {
        yield aConn.executeCached(kUpdateContact, {
          id: aContact.id,
          fields: JSON.stringify(aContact.fields),
          meta: "{}", // TODO
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
          fields: JSON.stringify(aContact.fields),
          meta: "{}", // TODO
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

let Contact = Record.extend({
  dba: ContactDBA,
  defaults: function() {
    return {
      popularity: 0,
      prefersText: false,
      preferDisplayName: true,
      allowRemoteContent: false,
      fields: new BaseRecord()
    };
  },

  constructor: function(aFields, aMeta) {
    if (aFields instanceof Record) {
      let record = aFields;
      Backbone.Model.prototype.constructor.call(this);
      this.set("fields", record.get("fields"));
      this.set("popularity", record.get("popularity"));
      this.set("prefersText", record.get("prefersText"));
      this.set("prefersDisplayName", record.get("prefersDisplayName"));
    } else {
      Record.prototype.constructor.call(this, aFields, aMeta);
    }
  }
});

let Contacts = Backbone.Collection.extend({
  dba: ContactDBA,
  model: Contact,
});
