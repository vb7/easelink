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
const {io: Si, prefs: Sp} = Services;
#ifdef DEBUG
const {console: Sc} = Services;
const kReasonsString = {
  1: 'APP_STARTUP',
  2: 'APP_SHUTDOWN',
  3: 'ADDON_ENABLE',
  4: 'ADDON_DISABLE',
  5: 'ADDON_INSTALL',
  6: 'ADDON_UNINSTALL',
  7: 'ADDON_UPGRADE',
  8: 'ADDON_DOWNGRADE'
};
#endif

const Global = this;

const kImports = ['i18n.js', 'easelink.js'];

const kAddonName = 'easelink';
const kResourceURI = 'resource://' + kAddonName + '/';
const kPrefBranch = 'extension.easelink.';
const kPrefFixerBranch = Sp.getBranch(kPrefBranch + 'fixer.').QueryInterface(Ci.nsIPrefBranch2);
const kPrefProtocolBranch = Sp.getBranch(kPrefBranch + 'protocol.').QueryInterface(Ci.nsIPrefBranch2);
const kDefaultLocale = 'zh-CN';
const kSupportLocales = ['zh-CN', 'en-US'];

const kProtocolSupportUnknown = 1;
const kProtocolSupportMissing = 2;
const kProtocolSupportApplication = 3;
const kProtocolSupportEaseLink = 4;

const res = {
  setup: function(data) {
    var resourceURI = data.resourceURI;
    if (!resourceURI) {
      resourceURI = Si.newFileURI(data.installPath);
      if (!installPath.isDirectory())
        resourceURI = Si.newURI('jar:' + resourceURI.alias.spec + '!/', null, null);
    }
    Si.getProtocolHandler('resource')
      .QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution(kAddonName, resourceURI);
    for (var i = 0; i < kImports.length; i++)
      Cu.import(kResourceURI + kImports[i]);
  },
  dispose: function() {
    if (Cu.unload)
      for (var i = 0; i < kImports.length; i++)
        Cu.unload(kResourceURI + kImports[i]);
    Si.getProtocolHandler('resource')
      .QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution(kAddonName, null);
  }
};

function startup(data, reason) {
  debug('startup: ' + kReasonsString[reason]);
  res.setup(data);
  Global.i18n = new I18N(kDefaultLocale, kSupportLocales, kResourceURI + '_locale/');
  prefs.setup();
}

function shutdown(data, reason) {
  debug('shutdown: ' + kReasonsString[reason]);
  if (reason == APP_SHUTDOWN)
    return;
  for (var key in EaseLink.fixer.enabled)
    EaseLink.disableFixer(key);
  for (var key in EaseLink.protocolHandler.enabled)
    EaseLink.disableProtocolHandler(key);
  prefs.dispose();
  i18n.dispose();
  res.dispose();
}

function install(data, reason) {
  debug('install: ' + kReasonsString[reason]);
  res.setup(data);
  prefs.update(reason == ADDON_INSTALL || reason == ADDON_DOWNGRADE);
  res.dispose();
}

function uninstall(data, reason) {
  debug('uninstall: ' + kReasonsString[reason]);
  if (reason == ADDON_UNINSTALL || reason == ADDON_DOWNGRADE)
    Sp.getBranch(kPrefBranch).deleteBranch('');
}

function checkSupport() {
  var result = {};
  for each (var handler in EaseLink.protocolHandler.available) {
    try {
      Si.newChannel(handler.scheme + '://', null, null).owner;
      result[handler.key] = kProtocolSupportEaseLink;
    } catch (e) {
      switch (e.result) {
       case Cr.NS_ERROR_NOT_IMPLEMENTED:
        result[handler.key] = kProtocolSupportApplication;
        break;
       case Cr.NS_ERROR_UNKNOWN_PROTOCOL:
        result[handler.key] = kProtocolSupportMissing;
        break;
#ifdef DEBUG
       default:
        result[handler.key] = kProtocolSupportUnknown;
        debug(e.toString());
#endif
       }
    }
  }
  return result;
}

const prefs = {
  update: function(override) {
    debug('update prefs, override: ' + override);
    //use user branch instead of default one, for data will lost when session ends.
    var support = checkSupport();
    for (var key in EaseLink.fixer.available)
      if (override || kPrefFixerBranch.getPrefType(key) == 0)
        kPrefFixerBranch.setBoolPref(key, true);
    for (var key in EaseLink.protocolHandler.available)
      if (override || kPrefProtocolBranch.getPrefType(key) == 0)
        kPrefProtocolBranch.setBoolPref(key, support[key] == kProtocolSupportMissing);
  },
  setup: function() {
    debug('setup prefs and install observers.');
    for (var key in EaseLink.fixer.available)
      if (kPrefFixerBranch.getBoolPref(key))
        EaseLink.enableFixer(key);
    for (var key in EaseLink.protocolHandler.available) 
      if (kPrefProtocolBranch.getBoolPref(key))
        EaseLink.enableProtocolHandler(key);
    kPrefFixerBranch.addObserver('', this.onFixerPrefChange, false);
    kPrefProtocolBranch.addObserver('', this.onProtocolPrefChange, false);
  },
  dispose: function() {
    kPrefFixerBranch.removeObserver('', this.onFixerPrefChange);
    kPrefProtocolBranch.removeObserver('', this.onProtocolPrefChange);
  },
  onFixerPrefChange: function(branch, topic, key) {
    assert(topic == 'nsPref:changed');
    if (branch.getBoolPref(key))
      EaseLink.enableFixer(key);
    else
      EaseLink.disableFixer(key);
  },
  onProtocolPrefChange: function(branch, topic, key) {
    assert(topic == 'nsPref:changed');
    if (branch.getBoolPref(key))
      EaseLink.enableProtocolHandler(key);
    else
      EaseLink.disableProtocolHandler(key);
  }
};
