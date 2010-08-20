function PrefBranch (prefix) {
  this.prefix = prefix;
}

PrefBranch.prototype = {
  getBoolPref: function (name) {
    return this._get(name) == 'true';
  },
  setBoolPref: function (name, value) {
    return this._set(name, value);
  },
  getIntPref: function (name) {
    return parseInt(this._get(name));
  },
  setIntPref: function (name, value) {
    return this._set(name, value);
  },
  getCharPref: function (name) {
    return this._get(name);
  },
  setCharPref: function (name, value) {
    return this._set(name, value);
  },
  _set: function (name, value) {
    localStorage[this.prefix + name] = value;
  },
  _get: function (name) {
    return localStorage[this.prefix + name];
  }
};
