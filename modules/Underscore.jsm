let EXPORTED_SYMBOLS = ["_"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

let loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
               .getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript("resource://ensemble/lib/underscore-1.3.3.js");

// Mixin functions

/**
 * This is my minor fork of an internal function found within Underscore.js.
 * It's the equivalence sub-function used by isEqual. I've modified it to
 * ignore constructors, since comparing them across compartments doesn't
 * work. In other words, a Date in one compartment has a different 
 * constructor than a Date in another compartment.
 *
 * TODO - am I allowed to fork this function, and slap the MPL on top?
 */
function eq(a, b, stack) {
  // Identical objects are equal. `0 === -0`, but they aren't identical.
  // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
  if (a === b) return a !== 0 || 1 / a == 1 / b;
  // A strict comparison is necessary because `null == undefined`.
  if (a == null || b == null) return a === b;
  // Unwrap any wrapped objects.
  if (a._chain) a = a._wrapped;
  if (b._chain) b = b._wrapped;
  // Invoke a custom `safeIsEqual` method if one is provided.
  if (a.safeIsEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
  if (b.safeIsEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
  // Compare `[[Class]]` names.
  var className = toString.call(a);
  if (className != toString.call(b)) return false;
  switch (className) {
    // Strings, numbers, dates, and booleans are compared by value.
    case '[object String]':
      // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
      // equivalent to `new String("5")`.
      return a == String(b);
    case '[object Number]':
      // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
      // other numeric values.
      return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
    case '[object Date]':
    case '[object Boolean]':
      // Coerce dates and booleans to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      return +a == +b;
    // RegExps are compared by their source patterns and flags.
    case '[object RegExp]':
      return a.source == b.source &&
             a.global == b.global &&
             a.multiline == b.multiline &&
             a.ignoreCase == b.ignoreCase;
  }
  if (typeof a != 'object' || typeof b != 'object') return false;
  // Assume equality for cyclic structures. The algorithm for detecting cyclic
  // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
  var length = stack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    if (stack[length] == a) return true;
  }
  // Add the first object to the stack of traversed objects.
  stack.push(a);
  var size = 0, result = true;
  // Recursively compare objects and arrays.
  if (className == '[object Array]') {
    // Compare array lengths to determine if a deep comparison is necessary.
    size = a.length;
    result = size == b.length;
    if (result) {
      // Deep compare the contents, ignoring non-numeric properties.
      while (size--) {
        // Ensure commutative equality for sparse arrays.
        if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
      }
    }
  } else {
    // Here, Underscore normally checks that constructors are equivalent,
    // but that doesn't work across compartments, so I'm commenting it out.
    // Objects with different constructors are not equivalent.
    //if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
    // Deep compare objects.
    for (var key in a) {
      if (_.has(a, key)) {
        // Count the expected number of properties.
        size++;
        // Deep compare each member.
        if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
      }
    }
    // Ensure that both objects contain the same number of properties.
    if (result) {
      for (key in b) {
        if (_.has(b, key) && !(size--)) break;
      }
      result = !size;
    }
  }
  // Remove the first object from the stack of traversed objects.
  stack.pop();
  return result;
}

_.mixin({

  /**
   * Checks Object equivalence - safe across different compartments since
   * it doesn't compare constructors (which, admittedly, weakens the
   * equivalence check, but what else am I going to do?).
   */
  safeIsEqual: function safeIsEqual(aItemA, aItemB) {
    return eq(aItemA, aItemB, []);
  },

  /**
   * Diff an Array of Objects with another array of Objects.
   *
   * @param aArray the Array to create the diff against.
   * @param args n number of Arrays that contain things that the resulting
   *             Array should not contain.
   * @return the items from aArray that are not in any of the Arrays in
   *         aArgs.
   */
  objDifference: function objDifference(aArray, ...aArgs) {
    var rest = _.flatten(aArgs, true);
    return _.filter(aArray, function(aValue) {
      return !_.objInclude(rest, aValue);
    });
  },

  /**
   * Return the union over N Arrays of Objects.
   *
   * @param aArgs n number of Object Arrays to union.
   * @return the unioned Array.
   */
  objUnion: function objUnion(...aArgs) {
    return _.objUnique(_.flatten(aArgs, true));
  },

  /**
   * Returns the unique elements of an Array, using safeIsEqual for
   * comparisons.
   *
   * @param aArray the Array to return the unique elements of.
   * @param aIsSorted if the collection is already sorted, for optimization.
   * @param aIterator an optional iterator to pass each Array value
   *                  through.
   */
  objUnique: function objUnique(aArray, aIsSorted, aIterator) {
    var initial = aIterator ? _.map(aArray, aIterator) : aArray;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two
    // elements.
    if (aArray.length < 3) isSorted = true;

    _.reduce(initial, function (memo, value, index) {
      if (aIsSorted ? _.last(memo) !== value || !memo.length
                    : !_.objInclude(memo, value)) {
        memo.push(value);
        results.push(aArray[index]);
      }
      return memo;
    }, []);

    return results;
  },

  /**
   * Returns true if aCollection contains an object equivalent to
   * aTarget.
   *
   * @param aCollection the collection to search
   * @param aTarget the Object to search for
   * @return true if aCollection contains something equivalent to aTarget.
   *         false otherwise.
   */
  objInclude: function objInclude(aCollection, aTarget) {
    if (aCollection == null) return false;
    return _.any(aCollection, function(aValue) {
      return _.safeIsEqual(aValue, aTarget);
    });
  },

  /**
   * Returns an object containing two array properties - "added" and "removed".
   * If you remove the items in "removed" from aArray, and add "added", you
   * should get aOther.
   *
   * @param aArray the array to that the diff would theoretically be applied to
   * @param aOther the other array to produce the diff against.
   * @returns an object with two array properties, "added" and "removed".
   */
  arrayDifference: function arrayDifference(aArray, aOther) {
    // We'll iterate over the smaller of the two arrays we were passed.
    let aArray = aArray.concat();
    let aOther = aOther.concat();

    // Let's get rid of two simple cases - aArray is empty and / or
    // aOther is empty.
    if (aArray.length == 0) {
      // In the event that both aArray and aOther is empty, this will be
      // executed, and will do the right thing - return an empty array
      // for added and removed.
      return {added: aOther, removed: []};
    }
    else if (aOther.length == 0) {
      return {added: [], removed: aArray};
    }

    // Ok, so now we can assume that both arrays have at least one element
    // each.
    let diffPoint = -1;
    let addedItems = [];
    let removedItems = [];

    for (let i = 0; i < aArray.length && i < aOther.length; ++i) {
      if (!_.safeIsEqual(aArray[i], aOther[i])) {
        diffPoint = i;
        break;
      }
    }

    if (diffPoint != -1) {
      removedItems = aArray.splice(diffPoint, aArray.length - diffPoint);
      addedItems = aOther.splice(diffPoint, aOther.length - diffPoint);
    } else {
      // We matched all the way to the end of either aArray or aOther.
      if (aArray.length < aOther.length) {
        addedItems = aOther.splice(aArray.length - 1,
                                   aOther.length - (aArray.length - 1));
      } else if (aArray.length > aOther.length) {
        removedItems = aArray.splice(aOther.length - 1,
                                     aArray.length - (aOther.length - 1));
      }
      // If equal, then we return empty arrays for added and removed, which
      // is the right thing to do.
    }

    return {added: addedItems, removed: removedItems};
  },

  /**
   * Returns a string with the first letter capitalized.
   *
   * @param aString the string to capitalize.
   * @returns the capitalized string.
   */
  capitalize: function capitalize(aString) {
    return aString.charAt(0).toUpperCase() + aString.slice(1);
  },
});
