(function (NS) {
    "use strict";

    var map,
        layer,
        heatmap,
        OpenLayers = NS.OpenLayers;

    function init() {
        var testData = {
            max: 46,
            data: [
                {lat: 41.9000, lon: 12.5000, count: 10},
                {lat: 41.9000, lon: 12.5000, count: 10}
            ]
        };

        var transformedTestData = { max: testData.max, data: [] },
            data = testData.data,
            datalen = data.length,
            nudata = [];

        // in order to use the OpenLayers Heatmap Layer we have to transform our data into
        // { max: <max>, data: [{lonlat: <OpenLayers.LonLat>, count: <count>},...]}

        while (datalen--) {
            nudata.push({
                lonlat: new OpenLayers.LonLat(data[datalen].lon, data[datalen].lat),
                count: data[datalen].count
            });
        }

        transformedTestData.data = nudata;

        map = new OpenLayers.Map({
            div: 'heatmapArea',
            center: new OpenLayers.LonLat(1334747.0395556, 4987357.6202126),
            zoom: 6
        });
        layer = new OpenLayers.Layer.OSM();

        // create our heatmap layer
        heatmap = new OpenLayers.Layer.Heatmap(
            "Heatmap Layer",
            map,
            layer,
            {visible: true, radius: 10},
            {isBaseLayer: false, opacity: 0.3, projection: new OpenLayers.Projection("EPSG:4326")}
        );
        map.addLayers([layer, heatmap]);

        //map.zoomToMaxExtent();
        map.zoomTo(6);
        heatmap.setDataSet(transformedTestData);
        NS.map = map;
    }

    window.onload = function () {
        init();
    };

    document.getElementById("tog").onclick = function () {
        heatmap.toggle();
    };

}(this));