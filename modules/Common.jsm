const EXPORTED_SYMBOLS = ['Errors', 'Originators', 'Utils'];

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/Services.jsm");

const Errors = {
  NO_CONNECTION: 1,
  TRANSACTION_FAILED: 2,
  TRANSACTION_CANCELLED: 3,
};

const Originators = {
  SYSTEM: "system",
  USER: "user",
};

const Utils = {
  executeSoon: function executeSoon(aCallback) {
    Services.tm
            .mainThread
            .dispatch(aCallback, Ci.nsIThread.DISPATCH_NORMAL);
  }
};
