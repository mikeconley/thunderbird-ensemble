let EXPORTED_SYMBOLS = ["itemsEqual"];

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
