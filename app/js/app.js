(function (NS) {
    "use strict";

    var links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        resources = {
            "atti": [
                "json/data_cluster_mensile.json",
                "json/data_legislature.json"
            ]
        },
        options = {
            width: '100%',
            height: 'auto',
            layout: "box",
            eventMargin: 0,  // minimal margin between events
            eventMarginAxis: 0, // minimal margin beteen events and the axis
            editable: false,   // enable dragging and editing events
            style: 'box',
            stackEvents: true
        };

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

    var drawVisualization = function (targetDatasetName) {
        var elem = NS.document.getElementById(targetDatasetName),
            timelineRenderer = new links.Timeline(elem, options),
            urls = resources[targetDatasetName];

        renderResources(urls, timelineRenderer);

        // attach an event listener using the links events handler
        //links.events.addListener(timeline, 'rangechanged', onRangeChanged);
    };

    drawVisualization("atti");

}(this));