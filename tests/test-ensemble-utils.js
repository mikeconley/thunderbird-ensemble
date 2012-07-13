let Cu = Components.utils;

const MODULE_NAME = 'test-ensemble-utils';
const RELATIVE_ROOT = '../shared-modules';
const MODULE_REQUIRES = ['folder-display-helpers'];

Cu.import('resource://ensemble/EnsembleUtils.jsm');

function setupModule(module) {
  collector.getModule('folder-display-helpers').installInto(module);
}

function assert_string_arrays_equal(aArray, aOtherArray, aMsg) {
  if (!aMsg)
    aMsg = aArray + " != " + aOtherArray;

  if (aArray.length != aOtherArray.length)
    throw new Error(aMsg);

  let equal = aArray.every(function(aItem) {
    return aOtherArray.indexOf(aItem) != -1;
  });

  if (!equal)
    throw new Error(aMsg);
}

function test_array_complement_with_strings() {
  const kArrayA = ["This", "is", "my", "test", "array"];
  const kArrayB = ["My", "array", "is", "awesome", "folks"];
  const kExpectedA = ["This", "my", "test"];
  const kExpectedB = ["My", "awesome", "folks"];

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_string_arrays_equal(complement, kExpectedA);

  complement = arrayComplement(kArrayB, kArrayA);
  assert_string_arrays_equal(complement, kExpectedB);
}

function test_array_complement_with_empty_arrays() {
  const kArrayA = [];
  const kArrayB = ['Stuff', 'to', 'remove'];

  let complement = arrayComplement(kArrayA, kArrayB);
  assert_equals(0, complement.length,
                "Should have returned an empty array.");

  complement = arrayComplement(kArrayB, kArrayA);
  assert_string_arrays_equal(complement, kArrayB);
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

}

function test_array_complement_mixed() {
}
