#ifdef DEBUG
#define assert(x) if (!(x)) debug('assertion failed: ' + #x)
#ifdef __BROWSER_FIREFOX
#define debug(x) Sc.logStringMessage((x) + ' (' + __FILE__ + ', line: ' + __LINE__ + ')')
#else
#define debug(x) console.log((x) + ' (' + __FILE__ + ', line: ' + __LINE__ + ')')
#endif //__BROWSER_FIREFOX
#else
#define assert(x)
#define debug(x)
#endif //DEBUG