let EXPORTED_SYMBOLS = ["itemsEqual", "arrayComplement"];

function itemsEqual(obj, reference) {
  if (obj === reference) return true;
//  if (obj.constructor !== reference.constructor) return false;
  if (obj instanceof Array) {
    if (obj.length !== reference.length) return false;
    for (let i = 0, len = obj.length; i < len; i++){
      if (typeof obj[i] == "object" && typeof reference[j] == "object") {
        if (!itemsEqual(obj[i], reference[i])) return false;
      }
      else {
        if (obj[i] !== reference[i]) return false;
      }
    }
  }
  else {
    let objListCounter = 0;
    let refListCounter = 0;
    for (let i in obj) {
      objListCounter++;
      if (typeof obj[i] == "object" && typeof reference[i] == "object"){
        if (!itemsEqual(obj[i], reference[i])) return false;
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
      if (!(aOther.some(function(aOtherItem) {
        return itemsEqual(aOtherItem, arrayItem);
      }))) {
        result.push(arrayItem);
      }
    }
  }

  return result;
}
