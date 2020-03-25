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
  'dojo/on',
  'dojo/Evented',
  'dojo/query',
  'dojo/Deferred',
  'dojo/promise/all',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'jimu/dijit/LoadingIndicator'
],
function(on, Evented, query, Deferred, all, lang, html, declare, _WidgetBase,
_TemplatedMixin, _WidgetsInTemplateMixin, LoadingIndicator) {

  var baseClassArr = [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented];

  var Clazz = declare(baseClassArr, {
    baseClass: 'jimu-layer-chooser-from-map-3d',
    declaredClass: 'builder.for3dSetting.LayerChooserFromMap3d',
    templateString: '<div>' +
      '<div class="chooser-container" data-dojo-attach-point="chooserContainer"></div>' +
      '</div>',

    layerFilter: null,
    _selectedLayer: null,

    constructor: function(options){
      this.options = options;
    },

    postMixInProperties: function(){
      this.nls = lang.clone(window.jimuNls.common);
      if(!this.layerFilter) {
        this.layerFilter = function(layer) {
          var def = new Deferred();
          //jshint unused:false
          def.resolve();
          return def;
        };
      }
    },

    postCreate: function(){
      this.inherited(arguments);
      this.loadingIndecator = new LoadingIndicator({
        hidden: false
      }).placeAt(this.domNode);
      this.createLayerChooser();
    },

    createLayerChooser: function() {
      var createdLayers = [];
      this.map.layers.forEach(lang.hitch(this, function(layer) {
        if(layer.allSublayers) {
          layer.allSublayers.forEach(lang.hitch(this, function(sublayer) {
            var subFeatureLayer = sublayer.createFeatureLayer();
            if(subFeatureLayer) {
              // working around for incorrect subFeatureLayer.url
              // it's a bug of js-api?
              subFeatureLayer._urlAddedByWab = sublayer.url;
              createdLayers.push(this._createLayerItem(subFeatureLayer));
            }
          }));
        } else {
          // working around for incorrect layer.url
          // confirmed, every layerId substring will be cutted from the layer.url after creating a new 'FeatreLayer'
          // it's a bug of js-api?
          if(layer.type === "scene") {
            layer._urlAddedByWab = layer.url + "/layers/" + layer.layerId;
          } else {
            layer._urlAddedByWab = layer.url + "/" + layer.layerId;
          }
          createdLayers.push(this._createLayerItem(layer));
        }
      }));
      all(createdLayers).then(lang.hitch(this, function(){
        this.loadingIndecator.hide();
      }));
    },

    _createLayerItem: function(layer) {
      var retDef = new Deferred();
      var layerItem = html.create("div", {
        'class': "layer-item",
        'innerHTML': layer.title
      }, this.chooserContainer);

      this.own(on(layerItem, 'click', lang.hitch(this, this._layerItemClick, layer)));
      if(layer.loaded) {
        this._showLayerItem(layer, layerItem);
        retDef.resolve();
      } else {
        layer.load();
        layer.when(lang.hitch(this, function() {
          this._showLayerItem(layer, layerItem);
          retDef.resolve();
        }), lang.hitch(this, function() {
          retDef.resolve();
        }));
      }
      return retDef;
    },

    _showLayerItem: function(layer, layerItem) {
      this.layerFilter(layer).then(lang.hitch(this, function() {
        html.addClass(layerItem, 'enable');
      }), lang.hitch(this, function() {
        html.removeClass(layerItem, 'enable');
      }));
    },

    _layerItemClick: function(layer, evt) {
      query(".layer-item.selected", this.chooserContainer).forEach(function(node) {
        html.removeClass(node, 'selected');
      });
      html.addClass(evt.target, 'selected');

      this._selectedLayer = layer;
      // compatible with LayerChooserFromMap.js
      this.emit('tree-click');
    },

    getSelectedItems: function(){
      var items = [];
      if(this._selectedLayer) {
        items.push({
          name: this._selectedLayer.title,
          url: this._selectedLayer._urlAddedByWab || this._selectedLayer.url,
          layerInfo: {
            id: this._selectedLayer.id
          }
        });
      }
      return items;
    }

    /*
    startup: function(){
      this.inherited(arguments);
      this.layerChooser.startup();
    }
    */
  });

  return Clazz;
});
