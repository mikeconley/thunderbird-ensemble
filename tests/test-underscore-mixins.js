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
 * for testing if _.isEqual works.
 */
function assert_items_equal(aItemA, aItemB, aMsg) {
  if (!aMsg) {
    aMsg = JSON.stringify(aItemA, null, "\t") + "\n != \n " +
           JSON.stringify(aItemB, null, "\t");
  }
  assert_true(_.isEqual(aItemA, aItemB), aMsg);
}

function test_items_equal_strings() {
  assert_true(_.isEqual(["this", "is", "a", "test"],
                         ["this", "is", "a", "test"]));

  assert_true(_.isEqual(["This", "is", "A", "test"],
                         ["This", "is", "A", "test"]));
  assert_false(_.isEqual(["This", "is", "a", "test"],
                          ["test", "is", "a", "This"]));


  assert_false(_.isEqual(["This", "is", "a", "test"],
                          ["this", "is", "a", "test"]));
  assert_false(_.isEqual(["this", "is"],
                          ["this"]));
}

/*
function test_items_equal_objects() {

  assert_true(_.isEqual({
    single: 'member'
  }, {
    single: 'member'
  }));

  assert_true(_.isEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    object: 'instance'
  }));

  assert_true(_.isEqual({
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }, {
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }));

  assert_true(_.isEqual([{
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

  assert_false(_.isEqual({
    single: 'member'
  }, {
    changed: 'member'
  }));

  assert_false(_.isEqual({
    single: 'member'
  }, {
    single: 'changed'
  }));

  assert_false(_.isEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    object: 'changed'
  }));

  assert_false(_.isEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    changed: 'instance'
  }));

  assert_false(_.isEqual({
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }, {
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 10 2012 12:53:18 GMT-0400 (EDT)").toJSON()
  }));

  assert_false(_.isEqual([{
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

// The following tests make use of _.isEqual, and assume that it's working
// properly to check the equivalence of various things.

function test_array_complement_with_strings() {
  const kArrayA = ["This", "is", "my", "test", "array"];
  const kArrayB = ["My", "array", "is", "awesome", "folks"];
  const kExpectedA = ["This", "my", "test"];
  const kExpectedB = ["My", "awesome", "folks"];

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_items_equal(complement, kExpectedA);

  complement = arrayComplement(kArrayB, kArrayA);
  assert_items_equal(complement, kExpectedB);
}

function test_array_complement_with_empty_arrays() {
  const kArrayA = [];
  const kArrayB = ['Stuff', 'to', 'remove'];

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_equals(0, complement.length,
                "Should have returned an empty array.");

  complement = arrayComplement(kArrayB, kArrayA);
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

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_items_equal(complement, kExpectedA);

  complement = arrayComplement(kArrayB, kArrayA);
  assert_items_equal(complement, kExpectedB);

  complement = arrayComplement([{empty: {}}], [{empty: {}}]);
  assert_items_equal(complement, []);
}

function test_array_union() {
  const kArrayA = ["This", "is", "some", "text"];
  const kArrayB = ["And", "here", "is", "some", "more"];
  const kExpected = ["This", "is", "some", "text", "And", "here",
                     "more"];

  let union = arrayUnion(kArrayA, kArrayB);

  assert_items_equal(union, kExpected);
}

function test_array_difference_same_length() {
  const kArrayA = ["This", "is", "some", "text"];
  const kArrayB = ["This", "is", "some", "more"];
  const kExpectedStrings = {
    added: ["more"],
    removed: ["text"],
  };

  let diff = arrayDifference(kArrayA, kArrayB);
  assert_true(_.isEqual(diff, kExpectedStrings));
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

  diff = arrayDifference(kArrayC, kArrayD);
  assert_items_equal(diff, kExpectedObjects);
}

function test_array_difference_different_lengths() {
  const kArrayA = ["This", "is", "more", "text"];
  const kArrayB = ["This", "is", "some", "more", "stuff", "to", "test"];

  const kExpectedFirst = {
    added: ["some", "more", "stuff", "to", "test"],
    removed: ["more", "text"]
  };

  let diff = arrayDifference(kArrayA, kArrayB);
  assert_items_equal(diff, kExpectedFirst);

  const kExpectedSecond = {
    added: ["more", "text"],
    removed: ["some", "more", "stuff", "to", "test"],
  };

  diff = arrayDifference(kArrayB, kArrayA);
  assert_items_equal(diff, kExpectedSecond);
}

function test_array_difference_one_empty() {
  const kArray = ["This", "stuff", "will", "be", "added"];
  const kExpectedFirst = {
    added: kArray,
    removed: [],
  };
  let diff = arrayDifference([], kArray);
  assert_items_equal(diff, kExpectedFirst);

  const kExpectedSecond = {
    added: [],
    removed: kArray,
  };

  diff = arrayDifference(kArray, []);
  assert_items_equal(diff, kExpectedSecond);
}

function test_array_difference_single_equal() {
  const kArray = ["Same!"];
  const kExpected = {
    added: [],
    removed: [],
  };

  let diff = arrayDifference(kArray, kArray);
  assert_items_equal(diff, kExpected);
}*/
