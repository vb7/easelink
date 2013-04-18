window.addEventListener('load', function () {
  var prefBranch = new PrefBranch('');
  function handleChange(e) {
    prefBranch.setBoolPref(e.target.name, e.target.checked);
  }
  var inputs = document.getElementsByTagName('input');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].checked = prefBranch.getBoolPref(inputs[i].name);
    inputs[i].addEventListener('change', handleChange);
    var i18nkeys = inputs[i].title.split(',');
    inputs[i].nextSibling.innerHTML = chrome.i18n.getMessage(i18nkeys[0], [chrome.i18n.getMessage(i18nkeys[1])]);
  }
});
