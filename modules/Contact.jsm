const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact", "ContactSaveStatus"];

Cu.import("resource://ensemble/ContactRecord.jsm");

function Contact(aParams) {
  this._root = new ContactRecord('root', aParams);
};

Contact.prototype = {
  _root: null,

  save: function(aCallback, aMaskServices) {
    //ContactStore.save(this._root, aCallback);
  },
};

const ContactSaveStatus = {
  OK: "OK",
}
