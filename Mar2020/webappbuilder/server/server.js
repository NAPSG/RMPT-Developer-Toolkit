/*
Copyright © 2014 - 2018 Esri. All rights reserved.

TRADE SECRETS: ESRI PROPRIETARY AND CONFIDENTIAL
Unpublished material - all rights reserved under the
Copyright Laws of the United States and applicable international
laws, treaties, and conventions.

For additional information, contact:
Attn: Contracts and Legal Department
Environmental Systems Research Institute, Inc.
380 New York Street
Redlands, California, 92373
USA

email: contracts@esri.com
*/

/* global __dirname, global, process*/
/* jshint es3: false */
/**
 * Module dependencies.
 */
var requirejs = require('requirejs');
requirejs.config({
  nodeRequire: require,
  baseUrl: '../client',
  paths: {
    'jimu': 'stemapp/jimu.js',
    'widgets': 'stemapp/widgets',
    'themes': 'stemapp/themes',
    'jimu3d': 'stemapp3d/jimu.js',
    'widgets3d': 'stemapp3d/widgets',
    'themes3d': 'stemapp3d/themes'
  }
});

var express = require('express');
var utils = require('./utils');
var appRest = require('./rest/apps');
var themeRest = require('./rest/themes');
var widgetRest = require('./rest/widgets');
var signinInfoRest = require('./rest/signininfo');
var repoRest = require('./rest/repo');
var net = require('net');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var proxy = require('./proxy');
var dbEngine = require('./db-engine');
var log4js = require('log4js');
var pluginsFinder = require('../client/builder/plugins/plugins-finder');

//middlewares
var bodyParser = require('body-parser');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var multer = require('multer');

var app = express();

var config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
global.config = config;

/**********************get command line parameter*************/
var args = readArgs();
if(typeof args.watch === 'undefined'){
  args.watch = true;
}
global.args = args;
/*************************************************************/

/*********************init logger*****************************/
if (!fs.existsSync(__dirname + '/logs')) {
  fs.mkdirSync(__dirname + '/logs');
}
log4js.configure('log4js.json');
var logger = log4js.getLogger('default');
/*************************************************************/

/*******************read plugins******************************/
pluginsFinder.setFse(require('fs-extra'));
pluginsFinder.readAllPlugins();
/*************************************************************/

/*******************init db***********************************/
var db = dbEngine.getDB();
global.db = db;
/*************************************************************/

/*******************init server*******************************/
setEnv();
useMiddleWares();
cacheControl();
mapUrl();

var options = {
  key: fs.readFileSync('./cakey.pem'),
  cert: fs.readFileSync('./cacert.pem')
};

var basePort = app.get('port');
var httpPort, httpsPort;
if (basePort === '80') {
  httpPort = '80';
  httpsPort = '443';
} else {
  httpPort = parseInt(basePort, 10) + 1;
  httpsPort = parseInt(basePort, 10) + 2;

  console.log('Server listening tcp connection on port ' + basePort + ' in ' +
    app.get('env') + ' mode');
  net.createServer({
    allowHalfOpen: true
  }, onTcpConnection).listen(basePort);
}

http.createServer(app).listen(httpPort, function() {
  console.log('Server listening http connection on port ' + httpPort + ' in ' +
    app.get('env') + ' mode');
});

https.createServer(options, app).listen(httpsPort, function() {
  console.log('Server listening https connection on port ' + httpsPort + ' in ' +
    app.get('env') + ' mode');
});
/*************************************************************/

/*******************refresh repo items*******************************/
repoRest.initWorkingRepositories();
/*************************************************************/

/*******************init predefined apps*******************************/
appRest.initPredefinedApps();
/*************************************************************/

/*******************utils functions****************************/

String.prototype.startWith = function(str) {
  if (this.substr(0, str.length) === str) {
    return true;
  } else {
    return false;
  }
};

String.prototype.endWith = function(str) {
  if (this.substr(this.length - str.length, str.length) === str) {
    return true;
  } else {
    return false;
  }
};

/*************************************************************/

/*******************private functions*************************/
//Somtimes not work with "multipart/form-data", so need to refresh page when finish upload
function onTcpConnection(conn) {
  conn.once('data', function (buf) {
    try {
      // A TLS handshake record starts with byte 22.
      var address, byte = buf[0];
      if (byte === 22) {
        address = httpsPort;
      } else if (32 < byte && byte < 127) {
        address = httpPort;
      } else {
        logger.debug('tcp protocol proxy error');
      }

      var proxy = net.createConnection(address, function () {
        try {
          proxy.write(buf);
          conn.pipe(proxy).pipe(conn);
        } catch (err) {
          logger(err);
        }
      });

      proxy.on('error', function () {
        logger.debug('on tcp proxy error');
      });
    } catch (err) {
      logger(err);
    }
  });

  conn.on('error', function() {
    // logger.debug('on tcp error');
  });
}

function setEnv() {
  if (!fs.existsSync(__dirname + '/uploads')) {
    fs.mkdirSync(__dirname + '/uploads');
  }

  app.set('port', args.port || process.env.PORT || 3344);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
}

function useMiddleWares() {
  app.use(log4js.connectLogger(log4js.getLogger('express')));

  app.use(cookieParser());
  app.use(compression());

  app.use(bodyParser.text());
  app.use(bodyParser.json());
  //parse form
  app.use(bodyParser.urlencoded({
    extended: false,
    limit: '50mb'
  }));
  //parse zip
  // app.use(bodyParser.raw({
  //   limit: '50mb'
  // }));

  //for parsing multipart/form-data
  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname + Date.now());//for upload more then 1 time
    }
  });
  app.use(multer({ storage: storage }).any());

  //support cors
  app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD, OPTIONS');
    next();
  });

  app.use(function(req, res, next) {
    if (req.method === "GET" && req.url === '/webappviewer') {
      //add end slash to /webappviewer
      res.writeHead(301, {
        "Location": req.url + '/'
      });
      res.end();
    }else if(req.url === '/'){
      res.redirect('/webappbuilder/');
      return;
    }
    next();
  });

  //set isXT variable
  app.use(function(req, res, next) {
    if (/env.js$/.test(req.path)) {
      var envContent;
      if(req.path.startWith('/webappbuilder/apps')){
        envContent = fs.readFileSync(path.join(__dirname, req.path.replace('/webappbuilder', '')),
          'utf-8');
      }else if(req.path.startWith('/webappbuilder')){
        envContent = fs.readFileSync(path.join(__dirname, '..',
          req.path.replace('/webappbuilder', 'client')), 'utf-8');
      }else if(req.path.startWith('/webappviewer')){
        envContent = fs.readFileSync(path.join(__dirname, '..',
          req.path.replace('/webappviewer', 'client/stemapp')), 'utf-8');
      }else if(req.path.startWith('/web3d')){
        envContent = fs.readFileSync(path.join(__dirname, '..',
          req.path.replace('/web3d', 'client/builder/plugins/stemapps/web3d')), 'utf-8');
      }else if(req.path.startWith('/client')){//for test env
        envContent = fs.readFileSync(path.join(__dirname, '..',
          req.path.replace('/client', 'client')), 'utf-8');
      }

      //logger.info('Set isXT = true;', req.path);
      res.type('application/javascript')
         .send(envContent.replace('//isXT = true;', 'isXT = true;'));
      return;
    }
    next();
  });

  //force set portal URL and sign in
  app.use(function(req, res, next) {
    if (!/webappbuilder$/.test(req.path) &&
      !/webappbuilder\/$/.test(req.path) &&
      !/webappbuilder\/index.html$/.test(req.path) ||
      req.query.action === 'setportalurl') {
      next();
      return;
    }

    var redirectUrl;
    if(!req.cookies.wab_portalurl_persistent){
      if (req.url.indexOf('?') > -1 && !req.url.endWith('?')) {
        if (req.query.action) {
          redirectUrl = req.url.replace(/(action=)(.+)/, '$1setportalurl');
        } else {
          redirectUrl = req.url + '&action=setportalurl';
        }
      } else if (req.url.endWith('?')) {
        redirectUrl = req.url + 'action=setportalurl';
      } else {
        redirectUrl = req.url + '?action=setportalurl';
      }
      logger.info('No portal URL is set, redirect', req.url, 'to', redirectUrl);
      res.redirect(redirectUrl);
      return;
    }

    if (req.query.action === 'signin') {
      next();
      return;
    }

    var info = signinInfoRest.getSignInInfoByPortalUrlApi(req.cookies.wab_portalurl_persistent);
    //if portal uses web-tier authorization, we should not check token from cookie
    //let user sigin in IWA portal in the front end
    if(info && info.isWebTier){
      logger.info("Portal " + info.portalUrl + ' uses web-tier authorization.');
    }else{
      if (!info || !utils.getTokenFromRequest(info.portalUrl, req)) {
        //the request url has not action for now

        //if user don't signin, redirect to set portal url page.
        if (req.url.indexOf('?') > -1 && !req.url.endWith('?')) {
          redirectUrl = req.url + '&action=setportalurl';
        } else if (req.url.endWith('?')) {
          redirectUrl = req.url + 'action=setportalurl';
        } else {
          redirectUrl = req.url + '?action=setportalurl';
        }
        logger.info('No token is found, redirect', req.url, 'to', redirectUrl);
        res.redirect(redirectUrl);
        return;
      }
    }

    next();
  });

  //redirect url
  app.use(function(req, res, next) {
    if (req.method === "GET" && /(stemapp|stemapp\/|stemapp\/index.html)\?id=(.+)/.test(req.url)) {
      var appId = req.param('id');
      var query = '';
      for (var p in req.query) {
        if (p === 'id' || p === 'ispredefined') {
          continue;
        }
        if (query === '') {
          query = '?' + p + '=' + req.param(p);
        } else {
          query = query + '&' + p + '=' + req.param(p);
        }
      }

      var appUrl;
      if(req.param('ispredefined')){
        var i = appId.indexOf('_');
        var appType = appId.substr(0, i);
        appId = appId.substr(i + 1);
        var stemappName = appType === 'HTML'? 'stemapp': 'stemapp3d';
        if(query){
          appUrl = '/webappbuilder/' + stemappName + '/' + query +
            '&config=/webappbuilder/' + stemappName + '/predefined-apps/' + appId + '/config.json';
        }else{
          appUrl = '/webappbuilder/' + stemappName + '/' +
            '?config=/webappbuilder/' + stemappName + '/predefined-apps/' + appId + '/config.json';
        }
      }else{
        appUrl = '/webappbuilder/apps/' + appId + query;
      }
      res.redirect(appUrl);
      logger.info('redirect ', req.url, 'to', appUrl);
      return;
    }
    next();
  });

  // development only
  if ('development' === app.get('env')) {
    setupDevEnv();
  }

  //404
  app.use(function(req, res, next){
    var url = req.url.toLowerCase();
    if((/webappbuilder\/apps\/[0-9]+\/?(index\.html)?$/gi).test(url)){
      //examples:
      //http://server:3344/webappbuilder/apps/2
      //http://server:3344/webappbuilder/apps/2/
      //http://server:3344/webappbuilder/apps/2/index.html
      var splits = url.split("webappbuilder/apps/");
      if(splits.length > 0){
        var split = splits[splits.length - 1];
        var splits2 = split.split("/");
        if(splits2.length > 0){
          var strAppId = splits2[0];
          //var appId = parseInt(strAppId, 10);
          //console.log(appId);
          var folderPath = path.join(__dirname, "apps", strAppId);

          if(!fs.existsSync(folderPath)){
            var url404 = "/webappbuilder/404.html";
            res.redirect(url404);
            logger.info("redirect", req.url, 'to', url404);
            return;
          }
        }
      }
    }
    next();
  });

  app.use(function(err, req, res, next) {
    logger.error(err.stack);
    res.send(500, 'Something broke!');
    /*jshint unused: false*/
  });
}

function setupDevEnv() {
  // register dojo source version for use in unit tests
  var devDojoPath;
  if (args.pathDevDojo && fs.existsSync(args.pathDevDojo)) {
    devDojoPath = args.pathDevDojo;
  } else if (fs.existsSync(path.join(__dirname, '../client/libs/dojo'))) {
    devDojoPath = path.join(__dirname, '../client/libs/dojo');
  }
  if (devDojoPath) {
    console.log("register /dojo -> " + devDojoPath);
    app.use('/dojo', express.static(devDojoPath));
  }

  // register local provided js api (the folder must directly contain the "js" folder of the api, no version number sub directory)
  if (args.pathDevJsapi && fs.existsSync(args.pathDevJsapi)) {
    mapJsApi('arg', args.pathDevJsapi);
  } else if (fs.existsSync(path.join(__dirname, '../client/libs/arcgis_js_api'))) {
    fs.readdirSync(path.join(__dirname, '../client/libs/arcgis_js_api')).forEach(function(file) {
      mapJsApi(file, path.join(__dirname, '../client/libs/arcgis_js_api', file));
    });
  }

  function mapJsApi(name, path) {
    console.log("register /arcgis_js_api/" + name + " -> " + path);
    app.use('/arcgis_js_api/' + name, express.static(path));
    app.get('/arcgis_js_api/' + name, function(req, res) {
      res.sendfile(path + '/js/dojo/dojo/dojo.js');
    });
  }
}

function mapUrl() {
  app.use('/proxy.js', proxy.proxyRequest());
  app.use('/webappviewer', express.static(path.join(__dirname, '../client/stemapp')));
  app.use('/webappviewer3d', express.static(path.join(__dirname, '../client/stemapp3d')));
  app.use('/web3d', express.static(path.join(__dirname, '../client/builder/plugins/stemapps/web3d')));
  app.use('/webappbuilder', express.static(path.join(__dirname, '../client')));
  app.use('/webappbuilder/apps', express.static(path.join(__dirname, './apps')));

  //for test
  app.use('/client', express.static(path.join(__dirname, '../client')));
  app.use('/tests', express.static(path.join(__dirname, '../tests')));
  app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));
  //~~for test

  app.use('/widgets/', express.static(path.join(__dirname, '../client/stemapp/widgets')));
  app.use('/themes/', express.static(path.join(__dirname, '../client/stemapp/themes')));

  var helpExists;
  if(fs.existsSync(path.join(__dirname, '../docs/cxhelp.js'))){
    helpExists = true;
    app.use('/webappbuilder/help', express.static(path.join(__dirname, '../docs')));
  }else{
    logger.info("No help found.");
    helpExists = false;
  }

  app.get('/webappbuilder/help/exists', function(req, res){
    /*jshint unused:true*/
    res.send({
      exists: helpExists
    });
  });

  /************** app rest *******************/
  app.all('/webappbuilder/rest/*', function(req, res, next){
    if(/\/webappbuilder\/rest\/apps\/.+\/download/.test(req.url) ||
      /\/webappbuilder\/rest\/apps\/.+\/downloadagoltemplate/.test(req.url)){
      //for download file, do not add content-type header.
      res.set('Cache-Control', 'no-cache');
    }else{
      res.set('Content-Type', 'application/json;charset=utf-8');
      res.set('Cache-Control', 'no-cache');
    }
    next();
  });

  app.get('/webappbuilder/rest/apps/list', appRest.getAppList);
  app.get('/webappbuilder/rest/apps/templatelist', appRest.getTemplateList);
  app.get('/webappbuilder/rest/apps/:appId', appRest.getApp);
  app.get('/webappbuilder/rest/apps/:appId/download', appRest.download);
  app.get('/webappbuilder/rest/apps/:appId/downloadagoltemplate', appRest.downloadAGOLTemplate);

  app.post('/webappbuilder/rest/apps/checkversion', appRest.checkAppVersion);
  app.post('/webappbuilder/rest/apps/importportalapp', appRest.importPortalApp);
  app.post('/webappbuilder/rest/apps/upload', appRest.uploadZipApp);

  app.post('/webappbuilder/rest/apps/updateapp', appRest.updateApp);
  app.post('/webappbuilder/rest/apps/updateagoltemplateinapp', appRest.updateAgolTemplateInApp);
  app.post('/webappbuilder/rest/apps/createapp', appRest.createApp);
  app.post('/webappbuilder/rest/apps/removeapp', appRest.removeApp);
  app.post('/webappbuilder/rest/apps/duplicateapp', appRest.duplicateApp);
  app.post('/webappbuilder/rest/apps/:appId/saveconfig', appRest.saveAppConfig);
  app.post('/webappbuilder/rest/apps/:appId/saveas', appRest.saveAs);
  app.post('/webappbuilder/rest/apps/:appId/copywidget', appRest.copyWidgetToApp);
  app.post('/webappbuilder/rest/apps/:appId/copytheme', appRest.copyThemeToApp);

  /****************** rest *******************/
  //app.post('/webappbuilder/rest/cropimage', utils.cropImage);

  /************** theme rest *******************/
  app.get('/webappbuilder/rest/themes/search', themeRest.searchThemes);

  /************** widget rest *******************/
  app.get('/webappbuilder/rest/widgets/search', widgetRest.searchWidgets);
  /************** signin rest ***********************/
  app.get('/webappbuilder/rest/signininfo/getsignininfos', signinInfoRest.getSignInInfos);
  app.get('/webappbuilder/rest/signininfo/getsignininfo', signinInfoRest.getSignInInfoByPortalUrl);
  app.post('/webappbuilder/rest/signininfo/setsignininfo', signinInfoRest.setSigninInfo);
}

function readArgs(){
  var _args = process.argv.splice(2);
  var args = {};
  _args.forEach(function(arg) {
    var a = arg.split('=');
    var param = a[0];
    var val = a[1];
    switch (param) {
      case "-port":
        args.port = val;
        break;
      case "-proxy":
        args.proxy = val;
        break;
      case "-jsapi":
        args.pathDevJsapi = val;
        break;
      case "-dojo":
        args.pathDevDojo = val;
        break;
      case "-sslClientVersion":
        //available options are: SSLv2_method, SSLv3_method, TLSv1_method,
        //if not set, the value is SSLv23_method
        //https://www.openssl.org/docs/ssl/ssl.html#DEALING_WITH_PROTOCOL_METHODS
        args.sslClientVersion = val;
        break;
      case "-watch":
        args.watch = JSON.parse(val);
        break;
    }
  });

  if(args.proxy){
    if(!/^http/.test(args.proxy)){
      args.proxy = 'http://' + args.proxy;
    }
    console.log('Server using proxy: ' + args.proxy);
  }
  return args;
}

function cacheControl() {
  var cacheTime = (60 * 60 * 24) * 30;//30 days
  // /webappbuilder/stemapp/libs/* && /webappbuilder/apps/*/libs/*
  app.all('/webappbuilder/*/libs/*', function (req, res, next) {
    /*jshint unused:true*/
    res.setHeader('Cache-Control', 'max-age=' + cacheTime);
    next();
  });
  // webappbuilder/builder/
}