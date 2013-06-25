/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-carddav-connector';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers',
                         'address-book-helpers'];

const Cr = Components.results;

Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://ensemble/connectors/CardDAVConnector.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://testing-common/httpd.js");

function setupModule(module) {
  collector.getModule("folder-display-helpers").installInto(module);
}

function test_server_connection_success() {
  let server = new HttpServer();
  const PORT = 5232;
  server.start(PORT);

  let connector = new CardDAVConnector();
  let promise = connector.testServerConnection("http://localhost:" + PORT);
  let done = false;

  promise.then(function() {
  	server.stop();
    done = true;
  }, function(aError) {
  	server.stop();
    throw aError;
  });

   mc.waitFor(function() done, "Timed out waiting for promise to resolve.");
}