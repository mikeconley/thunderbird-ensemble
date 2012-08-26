const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact", "ContactSaveStatus"];

Cu.import("resource://ensemble/ContactRecord.jsm");

function Contact(aParams) {
  this._root = new ContactRecord('root', aParams);
};

Contact.prototype = {
  _root: null,

  get id() {
  },

  get popularity() {
  },

  set popularity(aValue) {
  },
};

const ContactSaveStatus = {
  OK: "OK",
}
