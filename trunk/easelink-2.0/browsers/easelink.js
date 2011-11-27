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

'use strict'
const kURIPattern = {
  general: /^([a-z][a-z0-9]+\:)\/\/([a-z0-9;\/:@&=\+\$\.\-_\!~\*'\(\)%]+)([#\?].*)?$/i,
  base64: /^([a-z][a-z0-9]+\:)\/\/([a-z0-9\+\/]+=*)([#\?&].*)?$/i
};
function $extend(obj, ext) {
  for (var key in ext)
    if (!(obj.hasOwnProperty(key)))
      obj[key] = ext[key];
  return obj;
}
function $nop() {
}
function $false() {
  return false;
}
function $equal(x) {
  return x;
}
function $test(attname, node) {
  return node.hasAttribute(attname);
}
function $fix(attname, node) {
  node.setAttribute('href', node.getAttribute(attname));
  node.removeAttribute('oncontextmenu');
  node.removeAttribute('onclick');
}
function $decode(prelen, suflen, url) {
  var match = kURIPattern.base64.exec(url);
  if (match) {
    url = atob(match[2]);
    log('decoded: $1', encodeURI(url));
    return encodeURI(url.substring(prelen, url.length - suflen));
  }
  return url;
}
function generateTest(attname) {
  return function(node) {
    return $test(attname, node);
  };
}
function generateFix(attname) {
  return function(node) {
    return $fix(attname, node);
  };
}
function generateDecode(prelen, suflen) {
  return function(url) {
    return $decode(preflen, suflen, url);
  };
}
const kEaseLinkFixer = 1 << 0;
const kEaseLinkProtocolHandler = 1 << 1;
const EaseLink = {
  protocolHandler: {
    available: {},
    enabled: {}
  },
  fixer: {
    available: {},
    enabled: {}
  },
  isDecodeable: function(url) {
    var handlers = this.protocolHandler.available;
    for (var key in handlers) {
      var scheme = handlers[key].scheme;
      if (url.slice(0, scheme.length) == scheme)
        return key;
    }
    return null;
  },
  isFixable: function(node) {
    var handlers = this.fixer.enabled;
    for (var key in handlers)
      if (handlers[key].test(node))
        return key;
    return null;
  },
  addHandler: function(handler) {
    if (handler.type & kEaseLinkFixer)
      this.fixer.available[handler.key] = expandFixer(handler);
    if (handler.type & kEaseLinkProtocolHandler)
      this.protocolHandler.available[handler.key] = expandProtocolHandler(handler);
  },
  enableProtocolHandler: function(key) {
    if (!(key in this.protocolHandler.available)) throw "key in this.protocolHandler.available";
    this.protocolHandler.enabled[key] = this.protocolHandler.available[key];
  },
  disableProtocolHandler: function(key) {
    if (!(key in this.protocolHandler.enabled)) throw "key in this.protocolHandler.enabled";
    delete this.protocolHandler.enabled[key];
  },
  enableFixer: function(key) {
    if (!(key in this.fixer.available)) throw "key in this.fixer.available";
    this.fixer.enabled[key] = this.fixer.available[key];
  },
  disableFixer: function(key) {
    if (!(key in this.fixer.enabled)) throw "key in this.fixer.enabled";
    delete this.fixer.enabled[key];
  }
};
EaseLink.addHandler({
  key: 'thunder',
  name: 'thunder-name',
  description: 'thunder-description',
  type: kEaseLinkFixer | kEaseLinkProtocolHandler,
  test: generateTest('thunderhref'),
  selector: 'a[thunderhref]',
  fix: generateFix('thunderhref'),
  scheme: 'thunder',
  decode: generateDecode(2, 2)
});
EaseLink.addHandler({
  key: 'qqdl',
  name: 'qqdl-name',
  description: 'qqdl-description',
  type: kEaseLinkFixer | kEaseLinkProtocolHandler,
  test: generateTest('qhref'),
  selector: 'a[qhref]',
  fix: generateFix('qhref'),
  scheme: 'qqdl',
  decode: generateDecode(0, 0)
});
EaseLink.addHandler({
  key: 'flashget',
  name: 'flashget-name',
  description: 'flashget-description',
  type: kEaseLinkFixer | kEaseLinkProtocolHandler,
  test: function(node) {
    for (var i = 0; i < node.attributes.length; i++)
      if ((/^flashget\:/i).test(node.attributes[i].value)) {
        node.setAttribue('flashgethref', node.attributes[i].value);
        return true;
      }
    return false;
  },
  fix: generateFix('flashgethref'),
  scheme: 'flashget',
  decode: generateDecode(10, 10)
});
EaseLink.addHandler({
  key: 'rayfile',
  name: 'rayfile-name',
  description: 'rayfile-description',
  type: kEaseLinkProtocolHandler,
  scheme: 'fs2you',
  decode: generateDecode(0, 0)
});
EaseLink.addHandler({
  key: 'namipan',
  name: 'nami-name',
  description: 'nami-description',
  type: kEaseLinkFixer,
  test: function(node) {
    if (node.protocol == 'javascript:' && node.href.indexOf('.namipan.com') > -1) {
      var url = node.href.split("'");
      if (url.length == 3) {
        node.setAttribute('namihref', decodeURIComponent(url[1]));
        return true;
      }
    }
    return false;
  },
  fix: generateFix('namihref')
});
EaseLink.addHandler({
  key: 'qqwpa',
  name: 'qqwpa-name',
  type: kEaseLinkFixer,
  test: function(node) {
    return /^http:\/\/wpa\.qq\.com/.test(node.href);
  },
  fix: function(node) {
    var url = node.getAttribute('href');
    var matches = PROTOCOL_PATTERNS.URI.exec(url), params;
    if (matches && (params = matches[3]) && params.length > 0) {
      var paramlist = {};
      params = params.split('&');
      for (var i = 0; i < params.length; ++i) {
        var pair = params[i].split('=');
        paramlist[pair[0].toLowerCase()] = pair[1];
      }
      url = 'tencent://Message/?menu=' + (paramlist.menu || 'no')
          + '&exe=' + (paramlist.exe || '')
          + '&uin=' + (paramlist.uin || '10000')
          + '&websiteName=' + (paramlist.site || 'unknown')
          + '&info=';
      node.setAttribute('href', url);
    }
  }
});
