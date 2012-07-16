let EXPORTED_SYMBOLS = ["itemsEqual", "arrayComplement", "arrayContains",
                        "arrayUnion"];

function itemsEqual(obj, reference) {
  if (obj === reference) return true;
  if (Array.isArray(obj)) {
    if (obj.length !== reference.length) return false;
    for (let i = 0, len = obj.length; i < len; i++){
      if (!arrayContains(reference, obj[i])) {
        return false;
      }
    }
  }
  else {
    let objListCounter = 0;
    let refListCounter = 0;
    for (let i in obj) {
      objListCounter++;
      if (typeof obj[i] == "object" && typeof reference[i] == "object") {
        if (!itemsEqual(obj[i], reference[i])) {
          return false;
        }
      }
      else if (obj[i] !== reference[i]) return false;
    }
    for (let i in reference) refListCounter++;
    if (objListCounter !== refListCounter) return false;
  }
  return true; //Every object and array is equal
}

/**
 * Returns aArray - aOther
 */
function arrayComplement(aArray, aOther) {
  // Let's take care of the simple cases first...
  if (!Array.isArray(aArray))
    throw new Error("arrayComplement passed non-array entity for aArray");

  if (!Array.isArray(aOther))
    throw new Error("arrayComplement passed non-array entity for aOther");

  if (aOther.length == 0)
    return aArray.slice(0);

  let result = [];

  for (let i = 0; i < aArray.length; ++i) {
    let arrayItem = aArray[i];
    if (typeof(arrayItem) === "string") {
      if (aOther.indexOf(arrayItem) == -1)
        result.push(arrayItem);
    } else {
      if (!arrayContains(aOther, arrayItem)) {
        result.push(arrayItem);
      }
    }
  }

  return result;
}

function arrayUnion(aArray, aOther) {
  let combined = aArray.concat(aOther);
  let result = [];
  for (let i = 0; i < combined.length; ++i)
    if (!arrayContains(result, combined[i]))
      result.push(combined[i]);
  return result;
}

function arrayContains(aArray, aItem) {
  return aArray.some(function(aOtherItem) {
    return itemsEqual(aOtherItem, aItem);
  });
}
