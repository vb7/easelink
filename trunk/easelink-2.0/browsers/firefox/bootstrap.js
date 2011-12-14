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
const {io: Si, prefs: Sp, obs: So, ww: Sw, wm: Swm} = Services;
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

#define ADDON_NAME 'easelink'
#define ADDON_ID 'easelink@ashi.cn'
#define DEFAULT_LOCALE 'zh-CN'
#define SUPPORT_LOCALES ['zh-CN', 'en-US']

const kImports = ['i18n.js', 'easelink.js'];

const kResourceURI = 'resource://easelink/';
const kPrefDomain = 'extension.easelink.';
const kPrefProtocolDomain = kPrefDomain + 'protocol.';
const kPrefProtocolBranch = Sp.getBranch(kPrefProtocolDomain).QueryInterface(Ci.nsIPrefBranch2);

const kProtocolSupportUnknown = 1;
const kProtocolSupportMissing = 2;
const kProtocolSupportApplication = 3;
const kProtocolSupportEaseLink = 4;

function startup(data, reason) {
  debug('startup: ' + kReasonsString[reason]);
  res.setup(data);
  Global.i18n = new I18N(DEFAULT_LOCALE, SUPPORT_LOCALES, kResourceURI + '_locale/');
  prefs.setup();
  windows.setup();
}

function shutdown(data, reason) {
  debug('shutdown: ' + kReasonsString[reason]);
  if (reason == APP_SHUTDOWN)
    return;
  for (var key in EaseLink.protocolHandler.enabled)
    EaseLink.disableProtocolHandler(key);
  windows.dispose();
  prefs.dispose();
  i18n.dispose();
  res.dispose();
}

function install(data, reason) {
  debug('install: ' + kReasonsString[reason]);
  res.setup(data);
  prefs.update(reason == ADDON_INSTALL || reason == ADDON_DOWNGRADE);
  res.dispose();
  var window = Swm.getMostRecentWindow('navigator:browser');
  if (window)
    window.gBrowser.selectedTab = window.gBrowser.addTab(EASELINK_GUIDE_URL);
}

function uninstall(data, reason) {
  debug('uninstall: ' + kReasonsString[reason]);
  if (reason == ADDON_UNINSTALL || reason == ADDON_DOWNGRADE)
    Sp.getBranch(kPrefDomain).deleteBranch('');
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
      .setSubstitution(ADDON_NAME, resourceURI);
    for (var i = 0; i < kImports.length; i++)
      Cu.import(kResourceURI + kImports[i]);
  },
  dispose: function() {
    if (Cu.unload)
      for (var i = 0; i < kImports.length; i++)
        Cu.unload(kResourceURI + kImports[i]);
    Si.getProtocolHandler('resource')
      .QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution(ADDON_NAME, null);
  }
};

const prefs = {
  update: function(override) {
    debug('update prefs, override: ' + override);
    //use user branch instead of default one, for data will lost when session ends.
    var support = checkSupport();
    for (var key in EaseLink.protocolHandler.available)
      if (override || kPrefProtocolBranch.getPrefType(key) == 0)
        kPrefProtocolBranch.setBoolPref(key, support[key] == kProtocolSupportMissing);
  },
  setup: function() {
    debug('setup prefs and install observers.');
    for (var key in EaseLink.protocolHandler.available)
      if (kPrefProtocolBranch.getBoolPref(key))
        EaseLink.enableProtocolHandler(key);
    kPrefProtocolBranch.addObserver('', this.onProtocolPrefChange, false);
    So.addObserver(this.onOptionPageShow, 'addon-options-displayed', false);
  },
  dispose: function() {
    kPrefProtocolBranch.removeObserver('', this.onProtocolPrefChange);
    So.removeObserver(this.onOptionPageShow, 'addon-options-displayed');
  },
  onProtocolPrefChange: function(branch, topic, key) {
    assert(topic == 'nsPref:changed');
    debug(key + ': ' + branch.getBoolPref(key));
    if (branch.getBoolPref(key))
      EaseLink.enableProtocolHandler(key);
    else
      EaseLink.disableProtocolHandler(key);
  },
  onOptionPageShow: function(document, topic, addonId) {
    assert(topic == 'addon-options-displayed');
    if (addonId != ADDON_ID) return;
    var rows = document.getElementById('detail-rows');
    for each (var handler in EaseLink.protocolHandler.available) {
      var setting = document.createElement('setting');
      setting.setAttribute('pref', kPrefProtocolDomain + handler.key);
      setting.setAttribute('type', 'bool');
      setting.setAttribute('title', i18n.get('option-protocol-label', [i18n.get(handler.key + '-name')]));
      setting.appendChild(document.createTextNode(i18n.get('option-protocol-description', [handler.scheme])));
      rows.appendChild(setting);
    }
  }
};

const windows = {
  setup: function() {
    Sw.registerNotification(this.onWindowOpen);
    var enumerator = Swm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements())
      this.applyToWindow(enumerator.getNext().QueryInterface(Ci.nsIDOMWindow));
  },
  dispose: function() {
    Sw.unregisterNotification(this.onWindowOpen);
    var enumerator = Swm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements())
      this.unapplyToWindow(enumerator.getNext().QueryInterface(Ci.nsIDOMWindow));
  },
  applyToWindow: function(window) {
    assert(window.document.documentElement.getAttribute('windowtype') == 'navigator:browser');
    window.gBrowser.addEventListener('DOMContentLoaded', this.onContentLoaded, true);
    menu.setup(window.document);
  },
  unapplyToWindow: function(window) {
    assert(window.document.documentElement.getAttribute('windowtype') == 'navigator:browser');
    window.gBrowser.removeEventListener('DOMContentLoaded', this.onContentLoaded, true);
    menu.dispose(window.document);
  },
  onWindowOpen: function(window, topic) {
    if (topic == 'domwindowopened')
      window.addEventListener('load', windows.onWindowLoad, false);
  },
  onWindowLoad: function({currentTarget: window}) {
    window.removeEventListener('load', windows.onWindowLoad, false);
    if (window.document.documentElement.getAttribute('windowtype') == 'navigator:browser')
      windows.applyToWindow(window);
  },
  onContentLoaded: function({target: document}) {
    debug('content load');
    EaseLink.processPage(document);
  }
};

const menu = {
  selection: null,
  selectionUrl: null,
  setup: function(document) {
    var contextMenu = document.getElementById('contentAreaContextMenu');
    var item = document.createElement('menuitem');
    item.setAttribute('id', 'easelink-convert');
    item.setAttribute('label', i18n.get('menu-convert'));
    item.hidden = true;
    item.addEventListener('command', this.onConvertCommand, true);
    contextMenu.insertBefore(item, document.getElementById('context-sep-selectall').nextSibling);
    contextMenu.addEventListener('popupshowing', this.onPopupShowing, true);
  },
  dispose: function(document) {
    var contextMenu = document.getElementById('contentAreaContextMenu');
    var item = document.getElementById('easelink-convert');
    contextMenu.removeChild(item);
    contextMenu.removeEventListener('popupshowing', this.onPopupShowing, true);
  },
  onPopupShowing: function(e) {
    var window = e.view;
    var cm = window.gContextMenu;
    var menuitem = window.document.getElementById('easelink-convert');
    menuitem.hidden = true;
    if (cm.onLink) {
      if (EaseLink.tryFix(cm.link)) {
        cm.linkURL = cm.getLinkURL();
        cm.linkURI = cm.getLinkURI();
        cm.linkProtocol = cm.getLinkProtocol();
      }
    } else if (cm.isTextSelected) {
      var selection = window.document.commandDispatcher.focusedWindow.getSelection();
      var text, match, protocol;
      if (selection.rangeCount == 1 && (text = selection.toString().trim()) &&
          text.length <= 2048 && EaseLink.isDecodeable(text)) {
        menu.selection = selection;
        menu.selectionUrl = text;
        menuitem.hidden = false;
      }
    }
  },
  onConvertCommand: function() {
    var range = menu.selection.getRangeAt(0);
    var frag = range.extractContents();
    var link = frag.ownerDocument.createElement('a');
    link.setAttribute('href', menu.selectionUrl);
    link.appendChild(frag);
    range.insertNode(link);
  }
};
