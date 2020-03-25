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
  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/html',
  'jimu/BaseWidget',
  'esri/widgets/LayerList',
  'dojo/i18n!esri/nls/common',
  './LayerItem'
  ], function(on, array, declare, lang, html, BaseWidget, LayerList, apiNlsBundle, LayerItem) {

    var clazz = declare([BaseWidget], {

      name: 'LayerList',
      baseClass: 'jimu-widget-layerlist',
      _elevationLayerItems: null,

      postCreate: function(){
        this.inherited(arguments);
        this._elevationLayerItems = [];
        this.nls.hide = apiNlsBundle.visibility.hide;
        this.nls.show = apiNlsBundle.visibility.show;
        this.layerList = new LayerList({
          view: this.sceneView,
          container: this.dijitDiv,
          //createActionsFunction: lang.hitch(this, this._createActionsFunction),
          listItemCreatedFunction: lang.hitch(this, this._defineActions)
        });
        this.own(this.layerList.on('trigger-action', lang.hitch(this, this._onTriggerAction)));
        this.own(on(this.sceneView.map.ground.layers, 'change', lang.hitch(this, this._updateElevationLayers)));
        this.own(on(this.sceneView.map.allLayers, 'change', lang.hitch(this, this._updateGroudTip)));
        this._updateElevationLayers();
        // this._updateGroudTip();
      },

      onOpen: function(){
        this._updateGroudTip();
      },

      _updateGroudTip: function(){
        setTimeout(lang.hitch(this, function(){
          var visible = this.dijitDiv.clientHeight > 10;
          // var visible = this.sceneView.map.allLayers.length <= 1;
          if(visible){
            html.removeClass(this.groundTip, 'hidden');
          }else{
            html.addClass(this.groundTip, 'hidden');
          }
        }), 1000);
      },

      _updateElevationLayers: function(){
        this._destroyAllElevationLayerItems();
        var groundLayers = this.sceneView.map.ground.layers;
        var maxLayerIndex = groundLayers.get("length") - 1;
        var count = 0;
        for(var i = maxLayerIndex; i >= 0; i--){
          var layer = groundLayers.getItemAt(i);
          if(layer.listMode !== 'hide'){
            this._addElevationLayerItem(layer);
            count++;
          }
        }
        if(count === 0){
          html.addClass(this.elevationLayersContainer,  'hidden');
        }else{
          html.removeClass(this.elevationLayersContainer, 'hidden');
        }
      },

      _addElevationLayerItem: function(layer){
        var layerItem = new LayerItem({
          layer: layer,
          sceneView: this.sceneView,
          nls: this.nls
        });
        this._elevationLayerItems.push(layerItem);
        layerItem.placeAt(this.elevationLayersContainer);
      },

      _destroyAllElevationLayerItems: function(){
        array.forEach(this._elevationLayerItems, lang.hitch(this, function(layerItem){
          layerItem.destroy();
        }));
        this._elevationLayerItems = [];
      },

      _createActionsFunction: function(event){
        var actions = [];
        var layer = event.item.layer;
        if(layer){
          actions = [[{
            title: this.nls.fullExtentTip,
            className: "esri-icon-zoom-out-fixed",
            id: "full-extent"
          }]];
        }
        return actions;
      },

      _defineActions: function(event) {
        // The event object contains an item property.
        // is is a ListItem referencing the associated layer
        // and other properties. You can control the visibility of the
        // item, its title, and actions using this object.

        var item = event.item;

        if(!item.layer.title) {
          this.layerList.operationalItems.remove(item);
          item.destroy();
          return;
        }

        item.actionsSections = [
          [{
            title: this.nls.fullExtentTip,
            className: "esri-icon-zoom-out-fixed",
            id: "full-extent"
          }]
        ];
      },

      _onTriggerAction: function(event){
        var layer = event.item.layer;
        if(layer){
          switch(event.action.id){
            case "full-extent":
              var extent = layer.fullExtent || layer.extent;
              if(extent){
                this.sceneView.goTo(extent);
              }
              break;
          }
        }
      },

      destroy: function(){
        if(this.layerList){
          this.layerList.destroy();
          this.layerList = null;
        }
        this._destroyAllElevationLayerItems();
        this.inherited(arguments);
      }

    });

    return clazz;
  });
