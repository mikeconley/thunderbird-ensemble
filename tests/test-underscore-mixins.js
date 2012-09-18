/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cu = Components.utils;

const MODULE_NAME = 'test-underscore-mixins';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import('resource://ensemble/Underscore.jsm');

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
}

/**
 * Helper function for testing the equality of two items. Not used
 * for testing if _.safeIsEqual works.
 */
function assert_items_equal(aItemA, aItemB, aMsg) {
  if (!aMsg) {
    aMsg = JSON.stringify(aItemA, null, "\t") + "\n != \n " +
           JSON.stringify(aItemB, null, "\t");
  }
  assert_true(_.safeIsEqual(aItemA, aItemB), aMsg);
}

function test_items_equal_strings() {
  assert_true(_.safeIsEqual(["this", "is", "a", "test"],
                         ["this", "is", "a", "test"]));

  assert_true(_.safeIsEqual(["This", "is", "A", "test"],
                         ["This", "is", "A", "test"]));
  assert_false(_.safeIsEqual(["This", "is", "a", "test"],
                          ["test", "is", "a", "This"]));


  assert_false(_.safeIsEqual(["This", "is", "a", "test"],
                          ["this", "is", "a", "test"]));
  assert_false(_.safeIsEqual(["this", "is"],
                          ["this"]));
}


function test_items_equal_objects() {

  assert_true(_.safeIsEqual({
    single: 'member'
  }, {
    single: 'member'
  }));

  assert_true(_.safeIsEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    object: 'instance'
  }));

  assert_true(_.safeIsEqual({
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }, {
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }));

  assert_true(_.safeIsEqual([{
    nested: {
      some: 'value',
      inside: {
        another: 'object'
      }
    }
  }, "Another string"], [{
    nested: {
      some: 'value',
      inside: {
        another: 'object'
      }
    }
  }, "Another string"]));

  assert_false(_.safeIsEqual({
    single: 'member'
  }, {
    changed: 'member'
  }));

  assert_false(_.safeIsEqual({
    single: 'member'
  }, {
    single: 'changed'
  }));

  assert_false(_.safeIsEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    object: 'changed'
  }));

  assert_false(_.safeIsEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    changed: 'instance'
  }));

  assert_false(_.safeIsEqual({
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }, {
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 10 2012 12:53:18 GMT-0400 (EDT)").toJSON()
  }));

  assert_false(_.safeIsEqual([{
    nested: {
      some: 'value',
      inside: {
        another: 'object'
      }
    }
  }, "Another string"], [{
    nested: {
      some: 'value',
      inside: {
        another: 'changed'
      }
    }
  }, "Another string"]));

}

// The following tests make use of _.safeIsEqual, and assume that it's working
// properly to check the equivalence of various things.

function test_array_complement_with_strings() {
  const kArrayA = ["This", "is", "my", "test", "array"];
  const kArrayB = ["My", "array", "is", "awesome", "folks"];
  const kExpectedA = ["This", "my", "test"];
  const kExpectedB = ["My", "awesome", "folks"];

  let complement = _.objDifference(kArrayA, kArrayB);
  assert_items_equal(complement, kExpectedA);

  complement = _.objDifference(kArrayB, kArrayA);
  assert_items_equal(complement, kExpectedB);
}

function test_array_complement_with_empty_arrays() {
  const kArrayA = [];
  const kArrayB = ['Stuff', 'to', 'remove'];

  let complement = _.objDifference(kArrayA, kArrayB);
  assert_equals(0, complement.length,
                "Should have returned an empty array.");

  complement = _.objDifference(kArrayB, kArrayA);
  assert_items_equal(complement, kArrayB);
}

function test_array_complement_with_objects() {
  const kArrayA = [
    {
      type: 'something',
      value: 'another'
    },
    {
      name: 'James',
      familyName: 'Wilson'
    },
    {},
    {
      handle: '1512125',
    },
    {
      address: '123 fake st'
    },
  ];

  const kArrayB = [
    {
      name: 'James',
      familyName: 'Wilson',
    },
    {
      address: '123 fake st',
    },
    {
      type: 'something',
      value: 'Another',
    },
    {
      locality: 'Toronto'
    }
  ];

  const kExpectedA = [
    {
      type: 'something',
      value: 'another'
    },
    {},
    {
      handle: '1512125'
    }
  ];

  const kExpectedB = [
    {
      type: 'something',
      value: 'Another',
    },
    {
      locality: 'Toronto'
    }
  ];

  let complement = _.objDifference(kArrayA, kArrayB);
  assert_items_equal(complement, kExpectedA);

  complement = _.objDifference(kArrayB, kArrayA);
  assert_items_equal(complement, kExpectedB);

  complement = _.objDifference([{empty: {}}], [{empty: {}}]);
  assert_items_equal(complement, []);
}

function test_array_union() {
  const kArrayA = ["This", "is", "some", "text"];
  const kArrayB = ["And", "here", "is", "some", "more"];
  const kExpected = ["This", "is", "some", "text", "And", "here",
                     "more"];

  let union = _.objUnion(kArrayA, kArrayB);

  assert_items_equal(union, kExpected);
}

function test_array_difference_same_length() {
  const kArrayA = ["This", "is", "some", "text"];
  const kArrayB = ["This", "is", "some", "more"];
  const kExpectedStrings = {
    added: ["more"],
    removed: ["text"],
  };

  let diff = _.arrayDifference(kArrayA, kArrayB);
  assert_items_equal(diff, kExpectedStrings);

  const kArrayC = [
    {
      how: "about",
      an: "object",
    },
    {
      will: "that",
      work: "just",
      as: "well?"
    }
  ];

  const kArrayD = [
    {
      how: "about",
      an: "object",
    },
    {
      will: "this",
      work: "just",
      as: "well?"
    }
  ];

  const kExpectedObjects = {
    added: [
      {
        will: "this",
        work: "just",
        as: "well?",
      }
    ],
    removed: [
      {
        will: "that",
        work: "just",
        as: "well?",
      }
    ]
  };

  diff = _.arrayDifference(kArrayC, kArrayD);
  assert_items_equal(diff, kExpectedObjects);
}

function test_array_difference_different_lengths() {
  const kArrayA = ["This", "is", "more", "text"];
  const kArrayB = ["This", "is", "some", "more", "stuff", "to", "test"];

  const kExpectedFirst = {
    added: ["some", "more", "stuff", "to", "test"],
    removed: ["more", "text"]
  };

  let diff = _.arrayDifference(kArrayA, kArrayB);
  assert_items_equal(diff, kExpectedFirst);

  const kExpectedSecond = {
    added: ["more", "text"],
    removed: ["some", "more", "stuff", "to", "test"],
  };

  diff = _.arrayDifference(kArrayB, kArrayA);
  assert_items_equal(diff, kExpectedSecond);
}

function test_array_difference_one_empty() {
  const kArray = ["This", "stuff", "will", "be", "added"];
  const kExpectedFirst = {
    added: kArray,
    removed: [],
  };
  let diff = _.arrayDifference([], kArray);
  assert_items_equal(diff, kExpectedFirst);

  const kExpectedSecond = {
    added: [],
    removed: kArray,
  };

  diff = _.arrayDifference(kArray, []);
  assert_items_equal(diff, kExpectedSecond);
}

function test_array_difference_single_equal() {
  const kArray = ["Same!"];
  const kExpected = {
    added: [],
    removed: [],
  };

  let diff = _.arrayDifference(kArray, kArray);
  assert_items_equal(diff, kExpected);
}

function test_capitalize() {
  assert_equals(_.capitalize("word"), "Word");
  assert_equals(_.capitalize("a set of words"), "A set of words");
  assert_equals(_.capitalize("ALLCAPS"), "ALLCAPS");
  assert_equals(_.capitalize("sOMECAPS"), "SOMECAPS");
  assert_equals(_.capitalize("12345abc"), "12345abc");
}
