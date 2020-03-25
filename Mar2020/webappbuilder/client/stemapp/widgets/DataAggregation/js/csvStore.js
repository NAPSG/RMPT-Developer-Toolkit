///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define(['dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/DeferredList',
  'dojo/Evented',
  'dojox/data/CsvStore',
  'dojo/store/Observable',
  'dojo/store/Memory',
  'esri/graphicsUtils',
  'esri/geometry/webMercatorUtils',
  'esri/geometry/Point',
  'esri/layers/FeatureLayer',
  'esri/tasks/locator',
  'esri/tasks/query',
  'esri/SpatialReference',
  'esri/dijit/PopupTemplate',
  'esri/geometry/geometryEngine',
  'esri/tasks/ProjectParameters',
  'esri/tasks/GeometryService',
  'esri/request',
  'jimu/utils',
  'moment/moment'
],
function (declare, array, lang, Deferred, DeferredList, Evented, CsvStore, Observable, Memory,
  graphicsUtils, webMercatorUtils, Point, FeatureLayer, Locator, Query, SpatialReference, PopupTemplate,
  geometryEngine, ProjectParameters, GeometryService, esriRequest, jimuUtils, moment) {
  return declare([Evented], {

    //may just move away from the this.useMultiFields alltogether since each source should know what it supports
    //but each source can use either actually...need to really think through this
    //so if they flag single and multi on a single locator...that locator should actually be processed twice
    //once for multi and once for single is what I am thinking

    //When storing address details need to store the locator index that was used to generate a given address in addition to
    // the address so when feature views potentially re-geocode they use the same one

    //TODO need to set this._currentAddressFields for XY fields
    //TODO flag other field types and if things will fit like DATE

    file: null,
    map: null,
    spatialReference: null,
    fsFields: [],
    duplicateTestFields: [], //field names from the layer
    geocodeSources: [],
    duplicateData: [],
    data: null,
    editLayer: null,
    parent: null,
    separatorCharacter: null,
    csvStore: null,
    storeItems: null,
    matchedFeatureLayer: null,
    mappedArrayFields: null,
    unMatchedFeatureLayer: null,
    duplicateFeatureLayer: null,
    addrFieldName: "", //double check but I don't think this is necessary anymore
    xFieldName: "",
    yFieldName: "",
    symbol: null,
    matchFieldPrefix: "MatchField_",
    _internalFields: [],
    _removeLocators: [],

    constructor: function (options) {
      lang.mixin(this, options);

      this.useAddr = true;
      //used for new layers that will be constructed...suppose I could just pull the value from the edit layer and not store both...
      this.objectIdField = "ObjectID";
      this.nls = options.nls;
      this.minScore = 90;

      //find fields flagged to be used in duplicate search
      this._getDuplicateFields(this.fsFields);

      this.spatialReference = this.map.spatialReference;
      this.decimalSeperator = /^1(.+)1$/.exec(jimuUtils.localizeNumber(1.1))[1].toString();
    },

    _getDuplicateFields: function (fields) {
      var duplicateFieldNames = [];
      array.forEach(fields, function (f) {
        if (f.duplicate) {
          duplicateFieldNames.push(f.name);
        }
      });
      this.duplicateTestFields = duplicateFieldNames;
    },

    handleCsv: function () {
      var def = new Deferred();
      if (this.file && !this.file.data) {
        var reader = new FileReader();
        reader.onload = lang.hitch(this, function () {
          this.data = reader.result;
          this._processCsvData().then(function (fieldsInfo) {
            def.resolve(fieldsInfo);
          });
        });
        reader.readAsText(this.file);
      }
      return def;
    },

    _processCsvData: function () {
      var def = new Deferred();
      this._convertSources();
      this._getSeparator();
      this._getCsvStore().then(function (fieldsInfo) {
        def.resolve(fieldsInfo);
      });
      return def;
    },

    /*jshint loopfunc:true */
    processForm: function () {
      //fields that we add that need to not show up in the popup
      this._internalFields = ['DestinationOID', 'matchScore', 'hasDuplicateUpdates', 'duplicateState'];
      this._matchFields = [];
      var def = new Deferred();
      this._locateData(this.useAddr).then(lang.hitch(this, function (data) {
        var matchedFeatures = [];
        var unmatchedFeatures = [];
        var duplicateFeatures = [];
        var duplicateLookupList = {};
        var unmatchedI = 0;
        var duplicateI = 0;

        if (this._removeLocators.length > 0) {
          this._removeLocators.sort(function (a, b) { return b - a; });
          array.forEach(this._removeLocators, lang.hitch(this, function (idx) {
            this._geocodeSources.splice(idx, 1);
          }));
        }

        //if we are using coordinates and its a non '.' decimal seperator then swap it
        var deLocalizeNumber = function (v, decimalSeperator, addressFields, name) {
          var result = v;
          if ([null, undefined, ''].indexOf(v) === -1 && v.indexOf && v.indexOf(decimalSeperator) > -1) {
            var testFields = addressFields.filter(function (addrField) {
              return addrField.keyField === name;
            });
            if (testFields && testFields.hasOwnProperty('length') && testFields.length === 1) {
              result = v.toString ? v.toString().replace(decimalSeperator, '.') : v;
            }
          }
          return result;
        };

        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var attributes = {};
          var di = data[keys[i]];
          var si = this.storeItems[di.csvIndex];
          array.forEach(this.fsFields, lang.hitch(this, function (f) {
            if (this.mappedArrayFields.hasOwnProperty(f.name)) {
              if (this.mappedArrayFields[f.name]) {
                var _csvVal = this.csvStore.getValue(si, this.mappedArrayFields[f.name]);
                if (f.domainValues) {
                  var filteredList = f.domainValues.filter(lang.hitch(this, function (cv) {
                    return cv.label === _csvVal;
                  }));
                  attributes[f.name] = (filteredList && filteredList.length > 0) ? filteredList[0].value : _csvVal;
                } else {
                  attributes[f.name] = this.decimalSeperator !== '.' && !this.useAddr ?
                    deLocalizeNumber(_csvVal, this.decimalSeperator, this._currentAddressFields,
                      this.mappedArrayFields[f.name]) : _csvVal;
                }
              } else {
                attributes[f.name] = undefined;
              }
            }
          }));

          //These need to be persisted to support additional locate operations but need to be avoided when going into the actual layer
          array.forEach(this._currentAddressFields, lang.hitch(this, function (f) {
            var matchField = this.matchFieldPrefix + f.keyField;
            if (typeof (f.value) !== 'undefined') {
              var _csvVal = this.csvStore.getValue(si, f.value);
              attributes[matchField] = this.decimalSeperator !== '.' && !this.useAddr ?
                deLocalizeNumber(_csvVal, this.decimalSeperator, this._currentAddressFields,
                  f.keyField) : _csvVal;
            } else {
              attributes[matchField] = undefined;
            }
            this._matchFields.push(matchField);
          }));

          if (di && di.score > this.minScore) {
            attributes.ObjectID = i - unmatchedI - duplicateI;
            attributes.matchScore = di.score;
            matchedFeatures.push({
              "geometry": di.location,
              "attributes": lang.clone(attributes)
            });
          } else if (di.isDuplicate) {
            attributes.ObjectID = duplicateI;
            //If additional fields are auto added this._internalFields needs to be updated
            attributes.DestinationOID = di.featureAttributes[this.editLayer.objectIdField];
            attributes.matchScore = 100;
            attributes.hasDuplicateUpdates = false;
            attributes.duplicateState = 'no-change';
            duplicateFeatures.push({
              "geometry": di.location,
              "attributes": lang.clone(attributes)
            });
            duplicateLookupList[duplicateI] = di.featureAttributes;
            duplicateI++;
          } else {
            attributes.ObjectID = unmatchedI;
            attributes.matchScore = di.score ? di.score : 0;
            //need to handle the null location by doing something
            // not actually sure if this is the best way...may not store the geom...
            unmatchedFeatures.push({
              "geometry": di.location && di.location.type ? di.location : new Point(0, 0, this.spatialReference),
              "attributes": lang.clone(attributes)
            });
            unmatchedI++;
          }
        }

        //This layer will always be created to support save of unmatched or duplicate even when none are matched up front
        this.matchedFeatureLayer = this._initLayer(matchedFeatures, this.file.name.replace('.csv', ''));

        if (duplicateFeatures.length > 0) {
          this.duplicateFeatureLayer = this._initLayer(duplicateFeatures,
            this.file.name.replace('.csv', '') + "_Duplicate");
        }

        if (unmatchedFeatures.length > 0) {
          this.unMatchedFeatureLayer = this._initLayer(unmatchedFeatures,
            this.file.name.replace('.csv', '') + "_UnMatched");
        }

        def.resolve({
          matchedLayer: this.matchedFeatureLayer,
          unMatchedLayer: this.unMatchedFeatureLayer,
          duplicateLayer: this.duplicateFeatureLayer,
          duplicateLookupList: duplicateLookupList
        });

      }), function(err) {
        def.reject(err, true);
      });
      return def;
    },

    _initLayer: function (features, id) {
      var fc = this._generateFC(features);
      var lyr = new FeatureLayer(fc, {
        id: id,
        editable: true,
        outFields: ["*"]
      });
      this._initPopup(lyr);
      this.map.addLayers([lyr]);
      return lyr;
    },

    _initPopup: function (layer) {
      var content = { title: layer.id + ": {" + this.labelField + "}" };
      var fieldInfos = [];
      array.forEach(layer.fields, lang.hitch(this, function (f) {
        if (f.name !== this.objectIdField && this._internalFields.indexOf(f.name) === -1 &&
          this._matchFields.indexOf(f.name) === -1) {
          fieldInfos.push({ fieldName: f.name, visible: true });
        }
      }));
      content.fieldInfos = fieldInfos;
      layer.infoTemplate = new PopupTemplate(content);
    },

    _findDuplicates: function () {
      var def = new Deferred();

      //TODO this only needs to occur when one ore more duplicate fields are defined
      this._getAllLayerFeatures(this.editLayer, this.fsFields).then(lang.hitch(this, function (layerFeatures) {
        this.keys = Object.keys(this.mappedArrayFields);
        this.oidField = this.editLayer.objectIdField;

        var compareItems = [];
        var compareFields = [];
        var dupFields = this.duplicateTestFields;
        if (dupFields && dupFields.hasOwnProperty('length') && dupFields.length > 0) {
          array.forEach(this.storeItems, lang.hitch(this, function (si) {
            var compareItem = {
              compareValues: {},
              fileId: si._csvId,
              featureId: -1
            };
            array.forEach(dupFields, lang.hitch(this, function (dupField) {
              var fileFieldName = this.mappedArrayFields[dupField];
              if (typeof(fileFieldName) !== 'undefined') {
                compareItem.compareValues[dupField] = this.csvStore.getValue(si, fileFieldName);
                if (compareFields.indexOf(dupField) === -1) {
                  compareFields.push(dupField);
                }
              }
            }));
            if (Object.keys(compareItem.compareValues).length > 0) {
              compareItems.push(compareItem);
            }
          }));
        }

        var results = [];
        if (compareItems.length > 0) {
          //if multiple compare items match to a single feature what would be the expectation
          array.forEach(compareItems, lang.hitch(this, function (item) {
            array.forEach(layerFeatures, lang.hitch(this, function (feature) {
              var featureItem = {};
              array.forEach(compareFields, lang.hitch(this, function (f) {
                var _attr = feature.attributes[f];
                featureItem[f] = [null, undefined].indexOf(_attr) === -1 && _attr.toString ? _attr.toString() : _attr;
              }));

              if (JSON.stringify(item.compareValues) === JSON.stringify(featureItem)) {
                var featureId = feature.attributes[this.oidField];
                if (item.featureId !== -1) {
                  //not really sure how we would want to handle this situation but setting a flag and keeping track
                  // of the other ids for now
                  item.hasMultiDuplicates = true;
                  if (typeof (item.featureIds) === 'undefined') {
                    item.featureIds = [item.featureId, featureId];
                    item.features = [item.feature, feature];
                  } else {
                    item.featureIds.push(featureId);
                    item.features.push(feature);
                  }
                } else {
                  item.featureId = featureId;
                  item.feature = feature;
                  results.push(item);
                }
              }
            }));
          }));
        }
        def.resolve(results);
      }));

      return def;
    },

    _getAllLayerFeatures: function (lyr, fields) {
      var def = new Deferred();

      var fieldNames = [this.editLayer.objectIdField];
      array.forEach(fields, function (field) {
        if (field.name) {
          fieldNames.push(field.name);
        }
      });
      if (fieldNames.length < 2) {
        fieldNames = fields;
      }

      var max = lyr.maxRecordCount;

      var q = new Query();
      q.where = "1=1";
      lyr.queryIds(q).then(function (ids) {
        var queries = [];
        var i, j;
        if (ids && ids.length > 0) {
          for (i = 0, j = ids.length; i < j; i += max) {
            var q = new Query();
            q.outFields = fieldNames;
            q.objectIds = ids.slice(i, i + max);
            q.returnGeometry = true;

            queries.push(lyr.queryFeatures(q));
          }
          var queryList = new DeferredList(queries);
          queryList.then(lang.hitch(this, function (queryResults) {
            if (queryResults) {
              var allFeatures = [];
              for (var i = 0; i < queryResults.length; i++) {
                if (queryResults[i][1].features) {
                  //allFeatures.push.apply(allFeatures, queryResults[i][1].features);
                  //may not do this if it takes a performance hit...just seems like less to keep in memory
                  allFeatures.push.apply(allFeatures, queryResults[i][1].features.map(function (f) {
                    return {
                      geometry: f.geometry,
                      attributes: f.attributes
                    };
                  }));
                }
              }
              def.resolve(allFeatures);
            }
          }));
        } else {
          def.resolve([]);
        }
      }, function(err){
        console.error(err);
        def.resolve({
          type: 'error',
          message: err
        });
      });
      return def;
    },

    _locateData: function (useAddress) {
      var def = new Deferred();
      this._findDuplicates().then(lang.hitch(this, function (duplicateData) {
        this.duplicateData = duplicateData;
        if (useAddress) {
          //recursive function that will process un-matched records when more than one locator has been provided
          var _geocodeData = lang.hitch(this, function (storeItems, _idx, finalResults) {
            var def = new Deferred();
            var locatorSource = this._geocodeSources[_idx];
            var locator = locatorSource.locator;
            locator.outSpatialReference = this.spatialReference;
            var unMatchedStoreItems = [];
            var geocodeOps = [];
            var oid = "OBJECTID";
            var max = 500;
            var x = 0;
            var i, j;
            //loop through all provided store items
            store_item_loop:
            for (i = 0, j = storeItems.length; i < j; i += max) {
              var items = storeItems.slice(i, i + max);
              var addresses = [];
              if (locatorSource.singleEnabled || locatorSource.multiEnabled) {
                array.forEach(items, lang.hitch(this, function (item) {
                  var csvID = item._csvId;
                  //test if ID is in duplicate data
                  var duplicateItem = null;
                  duplicate_data_loop:
                  for (var duplicateKey in this.duplicateData) {
                    var duplicateDataItem = this.duplicateData[duplicateKey];
                    if (duplicateDataItem.fileId === csvID) {
                      //look and see if I can actually just pass the geom here or if I need to muck with it
                      //Object.assign fails in IE
                      //duplicateItem = Object.assign({}, duplicateDataItem);
                      duplicateItem = lang.mixin({}, duplicateDataItem);
                      delete this.duplicateData[duplicateKey];
                      break duplicate_data_loop;
                    }
                  }

                  var addr = {};
                  addr[oid] = csvID;
                  if (this.useMultiFields) {
                    array.forEach(this.multiFields, lang.hitch(this, function (f) {
                      this._currentAddressFields = this.multiFields;
                      if (f.value !== this.nls.noValue) {
                        var val = this.csvStore.getValue(item, f.value);
                        addr[f.keyField] = val;
                      } else {
                        addr[f.keyField] = undefined;
                      }
                    }));
                  } else {
                    if (this.singleFields[0].value !== this.nls.noValue) {
                      this._currentAddressFields = this.singleFields;
                      var s_val = this.csvStore.getValue(item, this.singleFields[0].value);
                      if (typeof (s_val) === 'undefined') {
                        //otherwise multiple undefined values are seen as the same key
                        // may need to think through other potential duplicates
                        s_val = typeof (s_val) + csvID;
                      }
                      addr[locatorSource.singleLineFieldName] = s_val;
                    }
                  }
                  //Object.assign fails in IE
                  //var clone = Object.assign({}, addr);
                  var clone = lang.mixin({}, addr);
                  var cacheKey = JSON.stringify(clone);
                  if (duplicateItem === null) {
                    addresses.push(addr);
                    finalResults[cacheKey] = {
                      index: x,
                      csvIndex: csvID,
                      location: {}
                    };
                    x += 1;
                  } else {
                    if (duplicateItem !== null) {
                      var fGeom = duplicateItem.feature.geometry;
                      var fAttr = duplicateItem.feature.attributes;
                      if ([null, undefined].indexOf(fGeom) !== -1) {
                        if (duplicateItem.features) {
                          duplicate_item_feature_loop:
                          for (var fIndex = 0; fIndex < duplicateItem.features.length; fIndex++) {
                            var fItem = duplicateItem.features[fIndex];
                            if ([null, undefined].indexOf(fItem.geometry) === -1) {
                              fGeom = fItem.geometry;
                              fAttr = fItem.attributes;
                              break duplicate_item_feature_loop;
                            }
                          }
                        }
                      }
                      finalResults[cacheKey] = {
                        index: -1,
                        csvIndex: csvID,
                        isDuplicate: true,
                        location: lang.mixin({}, fGeom),
                        featureAttributes: fAttr
                      };
                    }
                  }
                }));
              }
              if ((this.useMultiFields && locatorSource.multiEnabled) ||
                (!this.useMultiFields && locatorSource.singleEnabled)) {
                geocodeOps.push(locator.addressesToLocations({
                  addresses: addresses,
                  countryCode: locatorSource.countryCode,
                  outFields: ["ResultID", "Score"]
                }));
              } else {
                //If the current locator is not configured for the current locating options
                // chosen by the user reject the deferred so we can proceed to the next locator in the list.
                var mockDef = new Deferred();
                mockDef.reject(this.nls.warningsAndErrors.notConfigured, true);
                geocodeOps.push(mockDef);
              }
            }
            var keys = Object.keys(finalResults);
            var geocodeList = new DeferredList(geocodeOps);
            geocodeList.then(lang.hitch(this, function (results) {
              this.minScore = this._geocodeSources[_idx] ? this._geocodeSources[_idx].minCandidateScore : 90;
              _idx += 1;
              var additionalLocators = this._geocodeSources.length > _idx;
              //This should occur when the locator is down...needs to failover if more locators are potentially avalible
              if (results && results.length && results[0].length && results[0][0] === false) {
                if (results[0].length > 1) {
                  console.error(results[0][1]);
                }
                //This could be used to show a message about the next locator
                // But at that point we would need to show messages if the next didn't find all to say it's
                //  going to the next one when more than 2 are configured...will wait for feedback if that is necessary
                // Don't want to get too many messages going on.
                //For now just alert them if one is down
                //var nextLocator = additionalLocators ? this._geocodeSources[_idx].name : false;
                var nextLocator = false;
                if ((this.useMultiFields && locatorSource.multiEnabled) ||
                  (!this.useMultiFields && locatorSource.singleEnabled)) {
                  this.parent.locatorError(this._geocodeSources[_idx - 1].locator.url, nextLocator);
                }
                this._removeLocators.push(_idx - 1);
                if (additionalLocators) {
                  var _storeItems = this._remainingStoreItems || this.storeItems;
                  var _finalResults = this._currentFinalResults || {};
                  _geocodeData(_storeItems, _idx, _finalResults)
                    .then(lang.hitch(this, function (data) {
                      def.resolve(data);
                    }));
                } else {
                  if (this._geocodeSources.length > 1) {
                    def.resolve(finalResults);
                  } else {
                    def.reject(this.nls.warningsAndErrors.noMoreLocators);
                  }
                  return def.promise;
                }
              } else if (results) {
                var minScore = this.minScore;
                var idx = 0;
                array.forEach(results, lang.hitch(this, function (r) {
                  var defResults = r[1];
                  array.forEach(defResults, function (result) {
                    result.ResultID = result.attributes.ResultID;
                  });
                  var geocodeDataStore = Observable(new Memory({
                    data: defResults,
                    idProperty: "ResultID"
                  }));
                  var resultsSort = geocodeDataStore.query({}, { sort: [{ attribute: "ResultID" }] });
                  array.forEach(resultsSort, lang.hitch(this, function (_r) {
                    for (var k in keys) {
                      var _i = keys[k];
                      if (finalResults[_i] && finalResults[_i].index === idx) {
                        if (_r.attributes.Score < minScore) {
                          if (additionalLocators) {
                            unMatchedStoreItems.push(storeItems[finalResults[_i].csvIndex]);
                            delete finalResults[_i];
                          } else {
                            finalResults[_i].score = _r.attributes.Score;
                          }
                        } else {
                          finalResults[_i].location = _r.location;
                          finalResults[_i].score = _r.attributes.Score;
                          delete finalResults[_i].index;
                        }
                        delete keys[k];
                        break;
                      }
                    }
                    idx += 1;
                  }));
                }));
                if (additionalLocators && unMatchedStoreItems.length > 0) {
                  this._remainingStoreItems = unMatchedStoreItems;
                  this._currentFinalResults = finalResults;
                  _geocodeData(unMatchedStoreItems, _idx, finalResults)
                    .then(lang.hitch(this, function (data) {
                      def.resolve(data);
                    }));
                } else {
                  def.resolve(finalResults);
                  return def.promise;
                }
              }
            }), lang.hitch(this, function(err) {
              //Handle failover if it errors out
              console.log(err);
              _idx += 1;
              var additionalLocators = this._geocodeSources.length > _idx;
              if (additionalLocators) {
                var _storeItems = this._remainingStoreItems || this.storeItems;
                var _finalResults = this._currentFinalResults || {};
                _geocodeData(_storeItems, _idx, _finalResults)
                  .then(lang.hitch(this, function (data) {
                    def.resolve(data);
                  }));
              } else {
                if (this._geocodeSources.length > 1) {
                  def.resolve(finalResults);
                } else {
                  def.reject(this.nls.warningsAndErrors.noMoreLocators);
                }
                return def.promise;
              }
            }));
            return def;
          });

          this._removeLocators = [];
          //make the inital call to this recursive function
          _geocodeData(this.storeItems, 0, {}).then(lang.hitch(this, function (results) {
            def.resolve(results);
          }));
        } else {
          this._currentAddressFields = [{
            keyField: this.xFieldName,
            label: this.xFieldName,
            value: this.xFieldName
          }, {
            keyField: this.yFieldName,
            label: this.yFieldName,
            value: this.yFieldName
          }];
          this._xyData({
            storeItems: this.storeItems,
            csvStore: this.csvStore,
            xFieldName: this.xFieldName,
            yFieldName: this.yFieldName,
            wkid: this.spatialReference.wkid
          }).then(lang.hitch(this, function (data) {
            if (this.isGeographic && !this.map.spatialReference.isWebMercator() &&
              this.spatialReference.wkid !== 4326) {
              var points = [];
              array.forEach(data, function (d) {
                points.push(d.location);
              });
              var g = points.length > 1 ? geometryEngine.union(points) : geometryEngine.buffer(points[0], 100, 9001);
              this._projectPoints(g, points).then(function (projectedPoints) {
                for (var index = 0; index < data.length; index++) {
                  data[index].location = projectedPoints[index];
                }
                def.resolve(data);
              });
            } else {
              def.resolve(data);
            }
          }), function (err) {
            def.reject(err);
          });
        }
      }));

      return def;
    },

    _xyData: function (options) {
      //TODO eventually it would be good to use the defense solutions parsing logic...we could suppport many types of coordinates
      var def = new Deferred();
      var data = [];
      var csvStore = options.csvStore;
      array.forEach(options.storeItems, lang.hitch(this, function (i) {
        var csvID = i._csvId;
        //test if ID is in duplicate data
        var duplicateItem = null;
        duplicate_data_loop:
        for (var duplicateKey in this.duplicateData) {
          var duplicateDataItem = this.duplicateData[duplicateKey];
          if (duplicateDataItem.fileId === csvID) {
            duplicateItem = lang.mixin({}, duplicateDataItem);
            delete this.duplicateData[duplicateKey];
            break duplicate_data_loop;
          }
        }

        var attributes = {};
        var _attrs = csvStore.getAttributes(i);
        array.forEach(_attrs, function (a) {
          attributes[a] = csvStore.getValue(i, a);
        });
        var isDuplicate = false;
        var score;
        var featureAttributes;
        var geometry;
        if (duplicateItem !== null && duplicateItem.feature && duplicateItem.feature.geometry) {
          geometry = duplicateItem.feature.geometry;
          isDuplicate = true;
          featureAttributes = duplicateItem.feature.attributes;
        } else {
          var _x = csvStore.getValue(i, options.xFieldName);
          var _y = csvStore.getValue(i, options.yFieldName);
          //for non . decimal seperator convert to . so any values after the seperator are used for geom
          if (this.decimalSeperator !== '.') {
            _x = [null, undefined, ''].indexOf(_x) !== -1 ?
              undefined : _x.toString().replace(this.decimalSeperator, '.');
            _y = [null, undefined, ''].indexOf(_y) !== -1 ?
              undefined : _y.toString().replace(this.decimalSeperator, '.');
          }
          var x = parseFloat(_x);
          var y = parseFloat(_y);
          geometry = this._getGeometry(x, y);
          score = !isNaN(x) && !isNaN(y) ? 100 : 0;
        }
        if (geometry) {
          data.push({
            attributes: attributes,
            location: geometry,
            csvIndex: csvID,
            score: score,
            isDuplicate: isDuplicate,
            featureAttributes: featureAttributes
          });
        }
      }));
      def.resolve(data);
      return def;
    },

    _getGeometry: function (x, y) {
      if (typeof (this.isGeographic) === 'undefined') {
        this.isGeographic = /(?=^[-]?\d{1,3}\.)^[-]?\d{1,3}\.\d+|(?=^[-]?\d{4,})|^[-]?\d{1,3}/.exec(x) ? true : false;
      }

      var geometry = new Point(!isNaN(x) ? x : 0, !isNaN(y) ? y : 0);
      if (this.isGeographic && this.spatialReference.isWebMercator()) {
        geometry = webMercatorUtils.geographicToWebMercator(geometry);
      } else if (this.isGeographic && this.spatialReference.wkid !== 4326) {
        //assumes the geographic coordinate system used is WGS 84
        geometry.spatialReference = new SpatialReference(4326);
      } else {
        geometry.spatialReference = new SpatialReference({ wkid: this.spatialReference.wkid });
      }
      return geometry;
    },

    _projectPoints: function (extentGeom, points) {
      var def = new Deferred();

      this.gsvc = new GeometryService(this.appConfig.geometryService);

      var args = {
        url: this.gsvc.url + '/findTransformations',
        content: {
          f: 'json',
          inSR: extentGeom.spatialReference.wkid,
          outSR: this.spatialReference.wkid,
          extentOfInterest: JSON.stringify(extentGeom.getExtent().toJson())
        },
        handleAs: 'json',
        callbackParamName: 'callback'
      };
      esriRequest(args, {
        usePost: false
      }).then(lang.hitch(this, function (response) {
        var transformations = response && response.transformations ? response.transformations : undefined;
        var wkid = transformations && transformations.length > 0 ? transformations[0].wkid : undefined;
        var pp = new ProjectParameters();
        pp.outSR = this.spatialReference;
        pp.geometries = points;
        pp.transformForward = true;
        pp.transformation = wkid;
        this.gsvc.project(pp, lang.hitch(this, function (r) {
          def.resolve(r);
        }), function(err){
          def.reject(err);
        });
      }), function(err){
        def.reject(err);
      });
      return def;
    },

    _generateFC: function (features) {
      //create a feature collection for the input csv file
      var lyr = {
        "layerDefinition": {
          "geometryType": "esriGeometryPoint",
          "spatialReference": this.spatialReference,
          "objectIdField": this.objectIdField,
          "type": "Feature Layer",
          "drawingInfo": {
            "renderer": {
              "type": "simple",
              "symbol": this.symbol
            }
          },
          "fields": [{
            "name": this.objectIdField,
            "alias": this.objectIdField,
            "type": "esriFieldTypeOID"
          }]
        },
        "featureSet": {
          "features": features,
          "geometryType": "esriGeometryPoint"
        }
      };

      array.forEach(this.fsFields, lang.hitch(this, function (field) {
        lyr.layerDefinition.fields.push({
          "name": field.name,
          "alias": field.label,
          "type": field.value,
          "editable": true,
          "domain": null
        });
      }));

      return lyr;
    },

    clear: function () {
      this._removeLayer(this.matchedFeatureLayer);
      this._removeLayer(this.unMatchedFeatureLayer);
      this._removeLayer(this.duplicateFeatureLayer);

      this.file = undefined;
      this.fsFields = undefined;
      this.data = undefined;
      this.separatorCharacter = undefined;
      this.csvStore = undefined;
      this.storeItems = undefined;
      this.duplicateData = [];
      this.matchedFeatureLayer = undefined;
      this.unMatchedFeatureLayer = undefined;
      this.duplicateFeatureLayer = undefined;
      this.mappedArrayFields = undefined;
      this.useAddr = true;
      this.addrFieldName = "";
      this.xFieldName = "";
      this.yFieldName = "";
    },

    _removeLayer: function (layer) {
      if (layer) {
        this.map.removeLayer(layer);
        layer.clear();
      }
    },

    _getSeparator: function () {
      var newLineIndex = this.data.indexOf("\n");
      var firstLine = lang.trim(this.data.substr(0, newLineIndex));
      var separators = [",", "      ", ";", "|"];
      var maxSeparatorLength = 0;
      var maxSeparatorValue = "";
      array.forEach(separators, function (separator) {
        var length = firstLine.split(separator).length;
        if (length > maxSeparatorLength) {
          maxSeparatorLength = length;
          maxSeparatorValue = separator;
        }
      });
      this.separatorCharacter = maxSeparatorValue;
    },

    _getCsvStore: function () {
      var def = new Deferred();
      this.csvStore = new CsvStore({
        data: this.data,
        separator: this.separatorCharacter
      });
      this.csvStore.fetch({
        onComplete: lang.hitch(this, function (items) {
          this.storeItems = items;
          this._fetchFieldsAndUpdateForm(this.storeItems, this.csvStore, this.fsFields).then(function (fieldsInfo) {
            def.resolve(fieldsInfo);
          });
        }),
        onError: function (error) {
          console.error("Error fetching items from CSV store: ", error);
          def.reject(error);
        }
      });
      return def;
    },

    //check the values in the fields to evaluate if they are potential candidates for an integer of float field
    // allows us to filter the list of fields exposed for those field types from the destination layer
    _fetchFieldsAndUpdateForm: function (storeItems, csvStore, fsFields) {
      //the checking of unique vals is for domain support
      //TODO need to expand to support more than codedValues
      //var maxUniqueDomainVals = 0;
      //array.forEach(fsFields, function (f) {
      //  if (typeof (f.domain) !== 'undefined') {
      //    //if the number of unique values in the data exceeds the potential unique values
      //    // in the domain they cannot match
      //    if (f.domain.codedValues && f.domain.codedValues.hasOwnProperty('length')) {
      //      if (maxUniqueDomainVals < f.domain.codedValues.length) {
      //        maxUniqueDomainVals = f.domain.codedValues.length;
      //      }
      //    }
      //  }
      //});
      var def = new Deferred();
      var csvFieldNames = csvStore._attributes;
      var decimalSeperator = this.decimalSeperator;
      var fieldTypes = { };
      var len = function (v) {
        return v.toString().length;
      };
      var _isValidDate = function (v) {
        if (v) {
          try {
            var d = new Date(v);
            return !isNaN(d.getTime()); // d.toString() === 'Invalid Date'
          } catch (err) {
            console.error(err);
            return false;
          }
        } else {
          return [null, undefined, ""].indexOf(v) > -1 ? true : false;
        }
      };

      array.forEach(csvFieldNames, function (attr) {
        //var type = null;
        array.forEach(storeItems, function (si) {
          var checkVal = true;
          var checkDomain = false;
          var checkLen = true;
          var fTypeInt = true;
          var fTypeFloat = true;
          var fTypeDate = true;
          //var currentUniqueVals;
          var currentLen;
          if (fieldTypes.hasOwnProperty(attr)) {
            fTypeInt = fieldTypes[attr].supportsInt;
            fTypeFloat = fieldTypes[attr].supportsFloat;
            fTypeDate = fieldTypes[attr].supportsDate;
            //currentUniqueVals = fieldTypes[attr].uniqueVals;
            //if (!currentUniqueVals) {
            //  currentUniqueVals = [];
            //}
            currentLen = fieldTypes[attr].maxLength;
            if (!(fTypeInt) && !(fTypeFloat) && !(fTypeDate)) {
              checkVal = false;
            }
            //if (currentUniqueVals.length > maxUniqueDomainVals) {
            //  checkDomain = false;
            //}
          }
          if (checkVal || checkDomain || checkLen) {
            var v = csvStore.getValue(si, attr);
            if (v) {
              var lenV = len(v);
              var date = moment(v);
              if (checkVal) {
                var _null = [null, undefined, ''].indexOf(v) !== -1;
                fieldTypes[attr] = {
                  supportsDate: _null ? fTypeDate : (fTypeDate && date.isValid() && _isValidDate(v)),
                  supportsInt: _null ? fTypeInt :
                    ((!isNaN(parseInt(v, 10)) && len(parseInt(v, 10)) === lenV) && fTypeInt)
                };
                //modify the supportsFloat checks to account for non . decimal seperators
                if (decimalSeperator !== '.') {
                  v = !_null ? v.toString().replace(decimalSeperator, '.') : '';
                }
                fieldTypes[attr].supportsFloat = _null ?
                  fTypeFloat : (((!isNaN(parseFloat(v))) && len(parseFloat(v)) === lenV) && fTypeFloat);
              }
              var ft = fieldTypes[attr];
              //if (checkDomain) {
              //  ft.uniqueVals = currentUniqueVals;
              //  if (typeof (ft.uniqueVals) === 'undefined') {
              //    ft.uniqueVals = [v];
              //  } else if (ft.uniqueVals.indexOf(v) === -1) {
              //    ft.uniqueVals.push(v);
              //  }
              //} else {
              //  ft.uniqueVals = currentUniqueVals;
              //  ft.supportsDomain = false;
              //}

              //this helps avoid situations where values are too long to fit in some FS field
              // if this is changed discuss the best way to alert the user to this situation
              //As is they would need to start editing on each feature to understand if one or more of the values are
              // too long...could also consider using an alert on the list beside each feature label
              if (checkLen) {
                ft.maxLength = currentLen;
                if (typeof (ft.maxLength) === 'undefined') {
                  ft.maxLength = lenV;
                  //ft.maxDateLength = len(date.unix())
                } else if (ft.maxLength < lenV) {
                  ft.maxLength = lenV;
                }
                //not sure why my date field is length 8
                // var lenMaxDate = len(date.unix());
                // if (typeof (ft.maxDateLength) === 'undefined' && date.isValid()) {
                //   ft.maxDateLength = lenMaxDate;
                // } else if (ft.maxDateLength < lenMaxDate) {
                //   ft.maxDateLength = lenMaxDate;
                // }
              }
            }
          }
        });
      });
      def.resolve({
        fields: csvFieldNames,
        fieldTypes: fieldTypes,
        fsFields: fsFields
      });
      return def;
    },

    //This should go into a util class
    _zoomToData: function (graphics, expand) {
      if (graphics && graphics.length > 0) {
        try {
          //TODO this would not handle null features
          var ext = graphicsUtils.graphicsExtent(graphics);
          if (expand) {
            this.map.setExtent(ext.expand(1.9), true);
          } else {
            this.map.setExtent(ext, true);
          }
        } catch (err) {
          console.log(err.message);
        }
      }
    },

    _convertSources: function () {
      if (this.geocodeSources && this.geocodeSources.length > 0) {
        this._geocodeSources = array.map(this.geocodeSources, lang.hitch(this, function (source) {
          if (source && source.url && source.type === 'locator') {
            var _source = {
              locator: new Locator(source.url || ""),
              outFields: ["ResultID", "Score"],
              singleLineFieldName: source.singleLineFieldName || "",
              name: jimuUtils.stripHTML(source.name || ""),
              placeholder: jimuUtils.stripHTML(source.placeholder || ""),
              countryCode: source.countryCode || "",
              addressFields: source.addressFields,
              singleEnabled: source.singleEnabled || false,
              multiEnabled: source.multiEnabled || false,
              minCandidateScore: source.minCandidateScore || 90
            };
            return _source;
          }
        }));
      }
    }
  });
});