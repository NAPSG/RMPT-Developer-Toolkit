define([
  'dojo/Evented',

  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/Color',
  'dojo/_base/lang',
  'dojo/_base/html',

  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/dom-style',

  'dojo/number',
  'dojo/on',
  'dojo/query',

  'dojox/gfx',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',

  'dojo/text!./templates/VizCards.html'

], function(
  Evented,
  declare, array, Color, lang, html,
  domClass, domConstruct, domStyle,
  number, on, query,
  gfx,
  _WidgetBase, _TemplatedMixin,
  template
) {

  var MaxRecsCount = 400;

  var cards = declare('VizCards', [_WidgetBase, _TemplatedMixin, Evented], {

    declaredClass: "esri.widgets.VizCards",

    templateString: template,

    css: {
      root: "esri-viz-cards",
      content: "content"
    },

    //--------------------------------------------------------------------------
    //
    //  Lifecycle
    //
    //--------------------------------------------------------------------------

    constructor: function(options, srcRefNode) {
      this.rtl = false;

      this.options = {
        view: null,
        features: [],
        vizField: null,
        displayField: null,
        color: '#ff0000',
        showPercent: false
      };

      // mix in settings and defaults
      lang.mixin(this.options, options);
      // widget node
      this.domNode = srcRefNode;
      // store localized strings
      //this._i18n = i18n;
      // Record the selected card node each time
      this._currentSelectedCardNode = null;
    },

    postCreate: function() {
      this.inherited(arguments);
      if(query(".dj_rtl").length > 0) {
        this.rtl = true;
      }
      this.own(on(this.contentNode, "click", lang.hitch(this, this._clickCard)));
    },

    startup: function() {
      this.inherited(arguments);
      this._updateCards();
    },

    destroy: function() {
      this.view = null;
      this.inherited(arguments);
    },

    // clear
    clear: function() {
      this.containerNode.innerHTML = "";
    },

    // update
    update: function(options) {
      lang.mixin(this.options, options);
      this._updateCards();
    },

    // select card
    selectCard: function(index) {
      // To make difference to other Viz Widget
      var id = this.domNode.id + "_card_" + index;
      this.unselectCards();
      var selectedCardNode = query("#" + id, this.domNode)[0];
      if (selectedCardNode) {
        domClass.add(selectedCardNode, "selected");
        this._currentSelectedCardNode = selectedCardNode;
      }
      var w = html.getContentBox(this.containerNode).w;
      var pos = (index * 180) - w / 2 + 90;
      if (this.rtl) {
        pos = (this.options.features.length - index) * 180 - w / 2 - 90;
      }
      if (pos < 0) {
        pos = 0;
      }
      this.containerNode.scrollLeft = pos;
    },

    // unselect cards
    unselectCards: function() {
      // To improve performance
      if (this._currentSelectedCardNode) {
        domClass.remove(this._currentSelectedCardNode, "selected");
        this._currentSelectedCardNode = null;
      }
    },

    // get total
    _getTotal: function() {
      var fld = this.options.vizField;
      var total = 0;
      array.forEach(this.options.features, function(f) {
        total += f.attributes[fld];
      });
      return total;
    },

    // update cards
    _updateCards: function() {

      var node = this.contentNode;
      domStyle.set(node, "color", this.options.color);
      var recs = this.options.features;
      var total = this._getTotal();
      node.innerHTML = "";
      var pos = 0;
      if(this.rtl) {
        pos = recs.length * 180;
      }
      this.containerNode.scrollLeft = pos;
      domStyle.set(node, "width", recs.length * 180 + "px");

      var recsLen = recs.length;
      var rec = null, attr, value, valueF, fSize = null;
      var displayPct = (this.options.showPercent && recsLen <= MaxRecsCount);
      // array.forEach(recs, lang.hitch(this, function(rec, index) {
      for (var index=0; index<recsLen; index++) {
        //var geom = rec.geometry;
        rec = recs[index];
        attr = rec.attributes;
        value = attr[this.options.vizField];
        valueF = number.format(value);
        if (!fSize) {
          fSize = Math.floor(150 / valueF.length + 3);
          if (fSize < 10) {
            fSize = 10;
          }
          if (fSize > 60) {
            fSize = 60;
          }
        }
        var name = attr[this.options.displayField];
        if (value !== null) {

          var vizCard = domConstruct.create("div", {
            id: this.domNode.id + "_card_" + index
          }, node);
          domClass.add(vizCard, "card");

          var vizHeader = domConstruct.create("div", {
            innerHTML: (index + 1) + ". " + name
          }, vizCard);
          domClass.add(vizHeader, "header");

          var vizValue = domConstruct.create("div", {
            innerHTML: valueF
          }, vizCard);

          if (displayPct) {

            domClass.add(vizValue, "value");

            var pct = parseInt(value / total * 100, 10);
            var pctLabel = pct + "%";
            if (value > 0 && pct < 1) {
              pctLabel = "<1%";
            }

            var vizArea = domConstruct.create("div", {}, vizCard);
            domClass.add(vizArea, "area");

            var vizChart = domConstruct.create("div", {}, vizArea);
            domClass.add(vizChart, "chart");

            var vizPct = domConstruct.create("div", {
              innerHTML: pctLabel
            }, vizArea);
            domClass.add(vizPct, "pct");

            this._createChart(vizChart, pct);

          } else {

            domClass.add(vizValue, "valueBig");
            domStyle.set(vizValue, "fontSize", fSize + "px");

          }
        }
      }
    },

    // create chart
    _createChart: function(node, pct) {
      var box = html.getContentBox(node);
      var w = box.w;
      var h = box.h;
      var size = Math.min(w, h);
      var cx = size / 2;
      var cy = size / 2;
      var radius = cx - 3;

      // surface
      var surface = gfx.createSurface(node, size, size);
      surface.clear();
      // chart base
      surface.createCircle({
        cx: cx,
        cy: cy,
        r: radius
      }).
      setStroke({
        width: 6,
        color: Color.fromArray([255, 255, 255, 0.15]),
        cap: "round"
      });
      // chart donut
      if (pct > 0) {
        if (pct >= 100) {
          pct = 99;
        }
        var angle = pct * 360 / 100;
        var flag = false;
        if (angle >= 180) {
          flag = true;
        }
        var pt = this._getEndPoint(radius, angle, cx, cy);
        var startY = cy - radius;
        surface.createPath()
          .moveTo(cx, startY)
          .arcTo(radius, radius, 0, flag, true, pt.x, pt.y)
          .setStroke({
            width: 6,
            color: this.options.color,
            cap: "round"
          });
      }
    },

    // get end point
    _getEndPoint: function(r, angle, cx, cy) {
      var a = angle;
      if (angle > 0 && angle < 90) {
        a += 270;
      } else if (angle > 90) {
        a = angle - 90;
      }
      var rad = a * Math.PI / 180;
      var ptX = cx + Math.cos(rad) * r;
      var ptY = cy + Math.sin(rad) * r;
      return {
        x: ptX,
        y: ptY
      };
    },

    // click card
    _clickCard: function(evt) {
      var cardNode = evt.target || evt.srcElement;
      if (!domClass.contains(cardNode, 'card')) {
        while (cardNode && cardNode.parentNode) {
          cardNode = cardNode.parentNode;
          if (domClass.contains(cardNode, 'card')) {
            break;
          }
        }
      }
      if (!cardNode) {
        return;
      }

      var idPrefix = this.domNode.id + "_card_";
      var index = cardNode.id.replace(idPrefix, '');
      index = parseInt(index, 10);
      if (isNaN(index) || index == null) {
        return;
      }
      if (domClass.contains(cardNode, "selected")) {
        this.unselectCards();
        this.emit("selection", {});
      } else {
        this.unselectCards();
        domClass.add(cardNode, "selected");
        this._currentSelectedCardNode = cardNode;
        var feature = this.options.features[index];
        this.emit("selection", {
          data: feature
        });
      }
    }

  });

  return cards;
});
