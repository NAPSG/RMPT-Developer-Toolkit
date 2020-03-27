// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.15/esri/copyright.txt and http://www.arcgis.com/apps/webappbuilder/copyright.txt for details.

require({cache:{"url:builder/plugins/widget-config/WidgetChoosePage.html":'\x3cdiv class\x3d"widget-choose-page"\x3e\r\n  \x3cdiv data-dojo-attach-point\x3d"officialSection" class\x3d"official-section"\x3e\r\n    \x3cdiv class\x3d"section search" data-dojo-attach-point\x3d"searchSectionNode"\x3e\r\n      \x3cdiv data-dojo-attach-point\x3d"searchInputNode"\x3e\x3c/div\x3e\r\n      \x3cdiv class\x3d"list widget-list" data-dojo-attach-point\x3d"widgetListNode"\x3e\x3c/div\x3e\r\n    \x3c/div\x3e\r\n  \x3c/div\x3e\r\n  \x3cdiv data-dojo-attach-point\x3d"customSection" class\x3d"custom-section"\x3e\r\n    \x3cdiv data-dojo-attach-point\x3d"customSearchInputNode"\x3e\x3c/div\x3e\r\n  \x3c/div\x3e\r\n\x3c/div\x3e'}});
define("dojo/_base/declare dojo/_base/lang dojo/_base/html dojo/_base/array dojo/topic dojo/on dojo/Deferred dojo/promise/all dojo/query dojo/NodeList-dom dijit/_WidgetBase dijit/_TemplatedMixin dojo/text!./WidgetChoosePage.html jimu/dijit/Search jimu/WidgetManager jimu/dijit/LoadingShelter jimu/dijit/Message jimu/dijit/TabContainer3 jimu/utils jimu/portalUtils jimu/portalUrlUtils builder/serviceUtils esri/lang ./CustomWidgets".split(" "),function(u,e,d,f,v,l,p,q,g,E,w,x,y,r,z,A,m,B,h,F,C,n,D,t){return u([w,
x],{templateString:y,showCustomWidgets:!1,postMixInProperties:function(){this.widgetManager=z.getInstance()},startup:function(){this.inherited(arguments);C.isOnline(window.portalUrl)?this.showCustomWidgets=!1:this.showCustomWidgets=window.appInfo.isRunInPortal?window.queryObject.hideCustomWidgets?!1:!0:!1;this.showCustomWidgets||d.addClass(this.domNode,"hide-custom-widgets");this.tab=new B({tabs:[{title:this.nls.officialWidgets,content:this.officialSection},{title:this.nls.customWidgets,content:this.customSection}]});
this.tab.placeAt(this.domNode);this.searchDijit1=new r({placeholder:this.nls.widgetSearchHint,onSearch:e.hitch(this,this._onFilterDefaultWidget),searchWhenInput:!0},this.searchInputNode);this._getWidgets();this.own(l(window,"resize",e.hitch(this,this.resize)));setTimeout(e.hitch(this,function(){this.resize()}),100);this.loading=new A({hidden:!0});this.loading.placeAt(this.domNode);this.loading.startup();setTimeout(e.hitch(this,function(){this.searchDijit1.inputSearch.focus()}),60);this.showCustomWidgets&&
(this.searchDijit2=new r({placeholder:this.nls.widgetSearchHint,onChange:e.hitch(this,this._onFilterCustomWidget),onSearch:e.hitch(this,this._onSearchCustomWidget),searchWhenInput:!1},this.customSearchInputNode),this.allCustomWidgets=new t({portalUrl:window.portalUrl,fromNode:this.fromNode,widgetDomNode:this.domNode}),this.allCustomWidgets.placeAt(this.customSection),this.filterCustomWidgets=new t({portalUrl:window.portalUrl,hidden:!0,fromNode:this.fromNode,widgetDomNode:this.domNode}),this.filterCustomWidgets.placeAt(this.customSection),
this.own(l(this.tab,"tabChanged",e.hitch(this,function(a){a===this.nls.customWidgets?(this.searchDijit2.inputSearch.focus(),this.allCustomWidgets.queried||(this.allCustomWidgets.queried=!0,this.allCustomWidgets.queryItems())):this.searchDijit1.inputSearch.focus()}))))},_onFilterCustomWidget:function(a){this.allCustomWidgets.show();this.filterCustomWidgets.hide();a?this.allCustomWidgets.filterLocally(function(b){return b.title&&0<=b.title.toUpperCase().indexOf(a.toUpperCase())}):this.allCustomWidgets.filterLocally(function(){return!0})},
_onSearchCustomWidget:function(a){a?(this.allCustomWidgets.hide(),this.filterCustomWidgets.show(),this.filterCustomWidgets.queryItems({q:'title:"'+a+'"'})):(this.allCustomWidgets.show(),this.filterCustomWidgets.hide())},_onFilterDefaultWidget:function(a){var b;b=""===a?this.allWidgets:f.filter(this.allWidgets,function(b){if(-1<b.label.toUpperCase().indexOf(a.toUpperCase()))return!0});this._createWidgetNodes(b)},resize:function(){var a=g(".widget-choose-page").closest(".jimu-popup .content.content-absolute");
d.setStyle(a[0],{overflowY:"hidden"});var a=d.getContentBox(this.domNode).h,b=g("\x3e div",this.tab.domNode),c=g("div.official-section",this.tab.domNode)[0].parentNode,c=b.indexOf(c),k=0,e=0;b.slice(0,c).forEach(function(a){k+=d.getContentBox(a).h});e=a-60-k;d.setStyle(this.searchSectionNode,{height:a+"px"});d.setStyle(this.widgetListNode,{height:e+"px"})},setAppConfig:function(a){this.appConfig=a},_getWidgets:function(){var a={};this.appConfig.map["2D"]&&(a.support2D=!0);this.appConfig.map["3D"]&&
(a.support3D=!0);this.appConfig.map["2D"]&&this.appConfig.map["3D"]&&(a.support2D=!0,a.support3D=!0);a.platform=window.stemappInfo.appType;this.options.includeOffPanel||(a["properties.inPanel"]=!0);n.searchWidgets(a).then(e.hitch(this,function(a){a.success?(this.allWidgets=this._filterSingletonWidgets(a.widgets),this._createWidgetNodes(this.allWidgets)):console.log(a.message)}))},_filterSingletonWidgets:function(a){return f.filter(a,function(a){return!1===a.properties.supportMultiInstance&&this._checkWidgetIsInAppConfig(this.appConfig,
a.name)?!1:!0},this)},_checkWidgetIsInAppConfig:function(a,b){var c=[];0===h.getControllerWidgets(a).length?a.visitElement(e.hitch(this,function(a){a.isOnScreen&&a.name===b&&c.push(a)})):c=a.getConfigElementsByName(b);return 0<c.length},_createWidgetNodes:function(a){d.empty(this.widgetListNode);f.forEach(a,function(a){this._createWidgetNode(a)},this)},_createWidgetNode:function(a){var b,c,k;b=d.create("div",{"class":"widget-node","data-widget-name":a.name},this.widgetListNode);c=d.create("div",{"class":"box"},
b);d.create("div",{"class":"box-selected"},b);k=d.create("img",{"class":"icon",src:a.icon},c);window.isRTL&&a.properties&&a.properties.mirrorIconForRTL&&d.addClass(k,"jimu-flipx");d.create("div",{"class":"label",innerHTML:h.stripHTML(a.label),title:a.label},b);b.setting={name:a.name,label:a.label,version:a.version,closeable:"removeableWidgetOnScreen"===this.fromList?!0:void 0};h.widgetJson.addManifest2WidgetJson(b.setting,a);b.setting.uri=a.amdFolder+"Widget";b.box=c;this.own(l(b,"click",e.hitch(this,
this._onWidgetClick,b)));return b},_onWidgetClick:function(a){0===this.tab.getSelectedIndex()?g(".custom-section .jimu-state-selected",this.domNode).removeClass("jimu-state-selected"):g(".official-section .jimu-state-selected",this.domNode).removeClass("jimu-state-selected");this._isMultipleSelection()?d.hasClass(a,"jimu-state-selected")?d.removeClass(a,"jimu-state-selected"):d.addClass(a,"jimu-state-selected"):(g(".jimu-state-selected",this.domNode).removeClass("jimu-state-selected"),d.addClass(a,
"jimu-state-selected"))},_isMultipleSelection:function(){var a=this.fromNode;return"addBtn"===a.type&&"poolWidgets"===this.fromList||"addBtn"===a.type&&"groupOnScreen"===this.fromList&&this._canAddMoreWidgetsInGroup(a.gnode)||"group"===a.type&&this._canAddMoreWidgetsInGroup(a)},_canAddMoreWidgetsInGroup:function(a){return a?"undefined"===typeof a.setting.maxWidgets||a.setting.maxWidgets>a.setting.widgets.length+1:!1},onOk:function(){(0===this.tab.getSelectedIndex()?this._getOfficialSelection():this._getCustomSelection()).then(e.hitch(this,
function(a){var b=[];"group"===this.fromNode.type&&"undefined"!==typeof this.fromNode.setting.maxWidgets&&this.fromNode.setting.widgets.length+a.length>this.fromNode.setting.maxWidgets?(new m({message:D.substitute({maxCount:this.fromNode.setting.maxWidgets},this.nls.addWidgetExceedMax)}),this.loading.hide()):(f.forEach(a,function(a){b.push(this._copyWidget(a))},this),q(b).then(e.hitch(this,function(b){var c;for(c=0;c<b.length;c++)if(!b[c].success){new m({message:b[c].message});this.loading.hide();
return}this.loading.hide();this.popup.domNode&&(v.publish("widgetChoosePageOk",a,this.fromNode),this.popup.close())})))}),function(a){console.log("No widget is selected. ",a.message)})},_getOfficialSelection:function(){var a=new p,b=g(".jimu-state-selected",this.domNode);if(0===b.length)return new m({message:this.nls.emptyMessage}),a.reject({message:this.nls.emptyMessage}),a;this.loading.show();b=f.map(b,function(a){return e.clone(a.setting)});a.resolve(b);return a},_getCustomSelection:function(){var a=
[],a=this.allCustomWidgets.isVisible()?this.allCustomWidgets.getSelectedWidgetItems():this.filterCustomWidgets.getSelectedWidgetItems();return q(a.map(function(a){return n.getManifestFromItem(a).then(function(b){var c={name:b.name,label:a.title,version:b.version};h.widgetJson.addManifest2WidgetJson(c,b);c.uri=h.widgetJson.getUriFromItem(a);c.itemId=a.id;return c})}))},_copyWidget:function(a){var b=0,c,d=[],g=h.getControllerWidgets(this.appConfig);this.appConfig.visitElement(e.hitch(this,function(c){if(0!==
g.length||c.isOnScreen)c.name===a.name&&b++,d.push(c.label)}));a.icon=a.manifest.folderUrl+"images/icon.png?wab_dv\x3d"+window.deployVersion;if(0===b)a.label=a.label,c=n.copyWidgetToApp(window.appInfo.id,a);else if(0<b){c=new p;for(var f=a.label+"_"+(b+1);-1<d.indexOf(f);)b++,f=a.label+"_"+(b+1);a.label=f;c.resolve({success:!0})}return c}})});