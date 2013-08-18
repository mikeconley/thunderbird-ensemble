//
//  VCardParser.js
//
//  A Javascript VCard parser and composer
//  Ferran Caellas Puig (FerCa)
//  Released under the MIT Licence
//  Some parts of the code are based in the vcard.js from Matt Thomson released also under the MIT Licence
//  (Specificaly the regexp and the javascript 1.6 compatibility).
//
//  This parser was used from https://github.com/FerCa/VCardParser.js
//  and converted into a jsm for the uses of https://github.com/mikeconley/thunderbird-ensemble
//  by Jonathan Demelo (demelode@gmail.com)
//
let EXPORTED_SYMBOLS = ['VCardParser'];
let VCardParser = function() {};

VCardParser.prototype = {

    fromVCard: function(vcardString) {
        
        var fields, regexps, notParsed, lines, n, line, dirtyParamsArr, params, paramsSplit, valueSplit, paramObj, paramString,
            encodedLine, x, item, results, key, value;
        fields = {};
        regexps = {
            simple: /^(version|fn|title|n|uid|rev|note|org|prodid|categories|photo)\:(.+)$/i,
            complex: /^([^\:\;\.]+);([^\:]+)\:(.+)$/,
            key: /item\d{1,2}\./,
            properties: /((type=)?(.+);?)+/
        }

        notParsed = [];
        lines = vcardString.split(/\r?\n/);
        n = 0;
        for (n=0; n<lines.length; n++) {
            line = lines[n];

            if(regexps['complex'].test(line)) {

                results = line.match(regexps['complex']);
                key = results[1].replace(regexps['key'], '');

                // Getting values
                value = results[3];
                value = /;/.test(value) ? value.split(';') : value;

                // Getting params
                dirtyParamsArr = results[2].split(';');
                params = [];

                for (paramString in dirtyParamsArr) {
                    paramsSplit = dirtyParamsArr[paramString].split('=');
                    valueSplit = paramsSplit[1].split(',');
                    paramObj = {
                        'type': paramsSplit[0],
                        'value': valueSplit
                    }
                    params.push(paramObj);
                }

                if (this._isEncodedPhoto(params)) {
                    x = n + 1;
                    for (x; x<lines.length; x++) {
                        encodedLine = lines[x];
                        if (this._isBinaryLine(encodedLine)){
                            if (encodedLine[0] === ' ') {
                                encodedLine = encodedLine.substr(1);  // A binary line must begin with a space
                            }
                            value = value + encodedLine;
                        } else {
                            n = x - 1;
                            break;
                        }
                    }
                }

                item = {
                    'value': value,
                    'params': params
                }

                fields[key] = fields[key] || [];
                fields[key] = fields[key].concat(item);

            } else if(regexps['simple'].test(line)) {
                results = line.match(regexps['simple']);
                key = results[1];
                value = results[2];
                fields[key] = value;
            } else if ((line != 'BEGIN:VCARD') && (line != 'END:VCARD')) {
                notParsed.push(line);
            }
        }
        fields['NOTPARSED'] = notParsed;

        if (fields['VERSION'] === undefined) fields['VERSION'] = '3.0';
        if(fields['N'] !== undefined && fields['FN'] !== undefined) {
            return fields;
        } else {
            return false;
        }
    },

    toVCard: function(vcardObject){
        if(vcardObject['N'] === undefined || vcardObject['FN'] === undefined) return false;

        var vcard, item, npentry, entry, subentry, params, value, line, paramvalue, param, value1, entries;

        vcard = 'BEGIN:VCARD' + '\n';

        for (item in vcardObject) {
            if (typeof(vcardObject[item]) == 'string') {

                vcard = vcard + item + ':' + vcardObject[item] + '\n';

            } else if (item == 'NOTPARSED') {

                for (npentry in vcardObject[item]) {
                    vcard = vcard + vcardObject[item][npentry] + '\n';
                }

            } else {
                entries = vcardObject[item];
                for (entry in entries) {
                    subentry = entries[entry];
                    params = subentry.params;
                    value = subentry.value;
                    line = item;

                    // Params
                    for (param in params) {
                        line = line + ';' + params[param].type + '=';
                        for (paramvalue in params[param].value) {
                            line = line + params[param].value[paramvalue] + ',';
                        }
                        //removing extra comma from the end of vcard at this point
                        line = line.slice(0, -1);
                    }

                    // Values
                    line = line + ':';

                    if (this._isEncodedPhoto(params)) {
                        line = line + this._sliceEncodedPhoto(line, value);
                    }else if(typeof(value) == 'string') {
                        line = line + value;
                    } else {
                        for (value1 in value) {
                            line = line + value[value1] + ';';
                        }
                        line = line.slice(0, -1);
                    }
                    vcard = vcard + line + '\n';
                }
            }
        }
        vcard = vcard + 'END:VCARD';

        return vcard;
    },

    _isEncodedPhoto: function(params) {
        var x, i, encoded;
        encoded = false;
        for (x=0; x<params.length; x++) {
            if (params[x]['type'] === 'ENCODING') {
                for (i=0; i<params[x]['value'].length; i++) {
                    if (params[x]['value'][i] === 'b') {
                        encoded = true;
                    }
                }
            }
        }
        return encoded;
    },

    _sliceEncodedPhoto: function(line, value) {
        var lineSize, slicesSize, firstSliceSize, sliced, returnLine, y, x;
        lineSize = line.length;
        slicesSize = 74;
        firstSliceSize = slicesSize - lineSize + 1;
        if (firstSliceSize>0) returnLine = value.slice(0, firstSliceSize) + '\n' + ' ';
        else firstSliceSize = 0;
        for (y=firstSliceSize, x=firstSliceSize+slicesSize; y<value.length; x=x+slicesSize, y=y+slicesSize) {
            sliced = value.slice(y,x);
            returnLine = returnLine + sliced + '\n' + ' ';
        }
        returnLine = returnLine.slice(0, -2);
        return returnLine;
    },

    _isBinaryLine: function(encodedLine) {
        return (!(regexps['complex'].test(encodedLine)) && !(regexps['simple'].test(encodedLine)) && (encodedLine[0] === ' '));
    }


};