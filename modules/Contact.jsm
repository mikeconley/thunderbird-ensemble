/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact"];

Cu.import("resource://ensemble/Backbone.jsm");

let Contact = Backbone.Model.extend({
  defaults: {
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
  },

  initialize: function() {
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
      let result = _.arrayDifference(aRecord.fields[fieldName],
                                   this.fields[fieldName]);
      if (result.added.length > 0)
        added[fieldName] = result.added;
      if (result.removed.length > 0)
        removed[fieldName] = result.removed;
    }

    for each (let fieldName in kStringFields) {
      if (this.fields[fieldName] != aRecord.fields[fieldName])
        changed.fields[fieldName] = this.fields[fieldName];
    }

    for each (let defaultField in kHasDefaults) {
      if (!_.isEqual(this.fields.defaults[defaultField],
                     aRecord.fields.defaults[defaultField]))
        changed.defaults[defaultField] = this.fields.defaults[defaultField];
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
    for (let field in aDiff.changed.fields)
      this.fields[field] = aDiff.changed.fields[field];

    for (let field in aDiff.changed.defaults) {
      this.fields.defaults[field] = aDiff.changed.defaults[field];
    }

    // Now what was removed?
    for (let field in aDiff.removed)
      this.fields[field] = _.objDifference(this.fields[field],
                                           aDiff.removed[field]);

    // Finally, what was added?
    for (let field in aDiff.added)
      this.fields[field] = _.objUnion(this.fields[field],
                                      aDiff.added[field]);
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
    // Calculate the diff between aRecord and this ContactRecord.
    let diff = aRecord.diff(this);

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
