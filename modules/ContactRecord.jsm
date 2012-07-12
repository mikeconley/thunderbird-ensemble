const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["ContactRecord"];

Cu.import('resource://ensemble/EnsembleUtils.jsm');

function ContactRecord(aServiceID, aFields, aMeta) {
  if (!aServiceID)
    throw new Error("Expected a service ID when constructing ContactRecord");

  this.fields = {};

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

  const kBasicFields = ['name', 'honorificPrefix', 'givenName',
                        'additionalName', 'familyName', 'honorificSuffix',
                        'nickname', 'photo', 'url', 'category', 'org',
                        'jobTitle', 'note'];

  for each (let [, field] in Iterator(kBasicFields))
    this.fields[field] = _createBasic(aFields[field]);

  function _createDate(aField) {
    return (aField === undefined || aField === null) ? null : new Date(aField);
  }

  const kDateFields = ['bday', 'anniversary'];

  for each (let [, field] in Iterator(kDateFields))
    this.fields[field] = _createDate(aFields[field]);

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

  this.fields.name = ["House"];

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
    return {};
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
