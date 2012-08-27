/* This Source Code Form issubject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let EXPORTED_SYMBOLS = ["JobQueue"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

/**
 * JobQueue is a handy class for running asynchronous functions in a sequence
 * (though nothing prevents synchronous functions from being used as well).
 *
 * Each job is a function that is passed a callback function, to be called
 * with a single argument - either a Cr.NS_OK or some sort of error object
 * (like Error). If Cr.NS_OK is passed, then the next job is run. If
 * something else is passed, the finishing function (the one passed to the
 * start method) is executed and passed whatever we got back from the job.
 *
 * When the job exits successfully, the finishing function is called, passing
 * in Cr.NS_OK.
 *
 * Example usage:
 *
 * let q = new JobQueue();
 *
 * q.addJob(function(aJobFinished) {
 *   // ... stuff
 *   if (allWentWell)
 *     aJobFinished(Cr.NS_OK);
 *   else
 *     aJobFinished(new Error("OH NO! Things went awry!"));
 * });
 *
 * // .. add more jobs as needed, and then..
 *
 * q.start(function(aResult) {
 *   // This function is executed once all of the jobs are done, or when one
 *   // one job returns something that is not Cr.NS_OK
 *   if (aResult === Cr.NS_OK)
 *     // Hooray!
 *     celebrate();
 *   else
 *     // Something went wrong.
 *     reportProblem(aResult);
 * });
 */

// How many milliseconds to wait before running the next job?
const kJobWait = 10;

function JobQueue() {
  this._queue = [];
  this._listeners = [];
  this._origJobLength = 0;
  this._timer = null;
};

JobQueue.prototype = {
  addJob: function JQ_addJob(aFunction, aJobName) {
    if (!aJobName)
      aJobName = "";

    this._queue.push({
      job: aFunction,
      name: aJobName
    });
  },

  addListener: function JQ_addListener(aListener) {
    this._listeners.push(aListener);
  },

  start: function(aFinishedCallback) {
    this._finishedCallback = aFinishedCallback;
    this._origJobsLength = this._queue.length;
    this._tick(Cr.NS_OK);
  },

  _tick: function(aResult) {
    if (aResult !== Cr.NS_OK) {
      this._finish(aResult);
      return;
    }

    if (this._queue.length == 0) {
      this._finish(Cr.NS_OK);
      return;
    }

    if (this._queue.length < this._origJobsLength) {
      this._notifyOnProgressChanged(this._origJobsLength - this._queue.length);
    }

    let jobObj = this._queue.shift();

    this._timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    let timerEvent = {
      notify: function(aTimer) {
        try {
          this._notifyOnJobStarted(jobObj.name);
          jobObj.job(this._tick.bind(this));
        } catch(e) {
          this._finish(e);
        }
      }.bind(this),
    };
    this._timer
        .initWithCallback(timerEvent, kJobWait, Ci.nsITimer.TYPE_ONE_SHOT);
  },

  _notifyOnProgressChanged: function(aCompleted) {
    for each (let [, listener] in Iterator(this._listeners)) {
      if (listener.hasOwnProperty("onProgressChanged")) {
        listener.onProgressChanged(aCompleted,
                                   this._origJobsLength);
      }
    }
  },

  _notifyOnJobStarted: function(aJobName) {
    for each (let [, listener] in Iterator(this._listeners)) {
      if (listener.hasOwnProperty("onJobStarted")) {
        listener.onJobStarted(aJobName);
      }
    }
  },

  _finish: function(aResult) {
    // We only report that the last job ended successfully if aResult
    // is Cr.NS_OK.
    if (aResult == Cr.NS_OK)
      this._notifyOnProgressChanged(this._origJobsLength);

    this._listeners = [];
    this._finishedCallback(aResult);
  },
};


