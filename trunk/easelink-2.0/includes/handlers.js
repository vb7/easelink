EaseLink.addHandler({
  key: 'thunder',
  name: 'thunder-name',
  description: 'thunder-description',
  type: kEaseLinkFixer | kEaseLinkProtocolHandler,
  test: generateTest('thunderhref'),
  selector: 'a[thunderhref]',
  fix: generateFix('thunderhref'),
#ifdef __BROWSER_FIREFOX
  classId: Components.ID('{4bc34150-0b67-11e1-be50-0800200c9a66}'),
#endif
  scheme: 'thunder',
  decode: generateDecode(2, 2)
});

EaseLink.addHandler({
  key: 'qqdl',
  name: 'qqdl-name',
  description: 'qqdl-description',
  type: kEaseLinkFixer | kEaseLinkProtocolHandler,
  test: generateTest('qhref'),
  selector: 'a[qhref]',
  fix: generateFix('qhref'),
#ifdef __BROWSER_FIREFOX
  classId: Components.ID('{67fdc7b9-82a4-4ce4-9f55-0a7a42a9fc20}'),
#endif
  scheme: 'qqdl',
  decode: generateDecode(0, 0)
});

EaseLink.addHandler({
  key: 'flashget',
  name: 'flashget-name',
  description: 'flashget-description',
  type: kEaseLinkFixer | kEaseLinkProtocolHandler,
  test: function(node) {
    for (var i = 0; i < node.attributes.length; i++)
      if ((/^flashget\:/i).test(node.attributes[i].value)) {
        node.setAttribue('flashgethref', node.attributes[i].value);
        return true;
      }
    return false;
  },
  fix: generateFix('flashgethref'),
#ifdef __BROWSER_FIREFOX
  classId: Components.ID('{e1abc120-f180-4c0f-af43-5a1f9f1913dd}'),
#endif
  scheme: 'flashget',
  decode: generateDecode(10, 10)
});

EaseLink.addHandler({
  key: 'rayfile',
  name: 'rayfile-name',
  description: 'rayfile-description',
  type: kEaseLinkProtocolHandler,
#ifdef __BROWSER_FIREFOX
  classId: Components.ID('{8af3ff9d-1493-42fa-9e55-0a8dfd58cd34}'),
#endif
  scheme: 'fs2you',
  decode: generateDecode(0, 0)
});

EaseLink.addHandler({
  key: 'namipan',
  name: 'nami-name',
  description: 'nami-description',
  type: kEaseLinkFixer,
  test: function(node) {
    if (node.protocol == 'javascript:' && node.href.indexOf('.namipan.com') > -1) {
      var url = node.href.split("'");
      if (url.length == 3) {
        node.setAttribute('namihref', decodeURIComponent(url[1]));
        return true;
      }
    }
    return false;
  },
  fix: generateFix('namihref')
});

EaseLink.addHandler({
  key: 'qqwpa',
  name: 'qqwpa-name',
  type: kEaseLinkFixer,
  test: function(node) {
    return /^http:\/\/wpa\.qq\.com/.test(node.href);
  },
  fix: function(node) {
    var url = node.getAttribute('href');
    var matches = PROTOCOL_PATTERNS.URI.exec(url), params;
    if (matches && (params = matches[3]) && params.length > 0) {
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
});