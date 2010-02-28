(function() {

const Cc = Components.classes, Ci = Components.interfaces;
let prefBranch = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService)
                                                         .getBranch('extensions.easelink.')
                                                         .QueryInterface(Ci.nsIPrefBranch2);

const Version = '$VER$';
const UrlPattern = /^(([a-zA-Z][0-9a-zA-Z+\-\.]*\:)?\/{0,2}([0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]+))?([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const Base64Pattern = /^([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/\/((?:[A-Za-z0-9\+\/]{4})+(?:[A-Za-z0-9\+\/]{2}==|[A-Za-z0-9\+\/]{3}=)?)([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const PartialBase64Pattern = /([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/\/((?:[A-Za-z0-9\+\/]{4})+(?:[A-Za-z0-9\+\/]{2}==|[A-Za-z0-9\+\/]{3}=)?)([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}/g;

var gL10N;
var gAuto = false;
var gPlain = false;
var gEnabledAPs = {};

function fixedEscape(str) {
  return str.replace(/[^0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%\?\#]+/g, function(x) escape(x));
}

function defaultFixer(attname) {
  return function(node) {
    node.setAttribute('href', node.getAttribute(attname));
    node.removeAttribute(attname);
    node.removeAttribute('oncontextmenu');
    node.removeAttribute('onclick');
  };
}

function defaultDecoder(prelen, suflen) {
  return function(node) {
    var url = node.getAttribute('href');
    var match;
    if (match = Base64Pattern.exec(url)) {
      url = atob(match[2]);
      node.setAttribute('href', fixedEscape(url.substring(prelen, url.length - suflen)));
    }
  };
}

/* IProtocol Definitions */

const IAutomaticProtocolThunder = {
  name: 'l10n-thunder-name',
  xpath: '[@thunderhref]',
  fix: defaultFixer('thunderhref'),
  decode: defaultDecoder(2, 2)
};

const IAutomaticProtocolQQXuanFeng = {
  name: 'l10n-qqxuanfeng-name',
  xpath: '[@qhref]',
  fix: defaultFixer('qhref'),
  decode: defaultDecoder(0, 0)
};

const IProtocolFlashget = {
  xpath: "[count(@*[contains(translate(., 'FLASHGET', 'flashget'), 'flashget://')])>0]",
  fix: function(node) {
    var match;
    if (node.protocol != 'flashget:')
      for (var i = 0; i < node.attributes.length; ++i)
        if (match = PartialBase64Pattern.match(node.attributes[i].nodeValue) && match[1].toLowerCase() == 'flashget:') {
          node.setAttribute('href', match[0]);
          node.removeAttribute(node.attributes[i].nodeName);
          break;
        }
    var url = node.getAttribute('href');
    var pos = url.lastIndexOf('&');
    if (pos != -1) node.setAttribute('href', url.substring(0, pos));
    node.removeAttribute('oncontextmenu');
    node.removeAttribute('onclick');
  },
  decode: defaultDecoder(10, 10)
};

const IProtocolRayFile = {
  xpath: "[@href and starts-with(translate(@href, 'FSYOU', 'fsyou'), 'fs2you:')]",
  decode: function(node) {
    var url = node.getAttribute('href');
    var match;
    if (matches = Base64Pattern.exec(url)) {
      url = atob(matches[2]).toString();
      node.setAttribute('href', 'http://' + fixedEscape(url.substring(0, url.lastIndexOf('|'))));
    }
  }
};

const IProtocolQQTemporary = {
  xpath: "[@href and starts-with(translate(@href, 'HTPWAQCOM', 'htpwaqcom'), 'http://wpa.qq.com/')]",
  fix: function (node) {
    var url = node.getAttribute('href');
    var matches = UrlPattern.exec(url), params;
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
  }
};

const IProtocolNamipan = {
  xpath: "[@href and starts-with(translate(@href, 'JAVSCRIPT', 'javscript'), 'javascript:') and contains(translate(@href, 'NAMIPCO', 'namipco'), '.namipan.com')]",
  decode: function(node) {
    var url = node.getAttribute('href').split("'");
    if (url.length == 3)
      node.setAttribute('href', decodeURIComponent(url[1]));
  }
};

/* IProtocol Registers */

const AutomaticProtocols = {
  'thunder': IAutomaticProtocolThunder,
  'qqxuanfeng': IAutomaticProtocolQQXuanFeng
};

const Protocols = {
  'thunder:': IAutomaticProtocolThunder,
  'qqdl:': IAutomaticProtocolQQXuanFeng,
  'fs2you:': IProtocolRayFile,
  'flashget:': IProtocolFlashget,
  'tencent:': IProtocolQQTemporary,
  '#namipan:': IProtocolNamipan
};

const StatusBar = {
  _statusbar: null,
  _statustooltip: null,
  init: function() {
    this._statustooltip = document.getElementById('easelink-tooltip-auto-list');
    this._statusbar = document.getElementById('easelink-status');
    this._statusbar.addEventListener('click', this, false);
  },
  handleEvent: function(evt) {
    if (evt.button == 0)
      EaseLink.process();
  },
  set: function() {
    this._statusbar.setAttribute('auto', gAuto);
  }
};

const SettingMenu = {
  _menu: null,
  _menuitems: null,
  init: function() {
    this._menu = document.getElementById('easelink-setmu');
    for (var key in AutomaticProtocols) {
      var menuitem = document.createElement('menuitem');
      AutomaticProtocols[key].name = gL10N.getString(AutomaticProtocols[key].name);
      menuitem.setAttribute('label', gL10N.getFormattedString('SettingMenu-Process-Link', [AutomaticProtocols[key].name]));
      menuitem.setAttribute('type', 'checkbox');
      menuitem.setAttribute('value', key);
      this._menu.appendChild(menuitem);
    }
    this._menuitems = this._menu.getElementsByTagName('menuitem');
    for (var i = 0; i < this._menuitems.length; ++i) {
      if (prefBranch.getBoolPref(this._menuitems[i].getAttribute('value')))
        this._menuitems[i].setAttribute('checked', true);
      this._menuitems[i].addEventListener('command', this, true);
    }
  },
  set: function() {
    for (var i = 2; i < this._menuitems.length; ++i)
      this._menuitems[i].setAttribute('disabled', !gAuto);
  },
  handleEvent: function(evt) {
    prefBranch.setBoolPref(evt.target.getAttribute('value'), evt.target.hasAttribute('checked'));
  }
};

const ContextMenu = {
  _menudecode: null,
  _menuconvt: null,
  _fix: null,
  _decode: null,
  _selection : null,
  _selurl : "",
  init: function() {
    this._menudecode = document.getElementById('easelink-ctxmu-decode');
    this._menuconvt = document.getElementById('easelink-ctxmu-convert');
    this._menudecode.parentNode.addEventListener('popupshowing', this, true);
    this._menudecode.addEventListener('command', this, true);
    this._menuconvt.addEventListener('command', this, true);
  },
  _convert: function() {
    var range = this._selection.getRangeAt(0);
    var frag = range.extractContents();
    var link = frag.ownerDocument.createElement('a');
    link.setAttribute('href', this._selurl);
    link.setAttribute('target', '_blank');
    if (this._fix) this._fix(link);
    if (gPlain && this._decode) this._decode(link);
    link.appendChild(frag);
    range.insertNode(link);
  },
  handleEvent: function(evt) {
    switch (evt.type) {
    case 'popupshowing':
      this._menudecode.hidden = true;
      this._menuconvt.hidden = true;
      if (gContextMenu.onLink) {
        var link = gContextMenu.link;
        var doc = link.ownerDocument;
        var orghref = link.getAttribute('href');
        var plain = gPlain && gContextMenu.onSaveableLink;
        var fixed = false;
        var found = false;
        for each (var protocol in Protocols)
          if (doc.evaluate('.' + protocol.xpath, link, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
            if ('fix' in protocol) protocol.fix(link);
            this._decode = protocol.decode;
            fixed = true;
            break;
          }
        if (!fixed && link.protocol in Protocols) {
          this._decode = Protocols[link.protocol].decode;
          found = true;
        }
        if (fixed || found) {
          if (!plain)
            this._menudecode.hidden = !this._decode;
          else if (this._decode)
            this._decode(link);
          if (link.getAttribute('href') != orghref) {
            gContextMenu.linkURL = gContextMenu.getLinkURL();
            gContextMenu.linkURI = gContextMenu.getLinkURI();
            gContextMenu.linkProtocol = gContextMenu.getLinkProtocol();
          }
        }
      } else if (gContextMenu.isTextSelected) {
        var focusedWindow = document.commandDispatcher.focusedWindow;
        var selection = focusedWindow.getSelection();
        var text, match, protocol;
        if (selection.rangeCount == 1 && (text = selection.toString().trim()) && text.length < 1000
            && (match = UrlPattern.exec(text)) && (protocol = match[2].toLowerCase()) in Protocols) {
          this._selection = selection;
          this._fix = Protocols[protocol].fix;
          this._decode = Protocols[protocol].decode;
          this._selurl = text;
          this._menuconvt.hidden = false;
        }
      }
      break;
    case 'command':
      if (evt.target == this._menudecode)
        this._decode(gContextMenu.link);
      else if (evt.target == this._menuconvt)
        this._convert();
      break;
    }
  }
};

const EaseLink = {
  init: function() {
    gL10N = document.getElementById('easelink-strings');
    StatusBar.init();
    SettingMenu.init();
    ContextMenu.init();
    this._checkFirstRun();
    prefBranch.addObserver('', this, false);
    this._refreshEnabledList(true);
    this._refreshPlain();
    this._refreshAuto();
  },
  _checkFirstRun: function() {
    if (prefBranch.getCharPref('ver') != Version) {
      if (prefBranch.getCharPref('ver').indexOf('1.0.1.') != 0) window.setTimeout(function() {
        gBrowser.selectedTab = gBrowser.addTab(gL10N.getString('First_Run_URL'));
      }, 1500);
      prefBranch.setCharPref('ver', Version);
    }
  },
  _refreshAuto: function() {
    var exp = prefBranch.getBoolPref('auto');
    if (gAuto ^ exp) {
      if (exp)
        gBrowser.addEventListener('DOMContentLoaded', this, true);
      else
        gBrowser.removeEventListener('DOMContentLoaded', this, true);
      gAuto = exp;
      StatusBar.set();
      SettingMenu.set();
    }
  },
  _refreshPlain: function() {
    var exp = prefBranch.getBoolPref('plain');
    if (gPlain ^ exp)
      gPlain = exp;
  },
  _refreshEnabledList: function(init, key) {
    if (init) {
      for (var key in AutomaticProtocols)
        if (prefBranch.getBoolPref(key))
          gEnabledAPs[key] = AutomaticProtocols[key];
    } else {
      var exp = prefBranch.getBoolPref(key);
      if ((key in gEnabledAPs) ^ exp) {
        if (exp)
          gEnabledAPs[key] = AutomaticProtocols[key];
        else
          delete gEnabledAPs[key];
        StatusBar.refresh();
      }
    }
  },
  observe: function(subject, topic, data) {
    if (topic != "nsPref:changed")
			return;
    switch (data) {
      case 'auto':
        this._refreshAuto();
        break;
      case 'plain':
        this._refreshPlain();
        break;
      case 'ver':
        break;
      default:
        this._refreshEnabledList(false, data);
        break;
    }
  },
  handleEvent: function(evt) {
    var doc = evt.target;
    var iterator, node, nodes = [];
    if (doc.documentElement) for each (var protocol in gEnabledAPs) {
      iterator = doc.evaluate('.//a' + protocol.xpath, doc.documentElement, null, XPathResult.ANY_TYPE, null);
      while (!iterator.invalidIteratorState && (node = iterator.iterateNext()) && nodes.length <= 10)
        nodes.push(node);
      while ((node = nodes.pop()) || nodes.length) {
        protocol.fix(node);
        if (gPlain) protocol.decode(node);
      }
    }
  },
  process: function(doc) {
    doc = doc || gBrowser.contentDocument;
    var iterator, node, nodes = [];
    if (doc.documentElement) for each (var protocol in Protocols) {
      iterator = doc.evaluate('.//a' + protocol.xpath, doc.documentElement, null, XPathResult.ANY_TYPE, null);
      while (!iterator.invalidIteratorState && (node = iterator.iterateNext()) && nodes.length <= 50)
        nodes.push(node);
      while ((node = nodes.pop()) || nodes.length) {
        if ('fix' in protocol) protocol.fix(node);
        if (gPlain && 'decode' in protocol) protocol.decode(node);
      }
    }
  }
};

window.EaseLink = {
  fix: EaseLink.process,
  processAll: EaseLink.process
};

window.addEventListener('load', function() {EaseLink.init()}, false);

})();