const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

// Note that we don't import Backbone.jsm or Underscore.jsm here.
// This is because
Cu.import("resource://ensemble/Contacts.jsm");

let ContactItemView = Backbone.View.extend({
  tagName: "li",
  render: function() {
    let template = _.template($("#contactItemTemplate").html());
    this.$el.html(template(this.model.toJSON()));
    return this;
  },
});

let ContactsView = Backbone.View.extend({
  initialize: function() {
    this.el = document.getElementById("contactsList");
    this.collection = new Contacts();
    let self = this;
    this.collection.fetch({
      success: function(aContacts) {
        self.render();
      },
      error: function(aContacts, aError) {
        dump("\n\nHit an error: " + aError);
      }
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
    let contactView = new ContactItemView({model: aContact});
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
