// Nothing in this file is going to be used in the final product - it's
// just the logic behind a crappy little UI tool for testing things when
// I don't feel like automating.
//
// So there's bad code in here. And that's expected. Please ignore.

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
const kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://ensemble/Ensemble.jsm");
Cu.import("resource://ensemble/Contact.jsm");
Cu.import("resource://ensemble/storage/SQLiteContactStore.jsm");
Cu.import("resource://ensemble/JobQueue.jsm");

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
  defaultFields: {
    email: {
      type: 'Work',
      value: 'house@example.com',
    },
    impp: {
      type: 'ICQ',
      value: '15215125',
    },
    tel: null,
    photo: null,
  }
};


let DebugTab = {

  init: function DebugTab_init() {
    document.getElementById('insertFakeContacts')
            .addEventListener('click', this.insertFakeContacts.bind(this));
    document.getElementById('resetDb')
            .addEventListener('click', this._resetDb.bind(this));
    document.getElementById('importOldTB')
            .addEventListener('click', this._importOldTB.bind(this));
    document.getElementById("insertHouse")
            .addEventListener("click", this.insertHouse.bind(this));

    Ensemble.init(SQLiteContactStore, function(aResult) {
      dump("aResult is: " + aResult);
    });
  },

  uninit: function DebugTab_uninit() {
    Ensemble.uninit(function(aResult) {});
  },

  _resetDb: function DebugTab__resetDb() {
    Ensemble.uninit(function(aResult) {
      // Now delete the database...
      SQLiteContactStore.destroy();
      // Now init a new one.
      Ensemble.init(SQLiteContactStore, function(aResult) {
        dump("Database reset.");
      });
    });
  },

  insertHouse: function DebugTab_insertHouse() {
    let house = new Contact(kTestFields);
    house.save(null, {
      success: function(aModel) {
        alert("Success!");
      },
      error: function(aModel, aError) {
        alert("Failure: " + aError + " -- " + aError.fileName + ":" + aError.lineNumber);
      }
    });
  },

  insertFakeContacts: function DebugTab_insertFakeContacts() {
    // Load up the fakecontacts JSON.
    let req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
                .createInstance(Ci.nsIXMLHttpRequest);

    req.overrideMimeType('application/json');
    req.open('GET',
      'resource://ensemble-test-data/fakecontacts/fakecontacts.json',
      true);

    req.onreadystatechange = function() {
      if (req.readyState === 4 && (req.status === 200 ||
                                   req.status === 0)) {
        let contacts = JSON.parse(req.responseText);
        if (contacts) {
          this._insertContacts(contacts);
        }
      }
    }.bind(this);

    req.send(null);
  },

  _insertContacts: function DebugTab_insertContacts(aContacts) {
    // Synchronously (bleh) jam ~500 contacts into the old TB address book.
    let pab = MailServices.ab.getDirectory(kPersonalAddressbookURI);

    function setFirstIfAvailable(aCard, aProp, aVal) {
      if (aVal && aVal[0])
        aCard.setProperty(aProp, aVal[0]);
    }

    for each (let [, contact] in Iterator(aContacts)) {
      let card = Cc["@mozilla.org/addressbook/cardproperty;1"]
                   .createInstance(Ci.nsIAbCard);
      setFirstIfAvailable(card, "DisplayName", contact.name);
      setFirstIfAvailable(card, "PrimaryEmail", contact.email);
      setFirstIfAvailable(card, "FirstName", contact.givenName);
      setFirstIfAvailable(card, "LastName", contact.familyName);
      setFirstIfAvailable(card, "JobTitle", contact.jobTitle);
      setFirstIfAvailable(card, "Company", contact.org);
      setFirstIfAvailable(card, "NickName", contact.additionalName);
      if (contact.tel[0] && contact.tel[0].number)
        card.setProperty("HomePhone", contact.tel[0].number);

      if (contact.adr[0]) {
        let adr = contact.adr[0];
        if (adr.countryName)
          card.setProperty("HomeCountry", adr.countryName);
        if (adr.locality)
          card.setProperty("HomeCity", adr.locality);
        if (adr.postalCode)
          card.setProperty("HomeZipCode", adr.postalCode);
        if (adr.region)
          card.setProperty("HomeState", adr.region);
        if (adr.streetAddress)
          card.setProperty("HomeAddress", adr.streetAddress);
      }

      if (contact.bday) {
        let d = new Date(contact.bday);
        card.setProperty("BirthDay", d.getDate());
        card.setProperty("BirthMonth", d.getMonth());
        card.setProperty("BirthYear", d.getFullYear());
      }

      pab.addCard(card);
    }
  },

  _importOldTB: function DebugTab_importOldTB() {
    Cu.import("resource://ensemble/connectors/TBMorkConnector.jsm");
    let mork = new TBMorkConnector();
    let result = mork.getAllRecords(function(aRecords, aTags) {

      let q = new JobQueue();
/*
      for each (let [tagID, tagPrettyName] in Iterator(aTags)) {
        if (!Ensemble.hasTag(tagID)) {
          q.addJob(function(aJobFinished) {
            Ensemble.addTag(tagID, tagPrettyName, "user", aJobFinished);
          });
        }
      }

      q.start(function(aResult) {
        dump("\n\nInsertion result: " + aResult + "\n\n");
      });
*/
      let q = new JobQueue();
      for (let contactRecord of aRecords) {
        let record = contactRecord;

        q.addJob(function(aJobFinished) {
          let contact = new Contact(record.fields);
          contact.save(null, {
            success: function(aModel) {
              aJobFinished(Cr.NS_OK);
            },
            error: function(aModel, aMessage) {
              aJobFinished(aMessage);
            },
          });
        });
      }
      q.start(function(aResult) {
        dump("\n\nDone: " + aResult + "\n");
      });
    });
  },

  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "profile-before-change")
      SQLiteContactStore.uninit();
  }
};

window.addEventListener('load', function() {
  DebugTab.init();
});

window.addEventListener('unload', function() {
  DebugTab.uninit();
});
