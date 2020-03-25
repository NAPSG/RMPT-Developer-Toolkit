// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.15/esri/copyright.txt and http://www.arcgis.com/apps/webappbuilder/copyright.txt for details.
/*global weinreUrl, loadResources, _loadPolyfills, loadingCallback, debug, allCookies, unescape */
/*jshint unused:false*/

var dojoConfig, isBuilder = true;

window.isBuilder = true;//important

//store hash here because IdentityManager will remove the hash info
window.originalHash = window.location.hash;
var oauthSuccess = window.originalHash.indexOf('access_token=') >= 0;
var oauthError = window.originalHash.indexOf('error=') >= 0 &&
  window.originalHash.indexOf("error_description=") >= 0;

var ie = (function() {

  var undef,
    v = 3,
    div = document.createElement('div'),
    all = div.getElementsByTagName('i');

  div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->';
  while(all[0]){
    div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->';
  }
  return v > 4 ? v : undef;
}());

if ((oauthSuccess || oauthError)) {
  var isEdge = window.navigator.userAgent.indexOf("Edge/") >= 0;

  if(isEdge || ie > 0){
    //After redirecting from signin page to this page, IdentityManager will set location.hash to
    //empty, sometimes this will lead to IE/Edge refresh. So we call pushState here to avoid this case.
    if (window.history.pushState) {
      var newUrl = window.location.href.replace(window.location.hash, "");
      window.history.pushState({ path: newUrl }, '', newUrl);
    }else{
      //IE9 doens't support pushState, we need to set location.hash to empty by ourself. And if hostname is "localhost",
      //we should not set location.hash to empty because it will lead to signing in repeatedly.
      if(ie > 8 && window.location.hostname.toLowerCase() !== "localhost"){
        window.location.hash = '';
      }
    }
  }
}

(function(argument) {
  if (ie < 8){
    var mainLoading = document.getElementById('main-loading');
    var appLoading = document.getElementById('app-loading');
    var ieNotes = document.getElementById('ie-note');
    appLoading.style.display = 'none';
    ieNotes.style.display = 'block';
    mainLoading.style.backgroundColor = "#fff";
    return;
  }

  if (!window.apiUrl) {
    console.error('no apiUrl.');
  } else if (!window.path) {
    console.error('no path.');
  } else {
    if(window.location.protocol === 'https:'){
      var reg = /^http:\/\//i;
      if(reg.test(window.apiUrl)){
        window.apiUrl = window.apiUrl.replace(reg, 'https://');
      }
      if(reg.test(window.path)){
        window.path = window.path.replace(reg, 'https://');
      }
    }

    /*jshint unused:false*/
    dojoConfig = {
      parseOnLoad: false,
      async: true,
      tlmSiblingOfDojo: false,
      has: {
        'extend-esri': 1
      }
    };

    setLocale();

    if (window.isRTL) {
      dojoConfig.has['dojo-bidi'] = true;
    }

    var resources = [
      window.apiUrl + 'dojo/resources/dojo.css',
      window.apiUrl + 'dijit/themes/claro/claro.css',
      window.apiUrl + 'esri/css/esri.css',
      window.path + 'stemapp/jimu.js/css/jimu-theme.css',
      window.path + 'builder/css/builder-theme.css',
      window.path + 'stemapp/libs/caja-html-sanitizer-minified.js',
      window.path + 'stemapp/libs/moment/twix.js',
      window.path + 'stemapp/libs/Sortable.js',

      window.path + 'stemapp/libs/cropperjs/cropperjs.js',
      window.path + 'stemapp/libs/cropperjs/cropper.css',

      //because we have jimu/dijit/GridLayout dijit, so we import this css here
      window.path + 'stemapp/libs/goldenlayout/goldenlayout-base.css',
      window.path + 'stemapp/libs/goldenlayout/goldenlayout-light-theme.css'
    ];

    if (window.apiUrl.substr(window.apiUrl.length - 'stemapp/arcgis-js-api/'.length,
      'stemapp/arcgis-js-api/'.length) === 'stemapp/arcgis-js-api/') {
      //after build, we put js api here
      //user can also download release api package and put here
      dojoConfig.baseUrl = window.path;
      dojoConfig.packages = [{
        name: "dojo",
        location: window.apiUrl + "dojo"
      }, {
        name: "dijit",
        location: window.apiUrl + "dijit"
      }, {
        name: "dojox",
        location: window.apiUrl + "dojox"
      }, {
        name: "put-selector",
        location: window.apiUrl + "put-selector"
      }, {
        name: "xstyle",
        location: window.apiUrl + "xstyle"
      }, {
        name: "dgrid",
        location: window.apiUrl + "dgrid"
      }, {
        name: "moment",
        location: window.apiUrl + "moment"
      }, {
        name: "esri",
        location: window.apiUrl + "esri"
      }, {
        name: "jimu",
        location: 'stemapp/jimu.js'
      }, {
        name: "libs",
        location: "stemapp/libs"
      }, {
        name: "dynamic-modules",
        location: "stemapp/dynamic-modules"
      }, {
        name: "builder",
        location: "builder"
      }, {
        name: "for3dSetting",
        location: "builder/for3dSetting"
      }];

      resources.push(window.apiUrl + '/dojo/dojo.js');
    } else {
      dojoConfig.baseUrl = window.apiUrl + 'dojo';
      dojoConfig.packages = [{
        name: "builder",
        location: window.path + "builder"
      }, {
        name: "jimu",
        location: window.path + 'stemapp/jimu.js'
      }, {
        name: "libs",
        location: window.path + "stemapp/libs"
      }, {
        name: "dynamic-modules",
        location: window.path + "stemapp/dynamic-modules"
      }, {
        name: "for3dSetting",
        location: window.path + "builder/for3dSetting"
      }];

      resources.push(window.apiUrl + 'init.js');
    }

    if (debug) {
      resources.push(weinreUrl);
    }

    loadResources(resources, null, function(url, loaded) {
      if (typeof loadingCallback === 'function') {
        loadingCallback(url, loaded, resources.length);
      }
    }, function() {
      continueLoad();

      function continueLoad(){
        if(typeof require === 'undefined'){
          if (window.console){
            console.log('Waiting for API loaded.');
          }
          setTimeout(continueLoad, 100);
          return;
        }

        _loadPolyfills("stemapp/", function() {
          window.avoidRequireCache(require);
          require(['jimu/main'], function() {
            require(['builder/main'], function() {
              loadingCallback('builder', resources.length + 1, resources.length);
            });
          });
        });
      }
    });
  }

  function setLocale(){
    if(window.queryObject.locale){
      dojoConfig.locale = window.queryObject.locale.toLowerCase();
      window._setRTL(dojoConfig.locale);
      return;
    }

    if(allCookies.esri_auth){
      /*jshint -W061 */
      var userObj = eval('(' + unescape(allCookies.esri_auth) + ')');
      if(userObj.culture){
        dojoConfig.locale = userObj.culture;
      }
    }
    if (allCookies.arcgisLocale) {
      dojoConfig.locale = allCookies.arcgisLocale.toLowerCase();
    }
    if (allCookies.wab_locale) {
      dojoConfig.locale = allCookies.wab_locale.toLowerCase();
    }
    if(!dojoConfig.locale){
      dojoConfig.locale = navigator.language ? navigator.language : navigator.userLanguage;
    }
    dojoConfig.locale = dojoConfig.locale.toLowerCase();
    window._setRTL(dojoConfig.locale);
  }
})();
