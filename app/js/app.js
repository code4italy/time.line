(function (NS) {
    "use strict";

    var timeline,
        links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        data,
        resources = {
            "atti": ["/json/test.json"]
        },
        options = {
            'width': '100%',
            'height': '300px',
            'editable': false,   // enable dragging and editing events
            'style': 'box'
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
                "content": content.title + ": " + content.count
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
            resourceUrl = resources[targetDatasetName],
            cb = function (data) {
                timelineRender(data, timelineRenderer);
            };

        $.get(resourceUrl, null, cb, "json");

        // attach an event listener using the links events handler
        //links.events.addListener(timeline, 'rangechanged', onRangeChanged);
    };

    drawVisualization("atti", timelineRender);

}(this));