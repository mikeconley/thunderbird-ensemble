define(function (require) {
  // Load any app-specific modules
  // with a relative require call,
  // like:
  // var util = require('./util');

  //var models = require("./models");
  var views = require('./views');

  console.log('Hello world');

  // Kick off the app!
  var appView = new views.AppView();
  appView.addAll();
});