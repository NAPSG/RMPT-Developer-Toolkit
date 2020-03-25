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
  'dojo/_base/lang',
  'dojo/on',
  'dojo/query',
  'dojo/_base/html',
  'dojo/topic',
  'dijit/_TemplatedMixin',
  'dojo/text!./Panel.html',
  'jimu/BaseWidgetPanel',
  'jimu/utils'
], function (
  declare,
  lang,
  on,
  query,
  html,
  topic,
  _TemplatedMixin,
  template,
  BaseWidgetPanel,
  utils
) {
  /* global jimuConfig */
  return declare([BaseWidgetPanel, _TemplatedMixin], {

    baseClass: 'jimu-panel jimu-pocket-panel',

    templateString: template,

    postCreate: function () {
      this.inherited(arguments);
      this.own(on(this.maxNode, "click", lang.hitch(this, "_onMaxBtnClicked")));
    },

    startup: function () {
      //get the configured widget info
      var configs;
      configs = this.getAllWidgetConfigs();
      if (Array.isArray(this.config.widgets)) {
        configs = this.config.widgets;
      } else {
        configs = [this.config];
      }
      //if widget is configured remove the message
      if (configs.length > 0) {
        html.empty(this.containerNode);
      }
      //on startup call setPosition so that all the positions of controls get updated
      this._setPosition();
      this.inherited(arguments);
    },

    /**
     * This function is used to change the position of the panel & its size
     * depending upon the modes(desktop/mobile)
     */
    resize: function () {
      this._setPosition();
    },

    /**
     * This function is used to destroy the run-time files(position.css) created by
     * pocket theme when user switches from this theme to another theme like
     * foldable, dart etc..
     */
    destroy: function () {
      var styleLink, domNodes;
      //On destroy disable the position css applied to shift the controls,
      //so that it will not impact other themes
      styleLink = document.getElementById(this.baseClass + 'positionCSS');
      if (styleLink) {
        styleLink.disabled = true;
      }
      domNodes = query(".esriControlsBR");
      if (window.isRTL) {
        html.setStyle(domNodes[0], { "left": "0px" });
      } else {
        html.setStyle(domNodes[0], { "right": "0px" });
      }
      this.inherited(arguments);
    },

    /**
     * This function returns value true/false based the execution of app
     * whether it is running in mobile mode or not
     */
    _isShowingPanelOfMobileMode: function () {
      if (window.appInfo.isRunInMobile && window.innerWidth <= 760) {
        return true;
      }
      return false;
    },

    /**
     * This function is used to maximize the panel when user
     * clicks on max button which is available/active only in mobile mode
     */
    _onMaxBtnClicked: function (evt) {
      evt.stopPropagation();
      if (this._isShowingPanelOfMobileMode()) {
        if (this.windowState === 'maximized') {
          this.panelManager.normalizePanel(this);
        } else {
          this.panelManager.maximizePanel(this);
        }
        this._setPosition();
      }
    },

    /**
     * This function is used to set the positions of the widgets and styles of the panel.
     * This will consider all layouts, states, mobile mode etc.
     */
    _setPosition: function () {
      var style, currentPanel, isInMobileMode, titleNodeHeight;
      style = utils.getPositionStyle(this.position);
      //domNode & titleNode use to get null once theme is changed,
      //hence used getPanelById method to get current panel
      currentPanel = this.panelManager.getPanelById(this.id);
      isInMobileMode = this._isShowingPanelOfMobileMode();
      //If app is running in mobile set positions according to mobile else desktop
      //also based on layout shift the controls if required
      if (isInMobileMode) {
        style.width = '100%';
        style.right = '0';
        style.left = '0';
        style.bottom = '0';
        //Based on state set the map positions also as in mobile only 50% of map will be visible
        if (this.windowState === 'maximized') {
          style.height = '100%';
          style.width = '100%';
          style.top = '0';
          topic.publish('changeMapPosition', { bottom: "0" });
        } else {
          style.height = '50%';
          style.width = '100%';
          style.top = '50%';
          topic.publish('changeMapPosition', { bottom: "50%" });
        }
        html.setStyle(currentPanel.domNode, style);
        html.place(currentPanel.domNode, jimuConfig.layoutId);
        //In mobile mode show title node,
        //so that user can change the state of panel using maximize button
        html.setStyle(currentPanel.titleNode, "display", "block");
        titleNodeHeight = currentPanel.titleNode.offsetHeight;
        html.setStyle(currentPanel.containerNode, {
          height: "calc(100% - " + titleNodeHeight + "px)"
        });
      } else {
        style.height = 'auto';
        if (currentPanel.titleNode) {
          html.setStyle(currentPanel.titleNode, "display", "none");
        }
        html.setStyle(currentPanel.containerNode, { height: "100%" });
        topic.publish('changeMapPosition', { bottom: "0px" });
        html.place(currentPanel.domNode, jimuConfig.mapId);
        html.setStyle(currentPanel.domNode, style);
      }
      //Update the attribution and logo positions
      this._setAttributionAndLogoPosition(style);
      //Add remove styles to shift the controls based on layout
      //Condition 1. Layout 1 & not RTL
      //Condition 2. Layout 1 and RTL
      if ((style.right === "auto" && !window.isRTL) ||
        (style.right === "15px" && window.isRTL)) {
        this._setPositionStyles(true);
      } else {
        this._setPositionStyles(false);
      }
    },

    /**
     * This function is used to set the attribution and logo positions
     */
    _setAttributionAndLogoPosition: function (style) {
      var domNodes;
      domNodes = query(".esriControlsBR");
      //In default layout move logo before panel
      if (domNodes && domNodes.length > 0 && style.left === "auto") {
        html.setStyle(domNodes[0], { "right": "380px" });
      } else if (domNodes && domNodes.length > 0) {
        //If Default layout and in RTL mode
        //else if & else is for mobile mode and other layouts
        if ((style.right === "auto" && window.isRTL)) {
          html.setStyle(domNodes[0], { "left": "380px" });
        } else if ((style.right !== "auto" && window.isRTL)) {
          html.setStyle(domNodes[0], { "left": "0px" });
        } else {
          html.setStyle(domNodes[0], { "right": "0px" });
        }
      }
    },

    /**
     * This function is used to add or remove the styles to shift controls
     */
    _setPositionStyles: function (shiftPositions) {
      var styleLink, info;
      styleLink = document.getElementById(this.baseClass + 'positionCSS');
      if (shiftPositions) {
        if (styleLink) {
          styleLink.disabled = false;
        } else {
          info = utils.getUriInfo(this.uri);
          utils.loadStyleLink(this.baseClass + 'positionCSS',
            info.folderUrl + "positions.css", null);
        }
      } else if (styleLink) {
        styleLink.disabled = true;
      }
    }
  });
});