const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

// Note that we don't import Backbone.jsm or Underscore.jsm here.
// This is because
Cu.import("resource://ensemble/Ensemble.jsm");
Cu.import("resource://ensemble/Contacts.jsm");

let ContactItemView = Backbone.View.extend({
  tagName: "li",
  initialize: function() {
    this._template = _.template($("#contactItemTemplate").html());
  },

  render: function() {
    this.$el.html(this._template(this.model.fields.toJSON()));
    return this;
  },
});

let ContactsView = Backbone.View.extend({
  initialize: function() {
    dump("\nInitting contact view!\n");
    this.el = document.getElementById("contactsList");
    let self = this;
    let contacts = Ensemble.contacts.all().then(function(aContacts) {
      dump("\nGot contacts! Let's roll!\n");
      for (let contact in aContacts) {
        setTimeout(function() {
          self.renderContact(contact);
        }, 10);
      }
      dump("\nDone iterating.\n");
    });
  },
  render: function() {
    let self = this;
    // TODO: this is synchronous, and can bog us down. Let's not do this.
    this.collection.models.forEach(function(aContact) {
      self.renderContact(aContact);
    });
    return this;
  },
  renderContact: function(aContact) {
    dump("\nRendering a contact: " + aContact + "\n");
    let contactView = new ContactItemView({model: aContact});
    dump("\nRendering contact view\n");
    this.el.appendChild(contactView.render().el);
    return this;
  },
});

let ContactTab = {
  init: function ContactTab_init() {
    let list = new ContactsView();
  },

  uninit: function ContactTab_uninit() {
  },
};

window.addEventListener('load', function() {
  ContactTab.init();
});

window.addEventListener('unload', function() {
  ContactTab.uninit();
});
