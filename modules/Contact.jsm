/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Contact", "ContactsCommon", "ContactsSearchFields"];

Cu.import("resource://ensemble/Underscore.jsm");
Cu.import("resource://ensemble/Backbone.jsm");
Cu.import("resource://ensemble/storage/ContactDBA.jsm");

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

const ContactsCommon = {
  BasicFields: kBasicFields,
  TypedFields: kTypedFields,
  AddressFields: kAddressFields,
  DateFields: kDateFields,
  ArrayFields: kArrayFields,
  StringFields: kStringFields,
  IntFields: kIntFields,
  DefaultFields: kDefaultFields,
  TypedDefaultFields: kTypedDefaultFields,
  UntypedDefaultFields: kUntypedDefaultFields,
  AllFields: kAllFields,
};

const ContactsSearchFields = {
  name: "name",
  honorificPrefix: "honorificPrefix",
  givenName: "givenName",
  additionalName: "additionalName",
  familyName: "familyName",
  honorificSuffix: "honorificSuffix",
  nickname: "nickname",
  email: "email",
  tel: "tel",
  impp: "impp",
  url: "url",
  org: "org",
  jobTitle: "jobTitle",
  department: "department",
  note: "note",
  other: "other",
  defaultEmail: "defaultEmail",
  defaultImpp: "defaultImpp",
  defaultTel: "defaultTel",
//  adr: "adr",
//  bday: "bday",
//  anniversary: "anniversary",
//  sex: "sex",
//  genderIdentity: "genderIdentity",
};

let TypedDefault = Backbone.Model.extend({
  defaults: {
    type: "",
    value: "",
  }
});

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
      popularity: 0,
      defaultEmail: null,
      defaultImpp: null,
      defaultTel: null,
      defaultPhoto: null,
    };
  },

  initialize: function() {
    this.__defineGetter__("displayNameFamilyGiven", function() {
      return this._nameGetterHelper(true);
    });

    this.__defineGetter__("displayNameGivenFamily", function() {
      return this._nameGetterHelper(false);
    });
  },

  _prepareField: function(aKey, aValue) {
    if (kArrayFields.indexOf(aKey) != -1 && !Array.isArray(aValue))
      return [aValue];
    else if (kDateFields.indexOf(aKey) != -1) {
      return (aValue !== null && aValue !== undefined)
             ? new Date(aValue).toJSON()
             : null;
    }
    else if (kDefaultFields.indexOf(aKey) != -1) {
      // We're dealing with a default. In the event that the default is
      // one of our typed values, we need to return our special
      // TypedDefault object, or else we get strange behaviour from
      // Backbone.js, because it doesn't expect plain ol' Objects as
      // model attributes.
      // From: http://stackoverflow.com/questions/6351271/backbone-js-get-and-set-nested-object-attribute
      if (aValue && kTypedDefaultFields.indexOf(aKey) != -1) {
        return new TypedDefault({type: aValue.type, value: aValue.value});
      }
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
    let changed = {};

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
        changed[fieldName] = this.get(fieldName);
    }

    for each (let fieldName in kIntFields) {
      if (this.get(fieldName) != aContact.get(fieldName))
        changed[fieldName] = this.get(fieldName);
    }

    for each (let defaultField in kDefaultFields) {
      if (!_.safeIsEqual(this.get(defaultField), aContact.get(defaultField)))
        changed[defaultField] = this.get(defaultField);
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
   * @param aDiff the diff to apply to this Contact.
   */
  applyDiff: function Contact_applyDiff(aDiff, aOptions) {
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
    let changedFields = diff.changed;
    for (let changedField in changedFields) {
      if (changedFields[changedField] === null)
        delete diff.changed[changedField];
    }

    this.applyDiff(diff);
  },

  /**
   * A helper function for the displayNameGivenFamily and
   * displayNameFamilyGiven getters. If we have a value in the name
   * field, we simply return that, joined with a space. If not, we return
   * the givenNames followed by the familyNames, joined with spaces. If
   * aFamilyNameFirst is true, we return familyNames followed by givenNames.
   *
   * @param aFamilyNameFirst Set to true to return familyNames first.
   * @returns a string representing the name of the contact.
   */
  _nameGetterHelper: function Contact__nameGetterHelper(aFamilyNameFirst) {
    // Display name trumps all
    let name = this.get("name");
    if (name.length)
      return name.join(" ");

    let givenName = this.get("givenName");
    let familyName = this.get("familyName");

    // TODO: Does this need l10n?
    if (aFamilyNameFirst)
      return [familyName.join(" "), givenName.join(" ")].join(", ");
    else
      return givenName.concat(familyName).join(" ");
  },

});
