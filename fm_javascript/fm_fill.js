dojo.require("esri.dijit.Legend");
dojo.require("esri.dijit.Measurement");
dojo.require("esri.dijit.Scalebar");

dojo.require("esri.tasks.Locator");
dojo.require("esri.arcgis.utils");

var currentBasemap;
var geocoder;
var webmapResponse;

var basemaps = {"currentVersion":10.01,"folders":["Canvas","Demographics","Elevation","Reference","Specialty"],"services":[
	{"name":"NatGeo_World_Map","type":"MapServer", 'image':'bm-natgeo.jpg', 'title':'National Geographic'},
	{"name":"Ocean_Basemap","type":"MapServer", 'image':'bm-ocean.jpg', 'title':'Oceans'},
	//{"name":"USA_Topo_Maps","type":"MapServer"},
	{"name":"World_Imagery","type":"MapServer", 'image':'bm-imagery.jpg', 'title':'Imagery'},
	{"name":"World_Street_Map","type":"MapServer", 'image':'bm-street.jpg', 'title':'Street Map'},
	{"name":"World_Terrain_Base","type":"MapServer", 'image':'bm-terrain.png', 'title':'Terrain'},
	{"name":"World_Topo_Map","type":"MapServer", 'image':'bm-topo.jpg', 'title':'Topography'}]};

function fm_init(){
	
	var urlObject = esri.urlToObject(document.location.href);
	urlObject.query = urlObject.query || {};
	var webmap = null;
	var embed = false;

	if (urlObject.query.embed && urlObject.query.embed === 'true') res.embedSetup();
	
	//check for webmap id
	if(urlObject.query.webmap) {
		//if (urlObject.query.embed && urlObject.query.embed === 'true') res.embedSetup();

		webmap = urlObject.query.webmap;
		var mapDeferred = esri.arcgis.utils.createMap(webmap, "map", {
			mapOptions : {
				slider : true,
				nav : false,
				wrapAround180 : true
			},
			ignorePopups : false,
			geometryServiceURL : "http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer"
		});

		mapDeferred.addCallback(function(response){
			webmapResponse = response;

			//current basemap code
			currentBasemap = webmapResponse.itemInfo.itemData.baseMap.baseMapLayers[0].layerObject;

			map = response.map;
			if(map.loaded) {
				onMapLoaded();
			} else {
				dojo.connect(map, 'onLoad', onMapLoaded);
			}
		});

		mapDeferred.addErrback(function(error) {
			console.log("CreateMap failed: ", dojo.toJson(error));
			//alert("Unable to load Webmap - " + dojo.toJson(error));
		});
		
	}
}
	
function onMapLoaded() {
	console.log('map loaded enter');

	//initialize map elements
	var scalebar = new esri.dijit.Scalebar({
		map:map,
		attachTo:"bottom-left",
		scalebarUnit: 'metric'
	});

	//add measurement tool
	var measurement = new esri.dijit.Measurement({
			map: map
	}, dojo.byId('measurementDiv'));
	measurement.startup();
	
	//create legend - only show legend for operational & graphic layers
	var legend = null;
	var layerInfos = [];
	if(webmapResponse && webmapResponse.itemInfo && webmapResponse.itemInfo.itemData && webmapResponse.itemInfo.itemData.operationalLayers.length > 0) {
		dojo.forEach(webmapResponse.itemInfo.itemData.operationalLayers, function(layer) {
			layerInfos.push({"title":layer.title,"layer":layer.layerObject});
		});
	}

	if (layerInfos.length > 0 && false){
		var legend = new esri.dijit.Legend({
			map : map,
			layerInfos : layerInfos,
			respectCurrentMapScale : true
		}, "fm_legendDiv");
		legend.startup();
	}
	else{
		var legend = new esri.dijit.Legend({
			map : map,
			//layerInfos : layerInfos,
			respectCurrentMapScale : true
		}, "fm_legendDiv");
		legend.startup();
	}

	//populate information for map
	if(webmapResponse && webmapResponse.itemInfo && webmapResponse.itemInfo.item){
		res.populateMapInfo(webmapResponse.itemInfo.item);
	}

	//keep map coords updated
	dojo.connect(map, 'onMouseMove', res.showCoords);
	res.showCoords(map.extent.getCenter());
	//keep map info updated
	dojo.connect(map, 'onExtentChange', onMapExtentChange);
	onMapExtentChange();

	//call appropriate popup based on device type
	if(res.mobile) switchToMobile();
	else switchToDesktop();

	console.log('map loaded exit');
}

function onMapExtentChange() {
	var scale = Math.round(esri.geometry.getScale(map));

	if (scale > 999 && scale <= 999999) {
		scale = Math.round(scale / 1000) + " <b>K</b>";
	} else if (scale > 999999) {
		scale = Math.round(scale / 1000000) + " <b>M</b>";
	} else if (scale > 0 && scale <= 999) {
		scale = Math.round(scale) + " <b>Ft</b>";
	}

	res.updateScaleInfo( scale, map.getLevel() );
}	
	
function getBasemaps(){
	//add request to get basemaps
	showBasemaps(basemaps.services);
}

function getBasemapUrl(service){
	return 'http://server.arcgisonline.com/ArcGIS/rest/services/' + service.name + '/' + service.type;
}

function showBasemaps(basemaps){
	var code = '';
	for(i = 0; i < basemaps.length; i++){
		var basemap = basemaps[i];
		if (basemap.type === 'MapServer'){
			//code += "<p class='fm_container' >";
			code += "<a href='#' data-name='" + basemap.name + "' class='fm_basemap_option' >"
					+ "<img src='images/" + basemap.image + "' class='fm_basemap_image' />"
					+ "<label>" + basemap.title + "</label>";
					+ "</a>";
			//code += "</p>";
		}
	}
	$("#basemapList").html(code);
}

function setBasemap(name){
	for(i = 0; i < basemaps.services.length; i++){
		if (basemaps.services[i].name === name){
			if (currentBasemap) map.removeLayer(currentBasemap);

			currentBasemap = new esri.layers.ArcGISTiledMapServiceLayer( getBasemapUrl(basemaps.services[i]),{
				id: 'basemap'
			});
			map.addLayer(currentBasemap, 0);
			return true;
		}
	}
}


//** helpers ** DO NOT OVERWRITE
function switchToMobile(){
	//dojo.require("esri.dijit.Popup");
//dojo.require("esri.dijit.PopupMobile");
	console.log('switch to mobile popup');
	require(['esri/dijit/PopupMobile'], function(){
		if (esri && dojo && map && map.loaded){
			console.log('changing popup type to mobile');
			var popupDijit = new esri.dijit.PopupMobile(null, dojo.create("div"));
			map.setInfoWindow(popupDijit);
		}
	});
}

function switchToDesktop(){
	console.log('switch to desktop popup');
	require(['esri/dijit/Popup'], function(){
		if (esri && dojo && map && map.loaded){
			console.log('changing popup type to desktop');
			var popupDijit = new esri.dijit.Popup(null, dojo.create("div"));
			map.setInfoWindow(popupDijit);
		}
	});
}

function showZoomControl(){
	if (!( hasTouch() ) && map ) map.showZoomSlider();
}
function hideZoomControl(){
	if ( hasTouch() && map ) map.hideZoomSlider();
}

function locateAddress(evt, addr) {
    if (evt) {
        if (evt.keyCode != dojo.keys.ENTER) {
            return;
        }
    }

	$(".fm_search").hide();
	$(".fm_location_input").val('');

	String.prototype.trim = function () {
        return this.replace(/^\s*/, "").replace(/\s*$/, "");
    };
    //var address = dojo.byId("address").value.trim();
    var address = addr.trim();
	
	if (!geocoder) {
        geocoder = new esri.tasks.Locator("http://tasks.arcgis.com/ArcGIS/rest/services/WorldLocator/GeocodeServer");
        geocoder.outSpatialReference = map.spatialReference;
    }

    if (address && address !== "") {

        geocoder.addressToLocations({
            "SingleLine": address
        }, ['*'], function (geocodeResults) {
            if (geocodeResults.length > 0) {
                var attr = geocodeResults[0].attributes;
                if (map.getLevel() < 8) {
                    map.centerAndZoom(geocodeResults[0].location, 7);
                } else
                    map.centerAt(geocodeResults[0].location);
                setTimeout(function () {
                    var fillSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 3), new dojo.Color(0, 0, 0, 0));
                    animateGraphicSymbol(new esri.Graphic(map.extent.expand(0.8), fillSymbol));
                }, 500);
            } else {
                alert("Address not found");
            }
        }, function (err) {
            debug(dojo.toJson(err));
        });
    }
}

function animateGraphicSymbol(g) {
    var opacity = 1.0;
    var color = g.symbol.color;
    var type = g.geometry.type;
    var symbol = g.symbol;
    //console.log(type);
    if (type == "extent") {
        symbol.outline.color.a = opacity;
        symbol.color.a = 0.0;
    } else {
        symbol.color.a = opacity;
    }
    map.graphics.add(g);
    //console.log(g.symbol.color);

    var interval = setInterval(function () {
        if (type != "extent") {
            symbol.setColor(new dojo.Color([color.r, color.g, color.b, opacity]));
        }
        if (symbol.outline) {
            var ocolor = symbol.outline.color;
            symbol.outline.setColor(new dojo.Color([ocolor.r, ocolor.g, ocolor.b, opacity]));
        }
        g.setSymbol(symbol);
        if (opacity < 0.01) {
            clearInterval(interval);
            map.graphics.remove(g);
        }
        opacity -= 0.01;
    }, 20);
}
//** end helpers **

/* window events */
window.onorientationchange = function(){
	if (map) {
		map.resize();
	} else console.log('map not found');
}

window.onresize = function(){
	if (map) {
		map.resize();
	} else console.log('map not found');
}