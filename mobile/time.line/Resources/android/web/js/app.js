(function(NS) {
    "use strict";
    function itemClassByContent(type, content) {
        switch (type) {
          case "atti":
          case "ddl":
          case "pdl":
          case "pdlc":
            return content.count > 1e3 ? "level-1000 item-atti" : "item-atti level-" + content.count;

          default:
            return "item-" + type;
        }
    }
    function parsePayload(payload) {
        var idx, start, end, content, each, item, data = [];
        for (idx = 0; payload.length > idx; idx++) {
            each = payload[idx];
            start = each.start;
            content = each.content;
            item = {
                start: moment(start)
            };
            end = each.end;
            item.content = content.hasOwnProperty("count") ? content.count : content.title;
            item.count = content.count;
            end && (item.end = moment(end));
            item.className = itemClassByContent(each.type, each.content);
            data.push(item);
        }
        return data;
    }
    function renderResources(urls, renderer) {
        function build(payload) {
            data = data.concat(parsePayload(payload));
            fetchCount++;
            fetchCount === urlsNum && renderer.draw(data);
        }
        var idx, data = [], urlsNum = urls.length, fetchCount = 0;
        for (idx = 0; urlsNum > idx; idx++) $.get(urls[idx], null, build, "json");
    }
    var links = NS.links, $ = NS.jQuery, moment = NS.moment, google = NS.google, resources = {
        atti: [ "json/data_cluster_mensile.json" ],
        atti2: [ "json/data_cluster_mensile_ddl.json" ],
        legislature: [ "json/data_legislature.json" ]
    }, baseOptions = {
        width: "100%",
        height: "auto",
        layout: "box",
        eventMargin: 0,
        eventMarginAxis: 4,
        editable: false,
        style: "box",
        stackEvents: true
    }, stackedOptions = $.extend(true, {
        stackEvents: true
    }, baseOptions), unStackedOptions = $.extend(true, {
        stackEvents: false,
        eventMarginAxis: 0
    }, baseOptions), visibleTimelines = [];
    var updateVisualizations = function() {
        var source, sourceRange, idx, idsLen = visibleTimelines.length;
        if (idsLen > 1) {
            source = visibleTimelines[0];
            sourceRange = source.getVisibleChartRange();
            for (idx = 1; idsLen > idx; idx++) {
                var target = visibleTimelines[idx];
                target.setVisibleChartRange(sourceRange.start, sourceRange.end);
            }
        }
    };
    var getRenderer = function(rendererName) {
        var renderer;
        if ("timeline" === rendererName) return function(elem, urls) {
            renderer = new links.Timeline(elem, urls.length > 1 ? stackedOptions : unStackedOptions);
            visibleTimelines.push(renderer);
            return renderer;
        };
        if ("graph" === rendererName) {
            var data;
            return function(elem, urls) {
                function drawVisualization() {
                    var idx, each, tup, table = new google.visualization.DataTable(), dataLen = data.length;
                    table.addColumn("datetime", "time");
                    table.addColumn("number", "Function A");
                    for (idx = 0; dataLen > idx; idx++) {
                        each = data[idx];
                        var dt = new Date(each.start);
                        tup = [ dt, each.count ];
                        table.addRow(tup);
                    }
                    var options = {
                        width: "100%",
                        height: "350px",
                        showTooltip: true,
                        legend: false
                    };
                    var graph = new links.Graph(elem);
                    graph.draw(table, options);
                    visibleTimelines.push(graph);
                }
                google.load("visualization", "1");
                google.setOnLoadCallback(drawVisualization);
                $.ajax({
                    url: urls[0],
                    dataType: "json",
                    async: false,
                    success: function(payload) {
                        data = parsePayload(payload);
                    }
                });
            };
        }
        return void 0;
    };
    var drawVisualization = function(targetDatasetName, visType, idx, renderAxis) {
        var elem = NS.document.getElementById(targetDatasetName), urls = resources[targetDatasetName], renderer = getRenderer(visType)(elem, urls);
        "timeline" === visType && renderResources(urls, renderer);
        links.events.addListener(renderer, "rangechange", function() {
            updateVisualizations(idx);
        });
        "graph" !== visType && updateVisualizations(idx);
        renderAxis || elem.classList.add("hide-axis");
        NS.isDrawn[targetDatasetName] = true;
    };
    NS._vis = visibleTimelines;
    NS.draw = {};
    NS.isDrawn = {};
    NS.draw["atti"] = function() {
        drawVisualization("atti", "timeline", 0);
    };
    NS.draw["legislature"] = function() {
        drawVisualization("atti", "timeline", 1);
    };
    NS.draw["atti2"] = function() {
        drawVisualization("atti2", "graph", 2);
    };
    drawVisualization("atti", "timeline", 0);
    drawVisualization("legislature", "timeline", 1, true);
    drawVisualization("atti2", "graph", 2);
    setTimeout(function() {
        updateVisualizations(2);
    }, 500);
})(this);