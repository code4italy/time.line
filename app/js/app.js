(function (NS) {
    "use strict";

    var timeline,
        links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        eventsTimelineElem = document.getElementById('events'),
        data,
        dataUrl = "/json/test.json",
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

    function timelineRender(payload) {
        data = parsePayload(payload);
        timeline.draw(data);
    }

    var drawVisualization = function (resourceUrl, targetElem, callback) {
        timeline = new links.Timeline(targetElem, options);
        $.get(resourceUrl, null, callback, "json");

        // attach an event listener using the links events handler
        //links.events.addListener(timeline, 'rangechanged', onRangeChanged);
    };

    drawVisualization(dataUrl, eventsTimelineElem, timelineRender);

}(this));