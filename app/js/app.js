(function(NS) {
    "use strict";

    var links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        resources = {
            "atti": [
                "json/data_cluster_mensile.json",
                "json/data_legislature.json",
                "json/data_governi.json",
                "json/data_referendum.json",
                "json/data_elezioni.json"
            ],
            "legislature": [
                "json/data_legislature.json"
            ]
        },
        options = {
            width: '100%',
            height: 'auto',
            layout: "box",
            eventMargin: 10, // minimal margin between events
            eventMarginAxis: 0, // minimal margin beteen events and the axis
            editable: false, // enable dragging and editing events
            style: 'box',
            stackEvents: true
        },
        visibleTimelines = [];

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
            item.content = content.title || content.count;
            if (end) {
                item.end = moment(end);
            }
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

    var updateVisualizations = function(sourceIdx) {
        var source = visibleTimelines[sourceIdx],
            sourceRange = source.getVisibleChartRange(),
            idx,
            idsLen = visibleTimelines.length;

        for (idx = 0; idx < idsLen; idx++) {
            if (idx !== sourceIdx) {
                visibleTimelines[idx].setVisibleChartRange(
                    sourceRange.start,
                    sourceRange.end
                );
            }
        }
    };

    function getLen(arr) {
        return arr.length;
    }

    var drawVisualization = function(targetDatasetName, idx) {
        var elem = NS.document.getElementById(targetDatasetName),
            timelineRenderer = new links.Timeline(elem, options),
            urls = resources[targetDatasetName];

        renderResources(urls, timelineRenderer);

        visibleTimelines.push(timelineRenderer);

        links.events.addListener(
            timelineRenderer,
            'rangechange',
            function() {
                updateVisualizations(idx);
            }
        );

        updateVisualizations(idx);
    };

    drawVisualization("atti", 0);
    drawVisualization("legislature", 1);

    NS._vis = visibleTimelines;

}(this));