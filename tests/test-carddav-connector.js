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

let gServer = null;

const kProtocol = 'http';
const kHost = 'localhost';
const kPort = 8080;

const testConnectionPrefsJSON = {"address": kProtocol + "://" + kHost + ":" + kPort};
const testReadRecordsPrefsJSON = {"address": kProtocol + "://" + kHost + ":" + kPort};

const kCardDAVXMLContactA = '<D:response>\n' +
       '<D:href>/love.vcf</D:href>\n' +
       '<D:propstat>\n' +
         '<D:prop>\n' +
           '<D:getetag>"34fd5t-df33ht"</D:getetag>' +
           '<C:address-data>\n' +
              'BEGIN:VCARD\n' +
              'N:Lovelace;Ada\n' +
              'FN:Ada;Lovelace\n' +
              'ORG:Babbage\n' +
              'EMAIL;type=INTERNET;type=Work:ada.lovelace@babbage.org\n' +
              'EMAIL;type=INTERNET,Personal;LANGUAGE=En:ada@gmail.com\n' +
              'TEL;type=Home:932435434\n' +
              'TEL;type=Work:645324315\n' +
              'ADR;type=Home:32 Leicester Square, London\n' +
              'ADR;type=Work:12 Halsmere Road, London\n' +
              'URL;type=Blog:lovelace.org\n' +
              'URL;type=Twitter:twitter.com/ada\n' +
              'NOTE:Countess of Lovelace.\n' +
              'CATEGORIES:Developers,Mathematicians\n' +
              'UID:352D8E36-ECCF-4966-9060-15625008A10C\n' +
              'REV:20120720T014035Z\n' +
              'END:VCARD' +
            '</C:address-data>\n' +
         '</D:prop>\n' +
         '<D:status>HTTP/1.1 200 OK</D:status>\n' +
       '</D:propstat>\n' +
     '</D:response>';

const kCardDAVXMLContactB = '<D:response>\n' +
       '<D:href>/bobster.vcf</D:href>\n' +
       '<D:propstat>\n' +
         '<D:prop>\n' +
           '<D:getetag>"23ba4d-ff11fb"</D:getetag>' +
           '<C:address-data>\n' +
              'BEGIN:VCARD\n' +
              'N:Tester;Bob\n' +
              'FN:Bob;Tester\n' +
              'ORG:Bobster\n' +
              'EMAIL;type=INTERNET;type=Work:bob.tester@bobster.org\n' +
              'EMAIL;type=INTERNET,Personal;LANGUAGE=En:bob@gmail.com\n' +
              'TEL;type=Home:434234234\n' +
              'TEL;type=Work:567657567\n' +
              'ADR;type=Home:6767 Street Road, Toronto\n' +
              'ADR;type=Work:333 Lobster Street, Ottawa\n' +
              'URL;type=Blog:bobster.org\n' +
              'URL;type=Twitter:twitter.com/bobster\n' +
              'NOTE:Lord of Bobster.\n' +
              'CATEGORIES:Woodworker,Catcher\n' +
              'UID:555D8F36-ECCF-3454-7878-34536334A10C\n' +
              'REV:24350720T015555Z\n' +
              'END:VCARD' +
            '</C:address-data>\n' +
         '</D:prop>\n' +
         '<D:status>HTTP/1.1 200 OK</D:status>\n' +
       '</D:propstat>\n' +
     '</D:response>';

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

  setupCardDAVServer(kPort, "/", connectionResponder);
  let connector = new CardDAVConnector();
  connector.setPrefs(testConnectionPrefsJSON);
  let promise = connector.testConnection();

  wait_for_promise_resolved(promise);
}


function test_read_records() {
  function connectionResponder(request, response) {
    response.setStatusLine(request.httpVersion, 
                           kMultiStatusHeader.statusCode, 
                           kMultiStatusHeader.statusString);
    response.setHeader("Content-Type", kMultiStatusHeader.contentType, false);
    response.write('<?xml version="1.0" encoding="utf-8" ?>\n' +
   '<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">\n' +
      kCardDAVXMLContactA + 
      kCardDAVXMLContactB + 
   '</D:multistatus>');
  }

  setupCardDAVServer(kPort, "/", connectionResponder);
  let connector = new CardDAVConnector();
  connector.setPrefs(testReadRecordsPrefsJSON);
  let promise = connector.read();
  
  wait_for_promise_resolved(promise);
}

function test_init() {
  function connectionResponder(request, response) {
    response.setStatusLine(request.httpVersion, 
                           kMultiStatusHeader.statusCode, 
                           kMultiStatusHeader.statusString);
    response.setHeader("Content-Type", kMultiStatusHeader.contentType, false);
    response.write('<?xml version="1.0" encoding="utf-8" ?>\n' +
   '<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">\n' +
      kCardDAVXMLContactA + 
      kCardDAVXMLContactB + 
   '</D:multistatus>');
  }

  setupCardDAVServer(kPort, "/", connectionResponder);
  let connector = new CardDAVConnector();
  connector.setPrefs(testReadRecordsPrefsJSON);
  let promise = connector.init();
  
  wait_for_promise_resolved(promise);
}