define([
  'dojo/_base/declare',
  'dojo/_base/Color',
  'dojo/_base/html',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/xhr',

  'dojo/Deferred',
  'dojo/dom',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/dom-geometry',
  'dojo/dom-style',
  'dojo/number',
  'dojo/on',
  'dojo/query',
  'dojo/json',

  'dijit/_WidgetsInTemplateMixin',

  'esri/request',
  'esri/Graphic',
  'esri/layers/GraphicsLayer',

  'esri/geometry/Point',
  'esri/geometry/support/webMercatorUtils',

  'esri/symbols/PictureMarkerSymbol',
  'esri/symbols/PointSymbol3D',
  'esri/symbols/ObjectSymbol3DLayer',

  'esri/tasks/QueryTask',
  'esri/tasks/support/Query',

  'jimu/BaseWidget',
  'jimu/dijit/Message',
  'jimu/utils',
  'jimu/dijit/LoadingShelter',

  'fx3d/layers/FxLayer',
  './VizCards/VizCards',

  'dojo/domReady!'
],
function(declare, Color, html, lang, array, xhr,
  Deferred, dom, domClass, domConstruct, domGeom, domStyle,
  number, on, query, JSON,
  _WidgetsInTemplateMixin,
  esriRequest, Graphic, GraphicsLayer,
  Point, webMercatorUtils,
  PictureMarkerSymbol, PointSymbol3D, ObjectSymbol3DLayer,
  QueryTask, Query,
  BaseWidget, Message, utils, LoadingShelter,
  FxLayer,
  VizCards
) {

  var MaxRecsCount = 400;
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget, _WidgetsInTemplateMixin], {

    /*jshint scripturl:true*/

    baseClass: 'jimu-widget-viz',
    name: '3DFx',

    postCreate: function() {
      this.inherited(arguments);

      // Do not make vizFeatures to the prototype
      this.vizFeatures = [];
      this.vizMax = 0;
      this.vizCards = null;
      this.vizPage = 0;
      this._featuresLoadedDfd = new Deferred();
      // Cache all sorted features by each viz field
      this._sortedFeatures = {};
    },

    startup: function() {
      this.inherited(arguments);
      this.loadingCover = new LoadingShelter({hidden: true});
      this.loadingCover.placeAt(this.sceneView.map.id);
      this.loadingCover.startup();
      this._getStyleColor();
      var def = this._getStyleColor();
      this.panelMsgBlock.innerHTML = "";
      def.then(lang.hitch(this, function() {
        if (!this.config.vizLayer || this.config.vizFields.length === 0) {
          this.panelMsgBlock.innerHTML = "<p align='center'>" + this.nls.viz_error + "</p>";
        } else {
          this.loadingCover.show();
          esriRequest(this.config.vizLayer.url + "/query", {
            query: {
              f: "json",
              returnGeometry: false,
              returnCountOnly: true,
              where: "1=1"
            },
            callbackParamName: "callback"
          }).then(lang.hitch(this, function(response) {
            if (response.data.count) {
              if (response.data.count > MaxRecsCount) {
                this.config.showPercent = false;
              } else {
                this.panelMsgBlock.innerHTML = "";
              }
            } else {
              this.panelMsgBlock.innerHTML = "";
            }
            this._initUI();
            this._initLayers();
            this._initViz();
          }));
        }
      }));
    },

    onOpen: function() {
      this.inherited(arguments);
      if (this.loadingCover.hidden) {
        this.loadingCover.show();
      }
      this._styleSync();
      this._showLayers();
    },

    onClose: function() {
      this._hideLayers();
      this._stopVizTimer();
      this.loadingCover.hide();
      if (this.vizCards) {
        this.vizCards.unselectCards();
      }
      this.inherited(arguments);
    },

    onDeActive: function() {

    },

    destroy: function() {
      this._stopVizTimer();
      this._removeFxLayer();
      this._sortedFeatures = {};
      this._featuresLoadedDfd = null;
      this.loadingCover.destroy();
      this.inherited(arguments);
    },

    // close
    _close: function() {
      this.widgetManager.closeWidget(this.id);
    },

    _styleSync: function() {
      if(this.appConfig.theme.customStyles) {
        var color = this.appConfig.theme.customStyles.mainBackgroundColor;
        domStyle.set(this.footerNode, "backgroundColor", color);
        if (this.vizCards) {
          domStyle.set(this.vizCards.contentNode, "color", color);
        }
        this.config.color = color;
        // this._setVizPage(this.vizPage);
        this._updatePath();
        if (this.fxLayer) {
          this.fxLayer.set('renderingInfo', this._getRenderingInfo());
        }
      } else {
        this._updateUI(this.appConfig.theme.styles[0]);
      }
    },

    /* jshint unused: true */
    // on app config changed
    onAppConfigChanged: function(appConfig, reason, changedData) {
      this.appConfig = appConfig;
      if (this.state == 'closed') {
        return;
      }
      switch (reason) {
        case 'themeChange':
        case 'layoutChange':
          // this.destroy();
          break;
        case 'styleChange':
          this._styleSync();
          break;
        case 'widgetPoolChange':
          break;
      }
    },

    /*jshint unused:true */
    setPosition: function(position, containerNode) {
      if (this.appConfig.theme.name === "BoxTheme" || this.appConfig.theme.name === "DartTheme" ||
        this.appConfig.theme.name === "LaunchpadTheme") {
        this.inherited(arguments);
      } else {
        var pos = {
          left: "0px",
          right: "0px",
          bottom: "0px",
          height: "140px"
        };
        this.position = pos;
        var style = utils.getPositionStyle(this.position);
        style.position = 'absolute';

        containerNode = this.sceneView.map.id;

        html.place(this.domNode, containerNode);
        html.setStyle(this.domNode, style);
        if (this.started) {
          this.resize();
        }

        // fix for Tab Thme on mobile devices
        if (this.appConfig.theme.name === "TabTheme") {
          var controllerWidget = this.widgetManager.getControllerWidgets()[0];
          this.widgetManager.minimizeWidget(controllerWidget.id);
        }
      }
    },

    // update path color of cards
    _updatePath: function() {
      this.vizCards && this.vizCards.update({
        color: this._getColor()
      });
    },

    // update UI
    _updateUI: function(styleName) {
      var def = this._getStyleColor(styleName);
      def.then(lang.hitch(this, function() {
        // this._setVizPage(this.vizPage);
        if (this.fxLayer) {
          this._updatePath();
          this.fxLayer.set('renderingInfo', this._getRenderingInfo());
        }
      }));
    },

    // get style color
    _getStyleColor: function(styleName) {
      var def = new Deferred();
      if(this.appConfig.theme.customStyles && this.appConfig.theme.customStyles.mainBackgroundColor){
        this.config.color = this.appConfig.theme.customStyles.mainBackgroundColor;
        def.resolve(this.appConfig.theme.customStyles.mainBackgroundColor);
        return def.promise;
      }
      var t = this.appConfig.theme.name;
      var s = this.appConfig.theme.styles[0];
      if (styleName) {
        s = styleName;
      }
      var url = "./themes/" + t + "/manifest.json";
      xhr.get({
        url: url,
        handleAs: "json",
        load: lang.hitch(this, function(data) {
          var styles = data.styles;
          for (var i = 0; i < styles.length; i++) {
            var st = styles[i];
            if (st.name === s) {
              domStyle.set(this.footerNode, "backgroundColor", st.styleColor);
              if (this.vizCards) {
                domStyle.set(this.vizCards.contentNode, "color", st.styleColor);
              }
              this.config.color = st.styleColor;
              def.resolve(st.styleColor);
            }
          }
        })
      });
      return def.promise;
    },

    // init UI
    _initUI: function() {
      var options = {
        view: this.sceneView,
        showPercent: this.config.showPercent
      };
      this.vizCards = new VizCards(options, this.panelContent);
      this.vizCards.on('selection', lang.hitch(this, this._featureSelection));
      this.vizCards.startup();
      // disable play for local scenes
      if(this.sceneView.viewingMode === "global") {
        domStyle.set(this.btnPlay, "display", "block");
      } else {
        domStyle.set(this.btnPlay, "display", "none");
      }
    },

    // init layers
    _initLayers: function() {
      var map = this.sceneView.map;
      var def = map.findLayerById(this.config.vizLayer.id);
      def.when().then(lang.hitch(this, function(lyr) {
        this.vizLayer = lyr;
        this.vizLayerVisibility = lyr.visible;
        this.vizLayer.visible = false;
        this._addFxLayer();
      }));
    },

    // get color
    _getColor: function() {
      if (this.config.cycleColors) {
        var page = this.vizPage;
        var count = this.config.colors.length;
        var num = page - (Math.floor(page / count) * count);
        return this.config.colors[num];
      } else {
        return this.config.color;
      }
    },

    // get colors
    _getColors: function() {
      var color = this._getColor();
      var w = Color.fromString("#ffffff");
      var c1 = Color.fromString(color);
      var c2 = Color.blendColors(c1, w, 0.3);
      var c3 = Color.blendColors(c1, w, 0.8);
      return [c1.toRgb(), c2.toRgb(), c3.toRgb()];
    },

    // get rendering info
    _getRenderingInfo: function() {
      var colors = this._getColors();
      var info;
      switch (this.config.vizType) {
        case "PointExtrude":
          info = {
            visible: true,
            repeat: 1,
            animationInterval: this.config.interval / 1000,
            shapeType: "Cylinder",
            radius: this.config.maxWidth,
            height: this.config.maxHeight,
            transparency: 100,
            bottomColor: colors[0],
            topColors: [colors[0], colors[1]]
          };
          break;
        case "Pulse":
          info = {
            visible: true,
            repeat: 1000,
            animationInterval: this.config.interval / 1000,
            shapeType: "Circle",
            radius: this.config.maxWidth,
            transparency: 80,
            solidColor: colors[0],
            haloColor: colors[1]
          };
          break;
        case "Bounce":
          info = {
            visible: true,
            repeat: 1000,
            animationInterval: this.config.interval / 1000,
            dashHeight: this.config.maxHeight,
            radius: 100,
            transparency: 100,
            haloColors: colors
          };
          break;
        case "GridSurface":
          info = {
            visible: true,
            repeat: 1,
            animationInterval: this.config.interval / 1000,
            width: this.config.maxWidth,
            height: this.config.maxHeight,
            transparency: 60,
            colors: [colors[0], colors[1], colors[2]]
          };
          break;
        case "Fireball":
        case "JetTrail":
          info = {
            visible: true,
            repeat: 1000,
            animationInterval: this.config.interval / 1000,
            radius: 30,
            transparency: 90,
            colors: [colors[0], colors[0]]
          };
          break;
        case "AreaExtrude":
          info = {
            visible: true,
            repeat: 1,
            animationInterval: this.config.interval / 1000,
            height: this.config.maxHeight,
            transparency: 100,
            bottomColor: colors[0],
            topColors: [colors[0], colors[1]]
          };
          break;
      }
      if (this.config.vizType == "JetTrail") {
        info.showEndPoints = this.config.showJetTrailEndPoints;
      }
      // console.log(info);
      return info;
    },

    // remove fx layer
    _removeFxLayer: function() {
      if (this.fxLayer) {
        this.fxLayer.remove();
        this.fxLayer = null;
      }
    },

    // add fx layer
    _addFxLayer: function() {
      this._removeFxLayer();

      var info = this._getRenderingInfo();
      var flds = [];
      array.forEach(this.config.vizFields, function(f){
        flds.push(f.field);
      });
      this.fxLayer = new FxLayer(this.config.vizLayer.url, {
        vizType: this.config.vizType,
        vizFields: flds,
        displayField: this.config.displayField,
        renderingInfo: info
      });

      this.fxLayer.on("all-features-loaded", lang.hitch(this, this._allFeaturesLoaded));
      this.fxLayer.on("selected-feature-from-globe",
        lang.hitch(this, this._selectedFeatureFromGlobe));
      this.fxLayer.on("abandon-selected-feature", lang.hitch(this, this._abandonSelectedFeature));
      this.fxLayer.on('fx3d-ready', function() {
        this.loadingCover.hide();
      }.bind(this));

      this.fxLayer.watch('visible',
        lang.hitch(this, function(newValue, oldValue, property, object) {
        // console.log(newValue, oldValue, property, object);
        if (newValue === false) {
          this._stopVizTimer();
        }
      }));

      this.sceneView.map.add(this.fxLayer);
    },

    _selectedFeatureFromGlobe: function(evt) {
      if (this.fxLayer) {
        this.fxLayer.hideLabel();
      }
      this._featuresLoadedDfd.then(function() {
        if (evt.selectedFeature) {
          var index = this._getFeatureIndex(evt.selectedFeature);
          if (this.vizCards) {
            this.vizCards.selectCard(index);
          }
        }
      }.bind(this));
    },

    _abandonSelectedFeature: function(evt) {
      // console.log(evt);
      if (this.vizCards) {
        this.vizCards.unselectCards();
      }
    },

    _allFeaturesLoaded: function(evt) {
      this._featuresLoadedDfd.resolve();
      this.vizFeatures = evt.graphics;
      this._setVizPage(0, true);
    },

    // show layers
    _showLayers: function() {
      if (this.vizLayer) {
        this.vizLayer.visible = false;
      }
      if (this.fxLayer) {
        this.fxLayer.visible = true;
      }
      this.loadingCover.hide();
    },

    // hide layers
    _hideLayers: function() {
      if (this.vizLayer) {
        this.vizLayer.visible = this.vizLayerVisibility;
      }
      if (this.fxLayer) {
        this.fxLayer.visible = false;
      }
    },

    // init viz
    _initViz: function() {
      // this._queryVizData();
      this._initVizPages();
    },

    // init viz pages
    _initVizPages: function() {
      var list = this.pages;
      list.innerHTML = "";
      if (this.config.vizFields.length > 1) {
        for (var i = 0; i < this.config.vizFields.length; i++) {
          var fld = this.config.vizFields[i];
          var id = this.id + "-page" + i;
          var alias = fld.label || fld.alias;
          var link = domConstruct.create("li", {
            id: id,
            title: alias
          }, list);
          on(link, "click", lang.hitch(this, this._setVizPage, i));
        }
        domClass.add("page0", "active");
      }
      this.vizPage = 0;
    },

    // set viz page
    _setVizPage: function(num, first) {
      if (this.loadingCover.hidden) {
        this.loadingCover.show();
      }
      this._featuresLoadedDfd.then(function() {
        var oldId = this.id + "-page" + this.vizPage;
        var newId = this.id + "-page" + num;
        if (dom.byId(oldId)) {
          domClass.remove(oldId, "active");
        }
        this.vizPage = num;
        if (dom.byId(newId)) {
          domClass.add(newId, "active");
        }
        setTimeout(function() {
          this._processViz(first);
        }.bind(this), 300);
      }.bind(this));
    },

    // toggle viz timer
    _toggleVizTimer: function() {
      if (this.playing) {
        this._stopVizTimer();
      } else {
        this._startVizTimer();
      }
    },

    // start viz timer
    _startVizTimer: function() {
      this._stopVizTimer();
      this.vizTimer = setInterval(lang.hitch(this, this._doViz), this.config.interval * 10);
      if (this.fxLayer) {
        this.fxLayer.visible = true;
        this.fxLayer.startSpinning();
      }

      this.playing = true;
      domClass.add(this.btnPlay, "playing");
    },

    // stop viz timer
    _stopVizTimer: function() {
      if (this.vizTimer) {
        clearInterval(this.vizTimer);
        this.vizTimer = null;
      }
      if (this.fxLayer) {
        this.fxLayer.pauseSpinning();
      }
      this.playing = false;
      if (this.btnPlay) {
        domClass.remove(this.btnPlay, "playing");
      }
    },

    // do viz
    _doViz: function() {
      var num = this.vizPage + 1;
      if (num >= this.config.vizFields.length) {
        num = 0;
      }
      this._setVizPage(num);
    },

    // process viz
    _processViz: function(first) {
      var fld = this.config.vizFields[this.vizPage];
      var vizFld = fld.field;
      var alias = fld.label || fld.alias;
      var displayFld = this.config.displayField;
      this.titleNode.innerHTML = alias;

      // update fx layer
      //if (this.fxLayer && this.vizPage !== this.fxLayer._currentVizPage) {
      if (this.fxLayer && first !== true) {
        var info = this._getRenderingInfo();
        this.fxLayer.when().then(function() {
          this.fxLayer.switchVizField(vizFld, info);
        }.bind(this));
      }

      var filteredFeatures = this._sortedFeatures[vizFld];
      if (!filteredFeatures) {
        filteredFeatures = array.filter(this.vizFeatures, function(item) {
          if (item.attributes[vizFld] != null) {
            return true;
          } else {
            return false;
          }
        });

        if (filteredFeatures.length > 0) {
          filteredFeatures.sort(function(a, b) {
            if (a.attributes[vizFld] < b.attributes[vizFld]) {
              return 1;
            }
            if (a.attributes[vizFld] > b.attributes[vizFld]) {
              return -1;
            }
            return 0;
          });
          array.forEach(filteredFeatures, function(f, index) {
            f.attributes.index = index;
          });
          this.vizMax = filteredFeatures[0].attributes[vizFld];
        }

        this._sortedFeatures[vizFld] = filteredFeatures;
      }

      this.filteredFeatures = filteredFeatures;
      var options = {
        features: filteredFeatures,
        vizField: vizFld,
        displayField: displayFld,
        color: this._getColor()
      };
      this.vizCards.update(options);
      this.loadingCover.hide();
    },

    // **
    // Selection Functions
    // **

    // feature selection
    _featureSelection: function(obj) {
      if (obj.data) {
        var gra = obj.data;
        if (this.playing) {
          this._stopVizTimer();
        }
        if(this.fxLayer) {
          this.fxLayer.showLabel(gra);
        }
      } else {
        // Hide all labels when abandoning selecting feature on the VizCard
        if (this.fxLayer) {
          this.fxLayer.hideLabel();
        }
      }
    },

    // get feature index
    _getFeatureIndex: function(feature) {
      var fld = this.config.displayField;
      var name = feature.attributes[fld];
      var index = 0;
      array.some(this.filteredFeatures, function(f){
        if(f.attributes[fld] === name) {
          return true;
        }
        index += 1;
      });
      return index;
    }

  });
});
