(function (NS) {
    "use strict";

    var timeline,
        links = NS.links,
        $ = NS.jQuery,
        moment = NS.moment,
        timelineEl = document.getElementById('mytimeline'),
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
            dt,
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
                "content": content
            };
            end = each.end;
            if (end) {
                item.end = moment(end);
            }
            data.push(item);
        }

        return data;
    }

    function render(payload) {
        data = parsePayload(payload);
        timeline.draw(data);
    }

    var drawVisualization = function (data) {
        timeline = new links.Timeline(timelineEl, options);
        $.get(dataUrl, null, render, "json");

        // attach an event listener using the links events handler
        //links.events.addListener(timeline, 'rangechanged', onRangeChanged);

        // Draw our timeline with the created data and options
    };

    drawVisualization();

}(this));