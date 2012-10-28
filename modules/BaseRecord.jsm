/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const EXPORTED_SYMBOLS = ["BaseRecord",
                          "BaseRecordConsts"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");

const kBasicFields = ['name', 'honorificPrefix', 'givenName',
                      'additionalName', 'familyName', 'honorificSuffix',
                      'nickname', 'photo', 'category', 'org',
                      'jobTitle', 'department', 'note'];

const kTypedArrayFields = ['tel', 'email', 'impp', 'url', 'other', 'adr'];
const kAddressField = 'adr';
const kDateFields = ['bday', 'anniversary'];

const kArrayFields = kBasicFields.concat(kTypedArrayFields);
kArrayFields.push(kAddressField);

const kStringFields = ['sex', 'genderIdentity'].concat(kDateFields);
const kAllFields = kArrayFields.concat(kStringFields);

const BaseRecordConsts = {
  TypedArrayFields: kTypedArrayFields
};

let TypedValue = Backbone.Model.extend({
  defaults: {
    type: [],
    value: "",
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

let TypedAddress = TypedValue.extend({
  defaults: {
    type: [],
    streetAddress: "",
    locality: "",
    region: "",
    postalCode: "",
    countryName: ""
  },
});

let TypedCollection = Backbone.Collection.extend({
  model: TypedValue,
  toJSON: function() {
    if (!this.models.length) {
      return [];
    }
    return [obj.toJSON() for each (obj in this.models)];
  }
});

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
      email: new TypedCollection(),
      photo: [],
      url: new TypedCollection(),
      category: [],
      adr: new TypedCollection(),
      tel: new TypedCollection(),
      impp: new TypedCollection(),
      org: [],
      other: new TypedCollection(),
      jobTitle: [],
      department: [],
      bday: null,
      note: [],
      anniversary: null,
      sex: null,
      genderIdentity: null,
    };
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

  _prepareField: function(aKey, aValue) {
    // Are we dealing with a typed array field?
    if (kTypedArrayFields.indexOf(aKey) != -1) {
      if (aValue instanceof TypedCollection)
        return aValue;
      // If we didn't get an array, wrap the item in an array.
      if (!Array.isArray(aValue))
        aValue = [aValue];
      // Go through each item, convert it to a TypedValue, and then dump them
      // into a TypedCollection. We special-case address fields, and return
      // a collection of TypedAddress's instead.
      return new TypedCollection(_.map(aValue, function(aTypedValue) {
        return (aKey == kAddressField) ? new TypedAddress(aTypedValue)
                                       : new TypedValue(aTypedValue);
      }));
    }

    // If we've gotten here, and we're still dealing with an "array field",
    // that means we're dealing with one of the string lists, like names.
    // If it's not already wrapped in array, go ahead and do that.
    if (kArrayFields.indexOf(aKey) != -1 && !Array.isArray(aValue)) {
      return aValue !== undefined ? [aValue] : [];
    }

    // Or if we have a Date, convert that to a JSON string representation
    // of a Date for the value.
    if (kDateFields.indexOf(aKey) != -1) {
      return (aValue !== null && aValue !== undefined)
             ? new Date(aValue).toJSON()
             : null;
    }

    // If all else fails, just use the original value.
    return aValue;
  },

  toJSON: function() {
    let obj = Backbone.Model.prototype.toJSON.call(this);

    for (let key of kArrayFields) {
      if (kTypedArrayFields.indexOf(key) != -1) {
        let item = this.get(key);
        if (item) {
          obj[key] = item.toJSON();
        }
      }

      if (obj[key] && obj[key].hasOwnProperty("changes"))
        delete obj[key].changes;
    }

    return obj;
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
    let otherRecord = aBaseRecord.toJSON();
    let selfRecord = this.toJSON();

    let added = {};
    let removed = {};
    let changed = {};

    for each (let fieldName in kArrayFields) {
      let result = _.arrayDifference(otherRecord[fieldName],
                                     selfRecord[fieldName]);
      if (result.added.length > 0)
        added[fieldName] = result.added;
      if (result.removed.length > 0)
        removed[fieldName] = result.removed;
    }

    for each (let fieldName in kStringFields) {
      if (selfRecord[fieldName] != otherRecord[fieldName])
        changed[fieldName] = selfRecord[fieldName];
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
      this.set(field, aDiff.changed[field]);
    }

    // Now what was removed?
    let recordObj = this.toJSON();
    for (let field in aDiff.removed) {
      if (recordObj[field]) {
        this.set(field, _.objDifference(recordObj[field],
                                        aDiff.removed[field]));
      }
    }

    // Update the record, since we may have just altered it.
    recordObj = this.toJSON();

    // Finally, what was added?
    for (let field in aDiff.added) {
      if (recordObj[field]) {
        this.set(field, _.objUnion(this.toJSON()[field],
                                   aDiff.added[field]));
      } else {
        this.set(field, aDiff.added[field]);
      }
    }
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
