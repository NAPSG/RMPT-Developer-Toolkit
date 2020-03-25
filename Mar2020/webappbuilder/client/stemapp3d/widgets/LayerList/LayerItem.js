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
  'dojo/_base/html',
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./LayerItem.html',
  'dojo/_base/lang',
  'jimu/dijit/CheckBox'
  ], function(html, declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, lang){

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

      templateString: template,
      sceneView: null,
      layer: null,
      baseClass: 'jimu-widget-layeritem',
      nls: null,

      postCreate: function(){
        this.inherited(arguments);

        this.cbx.onChange = lang.hitch(this, this._onCbxChanged);

        this.own(this.layer.watch("title", lang.hitch(this, function(){
          this._updateTitleUI();
        })));
        this.own(this.layer.watch("visible", lang.hitch(this, function(){
          this._updateVisibilityUI();
        })));
        this.layer.when(lang.hitch(this, function(){
          if(!this.domNode){
            return;
          }
          this._updateTitleUI();
          this._updateVisibilityUI();
        }), lang.hitch(this, function(err){
          console.error(err);
          if(!this.domNode){
            return;
          }
          html.addClass(this.domNode, 'not-loaded');
        }));
        this._updateTitleUI();
      },

      _onClickSelf: function(event){
        var target = event.target;
        var isClickCbx = target === this.cbx.domNode || html.isDescendant(target, this.cbx.domNode);
        if(!isClickCbx){
          this.cbx.setValue(!this.cbx.getValue());
        }
      },

      _updateTitleUI: function(){
        var title = this.layer.title || this.layer.name || this.layer.mapName || "";
        this.cbx.setLabel(title);
      },

      _updateVisibilityUI: function(){
        var isVisible = this.layer.get('visible');
        if(isVisible !== this.cbx.getValue()){
          this.cbx.setValue(isVisible);
        }
        if(isVisible){
          this.domNode.title = this.nls.hide;
        }else{
          this.domNode.title = this.nls.show;
        }
      },

      _onCbxChanged: function(){
        if(this.cbx.getValue() !== this.layer.get('visible')){
          this.layer.set('visible', this.cbx.getValue());
        }
      },

      _onBtnZoomClicked: function(event){
        event.stopPropagation();
        var extent = this.layer.extent || this.layer.fullExtent;
        if(extent){
          extent = extent.expand(1.2);
          this.sceneView.goTo(extent);
        }
      },

      destroy: function(){
        this.sceneView = null;
        this.layer = null;
        this.inherited(arguments);
      }
    });
  });
