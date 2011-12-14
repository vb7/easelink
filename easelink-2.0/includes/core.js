const kURIPattern = /^([a-z][a-z0-9]+)\:\/\/([a-z0-9\+\/]+=*)([#\?&].*)?\s*$/i;

const EaseLink = {
  protocolHandler: {
    available: {},
    enabled: {}
  },
  fixer: {
    available: [],
    fast: []
  },
#ifdef __BROWSER_FIREFOX
  isDecodeable: function(url) {
    var match = kURIPattern.exec(url);
    if (match && match[1]) {
      var scheme = match[1].toLowerCase();
      debug(scheme);
      for each (var handler in this.protocolHandler.available)
        if (scheme == handler.scheme)
          return true;
    }
    return false;
  },
#else
  tryDecode: function(url) {
    var match = kURIPattern.exec(url);
    if (match && match[1]) {
      var scheme = match[1].toLowerCase();
      for (var key in this.protocolHandler.available) {
        var handler = this.protocolHandler.available[key];
        if (scheme == handler.scheme)
          return handler.decode(url);
      }
    }
    return null;
  },
#endif
  tryFix: function(node) {
    var handlers = this.fixer.available;
    for (var i = 0; i < handlers.length; i++)
      if (handlers[i].test(node)) {
        handlers[i].fix(node);
#ifndef __BROWSER_FIREFOX
        if (this.protocolHandler.enabled.hasOwnProperty(handers[i].key))
          node.href = handlers[i].decode(node.href);
#endif
        return true;
      }
    return false;
  },
  addHandler: function(handler) {
    if (handler.type & EASELINK_HANDLER_TYPE_FIXER) {
      var fixer = expandFixer(handler);
      this.fixer.available.push(fixer);
      if (fixer.hasOwnProperty('selector'))
        this.fixer.fast.push(fixer);
    }
    if (handler.type & EASELINK_HANDLER_TYPE_PROTOCOL)
      this.protocolHandler.available[handler.key] = expandProtocolHandler(handler);
  },
  enableProtocolHandler: function(key) {
    assert(key in this.protocolHandler.available);
#ifdef __BROWSER_FIREFOX
    var handler = this.protocolHandler.available[key];
    Cm.nsIComponentRegistrar.registerFactory(handler.classId, 'Ease Link Protocol Handler',
      '@mozilla.org/network/protocol;1?name=' + handler.scheme, handler);
    this.protocolHandler.enabled[key] = handler;
#else
    this.protocolHandler.enabled[key] = this.protocolHandler.available[key];
#endif
  },
  disableProtocolHandler: function(key) {
    assert(key in this.protocolHandler.enabled);
#ifdef __BROWSER_FIREFOX
    var handler = this.protocolHandler.enabled[key];
    Cm.nsIComponentRegistrar.unregisterFactory(handler.classId, handler);
#endif
    delete this.protocolHandler.enabled[key];
  },
#ifdef __BROWSER_FIREFOX
  diableAllProtocolHandlers: function() {
    for (var key in this.protocolHandler.enabled)
      this.disableProtocolHandler(key);
  },
#endif
  processPage: function(document) {
#ifdef DEBUG
    var time = new Date();
#endif
    var handlers = this.fixer.fast;
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      var nodes = document.querySelectorAll(handler.selector);
      var fix = handler.fix;
#ifdef __BROWSER_FIREFOX
      for (var j = 0; j < nodes.length; j++)
        fix(nodes[j]);
#else
      var decode = this.protocolHandler.enabled.hasOwnProperty(key) ? handler.decode : null;
      for (var j = 0; j < nodes.length; j++) {
        fix(nodes[j]);
        if (decode) nodes[j].href = decode(nodes[j].href);
      }
#endif
    }
    debug(new Date() - time);
  }
};