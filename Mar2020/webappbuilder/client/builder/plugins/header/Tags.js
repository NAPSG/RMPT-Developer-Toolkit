// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.15/esri/copyright.txt and http://www.arcgis.com/apps/webappbuilder/copyright.txt for details.
//>>built
define(["dojo/_base/declare","dojo/dom-attr","esri/dijit/Tags"],function(b,a,c){return b([c],{validate:function(){if(this._created&&!this.isValid())return a.set(this.domNode,"aria-invalid","true"),this._displayMessage(this.i18n.required),!1;a.set(this.domNode,"aria-invalid","false");this._displayMessage(null);return!0}})});