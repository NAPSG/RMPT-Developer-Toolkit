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

var fs = require('fs'), db, engine;
var Promise = require('bluebird');
var path = require('path');

/*global __dirname*/

var db;

exports.getDB = function(_path){
  var basePath = _path || __dirname;
  var cfg = JSON.parse(fs.readFileSync(path.join(basePath, "config.json")));

  // load requestd engine and define engine agnostic getDB function
  if (cfg.app.engine === "mongodb") {
    engine = require("mongodb");

    Promise.promisifyAll(engine);
    Promise.promisifyAll(engine.MongoClient);
    Promise.promisifyAll(engine.Collection.prototype);
    Promise.promisifyAll(engine.Cursor.prototype);

    db = new engine.Db(cfg.mongo.db,
      new engine.Server(cfg.mongo.host, cfg.mongo.port, cfg.mongo.opts), {
        native_parser: false,
        safe: true
      });

    return db;
  } else {
    engine = require("tingodb")({});

    Promise.promisifyAll(engine);
    Promise.promisifyAll(engine.Collection.prototype);

    var dbPath = path.join(basePath, cfg.tingo.path);
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath);
    }
    db = new engine.Db(dbPath, {});
    Promise.promisifyAll(db);

    return db;
  }

};
