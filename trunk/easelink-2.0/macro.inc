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