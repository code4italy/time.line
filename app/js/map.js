(function (NS) {
    "use strict";

    var map,
        layer,
        heatmap,
        OpenLayers = NS.OpenLayers,
        document = NS.document,
        originLon = 1334747.0395556,
        originLat = 4987357.6202126,
        $ = NS.jQuery,
        citiesCoords,
        baseThreshold = 2;

    function centerMap() {
        map.zoomTo(6);
    }

    function initializeMap() {
        var initialData = { max: baseThreshold, data: [] };
        map = new OpenLayers.Map({
            div: 'heatmapArea',
            center: new OpenLayers.LonLat(originLon, originLat),
            zoom: 6
        });
        layer = new OpenLayers.Layer.OSM();
        heatmap = new OpenLayers.Layer.Heatmap(
            "Heatmap Layer",
            map,
            layer,
            {visible: true, radius: 10},
            {isBaseLayer: false, opacity: 0.3, projection: new OpenLayers.Projection("EPSG:4326")}
        );
        map.addLayers([layer, heatmap]);
        centerMap();
        heatmap.setDataSet(initialData);
    }

    function addPoint(lon, lat, count) {
        heatmap.addDataPoint(new OpenLayers.LonLat(lon, lat), count || 1);
    }

    function displayCoords(coordsSeq) {
        var key,
            coords;

        for (key in coordsSeq) {
            if (coordsSeq.hasOwnProperty(key)) {
                coords = coordsSeq[key];
                addPoint(coords[1], coords[0], coords[2]);
            }
        }
    }

    function loadCitiesCoords () {
        $.ajax({
            url: "json/capoluoghi.json",
            async: false,
            success: function (payload) {
                citiesCoords = payload;
            }
        });
    }

    function initializeData () {
        loadCitiesCoords();
    }

    function displayCities () {
        if (citiesCoords) {
            displayCoords(citiesCoords);
        }
    }

    function bindEvents () {
        document.getElementById("tog").onclick = function () {
            heatmap.toggle();
        };
    }

    NS.onload = function () {
        initializeMap();
        initializeData();
        bindEvents();
        displayCities();
    };

}(this));