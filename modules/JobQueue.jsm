let EXPORTED_SYMBOLS = ["JobQueue"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

// How many milliseconds to wait before running the next job?
const kJobWait = 10;

function JobQueue() {
  this._queue = [];
  this._listeners = [];
  this._origJobLength = 0;
};

JobQueue.prototype = {
  addJob: function JQ_addJob(aFunction) {
    this._queue.push(aFunction);
  },

  addProgressListener: function JQ_addProgressListener(aProgressListener) {
    this._listeners.push(aProgressListener);
  },

  start: function(aFinishedCallback) {
    this._finishedCallback = aFinishedCallback;
    this._origJobsLength = this._queue.length;
    this._tick(Cr.NS_OK);
  },

  _tick: function(aResult) {
    if (!Components.isSuccessCode(aResult)) {
      this._finish(aResult);
      return;
    }

    if (this._queue.length == 0) {
      this._finish(Cr.NS_OK);
      return;
    }

    if (this._queue.length < this._origJobsLength) {
      this._notifyListeners(this._origJobsLength - this._queue.length);
    }

    let currentFunction = this._queue.shift();

    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    let timerEvent = {
      notify: function(aTimer) {
        try {
          currentFunction(this._tick.bind(this));
        } catch(e) {
          this._finish(e);
        }
      }.bind(this),
    };
    timer.initWithCallback(timerEvent, kJobWait, Ci.nsITimer.TYPE_ONE_SHOT);
  },

  _notifyListeners: function(aCompleted) {
    for each (let [, listener] in Iterator(this._listeners)) {
      if (listener.hasOwnProperty("onProgressChanged")) {
        listener.onProgressChanged(aCompleted, this._origJobsLength);
      }
    }
  },

  _finish: function(aResult) {
    this._notifyListeners(this._origJobsLength);
    this._listeners = [];
    this._finishedCallback(aResult);
  },
};


