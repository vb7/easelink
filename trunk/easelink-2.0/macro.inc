#ifdef DEBUG
#define assert(x) if (!(x)) debug('assertion failed: ' + #x)
#ifdef __BROWSER_FIREFOX
#define debug(args...) Sc.logStringMessage([args].join(', ') + ' (' + __FILE__ + ', line: ' + __LINE__ + ')')
#else
#define debug(args...) console.log(args, ' (' + __FILE__ + ', line: ' + __LINE__ + ')')
#endif //__BROWSER_FIREFOX
#else
#define assert(x)
#define debug(x)
#endif //DEBUG

#define EASELINK_HANDLER_TYPE_FIXER 1
#define EASELINK_HANDLER_TYPE_PROTOCOL 2

#define STR(v) #v
#define EASELINK_GUIDE_URL 'http://code.google.com/p/easelink/wiki/guide-' + __BROWSER
#define EASELINK_DECODE_FAIL_URL 'http://code.google.com/p/easelink/wiki/failed'