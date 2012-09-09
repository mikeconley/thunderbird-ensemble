define(["backbone"], function(Backbone) {

// From ContactModel.js
const kAllFields = ['name', 'honorificPrefix', 'givenName',
                    'additionalName', 'familyName', 'honorificSuffix',
                    'nickname', 'photo', 'category', 'org',
                    'jobTitle', 'department', 'note', 'tel', 'email',
                    'impp', 'url', 'other', 'adr', 'sex', 'genderIdentity',
                    'bday', 'anniversary'];


var Contact = Backbone.Model.extend({
  defaults: {
  },

  initialize: function(){
  }

});

var ContactList = Backbone.Collection.extend({
  model: Contact,
  url: '/contacts'
});

var contacts = new ContactList([
  {name:'Blake Winton', email:['bwinton@mozilla.com']},
  {name:'Mike Conley', email:['mconley@mozilla.com', 'mike@conley.ca']}
]);

return {contacts: contacts};

});