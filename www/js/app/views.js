define(["jquery", "underscore", "backbone", "./models"], function($, _, Backbone, models) {

var ContactView = Backbone.View.extend({
  tagName: "span",

  template: _.template($('#contact-list-tmpl').html()),

  initialize: function(args) {
    this.app = args.app;
    this.model.on('change', this.render, this);
  },

  events: {
    "click .list-contact": "showDetails"
  },

  showDetails: function( event ){
    console.log("Got showDetails!  " + this.$el.html());
    this.app.showDetails(this.model);
  },

  render: function(event){
    this.$el.html(this.template(this.model.toJSON()));
    return this; // recommended as this enables calls to be chained.
  }

});


var DetailView = Backbone.View.extend({
  tagName: "span",

  template: _.template($('#contact-detail-tmpl').html()),

  initialize: function(args) {
    this.app = args.app;
    this.model.on('change', this.render, this);
  },

  render: function(event){
    this.$el.html(this.template(this.model.toJSON()));
    return this; // recommended as this enables calls to be chained.
  }

});




var AppView = Backbone.View.extend({
  el: '#content',

  initialize: function() {
    this.$list = this.$('#list');
    this.$details = this.$('#details');

    models.contacts.on( 'add', this.addAll, this );
    models.contacts.on( 'reset', this.addAll, this );
    models.contacts.on( 'all', this.render, this );

    models.contacts.fetch();
  },

  render: function(event){
    return this; // recommended as this enables calls to be chained.
  },

  addOne: function(contact) {
    var view = new ContactView({ model: contact, app: this });
    this.$list.append(view.render().el);
  },

  addAll: function() {
    this.$list.html('');
    models.contacts.each(this.addOne, this);
  },

  showDetails: function(model) {
    var details = new DetailView({model: model});
    this.$details.html(details.render().el);
  }
});

return {AppView: AppView};

});