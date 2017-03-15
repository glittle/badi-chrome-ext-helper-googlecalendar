/* Code by Glen Little */

/*
 */
var browser = {
  Chrome: 'Chrome',
  Firefox: 'Firefox',
  Edge: 'Edge'
};
var browserHostType = browser.Chrome;

var BackgroundModule = function () {

  function installed(info) {
    if (info.reason == 'update') {
      setTimeout(function () {
        var newVersion = chrome.runtime.getManifest().version;
        var oldVersion = localStorage.updateVersion;
        if (newVersion !== oldVersion) {
          console.log(oldVersion + ' --> ' + newVersion);
          var url = getMessage(browserHostType + '_History');
          // console.log('opening', url);

          chrome.tabs.create({
            url: url + '?{0}'.filledWith(
              chrome.runtime.getManifest().version)
          });
          localStorage.updateVersion = newVersion;
        } else {
          console.log(newVersion);
        }
      }, 1000);
    } else {
      console.log(info);
    }
  }

  function showErrors() {
    var msg = chrome.runtime.lastError;
    if (msg) {
      console.log(msg);
    }
  }

  function prepare() {
    if (browserHostType === browser.Chrome) {
      chrome.runtime.onInstalled.addListener(installed);
    }

    console.log('prepared background in gCal');
  }

  return {
    prepare: prepare
  };
}

var _backgroundModule = new BackgroundModule();

$(function () {
  _backgroundModule.prepare();
});
