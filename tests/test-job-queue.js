/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MODULE_NAME = 'test-job-queue';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

const Cr = Components.results;

Cu.import('resource://ensemble/JobQueue.jsm');

const kFirstJob = "First Job";
const kSecondJob = "Second Job";
const kThirdJob = "Third Job";
const kJobWait = 50;

function setupModule(module) {
  collector.getModule("folder-display-helpers").installInto(module);
}

function AsyncJobMachine() {
  this._timers = [];
  this.finishedJobs = [];
}

AsyncJobMachine.prototype = {
  make_async_job: function AJB_make_async_job(aJobID, aDelay, aReturn) {
    if (!aReturn)
      aReturn = Cr.NS_OK;

    return function(aJobFinished) {
      let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      let timerEvent = {
        notify: function(aTimer) {
          this.finishedJobs.push(aJobID);
          aJobFinished(aReturn);
        }.bind(this),
      };
      timer.initWithCallback(timerEvent, aDelay,
                             Ci.nsITimer.TYPE_ONE_SHOT);
      this._timers.push(timer);
    }.bind(this);
  },
};

/**
 * Test running three async jobs, and make sure that they're completed
 * in the right order.
 */
function test_basic_functionality() {
  let q = new JobQueue();
  let j = new AsyncJobMachine();

  q.addJob(j.make_async_job(kFirstJob, kJobWait));
  q.addJob(j.make_async_job(kSecondJob, kJobWait));
  q.addJob(j.make_async_job(kThirdJob, kJobWait));

  let done = false;

  q.start(function(aResult) {
    assert_equals(aResult, Cr.NS_OK);
    assert_equals(3, j.finishedJobs.length, "Should have completed 3 jobs.");
    // Make sure they were completed in order.
    assert_equals(kFirstJob, j.finishedJobs[0]);
    assert_equals(kSecondJob, j.finishedJobs[1]);
    assert_equals(kThirdJob, j.finishedJobs[2]);
    done = true;
  });

  mc.waitFor(function() done, "Timed out waiting for jobs to finish!");
}

/**
 * Test for when a job returns an Error or some other object. Make sure that
 * the next jobs are not executed, and that the Error / object is returned
 * to the finishing function.
 */
function test_error_handling() {
  const kErrorMessage = "Error!";
  let q = new JobQueue();
  let j = new AsyncJobMachine();

  q.addJob(j.make_async_job(kFirstJob, kJobWait));
  q.addJob(j.make_async_job(kSecondJob, kJobWait, new Error(kErrorMessage)));
  q.addJob(j.make_async_job(kThirdJob, kJobWait));

  let done = false;

  q.start(function(aResult) {
    // We should have gotten an error back
    assert_not_equals(aResult, Cr.NS_OK);
    assert_true(aResult instanceof Error);
    assert_equals(kErrorMessage, aResult.message);
    assert_equals(2, j.finishedJobs.length,
                  "Should have completed only 2 jobs.");
    // Make sure they were completed in order.
    assert_equals(kFirstJob, j.finishedJobs[0]);
    assert_equals(kSecondJob, j.finishedJobs[1]);
    done = true;
  });

  mc.waitFor(function() done, "Timed out waiting for jobs to finish!");
}

/**
 * Test that we get progress updates correctly.
 */
function test_listeners_on_success() {
  let q = new JobQueue();
  let j = new AsyncJobMachine();

  q.addJob(j.make_async_job(kFirstJob, kJobWait), kFirstJob);
  q.addJob(j.make_async_job(kSecondJob, kJobWait), kSecondJob);
  q.addJob(j.make_async_job(kThirdJob, kJobWait), kThirdJob);

  let completed = [];
  let started = [];

  q.addListener({
    onProgressChanged: function(aCompleted, aTotal) {
      completed.push(aCompleted);
      assert_equals(aTotal, 3);
    },
    onJobStarted: function(aJobID) {
      started.push(aJobID);
    },
  });

  let done = false;

  q.start(function(aResult) {
    assert_equals(aResult, Cr.NS_OK);
    assert_equals(completed.length, 3,
                  "Should have reported 3 jobs completed.");

    for (let i = 0; i < 3; ++i)
      assert_equals(completed[i], i + 1);

    assert_equals(kFirstJob, started[0]);
    assert_equals(kSecondJob, started[1]);
    assert_equals(kThirdJob, started[2]);

    done = true;
  });

  mc.waitFor(function() done, "Timed out waiting for jobs to finish!");
}

/**
 * Test that when we error in one of our jobs, that we still say that that
 * job started, but don't say that it completes. We also don't say that any
 * of the subsequent jobs start or complete.
 */
function test_listeners_on_error() {
  let q = new JobQueue();
  let j = new AsyncJobMachine();

  q.addJob(j.make_async_job(kFirstJob, kJobWait), kFirstJob);
  q.addJob(j.make_async_job(kSecondJob, kJobWait), kSecondJob);
  q.addJob(j.make_async_job(kThirdJob, kJobWait, new Error()), kThirdJob);

  let completed = [];
  let started = [];

  q.addListener({
    onProgressChanged: function(aCompleted, aTotal) {
      completed.push(aCompleted);
      assert_equals(aTotal, 3);
    },
    onJobStarted: function(aJobID) {
      started.push(aJobID);
    },
  });

  let done = false;

  q.start(function(aResult) {
    assert_not_equals(aResult, Cr.NS_OK);
    assert_true(aResult instanceof Error);
    assert_equals(completed.length, 2,
                  "Should have reported 2 jobs completed.");

    for (let i = 0; i < 2; ++i)
      assert_equals(completed[i], i + 1);

    // Though only 2 jobs completed, 3 jobs were started.
    assert_equals(kFirstJob, started[0]);
    assert_equals(kSecondJob, started[1]);
    assert_equals(kThirdJob, started[2]);

    done = true;
  });

  mc.waitFor(function() done, "Timed out waiting for jobs to finish!");
}
