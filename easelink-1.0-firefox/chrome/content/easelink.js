(function() {

let Cc = Components.classes, Ci = Components.interfaces;
let prefService = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService);
let prefBranch = prefService.getBranch('extensions.easelink.').QueryInterface(Ci.nsIPrefBranch2);
//let log = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

const urlPattern = /^(([a-zA-Z][0-9a-zA-Z+\-\.]*\:)?\/{0,2}([0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]+))?([#\?]([0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const base64Pattrn = /^([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/{2}([0-9a-zA-Z\+=\/]+)([0-9a-zA-Z;\/\?:@&=\+\$\.\-_\!~\*'\(\)%#]+)?$/;

var emptyFunction = function() {};

function defaultFix(href) {
  return function(node) {
    node.setAttribute('href', node.getAttribute(href));
    node.removeAttribute(href);
    node.removeAttribute('oncontextmenu');
    node.removeAttribute('onclick');
  };
}

function defaultDecode(prefix, suffix) {
  return function(node) {
    var url = node.getAttribute('href');
    var match;
    if (matches = base64Pattrn.exec(url)) {
      url = atob(matches[2]).toString();
      node.setAttribute('href', url.substring(prefix, url.length - suffix));
    }
  };
}
 
const Protocols = {
  'thunder:': {
    prefkey: 'thunder',
    xpath: '[@thunderhref]',
    fix: defaultFix('thunderhref'),
    decode: defaultDecode(2, 2)
  },
  'qqdl:': {
    prefkey: 'qqxuanfeng',
    xpath: '[@qhref]',
    fix: defaultFix('qhref'),
    decode: defaultDecode(0, 0)
  },
  'fs2you:': {
    xpath: "[@href and starts-with(translate(@href, 'FSYOU', 'fsyou'), 'fs2you:')]",
    fix: emptyFunction,
    decode: defaultDecode(0, 0)
  },
  'flashget:': {
    xpath: "[count(@*[contains(translate(., 'FLASHGET', 'flashget'), 'flashget://')])>0]",
    fix: function(node) {
      var match;
      if (node.protocol != 'flashget:') {
        for (var i = 0; i < node.attributes.length; ++i)
          if (match = base64Pattrn.match(node.attributes[i].nodeValue) && match[1].toLowerCase() == 'flashget:') {
            node.setAttribute('href', 'flashget://' + match[2]);
            node.removeAttribute(node.attributes[i].nodeName);
            break;
          }
      }
      node.removeAttribute('oncontextmenu');
      node.removeAttribute('onclick');
    },
    decode: defaultDecode(10, 10)
  },
  'tencent:': {
    xpath: "[@href and starts-with(translate(@href, 'HTPWAQCOM', 'htpwaqcom'), 'http://wpa.qq.com/')]",
    fix: function (node) {
      var url = node.getAttribute('href');
      var matches = urlPattern.exec(url), params;
      if (matches && (params = matches[5]) && params.length > 0) {
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
    },
    decode: emptyFunction
  }
};

const StatusBar = {
  _statusbar: null,
  init: function() {
    this._statusbar = document.getElementById('easelink-status');
    this._statusbar.addEventListener('click', this, false);
  },
  handleEvent: function(evt) {
    if (evt.button == 0)
      EaseLink.fix();
  },
  toggle: function(val) {
    if (val)
      this._statusbar.setAttribute('auto', true);
    else
      this._statusbar.removeAttribute('auto')
  }
};

const SettingMenu = {
  _menuitems: null,
  init: function() {
    this._menuitems = document.getElementById('easelink-setmu').getElementsByTagName('menuitem');
    for (var i = 0; i < this._menuitems.length; ++i) {
      if (prefBranch.getBoolPref(this._menuitems[i].getAttribute('value')))
        this._menuitems[i].setAttribute('checked', true);
      this._menuitems[i].addEventListener('command', this, true);
    }
  },
  handleEvent: function(evt) {
    prefBranch.setBoolPref(evt.target.getAttribute('value'), evt.target.hasAttribute('checked'));
  },
  toggle: function(val) {
    for (var i = 2; i < this._menuitems.length; ++i)
      this._menuitems[i].setAttribute('disabled', !val);
  }
};

const ContextMenu = {
  _menu: null,
  _decode: null,
  init: function() {
    this._menu = document.getElementById('easelink-ctxmu-convt');
    this._menu.parentNode.addEventListener('popupshowing', this, true);
    this._menu.addEventListener('command', this, true);
  },
  handleEvent: function(evt) {
    switch (evt.type) {
      case 'popupshowing':
        this._menu.hidden = true;
        if (gContextMenu.onLink) {
          var link = gContextMenu.link;
          var doc = link.ownerDocument;
          for each (var protocol in Protocols)
            if (doc.evaluate('.' + protocol.xpath, link, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
              protocol.fix(link);
              gContextMenu.linkURL = gContextMenu.getLinkURL();
              gContextMenu.linkURI = gContextMenu.getLinkURI();
              gContextMenu.linkProtocol = gContextMenu.getLinkProtocol();
            }
          if ((link.protocol in Protocols) && (this._decode = Protocols[link.protocol].decode) != emptyFunction)
            this._menu.hidden = false;
        }
        break;
      case 'command':
        this._decode(gContextMenu.target);
        break;
    }
  }
};

const EaseLink = {
  _auto: false,
  init: function() {
    StatusBar.init();
    SettingMenu.init();
    ContextMenu.init();
    prefBranch.addObserver('auto', this, false);
    this._toggle();
  },
  _toggle: function(){
    var val = prefBranch.getBoolPref('auto');
    if (this._auto ^ val) {
      if (val)
        gBrowser.addEventListener('DOMContentLoaded', this, true);
      else
        gBrowser.removeEventListener('DOMContentLoaded', this, true);
      this._auto = val;
      StatusBar.toggle(val);
      SettingMenu.toggle(val);
    }
  },
  observe: function(subject, topic, data) {
    if (topic != 'nsPref:changed')
      return;
    this._toggle();
  },
  handleEvent: function(evt) {
    this.fix(true, evt.target);
  },
  fix: function(partial, target) {
    var doc = target || gBrowser.contentDocument;
    var iterator, node, nodes = [];
    var plain = prefBranch.getBoolPref('plain');
    if (doc.documentElement) for each (var protocol in Protocols) {
      if (!protocol.prefkey || partial && !prefBranch.getBoolPref(protocol.prefkey)) continue;
      iterator = doc.evaluate('.//a' + protocol.xpath, doc.documentElement, null, XPathResult.ANY_TYPE, null);
      while (!iterator.invalidIteratorState && (node = iterator.iterateNext()) && (!partial || nodes.length <= 10))
        nodes.push(node);
      while ((node = nodes.pop()) || nodes.length) {
        protocol.fix(node);
        if (plain) protocol.decode(node);
      }
    }
  }
};

window.EaseLink = {
  fix: EaseLink.fix
};

window.addEventListener('load', function() {EaseLink.init()}, false);

})();