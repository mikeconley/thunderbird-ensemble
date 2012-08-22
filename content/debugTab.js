const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://ensemble/Ensemble.jsm");
Cu.import("resource://ensemble/Contact.jsm");

Cu.import("resource:///modules/gloda/suffixtree.js");

let DebugTab = {
  _progress: null,

  init: function DebugTab_init() {
    this._progress = document.getElementById('jobProgress');

    document.getElementById('insertFakeContacts')
            .addEventListener('click', this.insertFakeContacts.bind(this));
    document.getElementById('createDb')
            .addEventListener('click', this._createDb.bind(this));
    document.getElementById('importOldTB')
            .addEventListener('click', this._importOldTB.bind(this));
  },

  insertFakeContacts: function DebugTab_insertFakeContacts() {
    // Load up the fakecontacts JSON.
    let req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
                .createInstance(Ci.nsIXMLHttpRequest);

    req.overrideMimeType('application/json');
    req.open('GET',
      'chrome://ensemble-test-data/content/fakecontacts/fakecontacts.json',
      true);

    req.onreadystatechange = function() {
      if (req.readyState === 4 && (req.status === 200 ||
                                   req.status === 0)) {
        let contacts = JSON.parse(req.responseText);
        if (contacts) {
          this._progress.max = contacts.length;
          dump("\n\nGot contacts!\n\n");
          this._insertContacts(contacts);
        }
      }
    }.bind(this);

    req.send(null);
  },

  _insertContacts: function DebugTab_insertContacts(aContacts) {
    let strings = [];
    let values = [];
    for each (let [, contact] in Iterator(aContacts)) {
      strings.push(contact.givenName);
      values.push(contact.givenName + " " + contact.familyName);
    }

    dump("\n\nCreating suffix tree\n\n");
    let st = new MultiSuffixTree(strings, values);

    dump("\n\nSearching!\n\n");
    dump(st.findMatches('er'))

/*
    if (aContacts.length > 0) {
      let contactData = aContacts.shift(0);
      let newContact = new Contact(contactData);

      let onSaveComplete = function(aStatus) {
        this._progress.value += 1;
        this._insertContacts(aContacts);
      }

      newContact.save(onSaveComplete.bind(this));
    }*/
  },

  _createDb: function DebugTab_createDb() {
    Components.utils.import("resource://ensemble/SQLiteContactStore.jsm");
    SQLiteContactStore.init(function(aResult) {
      alert("Done! Result was: " + aResult);
      if (aResult != Cr.NS_OK) {
        alert(aResult.code);
      }
    });

    Services.obs.addObserver(this, "profile-before-change", false);
  },

  _importOldTB: function DebugTab_importOldTB() {
    Components.utils.import("resource://ensemble/connectors/TBMorkConnector.jsm");
    let c = new TBMorkConnector();
    let result = c.getAllRecords(function(aRecords, aTags) {
      dump(JSON.stringify(aRecords, null, "\t"));
      dump(JSON.stringify(aTags, null, "\t"));
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
