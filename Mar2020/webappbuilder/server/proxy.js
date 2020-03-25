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

/*global args*/

var request = require('request');
var logger = require('log4js').getLogger('proxy');
var fs = require('fs');

exports.proxyRequest = function() {
  return function(req, res, next) {
    try{
      var url;
      if (req.url.indexOf('?') > -1) {
        url = req.url.substr(2);//delete the string before the [?]

        //if have others [?] in url, replace [?] to [&] except 1st [?]
        if (url.indexOf("?") > -1 && url.length > 1) {
          url = url.replace(/[?]/g, "&");//maybe more [?]s
          url = url.replace(/[&]/, "?");//the first [&] should be [?]
        }
      } else {
        return next();
      }
      var r;
      var requestParams = null;
      var _headers = {
        authorization: req.headers && req.headers.authorization
      };
      if (req.method === 'GET') {
        requestParams = {
          url: url,
          rejectUnauthorized: false,
          requestCert: true,
          agent: false,
          proxy: args.proxy? args.proxy: undefined,
          secureProtocol: args.sslClientVersion? args.sslClientVersion: 'SSLv23_method'
        };
        if (_headers.authorization) {
          requestParams.headers = _headers;
        }
        r = request.get(requestParams);
        r.pipe(res);
      } else if (req.method === 'POST') {
        requestParams = {
          method: 'POST',
          url: url,
          body: req.body,
          rejectUnauthorized: false,
          requestCert: true,
          agent: false,
          proxy: args.proxy? args.proxy: undefined,
          secureProtocol: args.sslClientVersion? args.sslClientVersion: 'SSLv23_method'
        };
        if (_headers.authorization) {
          requestParams.headers = _headers;
        }
        if (req.headers &&
          (req.headers['content-type'] === 'text/xml' ||
            req.headers['content-type'] === 'application/xml' ||
            req.headers['content-type'] === "application/json")) {

          requestParams.headers = requestParams.headers || {};
          requestParams.headers['content-type'] = req.headers['content-type'];
        }
        //for json
        if (isSetJsonFormat(requestParams.body) ||
          req.headers && (req.headers['content-type'] === 'application/json')) {

          requestParams.json = true;//flag for json
        }
        //for POST with formData
        if (req.headers &&
          (req.headers['content-type'] === "application/x-www-form-urlencoded")) {

          requestParams.headers = {};
          requestParams.headers['content-type'] = 'application/x-www-form-urlencoded';
          //must be encode params into a long str
          requestParams.body = Object.keys(req.body).map(function (key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(req.body[key])
          }).join('&');
        }

        if(req.files && req.files.length > 0){
          var fileForm = {
            f: 'json',
            rejectUnauthorized: 'false'
          };
          for (key in req.body) {
            fileForm[key] = req.body[key];
          }
          var file = req.files[0];
          fileForm[file.fieldname] = {
            value: fs.createReadStream(__dirname + '/' + file.path),
            options: {
              filename: file.originalname,
              contentType: file.mimetype
            }
          };

          request.post({
            url:url,
            formData: fileForm
          }, function(err, httpResponse, body) {
            if (err) {
              res.send(err);
            } else {
              res.send(body);
            }
          });
        }else{
          r = request(requestParams);
          r.pipe(res);
        }
      } else {
        res.send('support get and post only.');
      }
      if(r){
        r.on('error', function(err){
          logger.error('proxy error', err);
        });
        // r.on('response', function(response) {
        //   console.log(response.statusCode); // 200
        //   console.log(response.headers['content-type']); // 'image/png'
        // });
      }
    }
    catch(e){
      console.error(e);
    }
  };
};

function isEmpty(obj) {
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      return false;
    }
  }
  return true;
}
function isSetJsonFormat(obj) {
  var key = "f", val = "json";
  if (obj && obj.hasOwnProperty && obj.hasOwnProperty(key)) {
    return (obj[key] === val);//with f="json"
  }

  return false;
}