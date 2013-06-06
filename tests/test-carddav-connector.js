/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-carddav-connector';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import("resource://ensemble/connectors/CardDAVConnector.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import('resource://mozmill/stdlib/httpd.js');

const Cr = Components.results;
const kPort = 8080;

let gServer = null;

const kSuccessHeader = {
  statusCode: 200,
  statusString: "OK",
  contentType: "text/plain",
}

const kCreateHeader = {
  statusCode: 201,
  statusString: "Created",
  contentType: "text/plain",
}

const kMultiStatusHeader = {
  statusCode: 207,
  statusString: "Multi-Status",
  contentType: "text/xml",
}

const kCardDAVReturnHeader = {
  statusCode: 200,
  statusString: "OK",
  allow: "OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, COPY, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK, REPORT, ACL",
  dav: "1, 2, 3, access-control, addressbook, extended-mkcol",
  date: "Sat, 11 Nov 2006 09:32:12 GMT",
  contentLength: "0", 
}

function MockCardDAVServer() {}

MockCardDAVServer.prototype = {
  _server: null,
  _port: null,

  init: function MCDS_init(port) {
    this._server = new HttpServer();
    this._port = port;    
  },

  registerPathHandler: function MCDS_registerPathHandler(path, handler) {
    this._server.registerPathHandler(path, handler);
  },

  start: function MCDS_start() {
    this._server.start(this._port);
  },

  stop: function MCDS_stop(stopFunc) {
    this._server.stop(stopFunc);
  }, 
}


function setupModule(module) {
  collector.getModule("folder-display-helpers").installInto(module);
}


function setupCardDAVServer(port, location, responder) {
  gServer = new MockCardDAVServer();
  gServer.init(port);
  gServer.registerPathHandler(location, responder);
  gServer.start();   
}


function wait_for_promise_resolved(promise) {
  let done = false;

  Task.spawn(function() {
    yield promise.then(function() {
      gServer.stop(function() {
        done = true;
      });
    }, function(aError) {
      gServer.stop(function() {
        done = false;
      });
      throw aError;
    });
  });

  mc.waitFor(function() done, "Timed out waiting for promise to resolve.");
}


function test_server_connection_success() {
  function connectionResponder(request, response) {
    response.setStatusLine(request.httpVersion, 
                           kCardDAVReturnHeader.statusCode, 
                           kCardDAVReturnHeader.statusString);
    response.setHeader("Allow", kCardDAVReturnHeader.allow, false);
    response.setHeader("DAV", kCardDAVReturnHeader.dav, false);
    response.setHeader("Date", kCardDAVReturnHeader.date, false);
    response.setHeader("Content-Length", kCardDAVReturnHeader.contentLength, false);
  }

  setupCardDAVServer(kPort, "/test", connectionResponder);
  let connector = new CardDAVConnector();
  let promise = connector.testConnection("http://localhost:" + kPort + "/test");

  wait_for_promise_resolved(promise);
}


function test_read_records() {
  function connectionResponder(request, response) {
    response.setStatusLine(request.httpVersion, 
                           kMultiStatusHeader.statusCode, 
                           kMultiStatusHeader.statusString);
    response.setHeader("Content-Type", kMultiStatusHeader.contentType, false);
  }

  setupCardDAVServer(kPort, "/", connectionResponder);
  let connector = new CardDAVConnector();
  let promise = connector.readRecords("http://localhost:" + kPort);
  
  wait_for_promise_resolved(promise);
}