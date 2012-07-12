const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://ensemble/Ensemble.jsm");
Cu.import("resource://ensemble/Contact.jsm");

let DebugTab = {
  _progress: null,

  init: function DebugTab_init() {
    this._progress = document.getElementById('jobProgress');

    document.getElementById('insertFakeContacts')
            .addEventListener('click', this.insertFakeContacts.bind(this));
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
      if (req.readyState === 4) {
        let contacts = JSON.parse(req.responseText);
        if (contacts) {
          this._progress.max = contacts.length;
          this._insertContacts(contacts);
        }
      }
    }.bind(this);

    req.send(null);
  },

  _insertContacts: function DebugTab_insertContacts(aContacts) {
    if (aContacts.length > 0) {
      let contactData = aContacts.shift(0);
//      let newContact = new Contact();
      this._progress.value += 1;
      this._insertContacts(aContacts);
    }
  },
};

window.addEventListener('load', function() {
  DebugTab.init();
});
