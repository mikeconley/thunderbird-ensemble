/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["ContactRecord"];

Cu.import('resource://ensemble/EnsembleUtils.jsm');

// These are the fields that accept either a string, or an array of strings.
const kBasicFields = ['name', 'honorificPrefix', 'givenName',
                      'additionalName', 'familyName', 'honorificSuffix',
                      'nickname', 'photo', 'url', 'category', 'org',
                      'jobTitle', 'note'];

const kTypedFields = ['tel', 'email', 'impp'];
const kAddressFields = ['adr'];
const kDateFields = ['bday', 'anniversary'];

const kArrayFields = kBasicFields.concat(kTypedFields)
                                 .concat(kAddressFields);

const kStringFields = ['sex', 'genderIdentity'].concat(kDateFields);

function ContactRecord(aServiceID, aFields, aMeta) {
  if (!aServiceID)
    throw new Error("Expected a service ID when constructing ContactRecord");

  this.fields = {};

  /**
   * Helper function that allows us to accept both a string, or an array
   * of strings for a particular field. Returns an array of strings, or an
   * empty array.
   *
   * @param the field to convert into an array of strings.
   * @returns an array of strings, or an empty array.
   */
  function _createBasic(aField) {
    if (!aField)
      return [];

    if (Array.isArray(aField)) {
      for (let i = 0; i < aField.length; i++) {
        if (typeof aField[i] !== "string")
          aField[i] = String(aField[i]);
      }
      return aField;
    } else if (aField != null) {
      return [String(aField)];
    }
  };

  for each (let [, field] in Iterator(kBasicFields))
    this.fields[field] = _createBasic(aFields[field]);

  /**
   * Helper function that returns either a Date representing aField, or null
   * if aField cannot be turned into a Date.
   *
   * @param aField the field to try turning into a Date.
   * @returns a Date, or null.
   */
  function _createDate(aField) {
    return (aField === undefined || aField === null) ? null : new Date(aField).toJSON();
  }

  for each (let [, field] in Iterator(kDateFields))
    this.fields[field] = _createDate(aFields[field]);

  /**
   * Helper function that operates for fields that should be arrays of objects
   * that have a 'type' value, and an aTypeValue property representing the
   * value.
   *
   * For example, the tel field is an array of objects that could look like
   * this:
   *   {
   *     type: 'Home',
   *     number: '555-123-1511'
   *   }
   *
   * In this case, aTypeValue is 'number'.
   *
   * This function is rather flexible - it accepts either an array of objects,
   * an array of strings, or just a string.
   *
   * In the case of an array of objects, the function hopes that the object
   * has type and aTypeValue properties. If so, we simply return those objects
   * cloned into an array.
   *
   * In the case of a string X, it returns a single element array of objects
   * where the type property is blank and the aTypeValue is set to X.
   *
   * In the case of an array of strings, we simply follow the same rules as
   * the lone-string case, but with the whole array of strings. We then return
   * a full array of objects representing that array of strings.
   *
   * @param aTyped the string, object, or array of strings / objects to process.
   * @param aTypedValue the name of the type value for the resulting object.
   * @returns an array of objects with 'type' and aTypeValue properties.
   */
  function _createTyped(aTyped, aTypeValue) {
    if (!aTyped)
      return [];

    if (!Array.isArray(aTyped))
      aTyped = [aTyped];

    let result = [];

    for each (let [, typedValue] in Iterator(aTyped)) {
      let item = {'type': ''};

      if (typeof(typedValue) == 'object'
          && 'type' in typedValue && aTypeValue in typedValue) {
        item[aTypeValue] = String(typedValue[aTypeValue]);
        item['type'] = String(typedValue['type']);
      }
      else if (typeof typedValue === "string") {
        item[aTypeValue] = typedValue;
      }
      else {
        item[aTypeValue] = String(typedValue);
      }
      result.push(item);
    }

    return result;
  }

  this.fields['tel'] = _createTyped(aFields.tel, 'number');
  this.fields['email'] = _createTyped(aFields.email, 'address');
  this.fields['impp'] = _createTyped(aFields.impp, 'handle');

  /**
   * Helper function that accepts either a string, an array of strings, or
   * an object that contains any of the following properties: 'type',
   * 'streetAddress', 'locality', 'region', 'postalCode', 'countryName'.
   *
   * In the case of a single string, or an array of strings, the function
   * returns an array of one or more objects with most of the above properties
   * set to null, but the streetAddress will be set to the passed in string(s).
   *
   * In the case of an array of objects, if those objects contain any of the
   * properties listed above, those values are cloned. If the object does not
   * contain a particular property, it'll be set to null.
   *
   * @param aAddresses a string, an array of strings, an object, or an array of
   *                   objects to convert into our internal notion of addresses.
   * @returns an array of address objects
   */
  function _createAddresses(aAddresses) {
    if (!aAddresses)
      return [];

    if (!Array.isArray(aAddresses))
      aAddresses = [aAddresses];

    let result = [];

    const kAdrFields = ['type', 'streetAddress', 'locality', 'region',
                        'postalCode', 'countryName'];

    for each (let [, address] in Iterator(aAddresses)) {
      if (typeof aAddresses === "string")
        address = {streetAddress: address};

      let item = {};
      for each (let [, adrField] in Iterator(kAdrFields))
        item[adrField] = (adrField in address) ? address[adrField] : null;

      result.push(item);
    }

    return result;
  }

  this.fields['adr'] = _createAddresses(aFields.adr);

  this.fields['sex'] = (aFields.sex !== undefined) ? aFields.sex : null;
  this.fields['genderIdentity'] = (aFields.genderIdentity !== undefined)
                                  ? aFields.genderIdentity : null;

  this._serviceID = aServiceID;
  this.meta = aMeta || {};
};

ContactRecord.prototype = {
  fields: {},
  meta: {},
  masks: [],

  /**
   * Return the Service ID associated with this ContactRecord.
   */
  get serviceID() {
    return this._serviceID;
  },

  /**
   * Construct and return a diff between this ContactRecord, and aRecord.
   * The resulting diff, if applied to aRecord, will result in this
   * ContactRecord.
   *
   * @param aRecord the other ContactRecord to diff against.
   */
  diff: function ContactRecord_diff(aRecord) {

    let added = {};
    let removed = {};
    let changed = {};

    for each (let [, fieldName] in Iterator(kArrayFields)) {
      let addedComp = arrayComplement(this.fields[fieldName],
                                      aRecord.fields[fieldName]);

      let removedComp = arrayComplement(aRecord.fields[fieldName],
                                        this.fields[fieldName]);

      if (addedComp.length)
        added[fieldName] = addedComp;
      if (removedComp.length)
        removed[fieldName] = removedComp;
    }

    for each (let [, fieldName] in Iterator(kStringFields)) {
      if (this.fields[fieldName] != aRecord.fields[fieldName])
        changed[fieldName] = this.fields[fieldName];
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  },

  /**
   * Apply a diff to this ContactRecord.
   *
   * @param aDiff the diff to apply to this ContactRecord.
   */
  applyDiff: function ContactRecord_applyDiff(aDiff) {
  },

  /**
   * Merge the fields from aRecord into this ContactRecord. aRecord can
   * potentially overwrite fields in this ContactRecord.
   *
   * @param aRecord the ContactRecord to merge in.
   */
  merge: function ContactRecord_merge(aRecord) {
  },

  /**
   * Determine if this ContactRecord is equivalent to another ContactRecord.
   *
   * @param aRecord the other ContactRecord to check equivalency with.
   */
  equals: function ContactRecord_equals(aRecord) {
    if (aRecord === this)
      return true;

    return (itemsEqual(this.fields, aRecord.fields)
            && itemsEqual(this.meta, aRecord.meta));
  },
};
