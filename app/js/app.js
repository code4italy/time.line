(function (NS) {
    "use strict";

    var links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        data,
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
            stackEvents: false
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
                "start": moment(start),
                "content": content.count
            };
            end = each.end;
            if (end) {
                item.end = moment(end);
            }
            data.push(item);
        }

        return data;
    }

    function timelineRender(payload, renderer) {
        data = parsePayload(payload);
        renderer.draw(data);
    }

    var drawVisualization = function (targetDatasetName, callback) {
        var elem = NS.document.getElementById(targetDatasetName),
            timelineRenderer = new links.Timeline(elem, options),
            resourceUrl = resources[targetDatasetName][0],
            cb = function (data) {
                callback(data, timelineRenderer);
            };

        $.get(resourceUrl, null, cb, "json");

        // attach an event listener using the links events handler
        //links.events.addListener(timeline, 'rangechanged', onRangeChanged);
    };

    drawVisualization("atti", timelineRender);

}(this));