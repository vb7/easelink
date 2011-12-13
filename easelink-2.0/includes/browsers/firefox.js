var EXPORTED_SYMBOLS = ['EaseLink'];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm} = Components;
Cu.import('resource://gre/modules/Services.jsm');
const {io: Si} = Services;
#ifdef DEBUG
const {console: Sc} = Services;
#endif
const Su = Cc['@mozilla.org/intl/scriptableunicodeconverter'].getService(Ci.nsIScriptableUnicodeConverter);  

const kClassName = 'Ease Link Protocol Handler';
const kContractIDBase = '@mozilla.org/network/protocol;1?name=';
const kFailedURI = Si.newURI('http://www.google.com/', null, null);

const kFixerPrototype = {
  test: $false,
  fix: $nop
};

const kProtocolHandlerPrototype = {
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,
  allowPort: $false,
  defaultPort: -1,
  QueryInterface: function(aIID) {
    if (!aIID.equals(Ci.nsIProtocolHandler) && !aIID.equals(Ci.nsISupports))
      throw Cr.NS_ERROR_NO_INTERFACE;
    return this;
  },
  newChannel: function(aURI) {
    return Si.newChannelFromURI(aURI)
  },
  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    try {
      return Si.newURI(this.decode(aSpec), aOriginCharset, aBaseURI)
    } catch(e) {
      debug(e.toString());
      return kFailedURI;
    }
  },
  createInstance: function(aOuter, aIID) {
    if (aOuter != null) throw Cr.NS_ERROR_NO_AGGREGATION;
    return this.QueryInterface(aIID);
  },
  decode: $equal
};

function expandFixer(handler) {
  return $extend(handler, kFixerPrototype);
};

function expandProtocolHandler(handler) {
  return $extend(handler, kProtocolHandlerPrototype);
};
