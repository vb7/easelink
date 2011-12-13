/* Firefox Bootstrapped Extension I18N Helper
 * Version: 1.0
 *
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is xiaoyi.me code.
 *
 * The Initial Developer of the Original Code is Xiaoyi Shi.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

'use strict';

const {utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://gre/modules/PluralForm.jsm");
const {strings: Ss, locale: Sl} = Services;
#ifdef DEBUG
const {console: Sc} = Services;
#endif

var EXPORTED_SYMBOLS = ['I18N'];

function I18N(defaultLocale, supportLocales, localeURL) {
  var locMapping = {};
  for (var i = 0; i < supportLocales.length; i++) {
    var locale = supportLocales[i];
    locMapping[locale] = locale;
    var parts = locale.split('-');
    parts.pop();
    while (parts.length > 0) {
      var extLocale = parts.join('-');
      if (!locMapping.hasOwnProperty(extLocale))
        locMapping[extLocale] = locale;
      parts.pop();
    }
  }
  var sysLocalParts = Sl.getApplicationLocale().getCategory('NSILOCALE_MESSAGES').split('-');
  var locales = [];
  while (sysLocalParts.length > 0) {
    var locale = sysLocalParts.join('-');
    if (locMapping.hasOwnProperty(locale) && 
        (locales.length == 0 || locales[locales.length-1] != locMapping[locale]))
      locales.push(locMapping[locale]);
    sysLocalParts.pop();
  }
  locales.push(defaultLocale);
  this.bundles = [];
  debug('loaded locales: ' + locales.join(', '));
  for (var i = 0; i < locales.length; i++)
    this.bundles.push(Ss.createBundle(localeURL + locales[i] + '/messages.properties'));
}
I18N.prototype = {
  /*
  get(name[, args]) is generally a combination of nsIStringBundle.{GetStringByName, formatStringFromName} and
    PluralForm.get, but it's more powerful than those functions. get() provides a fallback sequence for the
    messages, which means you may store only differences between en-US and en in en-US.properties, instead of
    copying all the strings from en to en-US. get() also enchanced the format string. You may contain your
    plural form message as a part of the message, see the example below to make it clear:
      eg. messages.properties:
            message=You have %S $downloads.
            downloads=download;downloads
            message2=You have $#downloads2.
            downloads2=one download;# downloads
          extension.js:
            I18N.get('message', [5]);
            I18N.get('message2', [1]);
          results:
            You have 5 downloads.
            You have one download.
  */
  get: function(name, args) {
    var str = this._get(name);
    if (str === null)
      return '(' + name + ')';
    if (args) {
      var idx = 0;
      return str.replace(/(?:%(\d+)?S|\$(#)?(\d+)?([a-zA-Z]\w*))/g, function(r0, sidx, preplace, pidx, pname) {
        if (sidx != '') {
          return args[parseInt(sidx)];
        } else if (pname != '') {
          var num = args[pidx !== null ? parseInt(pidx) : idx];
          var pstr = PluralForm.get(num, this._get(pname));
          return preplace ? pstr.replace(/#/, num) : pstr;
        }
        return args[idx++];
      });
    }
    return str;
  },
  _get: function(name) {
    for each (var bundle in this.bundles) {
      try {
        return bundle.GetStringFromName(name);
      } catch(e) {
      }
    }
    debug('unable to resolve `' + name + '`');
    return null;
  },
  dispose: function() {
    Ss.flushBundles();
  }
};
