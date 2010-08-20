const UrlPattern = /^(([a-zA-Z][0-9a-zA-Z+\-\.]*\:)?\/{0,2}([0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]+))?([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const Base64Pattern = /^([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/\/((?:[A-Za-z0-9\+\/]{4})+(?:[A-Za-z0-9\+\/]{2}==|[A-Za-z0-9\+\/]{3}=)?)([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const PartialBase64Pattern = /([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/\/((?:[A-Za-z0-9\+\/]{4})+(?:[A-Za-z0-9\+\/]{2}==|[A-Za-z0-9\+\/]{3}=)?)([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}/g;

var settings;

function fixedEscape(str) {
  return str.replace(/[^0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%\?\#]+/g, escape);
}

function defaultFixer(attname) {
  return function (node) {
    node.setAttribute('href', node.getAttribute(attname));
    node.removeAttribute(attname);
    node.removeAttribute('oncontextmenu');
    node.removeAttribute('onclick');
  };
}

function defaultDecoder(prelen, suflen) {
  return function (node) {
    var url = node.getAttribute('href');
    var match;
    if (match = Base64Pattern.exec(url)) {
      url = atob(match[2]);
      node.setAttribute('href', fixedEscape(url.substring(prelen, url.length - suflen)));
    }
  };
}

function defaultMatcher(attname) {
  return function (node) {
    return node.hasAttribute(attname);
  };
}

/* IProtocol Definitions */

const IAutomaticProtocolThunder = {
  //xpath: '[@thunderhref]',
  match: defaultMatcher('thunderhref'),
  fix: defaultFixer('thunderhref'),
  decode: defaultDecoder(2, 2)
};

const IAutomaticProtocolQQXuanFeng = {
  //xpath: '[@qhref]',
  match: defaultMatcher('qhref'),
  fix: defaultFixer('qhref'),
  decode: defaultDecoder(0, 0)
};

const IProtocolFlashget = {
  //xpath: "[count(@*[contains(translate(., 'FLASHGET', 'flashget'), 'flashget://')])>0]",
  match: function (node) {
    var attrs = node.attributes;
    for (var i = 0; i < attrs.length; i++)
      if (attrs[i].value.toLowerCase().indexOf('flashget://') > -1)
        return true;
    return false;
  },
  fix: function (node) {
    var match;
    if (node.protocol != 'flashget:')
      for (var i = 0; i < node.attributes.length; ++i)
        if (match = PartialBase64Pattern.match(node.attributes[i].nodeValue) && match[1].toLowerCase() == 'flashget:') {
          node.setAttribute('href', match[0]);
          node.removeAttribute(node.attributes[i].nodeName);
          break;
        }
    node.removeAttribute('oncontextmenu');
    node.removeAttribute('onclick');
  },
  decode: function (node) {
    var url = node.getAttribute('href').replace(/&.+$/, '');
    var match;
    if (match = Base64Pattern.exec(url)) {
      url = atob(match[2]);
      node.setAttribute('href', fixedEscape(url.substring(10, url.length - 10)));
    }
  }
};

const IProtocolRayFile = {
  //xpath: "[@href and translate(substr(@href, 1, 7), 'FSYOU', 'fsyou') = 'fs2you:']",
  match: function (node) {
    return node.protocol == 'fs2you:';
  },
  decode: function (node) {
    var url = node.getAttribute('href');
    var match;
    if (matches = Base64Pattern.exec(url)) {
      url = atob(matches[2]).toString();
      node.setAttribute('href', 'http://' + fixedEscape(url.substring(0, url.lastIndexOf('|'))));
    }
  }
};

const IProtocolQQTemporary = {
  //xpath: "[@href and translate(substr(@href, 1, 19), 'HTPWAQCOM', 'htpwaqcom') = 'http://wpa.qq.com/']",
  match: function (node) {
    return node.host == 'wpa.qq.com';
  },
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
  //xpath: "[@href and translate(substr(@href, 1, 12), 'JAVSCRIPT', 'javscript') = 'javascript:' and contains(translate(@href, 'NAMIPCO', 'namipco'), '.namipan.com')]",
  match: function (node) {
    return node.protocol == 'javascript:' && node.href.indexOf('.namipan.com') > -1;
  },
  decode: function (node) {
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

const ContextMenu = {
  _menudecode: null,
  _menuconvt: null,
  _decode: null,
  _selection : null,
  _selurl : "",
  _decodable: false,
  _convertable: false,
  _convert: function () {
    var range = this._selection.getRangeAt(0);
    var link = document.createElement('a');
    link.setAttribute('href', this._selurl);
    link.setAttribute('target', '_blank');
    if (settings.plain && this._decode) this._decode(link);
    link.appendChild(range.extractContents());
    range.insertNode(link);
  },
  handleEvent: function (e) {
    //console.log(e);
    this._decodable = false;
    this._convertable = false;
    var selection = window.getSelection();
    if (!selection.isCollapsed) {
      var text, match, protocol;
      if (selection.rangeCount == 1 && (text = selection.toString().trim()) && text.length < 1000
          && (match = UrlPattern.exec(text)) && match[2] && (protocol = match[2].toLowerCase()) in Protocols) {
        this._selection = selection;
        this._decode = Protocols[protocol].decode;
        this._selurl = text;
        this._convertable = true;
      }
    } else {
      var link = e.target;
      while (link && link.tagName != 'A')
        link = link.parentNode;
      if (this._link = link) {
        var fixed = false;
        var found = false;
        for (var key in Protocols) {
          var protocol = Protocols[key];
          if (protocol.match(link)) {
            if ('fix' in protocol) protocol.fix(link);
            this._decode = protocol.decode;
            fixed = true;
            break;
          }
        }
        if (!fixed && (link.protocol in Protocols)) {
          this._decode = Protocols[link.protocol].decode;
          found = true;
        }
        if (fixed || found) {
          if (!settings.plain)
            this._decodable = !!this._decode;
          else if (this._decode)
            this._decode(link);
        }
      }
    }
    chrome.extension.sendRequest({
      topic: 'changeMenuItemVisibility',
      change: {
        decode: this._decodable,
        convert: this._convertable
      }
    });
  }
};

const extension = {
  _enabledAPs: {},
  handleRequest: function (aRequest, aSender, aResponse) {
    console.log(extension, arguments);
    switch (aRequest.topic) {
      case 'decode':
        if (ContextMenu._decodable) ContextMenu._decode(ContextMenu._link);
        break;
      case 'convert':
        if (ContextMenu._convertable) ContextMenu._convert();
        break;
      case 'updateConfig':
        extension.updateSettings(aRequest.settings);
        break;
      case 'process':
        extension.process();
        break;
    }
  },
  updateSettings: function (aSettings) {
    settings = aSettings;
    for (var key in AutomaticProtocols) {
      var exp = settings[key];
      if ((key in this._enabledAPs) ^ exp) {
        if (exp)
          this._enabledAPs[key] = AutomaticProtocols[key];
        else
          delete this._enabledAPs[key];
      }
    }
  },
  autoProcess: function() {
    var nodes = document.getElementsByTagName('a');
    for (var i = 0, node, u = Math.min(nodes.length, 400); i < u; i++) {
      var node = nodes[i];
      for (var key in this._enabledAPs) {
        var protocol = this._enabledAPs[key];
        if (protocol.match(node)) {
          protocol.fix(node);
          if (settings.plain) protocol.decode(node);
          break;
        }
      }
    }
  },
  process: function(doc) {
    var nodes = document.getElementsByTagName('a');
    for (var i = 0, node, u = Math.min(nodes.length, 2000); i < u; i++) {
      var node = nodes[i];
      for (var key in Protocols) {
        var protocol = Protocols[key];
        if (protocol.match(node)) {
          if ('fix' in protocol) protocol.fix(node);
          if (settings.plain && 'decode' in protocol) protocol.decode(node);
          break;
        }
      }
    }
  },
  init: function () {
    chrome.extension.sendRequest({ topic: 'getConfig' }, function(s) {
      extension.updateSettings(s);
      if (settings.auto) extension.autoProcess();
    });
    chrome.extension.onRequest.addListener(this.handleRequest);
    window.addEventListener('contextmenu', ContextMenu);
  }
};

extension.init();
