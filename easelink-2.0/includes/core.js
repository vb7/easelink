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
#ifdef __BROWSER_FIREFOX
    for each (var handler in this.protocolHandler.available)
      if (url.slice(0, handler.scheme.length) == handler.scheme)
        return handler.key;
#else
    var handlers = this.protocolHandler.available;
    for (var key in handlers) {
      var scheme = handlers[key].scheme;
      if (url.slice(0, scheme.length) == scheme)
        return key;
    }
#endif
    return null;
  },
  isFixable: function(node) {
#ifdef __BROWSER_FIREFOX
    for each (var handler in this.fixer.enabled)
      if (handler.test(node))
        return handler.key;
#else
    var handlers = this.fixer.enabled;
    for (var key in handlers)
      if (handlers[key].test(node))
        return key;
#endif
    return null;
  },
  addHandler: function(handler) {
    if (handler.type & kEaseLinkFixer)
      this.fixer.available[handler.key] = expandFixer(handler);
    if (handler.type & kEaseLinkProtocolHandler)
      this.protocolHandler.available[handler.key] = expandProtocolHandler(handler);
  },
  enableProtocolHandler: function(key) {
    assert(key in this.protocolHandler.available);
#ifdef __BROWSER_FIREFOX
    var handler = this.protocolHandler.available[key];
    Cm.nsIComponentRegistrar.registerFactory(handler.classId, kClassName, kContractIDBase + handler.scheme, handler);
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
  enableFixer: function(key) {
    assert(key in this.fixer.available);
    this.fixer.enabled[key] = this.fixer.available[key];
  },
  disableFixer: function(key) {
    assert(key in this.fixer.enabled);
    delete this.fixer.enabled[key];
  }
};