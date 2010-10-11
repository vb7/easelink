const UrlPattern = /^(([a-zA-Z][0-9a-zA-Z+\-\.]*\:)?\/{0,2}([0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]+))?([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const Base64Pattern = /^([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/\/((?:[A-Za-z0-9\+\/]{4})+(?:[A-Za-z0-9\+\/]{2}==|[A-Za-z0-9\+\/]{3}=)?)([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}$/;
const PartialBase64Pattern = /([a-zA-Z][0-9a-zA-Z+\-\.]*\:)\/\/((?:[A-Za-z0-9\+\/]{4})+(?:[A-Za-z0-9\+\/]{2}==|[A-Za-z0-9\+\/]{3}=)?)([#\?](?:[0-9a-zA-Z;\/:@&=\+\$\.\-_\!~\*'\(\)%]*)){0,2}/g;

var gSettings = {};

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

/* IProtocol Definitions */

const IAutomaticProtocolThunder = {
  xpath: '[@thunderhref]',
  fix: defaultFixer('thunderhref'),
  decode: defaultDecoder(2, 2)
};

const IAutomaticProtocolQQXuanFeng = {
  xpath: '[@qhref]',
  fix: defaultFixer('qhref'),
  decode: defaultDecoder(0, 0)
};

const IProtocolFlashget = {
  xpath: "[count(@*[contains(translate(., 'FLASHGET', 'flashget'), 'flashget://')])>0]",
  fix: function (node) {
    var match;
    if (node.protocol != 'flashget:')
      for (var i = 0; i < node.attributes.length; ++i)
        if ((match = PartialBase64Pattern.exec(node.attributes[i].nodeValue)) && match[1].toLowerCase() == 'flashget:') {
          node.removeAttribute(node.attributes[i].nodeName);
          node.setAttribute('href', match[0]);
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
  xpath: "[@href and translate(substring(@href, 1, 7), 'FSYOU', 'fsyou') = 'fs2you:']",
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
  xpath: "[@href and translate(substring(@href, 1, 19), 'HTPWAQCOM', 'htpwaqcom') = 'http://wpa.qq.com/']",
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
  xpath: "[@href and translate(substring(@href, 1, 12), 'JAVSCRIPT', 'javscript') = 'javascript:' and contains(translate(@href, 'NAMIPCO', 'namipco'), '.namipan.com')]",
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
    if (gSettings.plain && this._decode) this._decode(link);
    link.appendChild(range.extractContents());
    range.insertNode(link);
  },
  handleEvent: function (evt) {
    console.log(evt);
    this._decodable = false;
    this._convertable = false;
    var sel = window.getSelection();
    var link = evt.target;
    while (link && link.tagName != 'A')
      link = link.parentNode;
    if (this._link = link) {
      var fixed = false;
      var found = false;
      for (var key in Protocols) {
        var protocol = Protocols[key];
        if (document.evaluate('self::node()' + protocol.xpath, link, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
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
        if (!gSettings.plain)
          this._decodable = !!this._decode;
        else if (this._decode)
          this._decode(link);
      }
    } else if (!sel.isCollapsed) {
      var text, match, protocol;
      if (sel.rangeCount == 1 && (text = sel.toString().trim()) && text.length < 1000
          && (match = UrlPattern.exec(text)) && match[2] && (protocol = match[2].toLowerCase()) in Protocols) {
        this._selection = sel;
        this._decode = Protocols[protocol].decode;
        this._selurl = text;
        this._convertable = true;
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
        gSettings = aRequest.settings;
        break;
      case 'process':
        extension.process();
        break;
    }
  },
  autoProcess: function() {
    var iterator, node, nodes = [];
    for (var key in extension._enabledAPs) {
      var protocol = extension._enabledAPs[key];
      iterator = document.evaluate('self::node()//a' + protocol.xpath, document.documentElement, null, XPathResult.ANY_TYPE, null);
      while (!iterator.invalidIteratorState && (node = iterator.iterateNext()) && nodes.length <= 10)
        nodes.push(node);
      while ((node = nodes.pop()) || nodes.length) {
        protocol.fix(node);
        if (gSettings.plain) protocol.decode(node);
      }
    }
  },
  process: function() {
    var iterator, node, nodes = [];
    for (var key in Protocols) {
      var protocol = Protocols[key];
      iterator = document.evaluate('self::node()//a' + protocol.xpath, document.documentElement, null, XPathResult.ANY_TYPE, null);
      while (!iterator.invalidIteratorState && (node = iterator.iterateNext()) && nodes.length <= 50)
        nodes.push(node);
      while ((node = nodes.pop()) || nodes.length) {
        if ('fix' in protocol) protocol.fix(node);
        if (gSettings.plain && 'decode' in protocol) protocol.decode(node);
      }
    }
  },
  init: function () {
    chrome.extension.sendRequest({ topic: 'getConfig' }, function(aSettings) {
      gSettings = aSettings;
      var auto = false;
      for (var key in AutomaticProtocols)
        if (gSettings[key]) {
          extension._enabledAPs[key] = AutomaticProtocols[key];
          auto = true;
        }
      if (auto) extension.autoProcess();
    });
    chrome.extension.onRequest.addListener(this.handleRequest);
    window.addEventListener('contextmenu', ContextMenu);
  }
};

extension.init();
