(function (NS) {
    "use strict";

    var links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        google = NS.google,
        resources = {
            "atti": [
                "json/data_cluster_mensile.json"
            ],
            "atti2": [
                "json/data_cluster_mensile_ddl.json",
                "json/data_cluster_mensile_pdl.json",
                "json/data_cluster_mensile_pdlc.json"
            ],
            "legislature": [
                "json/data_legislature.json"
            ]
        },
        baseOptions = {
            width: '100%',
            height: 'auto',
            layout: "box",
            eventMargin: 0, // minimal margin between events
            eventMarginAxis: 4, // minimal margin beteen events and the axis
            editable: false, // enable dragging and editing events
            style: 'box',
            stackEvents: true
        },
        stackedOptions = $.extend(true, {
            stackEvents: true
        }, baseOptions),
        unStackedOptions = $.extend(true, {
            stackEvents: false,
            eventMarginAxis: 0
        }, baseOptions),
        visibleTimelines = [];

    function itemClassByContent(type, content) {
        switch (type) {
            case 'atti':
            case 'ddl':
            case 'pdl':
            case 'pdlc':

                if (content.count > 1000) {
                    // console.log('a');
                    return 'level-1000 item-atti';
                } else {
                    //console.log('b');
                    return 'item-atti level-' + content.count;

                }
                break;
            default:
                return 'item-' + type;
        }
    }

    function parsePayload(payload) {
        var idx,
            data = [],
            start,
            end,
            content,
            each,
            item;

        for (idx = 0; idx < payload.length; idx++) {
            each = payload[idx];
            start = each.start;
            content = each.content;
            item = {
                "start": moment(start)
            };
            end = each.end;
            item.content = (content.hasOwnProperty("count")) ? content.count : content.title;
            item.count = content.count;
            if (end) {
                item.end = moment(end);
            }
            item.className = itemClassByContent(each.type, each.content);
            data.push(item);
        }

        return data;
    }

    function renderResources(urls, renderer) {
        var idx,
            data = [],
            urlsNum = urls.length,
            fetchCount = 0;

        function build(payload) {
            data = data.concat(parsePayload(payload));
            fetchCount++;
            if (fetchCount === urlsNum) {
                renderer.draw(data);
            }
        }

        for (idx = 0; idx < urlsNum; idx++) {
            $.get(urls[idx], null, build, "json");
        }
    }

    var updateVisualizations = function () {
        var source,
            sourceRange,
            idx,
            idsLen = visibleTimelines.length;

        if (idsLen > 1) {
            source = visibleTimelines[0];
            sourceRange = source.getVisibleChartRange();
            for (idx = 1; idx < idsLen; idx++) {
                var target = visibleTimelines[idx];
                target.setVisibleChartRange(
                    sourceRange.start,
                    sourceRange.end
                );
            }
        }
    };

    var getRenderer = function (rendererName) {
        var renderer;
        if (rendererName === "timeline") {
            return function (elem, urls) {
                renderer = new links.Timeline(elem, (urls.length > 1) ? stackedOptions : unStackedOptions);
                visibleTimelines.push(renderer);
                return renderer;
            };
        } else if (rendererName === "graph") {
            var data;
            return function (elem, urls) {
                var collection = [],
                    url,
                    colors = ["cyan", "blue", "green", "yellow", "purple"],
                    defaultLineWidth = 2;

                google.load("visualization", "1");

                // Set callback to run when API is loaded
                google.setOnLoadCallback(drawVisualization);

                for (var l = 0; l < urls.length; l++) {
                    $.ajax({
                        url: urls[l],
                        dataType: "json",
                        async: false,
                        success: function (payload) {
                            collection.push(parsePayload(payload));
                        }
                    });
                }

                // Called when the Visualization API is loaded.
                function drawVisualization() {
                    var datapoint,
                        i,
                        l,
                        subset,
                        dataset,
                        each,
                        graphs = [],
                        lines = [];

                    for (i = 0; i < collection.length; i++) {
                        subset = collection[i];
                        dataset = [];
                        for (l = 0; l < subset.length; l++) {
                            each = subset[l];
                            datapoint = {
                                "date": each.start.toDate(),
                                "value": each.count
                            };
                            dataset.push(datapoint);
                        }
                        graphs.push({"label": "Dataset A", "data": dataset});
                        lines.push({color: lines[i], width: defaultLineWidth});
                    }

                    var options = {
                        width: "100%",
                        height: "350px",
                        lines: lines
                    };

                    // Instantiate our graph object.
                    var graph = new links.Graph(elem);

                    // Draw our graph with the created data and options
                    graph.draw(graphs, options);

                    visibleTimelines.push(graph);
                }
            };
        }
        return undefined;

    };

    var drawVisualization = function (targetDatasetName, visType, idx, renderAxis) {
        var elem = NS.document.getElementById(targetDatasetName),
            urls = resources[targetDatasetName],
            renderer = getRenderer(visType)(elem, urls);

        if (visType === "timeline") {
            renderResources(urls, renderer);
        }

        links.events.addListener(
            renderer,
            'rangechange',
            function () {
                updateVisualizations(idx);
            }
        );

        if (visType !== "graph") {
            updateVisualizations(idx);
        }

        if (!renderAxis) {
            elem.classList.add('hide-axis');
        }

        NS.isDrawn[targetDatasetName] = true;
    };

    NS._vis = visibleTimelines;

    //espongo per il lazy load
    NS.draw = {};
    NS.isDrawn = {};

    NS.draw["atti"] = function () {
        drawVisualization("atti", "timeline", 0);
    };
    NS.draw["legislature"] = function () {
        drawVisualization("atti", "timeline", 1);
    };
    NS.draw["atti2"] = function () {
        drawVisualization("atti2", "graph", 2);
    };

    drawVisualization("atti", "timeline", 0);
    drawVisualization("legislature", "timeline", 1, true);
    drawVisualization("atti2", "graph", 2);

    setTimeout(function () {
        updateVisualizations(2);
    }, 3 * 250);

}(this));