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
var fs = require('fs');
var dbEngine = require('./db-engine');
var log4js = require('log4js');
var appService = require('./rest/apps');

/*global process, global, __dirname*/

/*********************init logger*****************************/
if (!fs.existsSync(__dirname + '/logs')) {
  fs.mkdirSync(__dirname + '/logs');
}
log4js.configure({
  "appenders": {
    "console":{
      "type": "console"
    },
    "file":{
      "type": "file",
      "filename": "logs/upgrade.log",
      "maxLogSize": "1024k",
      "backups": 10
    }
  },
  "categories": {
    "default": {"appenders": [ "console", "file" ], "level": "warn"},
    "upgrade": {"appenders": [ "console", "file" ], "level": "info"}
  }
});
var logger = log4js.getLogger('upgrade');
/*************************************************************/

/*******************init db***********************************/
var db = dbEngine.getDB();
global.db = db;
/*************************************************************/

var args = getArgs();

appService.initPredefinedApps();

if (args.builderFolder) {
  logger.info('Builder folder:', args.builderFolder);
  if(args.appId){
    logger.info('App id:', args.appId);
  }
  appService.importFolderApps(args.builderFolder, args.appId);
}

function getArgs() {
  var _args = process.argv.splice(2);
  if (_args.length === 0) {
    logger.error('Please provide builder folder: node update <builderFolder>');
    return {};
  }
  var args = {
    builderFolder: _args[0]
  };
  if(_args[1]){
    args.appId = _args[1];
  }
  return args;
}