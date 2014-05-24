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
        actsInfo,
        baseThreshold = 10,
        currentDt,
        stopped = false,
        $info;

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

    function setPoints(pointSeq) {
        var lon,
            lat,
            count,
            len = pointSeq.length,
            item,
            idx,
            dataset = {
                max: baseThreshold
            },
            data = [];

        for (idx = 0; idx < len; idx++) {
            item = pointSeq[idx];
            lon = item[1];
            lat = item[0];
            count = item[2] || 1;
            data.push({
                lonlat: new OpenLayers.LonLat(lon, lat),
                count: count
            });
        }
        dataset.data = data;
        heatmap.setDataSet(dataset);
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

    function loadCitiesCoords() {
        $.ajax({
            url: "json/capoluoghi.json",
            async: false,
            success: function (payload) {
                citiesCoords = payload;
            }
        });
    }

    function loadActsInfo() {
        $.ajax({
            url: "json/acts.json",
            async: false,
            success: function (payload) {
                actsInfo = payload;
            }
        });

    }

    function initializeData() {
        loadCitiesCoords();
    }

    function displayCities() {
        if (citiesCoords) {
            displayCoords(citiesCoords);
        }
    }

    function runActs() {
        function runTimeline(data) {
            var dataLen = data.length,
                item,
                coords,
                idx = 0,
                l,
                dt,
                cities,
                citiesLen,
                $dateMsg = $("#date"),
                $info = $("#info"),
                displaying = false;

            function updateDate(dt) {
                $dateMsg.text(dt);
            }

            function displayDate() {
                var points = [],
                    info,
                    $anchor,
                    el,
                    i,
                    dates,
                    datesLen,
                    start,
                    end;
                if (stopped) {
                    if (actsInfo && !displaying) {
                        $info.children().remove();
                        info = actsInfo[dt];
                        for (el in info) {
                            if (info.hasOwnProperty(el)) {
                                $anchor = $('<a>');
                                $anchor.attr("href", info[el].ref);
                                $anchor.text(info[el].title);
                                $info.append("<p>").append($anchor);
                            }
                        }
                        $info.fadeIn(500);
                        displaying = true;
                    }
                    setTimeout(displayDate, 1000);
                } else {
                    displaying = false;
                    start = (idx < baseThreshold) ? 0 : idx - baseThreshold;
                    end = idx;
                    dates = data.slice(start, end);
                    datesLen = dates.length;
                    for (i = 0; i < datesLen; i++) {
                        item = dates[i];
                        dt = item[0];
                        currentDt = dt;
                        cities = item[1];
                        citiesLen = cities.length;
                        for (l = 0; l < citiesLen; l++) {
                            coords = citiesCoords[cities[l]];
                            points.push([coords[0], coords[1], i + 1]);
                        }
                    }
                    setPoints(points);
                    updateDate(dt);
                    if (idx < dataLen) {
                        idx++;
                        setTimeout(displayDate, 100);
                    }
                }
            }

            displayDate();
        }

        $.ajax({
            url: "json/timeline.json",
            async: true,
            success: runTimeline
        });
    }

    function bindEvents() {
        document.getElementById("tog").onclick = function () {
            stopped = !stopped;
            if (!stopped) {
                $('#info').fadeOut(500);
            }
        };
    }

    NS.onload = function () {
        initializeMap();
        initializeData();
        bindEvents();
        runActs();
        loadActsInfo();
    };

}(this));