/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/storage/ContactDBA.jsm");

const kBasicFields = ['name', 'honorificPrefix', 'givenName',
                      'additionalName', 'familyName', 'honorificSuffix',
                      'nickname', 'photo', 'category', 'org',
                      'jobTitle', 'department', 'note'];

const kTypedFields = ['tel', 'email', 'impp', 'url', 'other'];
const kAddressFields = ['adr'];
const kDateFields = ['bday', 'anniversary'];

const kArrayFields = kBasicFields.concat(kTypedFields)
                                 .concat(kAddressFields);

const kStringFields = ['sex', 'genderIdentity'].concat(kDateFields);
const kHasDefaults = ['email', 'impp', 'tel'];

let Contact = Backbone.Model.extend({

  dba: ContactDBA,

  defaults: function Contact_defaults() {
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
      defaults: {
        email: {},
        impp: {},
        tel: {},
      }
    };
  },

  _prepareField: function(aKey, aValue) {
    if (kArrayFields.indexOf(aKey) != -1 && !Array.isArray(aValue))
      return [aValue];
    else if (kDateFields.indexOf(aKey) != -1) {
      return (aValue !== null && aValue !== undefined)
             ? new Date(aValue).toJSON()
             : null;
    }
    else
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
   * Construct and return a diff between this Contact and aContact.
   * The resulting diff, if applied to aContact, will result in this
   * Contact.
   *
   * See the header for applyDiff for a description of the generated
   * diff.
   *
   * @param aContact the other Contact to diff against.
   */
  diff: function Contact_diff(aContact) {
    let added = {};
    let removed = {};
    let changed = {
      defaults: {},
      fields: {},
    };

    for each (let fieldName in kArrayFields) {
      let result = _.arrayDifference(aContact.get(fieldName),
                                     this.get(fieldName));
      if (result.added.length > 0)
        added[fieldName] = result.added;
      if (result.removed.length > 0)
        removed[fieldName] = result.removed;
    }

    for each (let fieldName in kStringFields) {
      if (this.get(fieldName) != aContact.get(fieldName))
        changed.fields[fieldName] = this.get(fieldName);
    }

    for each (let defaultField in kHasDefaults) {
      if (!_.safeIsEqual(this.get('defaults')[defaultField],
                         aContact.get('defaults')[defaultField]))
        changed.defaults[defaultField] = this.get('defaults')[defaultField];
      else
        changed.defaults[defaultField] = {};
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  },

  /**
   * Apply a diff to this Contact.
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
   *     fields: {
   *       bday: '2012-07-13T20:44:16.028Z',
   *       sex: 'Male',
   *       genderIdentity: 'Male',
   *     }
   *     defaults: {
   *       email: {
   *         type: 'Work',
   *         address: 'house@example.com',
   *       },
   *       impp: {},
   *       tel: {},
   *     }
   *   }
   * }
   *
   * @param aDiff the diff to apply to this Contact.
   */
  applyDiff: function Contact_applyDiff(aDiff) {
    if (typeof(aDiff) !== 'object')
      throw new Error("Expected a diff object");
    if (!(aDiff.hasOwnProperty('added')))
      throw new Error("The diff being applied is missing 'added'");
    if (!(aDiff.hasOwnProperty('removed')))
      throw new Error("The diff being applied is missing 'removed'");
    if (!(aDiff.hasOwnProperty('changed')))
      throw new Error("The diff being applied is missing 'changed'");
    if (!(aDiff.changed.hasOwnProperty('fields')))
      throw new Error("The diff being applied is missing 'changed.fields'");
    if (!(aDiff.changed.hasOwnProperty('defaults')))
      throw new Error("The diff being applied is missing 'changed.defaults");
    // The changed fields are easy, so let's take care of those first.
    for (let field in aDiff.changed.fields) {
      this.set(field, aDiff.changed.fields[field]);
    }

    for (let field in aDiff.changed.defaults) {
      this.get('defaults')[field] = aDiff.changed.defaults[field];
    }

    // Now what was removed?
    for (let field in aDiff.removed)
      this.set(field, _.objDifference(this.get(field),
                                      aDiff.removed[field]));

    // Finally, what was added?
    for (let field in aDiff.added)
      this.set(field, _.objUnion(this.get(field),
                                 aDiff.added[field]));
  },

  /**
   * Merge the fields from aContact into this Contact. aContact can
   * potentially overwrite fields in this Contact.
   *
   * This function computes the difference between aContact and this
   * Contact, clears the "removed" portion of the diff, and then
   * applies the diff to this Contact.
   *
   * This way, we get all of the added data from aContact, but no items
   * are lost from collections (like phone numbers, email addresses, etc).
   * Singleton fields like sex, genderIdentity, bday, or anniversary will
   * be overwritten if those fields has values in aContact.
   *
   * @param aContact the Contact to merge in.
   */
  merge: function Contact_merge(aContact) {
    // Calculate the diff between aContact and this Contact.
    let diff = aContact.diff(this);

    // Clear the removals.
    diff.removed = {};

    // Remove any of the changes that result in nulls
    let changedFields = diff.changed.fields;
    for (let changedField in changedFields) {
      if (changedFields[changedField] === null)
        delete diff.changed.fields[changedField];
    }

    this.applyDiff(diff);
  },

  /**
   * Determine if this Contact is equivalent to another Contact.
   *
   * @param aContact the other Contact to check equivalency with.
   */
  equals: function Contact_equals(aContact) {
  },
});
