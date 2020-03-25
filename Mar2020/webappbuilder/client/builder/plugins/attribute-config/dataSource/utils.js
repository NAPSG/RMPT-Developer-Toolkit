// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.15/esri/copyright.txt and http://www.arcgis.com/apps/webappbuilder/copyright.txt for details.
//>>built
define(["jimu/utils"],function(a){return{createDataSourceId:function(c,b){var d="";return d="map"===c&&b?"map~"+b+"~"+a.getRandomString():"external~"+a.getRandomString()}}});