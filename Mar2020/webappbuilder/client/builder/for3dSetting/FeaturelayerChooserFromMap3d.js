///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/Deferred',
  'dojo/_base/html',
  'dojo/_base/lang',
  './LayerChooserFromMap3d'
],
function(declare, Deferred, html, lang, LayerChooserFromMap3d) {
  //jshint unused:false
  return declare([LayerChooserFromMap3d], {
    baseClass: 'jimu-layer-chooser-from-map-3d jimu-featurelayer-chooser-from-map-3d',
    declaredClass: 'jimu.dijit.FeaturelayerChooserFromMap3d',
    mustSupportQuery: null,

    constructor: function(){
      this.mustSupportQuery = false;
    },

    postMixInProperties:function(){
      this.inherited(arguments);
      this.layerFilter = lang.hitch(this, this._featureLayerFilter);
    },

    /*
    postCreate: function(){
      this.inherited(arguments);
      this.layerFilter = lang.hitch(this, this._featureLayerFilter);
      //html.addClass(this.domNode, 'jimu-layer-chooser-from-map-3d');
    },
    */

    _isQueryable: function(layer) {
      if(layer &&
         layer.capabilities &&
         layer.capabilities.operations &&
         layer.capabilities.operations.supportsQuery) {
        return true;
      }
    },

    _featureLayerFilter: function(layer) {
      var def = new Deferred();
      var queryable = this.mustSupportQuery ? this._isQueryable(layer) : true;
      if(layer && layer.type === "feature" && queryable) {
        def.resolve();
      } else {
        def.reject();
      }
      return def;
    }

  });
});
