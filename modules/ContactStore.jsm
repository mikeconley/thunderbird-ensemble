/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ['ContactStore'];

let ContactStore = {
  _initted: false,

  init: function() {
    this._initted = true;
  },

  uninit: function() {
    this._initted = false;
  },
};
