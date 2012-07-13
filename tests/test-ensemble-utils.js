let Cu = Components.utils;

const MODULE_NAME = 'test-ensemble-utils';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import('resource://ensemble/EnsembleUtils.jsm');

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
}

function test_items_equal_strings() {
  assert_true(itemsEqual(["this", "is", "a", "test"],
                         ["this", "is", "a", "test"]));

  assert_true(itemsEqual(["This", "is", "A", "test"],
                         ["This", "is", "A", "test"]));


  assert_false(itemsEqual(["This", "is", "a", "test"],
                          ["this", "is", "a", "test"]));
  assert_false(itemsEqual(["this", "a", "is", "test"],
                          ["this", "is", "a", "test"]));
  assert_false(itemsEqual(["this", "is"],
                          ["this"]));
}

function test_items_equal_objects() {

  assert_true(itemsEqual({
    single: 'member'
  }, {
    single: 'member'
  }));

  assert_true(itemsEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    object: 'instance'
  }));

  assert_true(itemsEqual({
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }, {
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }));

  assert_true(itemsEqual([{
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

  assert_false(itemsEqual({
    single: 'member'
  }, {
    changed: 'member'
  }));

  assert_false(itemsEqual({
    single: 'member'
  }, {
    single: 'changed'
  }));

  assert_false(itemsEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    object: 'changed'
  }));

  assert_false(itemsEqual({
    multiple: 'member',
    object: 'instance'
  }, {
    multiple: 'member',
    changed: 'instance'
  }));

  assert_false(itemsEqual({
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 13 2012 12:53:17 GMT-0400 (EDT)").toJSON()
  }, {
    multiple: 'member',
    object: 'instance',
    somedate: new Date("Fri Jul 10 2012 12:53:18 GMT-0400 (EDT)").toJSON()
  }));

  assert_false(itemsEqual([{
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

// The following tests make use of itemsEqual, and assume that it's working
// properly to check the equivalence of various things.

function test_array_complement_with_strings() {
  const kArrayA = ["This", "is", "my", "test", "array"];
  const kArrayB = ["My", "array", "is", "awesome", "folks"];
  const kExpectedA = ["This", "my", "test"];
  const kExpectedB = ["My", "awesome", "folks"];

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_true(itemsEqual(complement, kExpectedA));

  complement = arrayComplement(kArrayB, kArrayA);
  assert_true(itemsEqual(complement, kExpectedB));
}

function test_array_complement_with_empty_arrays() {
  const kArrayA = [];
  const kArrayB = ['Stuff', 'to', 'remove'];

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_equals(0, complement.length,
                "Should have returned an empty array.");

  complement = arrayComplement(kArrayB, kArrayA);
  assert_true(itemsEqual(complement, kArrayB));
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
  assert_true(itemsEqual(complement, kExpectedA));

  complement = arrayComplement(kArrayB, kArrayA);
  assert_true(itemsEqual(complement, kExpectedB));

  complement = arrayComplement([{empty: {}}], [{empty: {}}]);
  assert_true(itemsEqual(complement, []));
}

