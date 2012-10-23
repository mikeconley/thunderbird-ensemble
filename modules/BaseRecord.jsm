/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const EXPORTED_SYMBOLS = ["BaseRecord",
                          "BaseRecordsCommon"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");

const kBasicFields = ['name', 'honorificPrefix', 'givenName',
                      'additionalName', 'familyName', 'honorificSuffix',
                      'nickname', 'photo', 'category', 'org',
                      'jobTitle', 'department', 'note'];

const kTypedArrayFields = ['tel', 'email', 'impp', 'url', 'other'];
const kAddressFields = ['adr'];
const kDateFields = ['bday', 'anniversary'];

const kArrayFields = kBasicFields.concat(kTypedArrayFields)
                                 .concat(kAddressFields);

const kStringFields = ['sex', 'genderIdentity'].concat(kDateFields);
const kDefaultPrefix = "default";
const kTypedDefaultFields = ['defaultEmail', 'defaultImpp', 'defaultTel'];
const kTypedFields = kTypedArrayFields.concat(kTypedDefaultFields);
const kUntypedDefaultFields = ['defaultPhoto'];
const kDefaultFields = kTypedDefaultFields.concat(kUntypedDefaultFields);
const kIntFields = ['popularity'];
const kAllFields = kArrayFields.concat(kStringFields)
                               .concat(kIntFields)
                               .concat(kDefaultFields);

let TypedValue = Backbone.Model.extend({
  defaults: {
    type: [],
    value: "",
  },

  constructor: function(aAttributes) {
    if (!aAttributes || _.isString(aAttributes)) {
      aAttributes = {type: [], value: aAttributes};
    }

    return Backbone.Model.prototype.constructor.call(this, aAttributes);
  },

  set: function(aAttributes, aOptions) {
    let wrapped = {};

    if (_.isString(aAttributes)) {
      let key = aAttributes;
      let value = aOptions;
      aAttributes = {};
      aAttributes[key] = value;
    }

    if (_.has(aAttributes, "type") && !_.isArray(aAttributes.type))
      aAttributes.type = [aAttributes.type];

    return Backbone.Model.prototype.set.call(this, aAttributes, aOptions);
  },
});


let BaseRecordsCommon = {
  TypedDefaultFields: kTypedDefaultFields,
};

let BaseRecord = Backbone.Model.extend({

  defaults: function BaseRecord_defaults() {
    return {
      name: [],
      honorificPrefix: [],
      givenName: [],
      additionalName: [],
      familyName: [],
      honorificSuffix: [],
      nickname: [],
      email: [],
      photo: [],
      url: [],
      category: [],
      adr: [],
      tel: [],
      impp: [],
      org: [],
      other: [],
      jobTitle: [],
      department: [],
      bday: null,
      note: [],
      anniversary: null,
      sex: null,
      genderIdentity: null,
      popularity: 0,
      defaultEmail: null,
      defaultImpp: null,
      defaultTel: null,
      defaultPhoto: null,
    };
  },

  _prepareField: function(aKey, aValue) {
    if (kTypedArrayFields.indexOf(aKey) != -1) {
      if (Array.isArray(aValue))
        aValue = _.map(aValue, function(aTypedValue) {
          return new TypedValue(aTypedValue);
        });
      else
        aValue = new TypedValue(aValue);
    }
    if (kAddressFields.indexOf(aKey) != -1) {
      if (Array.isArray(aValue)) {
        aValue = _.map(aValue, function(aTypedAddress) {
          aTypedAddress.type = new TypedValue(aTypedAddress.type);
          return aTypedAddress;
        });
      }
      else {
        aValue.type = new TypedValue(aValue.type);
      }
    }

    if (kArrayFields.indexOf(aKey) != -1 && !Array.isArray(aValue)) {
      return [aValue];
    }
    else if (kDateFields.indexOf(aKey) != -1) {
      return (aValue !== null && aValue !== undefined)
             ? new Date(aValue).toJSON()
             : null;
    }
    return aValue;
  },

  set: function(aAttributes, aOptions) {
    let wrapped = {};

    if (_.isString(aAttributes)) {
      let key = aAttributes;
      let value = aOptions;
      aAttributes = {};
      aAttributes[key] = value;
    }

    for (let key in aAttributes)
      wrapped[key] = this._prepareField(key, aAttributes[key]);

    return Backbone.Model.prototype.set.call(this, wrapped, aOptions);
  },

  /**
   * Construct and return a diff between this BaseRecord and aBaseRecord.
   * The resulting diff, if applied to aBaseRecord, will result in this
   * BaseRecord.
   *
   * See the header for applyDiff for a description of the generated
   * diff.
   *
   * @param aBaseRecord the other BaseRecord to diff against.
   */
  diff: function BaseRecord_diff(aBaseRecord) {
    let added = {};
    let removed = {};
    let changed = {};

    for each (let fieldName in kArrayFields) {
      let result = _.arrayDifference(aBaseRecord.get(fieldName),
                                     this.get(fieldName));
      if (result.added.length > 0)
        added[fieldName] = result.added;
      if (result.removed.length > 0)
        removed[fieldName] = result.removed;
    }

    for each (let fieldName in kStringFields) {
      if (this.get(fieldName) != aBaseRecord.get(fieldName))
        changed[fieldName] = this.get(fieldName);
    }

    for each (let fieldName in kIntFields) {
      if (this.get(fieldName) != aBaseRecord.get(fieldName))
        changed[fieldName] = this.get(fieldName);
    }

    for each (let defaultField in kDefaultFields) {
      if (!_.safeIsEqual(this.get(defaultField), aBaseRecord.get(defaultField)))
        changed[defaultField] = this.get(defaultField);
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  },

  /**
   * Apply a diff to this BaseRecord.
   *
   * A diff is an object with 'added', 'removed', and 'changed'
   * properties that list the difference.
   *
   * Example (copied from the test suite):
   *
   * {
   *   added: {
   *     name: ['House'],
   *     givenName: ['Gregory'],
   *     additionalName: ['Berton'],
   *     familyName: ['House'],
   *     honorificSuffix: ['Junior'],
   *     nickname: ['Hugh'],
   *     email: [{
   *       type: 'Work',
   *       address: 'house@example.com',
   *     }],
   *     url: ['https://www.example.com'],
   *     adr: [{
   *       type: 'Work',
   *       streetAddress: '123 Fake St.',
   *       locality: 'Toronto',
   *        region: 'Ontario',
   *       postalCode: 'L5T2R1',
   *       countryName: 'Canada',
   *     }],
   *     tel: [{
   *       type: 'Work',
   *        number: '5553125123'
   *     }, {
   *       type: 'Cell',
   *       number: '5124241521'
   *     }],
   *     org: ['Princeton-Plainsboro Teaching Hospital'],
   *     jobTitle: ['Diagnostician'],
   *     note: ['Sharp as a tack',
   *            'Not exactly the king of bedside manor.'],
   *   },
   *   removed: {
   *     name: ['Wilson'],
   *     givenName: ['James'],
   *     additionalName: ['Coleman'],
   *     familyName: ['Wilson'],
   *     nickname: ['Robert'],
   *     email: [{
   *       type: 'Work',
   *       address: 'wilson@example.com',
   *     }, {
   *       type: 'Copy',
   *       address: 'house@example.com',
   *     }],
   *     photo: ['somedata'],
   *   },
   *   changed: {
   *     bday: '2012-07-13T20:44:16.028Z',
   *     sex: 'Male',
   *     genderIdentity: 'Male',
   *     popularity: 5,
   *     defaultEmail: {
   *       type: 'Work',
   *       address: 'house@example.com',
   *     }
   *   }
   * }
   *
   * @param aDiff the diff to apply to this BaseRecord.
   */
  applyDiff: function BaseRecord_applyDiff(aDiff, aOptions) {
    if (typeof(aDiff) !== 'object')
      throw new Error("Expected a diff object");
    if (!(aDiff.hasOwnProperty('added')))
      throw new Error("The diff being applied is missing 'added'");
    if (!(aDiff.hasOwnProperty('removed')))
      throw new Error("The diff being applied is missing 'removed'");
    if (!(aDiff.hasOwnProperty('changed')))
      throw new Error("The diff being applied is missing 'changed'");

    // The changed fields are easy, so let's take care of those first.
    for (let field in aDiff.changed) {
      this.set(field, _.clone(aDiff.changed[field]), aOptions);
    }

    // Now what was removed?
    for (let field in aDiff.removed)
      this.set(field, _.objDifference(this.get(field),
                                      aDiff.removed[field]), aOptions);

    // Finally, what was added?
    for (let field in aDiff.added)
      this.set(field, _.objUnion(this.get(field),
                                 aDiff.added[field]), aOptions);
  },

  /**
   * Merge the fields from aBaseRecord into this BaseRecord. aBaseRecord can
   * potentially overwrite fields in this BaseRecord.
   *
   * This function computes the difference between aBaseRecord and this
   * BaseRecord, clears the "removed" portion of the diff, and then
   * applies the diff to this BaseRecord.
   *
   * This way, we get all of the added data from aBaseRecord, but no items
   * are lost from collections (like phone numbers, email addresses, etc).
   * Singleton fields like sex, genderIdentity, bday, or anniversary will
   * be overwritten if those fields has values in aBaseRecord.
   *
   * @param aBaseRecord the BaseRecord to merge in.
   */
  merge: function BaseRecord_merge(aBaseRecord) {
    // Calculate the diff between aBaseRecord and this BaseRecord.
    let diff = aBaseRecord.diff(this);

    // Clear the removals.
    diff.removed = {};

    // Remove any of the changes that result in nulls
    let changedFields = diff.changed;
    for (let changedField in changedFields) {
      if (changedFields[changedField] === null)
        delete diff.changed[changedField];
    }

    this.applyDiff(diff);
  },

});
