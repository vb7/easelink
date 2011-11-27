/* Ease Link
 * Version: $VER$
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

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm} = Components;
Cu.import('resource://gre/modules/Services.jsm');
const {io: Si, console: Sc} = Services;

const Global = this;
const kResHandler = Si.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
const kAddonName = 'easelink';
const kImports = ['i18n', 'easelink'];
const kDefaultLocale = 'zh-CN';
const kSupportLocales = ['zh-CN', 'en-US'];

const kProtocolSupportMissing = 0x1
const kProtocolSupportApplication = 0x2;
const kProtocolSupportEaseLink = 0x4;

function startup(data, reason) {
  Sc.logStringMessage('startup');
  if (!data.resourceURI) {
    data.resourceURI = Si.newFileURI(data.installPath);
    if (!data.installPath.isDirectory())
      data.resourceURI = Si.newURI('jar:' + alias.spec + '!/', null, null);
  }
  kResHandler.setSubstitution(kAddonName, data.resourceURI);
  Global.resourceURI = 'resource://' + kAddonName + '/';
  data.resourceURI = Si.newURI(resourceURI, null, null);
  for (var i = 0; i < kImports.length; i++)
    Cu.import(resourceURI + kImports[i] + '.js');
  Global.i18n = new I18N(kDefaultLocale, kSupportLocales, resourceURI + '_locale/');
}

function shutdown(data, reason) {
  Sc.logStringMessage('shutdown');
  if (Cu.unload)
    for (var i = 0; i < kImports.length; i++)
      Cu.unload(resourceURI + kImports[i] + '.jsm');
  kResHandler.setSubstitution(kAddonName, null);
}

function install (data, reason) {
  Sc.logStringMessage('install');
}

function uninstall(data, reason) {
  Sc.logStringMessage('uninstall');
}

function checkSupport() {
  var result = {};
  for each (var handler in EaseLink.protocolHandler.available) {
    try {
      IOService.newChannel(handler.scheme + '://', null, null).owner;
      result[handler.key] = kProtocolSupportEaseLink;
    } catch (e) {
      switch (e.result) {
       case Cr.NS_ERROR_NOT_IMPLEMENTED:
        result[handler.key] = kProtocolSupportApplication;
        break;
       case Cr.NS_ERROR_UNKNOWN_PROTOCOL:
        result[handler.key] = kProtocolSupportMissing;
        break;
       default:
        log('error: $1', e);
      }
    }
  }
  return result;
}
