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
  'dojo/_base/html',
  'dojo/on',
  'dojo/when',
  'dojo/query',
  'dojo/_base/array',
  'dojo/dom-style',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/Deferred',
  'dojo/DeferredList',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/Select',
  'jimu/BaseWidgetSetting',
  'jimu/dijit/SimpleTable',
  'jimu/LayerInfos/LayerInfos',
  'jimu/dijit/Message',
  'jimu/dijit/CheckBox',
  'jimu/dijit/LayerChooserFromMapWithDropbox',
  'esri/symbols/jsonUtils',
  'esri/request',
  '../locatorUtils',
  './EditablePointFeatureLayerChooserFromMap',
  './EditFields',
  './LocatorSourceSetting',
  'jimu/dijit/SymbolPicker'
],
  function (
    declare,
    lang,
    html,
    on,
    when,
    query,
    array,
    domStyle,
    domConstruct,
    domClass,
    Deferred,
    DeferredList,
    _WidgetsInTemplateMixin,
    Select,
    BaseWidgetSetting,
    SimpleTable,
    LayerInfos,
    Message,
    CheckBox,
    LayerChooserFromMapSelect,
    jsonUtils,
    esriRequest,
    _utils,
    EditablePointFeatureLayerChooserFromMap,
    EditFields,
    LocatorSourceSetting,
    SymbolPicker) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-setting-critical-facilities',

      //TODO figure out what's up with the css for all SimpleTable instances with the rows. I handled in some way for IS but it was not correct

      //Questions
      //TODO should we support an option for configure user to mark certain fields as required?
      operLayerInfos: null,
      jimuLayerInfo: null,
      jimuLayerObject: null,
      layerInfo: null,

      postMixInProperties: function () {
        this.inherited(arguments);
        this.nls = lang.mixin(this.nls, window.jimuNls.common);
      },

      postCreate: function () {
        this.inherited(arguments);
        if (!(this.config && this.config.sources)) {
          this.config.sources = [];
        }
      },

      startup: function () {
        this.inherited(arguments);
        LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (infos) {
          this.operLayerInfos = infos;
          this._initUI();
          _utils.setMap(this.map);
          _utils.setAppConfig(this.appConfig);
          _utils.setDefaultXYFields(this.config.defaultXYFields);
          when(_utils.getConfigInfo(this.config)).then(lang.hitch(this, function (config) {
            if (!this.domNode) {
              return;
            }
            this.setConfig(config);
          }));
        }));
      },

      _initUI: function () {
        this._initLayerOptions();
        this._addLayerRow();
        this._initLocationOptions();
      },

      _initLayerOptions: function () {
        this.layerList = new SimpleTable({
          autoHeight: false,
          selectable: false,
          fields: [{
            name: "layer",
            title: this.nls.layerFieldTitle,
            width: "200px",
            type: "empty",
            editable: true
          }, {
            name: "actions",
            title: this.nls.layerFields,
            width: "200px",
            type: "actions",
            actions: ["edit"]
          }, {
            name: "symbol",
            title: this.nls.tempSymbolTitle,
            width: "80px",
            type: "empty",
            editable: true
          }]
        }, this.layerList);
        this.layerList.placeAt(this.layerListNode);
        this.layerList.startup();
        var tableBody = query('.body-section', this.layerListNode)[0];
        domStyle.set(tableBody, 'overflow', 'hidden');
        var headers = query("th.simple-table-field", this.layerListNode);
        var nls = this.nls;
        headers.forEach(function (n) {
          n.title = n.innerHTML === nls.layerFieldTitle ?
            nls.layerOptionHint : n.innerHTML === nls.layerFields ?
              nls.layerFieldsHint : nls.tempSymbolHint;
        });
      },

      _addLayerRow: function () {
        var result = this.layerList.addRow({});
        if (result.success && result.tr) {
          var tr = result.tr;
          this._createLayerChooserSelect(true, tr);
          this._initSymbolPicker(tr);
          this._initLayerFieldsEdit(tr);
        }
      },

      _createLayerChooserSelect: function (bindEvent, tr) {
        var layerTd = query('.simple-table-cell', tr)[0];

        if (this.layerChooserSelect) {
          this.layerChooserSelect.destroy();
        }
        this.layerChooserSelect = null;

        var layerChooserFromMap = new EditablePointFeatureLayerChooserFromMap({
          multiple: false,
          showLayerFromFeatureSet: false,
          showTable: false,
          onlyShowVisible: false,
          createMapResponse: this.map.webMapResponse
        });
        if (layerChooserFromMap.errorTipSection && layerChooserFromMap.errorTipSection.style) {
          domStyle.set(layerChooserFromMap.errorTipSection, 'display', 'none');
        }
        layerChooserFromMap.startup();
        domClass.add(layerTd, 'layer-select-node');
        this.layerChooserSelect = new LayerChooserFromMapSelect({
          layerChooser: layerChooserFromMap
        });
        this.layerChooserSelect.placeAt(layerTd);
        this.layerChooserSelect.startup();
        tr.layerChooserSelect = this.layerChooserSelect;
        if (bindEvent) {
          this.own(on(this.layerChooserSelect, 'selection-change', lang.hitch(this, this._onLayerChanged)));
        }

        var editLayers = layerChooserFromMap.getAllItems();
        if (editLayers.length === 0) {
          var d = query('.action-item', this.layerList.domNode)[0];
          this._toggleNode(d, false, 'jimu-state-disabled', 'jimu-icon-edit');
          this._validLayer = false;
          this._updateOk();
          this._showMessage(this.nls.needsEditablePointLayers);
        }
      },

      _initLayerFieldsEdit: function (tr) {
        var editTd = query('.simple-table-cell', tr)[1];
        domStyle.set(editTd, 'vertical-align', 'top');
        domStyle.set(editTd, 'padding-top', '7px');

        if (editTd && !this.editLayerFields) {
          this.editLayerFields = domConstruct.create("div", {}, editTd);

          domConstruct.create("span", {
            'class': "jimu-icon jimu-icon-error layer-fields-edit-error",
            title: this.nls.noFields
          }, this.editLayerFields);
          this.own(on(this.layerList, 'actions-edit', lang.hitch(this, this._onLayerEditFieldsClick)));
        }
        this._editAction = query('.action-item', this.layerList.domNode)[0];
      },

      _initLocationOptions: function () {
        this.sourceList = new SimpleTable({
          autoHeight: false,
          selectable: true,
          fields: [{
            name: "name",
            title: this.nls.name,
            width: "auto",
            type: "text",
            editable: false
          }, {
            name: "error",
            title: "",
            type: 'extension',
            width: "30px",
            hidden: false,
            create: lang.hitch(this, this._createError),
            setValue: lang.hitch(this, this._setErrorValue),
            getValue: lang.hitch(this, this._getErrorValue)
          }, {
            name: "actions",
            title: "",
            width: "80px",
            type: "actions",
            actions: ["up", "down", "delete"]
          }]
        }, this.sourceList);
        html.setStyle(this.sourceList.domNode, 'height', '100%');
        this._validLocator = false;
        this.sourceList.startup();
        this.own(on(this.sourceList, 'row-select', lang.hitch(this, this._onSourceItemSelected)));
        this.own(on(this.sourceList, 'row-delete', lang.hitch(this, this._onSourceItemRemoved)));

        this.xyEnabled = false;
        this.enableXYField = this._initCheckBox(this.enableXYField, this.nls.enableXYField, this.editXYFields);

        this.own(on(this.editXYFields, 'click', lang.hitch(this, this._onXYEditFieldsClick)));
      },

      _createError: function(td){
        if (td) {
          var errorSpan = domConstruct.create("span", {
            'class': "jimu-icon jimu-icon-error locator-error display-none"
          }, td);
          td.errorSpan = errorSpan;
        }
      },

      _setErrorValue: function (td, value) {
        if (value) {
          if (domClass.contains(td.errorSpan, 'display-none')) {
            td.errorSpan.title = value;
            domClass.remove(td.errorSpan, 'display-none');
          }
        } else {
          domClass.add(td.errorSpan, 'display-none');
        }
      },

      _getErrorValue: function(td){
        return td.errorSpan && domClass.contains(td.errorSpan, 'display-none');
      },

      _initCheckBox: function (domNode, nlsValue, editNode) {
        domNode = new CheckBox({
          checked: false,
          label: nlsValue
        }, domNode);
        this._toggleNode(editNode, false, 'edit-fields-disabled', 'edit-fields');
        this.own(on(domNode, 'change', lang.hitch(this, function () {
          var enabled = domNode.getValue();
          this.xyEnabled = enabled;
          this.validateAddressOptions();
          this._toggleNode(editNode, enabled, 'edit-fields-disabled', 'edit-fields');
        })));
        return domNode;
      },

      _initMaxRecords: function () {
        //var ls = this.config.layerSettings;
        //this.maxRecords.setValue((ls && ls.maxRecords && ls.maxRecords !== NaN) ? ls.maxRecords : undefined);
      },

      _initSymbolPicker: function (tr) {
        if(!this.symbolPicker && tr) {
          this.symbolPicker = new SymbolPicker();
          var symbolTd = query('.simple-table-cell', tr)[2];
          this.symbolPicker.placeAt(symbolTd);
          this.symbolPicker.startup();
          domClass.add(symbolTd, 'layer-symbol');
          tr.symbolPicker = this.symbolPicker;
        }

        if (this.config.layerSettings && this.config.layerSettings.symbol) {
          this.symbolPicker.showBySymbol(jsonUtils.fromJson(this.config.layerSettings.symbol));
        } else {
          this.symbolPicker.showByType('marker');
        }
      },

      _onLayerChanged: function () {
        var item = this.layerChooserSelect.getSelectedItem();
        if (!item) {
          this._validLayer = false;
          return;
        }
        this.jimuLayerInfo = item.layerInfo;
        this.jimuLayerObject = item.layerInfo.layerObject;

        var defaultLayerInfo = this._getDefaultLayerInfo(this.jimuLayerObject);
        var configLayerInfo = this._getLayerInfoFromConfiguration(this.jimuLayerObject);

        this.layerInfo = configLayerInfo || defaultLayerInfo;
        this._validLayer = true;
        this._updateOk();
        this._toggleNode(this._editAction, true, 'jimu-state-disabled', 'jimu-icon-edit');
        this._validateLayerFields();
      },

      addSelect: function (node, values) {
        node.selectControl = new Select({
          options: values,
          style: "width: 100%;"
        });
        node.selectControl.placeAt(node).startup();
      },

      _toggleNode: function (domNode, enable, disableClass, enableClass) {
        if (domNode) {
          html.removeClass(domNode, enable ? disableClass : enableClass);
          html.addClass(domNode, enable ? enableClass : disableClass);
        }
      },

      _onLayerEditFieldsClick: function () {
        if (this.layerInfo) {
          var editFields = new EditFields({
            nls: this.nls,
            _layerInfo: this.layerInfo,
            type: 'fieldInfos'
          });
          this.own(on(editFields, 'edit-fields-popup-ok', lang.hitch(this, function () {
            this._validateLayerFields();
          })));
          editFields.popupEditPage();
        }
      },

      _validateLayerFields: function () {
        var visibleFields = this._getVisibleFields(this.layerInfo.fieldInfos);
        this._validFields = visibleFields.length > 0;
        this._toggleNode(this.editLayerFields, this._validFields, 'display-block', 'display-none');
        this._updateOk();
      },

      setConfig: function (config) {
        this.config = config;
        var sources = config.sources;
        var queries = [];
        array.forEach(sources, lang.hitch(this, function (source, index) {
          var addResult = this.sourceList.addRow({
            name: source.name || ""
          });
          if (addResult && addResult.success) {
            this._setRowConfig(addResult.tr, source);
            if (index === 0) {
              var firstTr = addResult.tr;
              setTimeout(lang.hitch(this, function () {
                this.sourceList.selectRow(addResult.tr);
                firstTr = null;
              }), 100);
            }
            if (source && source.url) {
              queries.push(this._verifyURL(source.url));
            }
          } else {
            console.error("add row failed ", addResult);
          }
        }));
        this.validateAddressOptions();

        var locatorQueryList = new DeferredList(queries);
        locatorQueryList.then(lang.hitch(this, function (queryResults) {
          if (queryResults) {
            for (var i = 0; i < queryResults.length; i++) {
              var qr = queryResults[i][1];
              if (qr && qr.type && qr.type === 'error') {
                //make the locator name text red
                if (this.sourceList) {
                  var rows = this.sourceList.getRows();
                  var tr = rows[i];
                  tr.isDisabled = true;
                  var td = query('.normal-text-div', tr)[0];
                  td.title = this.nls.locatorError;
                  domStyle.set(td, 'color', 'red');
                }
              }
            }
          }
        }));

        //get the config layer if it exists
        var layerInfo;
        var layerSettings = this.config.layerSettings;
        if (layerSettings && layerSettings.layerInfo && layerSettings.layerInfo.featureLayer) {
          layerInfo = this.operLayerInfos.getLayerInfoById(this.config.layerSettings.layerInfo.featureLayer.id);
        }
        //if we have a config layer set it otherwise just expand the chooser
        if (layerInfo) {
          layerInfo.getLayerObject().then(lang.hitch(this, function (layer) {
            this.layerChooserSelect.setSelectedLayer(layer).then(lang.hitch(this, function () {
              this._validLayer = true;
              this._updateOk();
              this._toggleNode(this._editAction, true, 'jimu-state-disabled', 'jimu-icon-edit');
            }));
          }));
        } else {
          this._validLayer = false;
          this._updateOk();
          this.layerChooserSelect.showLayerChooser();
          this._toggleNode(this._editAction, false, 'jimu-state-disabled', 'jimu-icon-edit');
        }

        //Layer Settings
        this._initSymbolPicker();
        this._initMaxRecords();

        //Location settings

        //X/Y settings
        if (!this.config.defaultXYFields) {
          this._setDefaultXYFields();
        }

        this.xyEnabled = typeof (this.config.xyEnabled) !== 'undefined' ? this.config.xyEnabled : false;
        this.enableXYField.setValue(this.config.xyEnabled);

        this._setXYFields(this.defaultXYFields, this.config);

        this.validateAddressOptions();
      },

      _verifyURL: function(url) {
        var def = new Deferred();
        esriRequest({
          url: url,
          content: {
            f: 'json'
          },
          handleAs: 'json',
          callbackParamName: 'callback'
        }).then(lang.hitch(this, function (response) {
          def.resolve(response);
        }), lang.hitch(this, function (err) {
          console.error(err);
          def.resolve({
            type: 'error',
            url: url
          });
        }));
        return def;
      },

      validateAddressOptions: function () {
        //disable ok if no address options are enabled or if no fields are defined within them
        var optionsEnabled = [];
        var trs = this.sourceList.getRows();
        var allSingleEnabled = [];
        var allMultiEnabled = [];
        var oneMulti = false;
        var oneSingle = false;
        array.forEach(trs, lang.hitch(this, function (tr) {
          var single = tr.singleEnabled;
          var visibleFields = tr.multiEnabled && tr.addressFields ? this._getVisibleFields(tr.addressFields) : [];

          var multi = tr.multiEnabled && visibleFields.length > 0;
          allSingleEnabled.push(single);
          allMultiEnabled.push(multi);
          oneMulti = multi ? multi : oneMulti;
          oneSingle = single ? single : oneSingle;

          optionsEnabled.push(multi && single ? true : multi || single);
          this._toggleNode(tr.noFieldsNode, tr.multiEnabled ? multi : true, 'display-block', 'display-none');
        }));
        this._validateMatchingOptions(trs, oneMulti, allMultiEnabled, oneSingle, allSingleEnabled);
        var _valid = oneMulti || oneSingle;
        this._validAddressOptions = this.xyEnabled && _valid ? true : _valid ? true : this.xyEnabled;
        this._updateOk();
      },

      _validateMatchingOptions: function(rows, oneMulti, allMultiEnabled, oneSingle, allSingleEnabled) {
        //alert user if settings do not match...for example if single is defined for one but not the other
        var validMulti = !oneMulti || allMultiEnabled.every(function(v) { return v === true; });
        var validSingle = !oneSingle || allSingleEnabled.every(function(v) { return v === true; });

        var val = !validMulti || !validSingle ? this.nls.optionNotMatch : null;
        array.forEach(rows, lang.hitch(this, function (tr) {
          var td = query('.error', tr)[0];
          this.sourceList.fields[1].setValue(td, val);
        }));
      },

      _getVisibleFields: function(fields){
        var visibleFields = [];
        if (fields && fields.filter) {
          visibleFields = fields.filter(function (f) {
            return f.visible;
          });
        }
        return visibleFields;
      },

      _getLayerInfoFromConfiguration: function (layer) {
        var layerInfo = null;
        var layerSettings = this.config.layerSettings;
        if (layerSettings && layerSettings.layerInfo && layerSettings.layerInfo.featureLayer) {
          if (layerSettings.layerInfo.featureLayer.id === layer.id) {
            layerInfo = layerSettings.layerInfo;
            layerInfo.fieldInfos = this._getFieldInfos(layer, layerInfo);
          }
        }
        return layerInfo;
      },

      _getDefaultLayerInfo: function (layerObject) {
        var layerInfo = {
          'featureLayer': {
            'id': layerObject.id,
            'fields': layerObject.fields,
            'title': layerObject.name,
            'url': layerObject.url
          },
          'fieldInfos': this._getFieldInfos(layerObject)
        };
        return layerInfo;
      },

      _getDefaultFieldInfos: function (layerObject) {
        var fieldInfos = [];
        for (var i = 0; i < layerObject.fields.length; i++) {
          if (layerObject.fields[i].editable &&
            layerObject.fields[i].name !== layerObject.globalIdField &&
            layerObject.fields[i].name !== layerObject.objectIdField) {
            var isRecognizedValues = [layerObject.fields[i].name];
            if (layerObject.fields[i].alias && isRecognizedValues.indexOf(layerObject.fields[i].alias) === -1) {
              isRecognizedValues.push(layerObject.fields[i].alias);
            }
            fieldInfos.push({
              fieldName: layerObject.fields[i].name,
              label: layerObject.fields[i].alias || layerObject.fields[i].name,
              isEditable: layerObject.fields[i].editable,
              visible: false,
              isRecognizedValues: isRecognizedValues,
              type: layerObject.fields[i].type
            });
          }
        }
        return fieldInfos;
      },

      _getWebmapFieldInfos: function (layerObject) {
        var fieldInfos = [];
        var wFieldInfos = this._getFieldInfosFromWebmap(layerObject.id, this.operLayerInfos);
        if (wFieldInfos) {
          array.forEach(wFieldInfos, function (fi) {
            if ((fi.isEditableOnLayer !== undefined && fi.isEditableOnLayer) &&
              fi.fieldName !== layerObject.globalIdField &&
              fi.fieldName !== layerObject.objectIdField) {
              fieldInfos.push({
                fieldName: fi.fieldName,
                label: fi.label,
                isEditable: fi.isEditable,
                visible: fi.visible,
                type: fi.fieldType
              });
            }
          });
          if (fieldInfos.length === 0) {
            fieldInfos = null;
          }
        } else {
          fieldInfos = null;
        }
        return fieldInfos;
      },

      _getFieldInfosFromWebmap: function(layerId, jimuLayerInfos) {
        var fieldInfos = null;
        var jimuLayerInfo = jimuLayerInfos.getLayerInfoByTopLayerId(layerId);
        if(jimuLayerInfo) {
          var popupInfo = jimuLayerInfo.getPopupInfo();
          if(popupInfo && popupInfo.fieldInfos) {
            fieldInfos = lang.clone(popupInfo.fieldInfos);
          }
        }

        if(fieldInfos) {
          array.forEach(fieldInfos, function(fieldInfo) {
            if(fieldInfo.format &&
              fieldInfo.format.dateFormat &&
              fieldInfo.format.dateFormat.toLowerCase() &&
              fieldInfo.format.dateFormat.toLowerCase().indexOf('time') >= 0
              ) {
              fieldInfo.format.time = true;
            }
          });
        }

        return fieldInfos;
      },

      _getFieldInfos: function (layerObject, layerInfo) {
        var fieldInfos = [];
        var wFieldInfos = this._getWebmapFieldInfos(layerObject);
        var bFieldInfos = this._getDefaultFieldInfos(layerObject);
        bFieldInfos = bFieldInfos ? bFieldInfos : wFieldInfos;
        if (layerInfo && layerInfo.fieldInfos) {
          array.forEach(layerInfo.fieldInfos, function (fi) {
            if (!fi.hasOwnProperty('isRecognizedValues')) {
              var isRecognizedValues = [fi.fieldName];
              if (fi.label && isRecognizedValues.indexOf(fi.label) === -1) {
                isRecognizedValues.push(fi.label);
              }
              fi.isRecognizedValues = isRecognizedValues;
            }

            if (typeof(fi.visible) === 'undefined') {
              if (wFieldInfos) {
                for (var j = 0; j < wFieldInfos.length; j++) {
                  if (fi.fieldName === wFieldInfos[j].fieldName) {
                    fi.visible = wFieldInfos[j].visible || wFieldInfos[j].isEditable;
                  }
                }
              } else {
                fi.visible = true;
              }
            }

            // keep order.
            for (var i = 0; i < bFieldInfos.length; i++) {
              if (fi.fieldName === bFieldInfos[i].fieldName) {
                fieldInfos.push(fi);
                bFieldInfos[i]._exit = true;
                break;
              }
            }
          });
          // add new fieldInfos at end.
          array.forEach(bFieldInfos, function (fi) {
            if (!fi._exit) {
              fieldInfos.push(fi);
            }
          });
        } else {
          fieldInfos = bFieldInfos;
        }
        return fieldInfos;
      },

      getConfig: function () {
        //Layer Settings
        this.config.layerSettings = {
          layerInfo: this.layerInfo,
          symbol: this.symbolPicker.getSymbol().toJson()
          //maxRecords: this.maxRecords.getValue()
        };

        //Location Settings
        if (this._currentSourceSetting) {
          this._closeSourceSetting();
        }
        var trs = this.sourceList.getRows();
        var sources = [];
        array.forEach(trs, lang.hitch(this, function (tr) {
          var source = this._getRowConfig(tr);
          source.isEsriLocator = this._currentSourceSetting._isEsriLocator(source.url);
          delete source._definition;
          this._removeRowConfig(tr);
          sources.push(source);
        }));

        this.config.sources = sources;
        this.config.xyFields = this.xyFields || this.config.defaultXYFields;
        this.config.xyEnabled = this.xyEnabled;

        return this.config;
      },

      ///////////////////////////////////////////////////////////
      //XY Fields
      _setDefaultXYFields: function () {
        this.config.defaultXYFields = [{
          "fieldName": this.nls.xyFieldsX,
          "alias": this.nls.xyFieldsLabelX,
          "label": this.nls.xyFieldsLabelX,
          "visible": true,
          "isRecognizedValues": [this.nls.xyFieldsX, this.nls.longitude, this.nls.lon, this.nls.easting],
          "type": "STRING"
        }, {
          "fieldName": this.nls.xyFieldsY,
          "alias": this.nls.xyFieldsLabelY,
          "label": this.nls.xyFieldsLabelY,
          "visible": true,
          "isRecognizedValues": [this.nls.xyFieldsY, this.nls.latitude, this.nls.lat, this.nls.northing],
          "type": "STRING"
        }];
      },

      _onXYEditFieldsClick: function () {
        if (this.xyEnabled) {
          var editFields = new EditFields({
            nls: this.nls,
            type: 'locatorFields',
            addressFields: this.xyFields || this.config.defaultXYFields,
            popupTitle: this.nls.configureXYFields,
            disableDisplayOption: true,
            disableDuplicateOption: true
          });
          this.own(on(editFields, 'edit-fields-popup-ok', lang.hitch(this, function () {
            this.xyFields = editFields.fieldInfos;
          })));
          editFields.popupEditPage();
        }
      },

      _setXYFields: function (xyFields, config) {
        var useConfig = config && config.xyFields &&
          config.xyFields.hasOwnProperty('length') && config.xyFields.length > 0;
        this.xyFields = useConfig ? config.xyFields : xyFields;
      },
      ///////////////////////////////////////////////////////////

      ///////////////////////////////////////////////////////////
      //Locator settings
      _onAddClick: function () {
        this._createNewLocatorSourceSettingFromMenuItem({}, {});
      },

      _createNewLocatorSourceSettingFromMenuItem: function (setting, definition) {
        var locatorSetting = new LocatorSourceSetting({
          nls: this.nls,
          map: this.map,
          defaultXYFields: this.config.defaultXYFields,
          parent: this
        });
        locatorSetting.setDefinition(definition);
        locatorSetting.setConfig({
          url: setting.url || "",
          name: setting.name || "",
          singleLineFieldName: setting.singleLineFieldName || "",
          countryCode: setting.countryCode || "",
          addressFields: setting.addressFields || [],
          singleAddressFields: setting.singleAddressFields || [],
          xyFields: setting.xyFields || [],
          singleEnabled: setting.singleEnabled || false,
          multiEnabled: setting.multiEnabled || false,
          xyEnabled: setting.xyEnabled || false,
          minCandidateScore: setting.minCandidateScore || 90,
          type: "locator"
        });
        locatorSetting._openLocatorChooser();

        locatorSetting.own(
          on(locatorSetting, 'select-locator-url-ok', lang.hitch(this, function (item) {
            var addResult = this.sourceList.addRow({
              name: item.name || "New Geocoder"
            }, this.sourceList.getRows().length);
            if (addResult && addResult.success) {
              if (this._currentSourceSetting) {
                this._closeSourceSetting();
              }
              locatorSetting.setRelatedTr(addResult.tr);
              locatorSetting.placeAt(this.sourceSettingNode);
              this.sourceList.selectRow(addResult.tr);
              this._currentSourceSetting = locatorSetting;
            }
            var xy = query('.xy-table');
            if (xy.length > 0) {
              html.removeClass(xy[0], 'display-none');
            }
            this._validLocator = true;
            this._updateOk();
          }))
        );
        locatorSetting.own(
          on(locatorSetting, 'reselect-locator-url-ok', lang.hitch(this, function (item) {
            var tr = this._currentSourceSetting.getRelatedTr();
            this.sourceList.editRow(tr, {
              name: item.name
            });
          }))
        );
        locatorSetting.own(
          on(locatorSetting, 'select-locator-url-cancel', lang.hitch(this, function () {
            if (this._currentSourceSetting !== locatorSetting) {// locator doesn't display in UI
              locatorSetting.destroy();
              locatorSetting = null;
            }
          }))
        );
      },

      _createNewLocatorSourceSettingFromSourceList: function (setting, definition, relatedTr) {
        if (this._currentSourceSetting) {
          this._closeSourceSetting();
        }

        this._currentSourceSetting = new LocatorSourceSetting({
          nls: this.nls,
          map: this.map,
          defaultXYFields: this.config.defaultXYFields,
          parent: this
        });
        this._currentSourceSetting.setDefinition(definition);
        this._currentSourceSetting.setConfig({
          url: setting.url || "",
          name: setting.name || "",
          singleLineFieldName: setting.singleLineFieldName || "",
          countryCode: setting.countryCode || "",
          addressFields: setting.addressFields,
          singleAddressFields: setting.singleAddressFields,
          xyFields: setting.xyFields,
          singleEnabled: setting.singleEnabled,
          multiEnabled: setting.multiEnabled,
          xyEnabled: setting.xyEnabled,
          minCandidateScore: setting.minCandidateScore || 90,
          type: "locator"
        });
        this._currentSourceSetting.setRelatedTr(relatedTr);
        this._currentSourceSetting.placeAt(this.sourceSettingNode);
        this._validLocator = true;
        this._updateOk();
        this._currentSourceSetting.own(
          on(this._currentSourceSetting,
            'reselect-locator-url-ok',
            lang.hitch(this, function (item) {
              var tr = this._currentSourceSetting.getRelatedTr();
              this.sourceList.editRow(tr, {
                name: item.name
              });
              this._validLocator = true;
              this._updateOk();
            }))
        );
        this.validateAddressOptions();
      },

      _onSourceItemRemoved: function (tr) {
        if (!this._currentSourceSetting) {
          this._validLocator = false;
          this._updateOk();
          return;
        }
        var currentTr = this._currentSourceSetting.getRelatedTr();
        if (currentTr === tr) {
          this._currentSourceSetting.destroy();
          this._currentSourceSetting = null;
        }
        var rows = this.sourceList.getRows();
        if (rows.length > 0) {
          this._onSourceItemSelected(rows[0]);
          this.validateAddressOptions();
        } else {
          this._validLocator = false;
          this._updateOk();
          this._showMessage(this.nls.requiresLocator);
          var xy = query('.xy-table');
          if (xy.length > 0) {
            html.addClass(xy[0], 'display-none');
          }
        }
      },

      _onSourceItemSelected: function (tr) {
        var config = this._getRowConfig(tr);
        var currentTr = this._currentSourceSetting && this._currentSourceSetting.tr;
        if (!config || tr === currentTr) {
          return;
        }
        if (this._currentSourceSetting && !this._currentSourceSetting.isValidConfig()) {
          this._currentSourceSetting.showValidationTip();
          this.sourceList.selectRow(currentTr);
          return;
        }
        this._createNewLocatorSourceSettingFromSourceList(config, config._definition || {}, tr);
      },

      _setRowConfig: function (tr, source) {
        query(tr).data('config', lang.clone(source));
        tr.singleEnabled = source.singleEnabled;
        tr.addressFields = source.addressFields;
        tr.multiEnabled = source.multiEnabled;
        this.validateAddressOptions();
      },

      _getRowConfig: function (tr) {
        return query(tr).data('config')[0];
      },

      _removeRowConfig: function (tr) {
        tr.singleEnabled = false;
        tr.multiEnabled = false;
        tr.addressFields = [];
        return query(tr).removeData('config');
      },

      _closeSourceSetting: function () {
        var tr = this._currentSourceSetting.getRelatedTr();
        var source = this._currentSourceSetting.getConfig();
        source._definition = this._currentSourceSetting.getDefinition();
        this._setRowConfig(tr, source);
        this.sourceList.editRow(tr, {
          name: source.name
        });
        if (tr.isDisabled) {
          this._currentSourceSetting._updateNameText(true);
        }
        this._currentSourceSetting.destroy();
      },
      ///////////////////////////////////////////////////////////

      _updateOk: function () {
        var disable = !((typeof (this._validLayer) !== 'undefined') ? this._validLayer : true) ||
          !((typeof (this._validLocator) !== 'undefined') ? this._validLocator : true) ||
          !((typeof (this._validFields) !== 'undefined') ? this._validFields : true) ||
          !((typeof (this._validAddressOptions) !== 'undefined') ? this._validAddressOptions : true);
        var s = query(".button-container")[0];
        var s2 = s.children[2];
        var s3 = s.children[3];
        domStyle.set(s2, "display", disable ? "none" : "inline-block");
        domStyle.set(s3, "display", disable ? "inline-block" : "none");
      },

      _showMessage: function (msg) {
        new Message({
          message: msg
        });
      },

      destroy: function () {
        this.emit('before-destroy');
        this.inherited(arguments);
      }
    });
  });
