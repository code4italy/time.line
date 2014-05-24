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
        citiesCoords;

    function centerMap() {
        map.zoomTo(6);
    }

    function initializeMap() {
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
    }

    function displayCoords(data) {
        var threshold = 2,
            nudata = [],
            key,
            coords,
            transformedTestData = { max: threshold, data: [] };

        for (key in data) {
            if (data.hasOwnProperty(key)) {
                coords = data[key];
                nudata.push({
                    lonlat: new OpenLayers.LonLat(coords[1], coords[0]),
                    count: 1
                });
            }
        }
        transformedTestData.data = nudata;
        heatmap.setDataSet(transformedTestData);
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