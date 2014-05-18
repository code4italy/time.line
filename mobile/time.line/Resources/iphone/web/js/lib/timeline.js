"undefined" == typeof links && (links = {});

"undefined" == typeof google && (google = void 0);

Array.prototype.indexOf || (Array.prototype.indexOf = function(obj) {
    for (var i = 0; this.length > i; i++) if (this[i] == obj) return i;
    return -1;
});

Array.prototype.forEach || (Array.prototype.forEach = function(fn, scope) {
    for (var i = 0, len = this.length; len > i; ++i) fn.call(scope || this, this[i], i, this);
});

links.Timeline = function(container, options) {
    if (!container) return;
    this.dom = {};
    this.conversion = {};
    this.eventParams = {};
    this.groups = [];
    this.groupIndexes = {};
    this.items = [];
    this.renderQueue = {
        show: [],
        hide: [],
        update: []
    };
    this.renderedItems = [];
    this.clusterGenerator = new links.Timeline.ClusterGenerator(this);
    this.currentClusters = [];
    this.selection = void 0;
    this.listeners = {};
    this.size = {
        actualHeight: 0,
        axis: {
            characterMajorHeight: 0,
            characterMajorWidth: 0,
            characterMinorHeight: 0,
            characterMinorWidth: 0,
            height: 0,
            labelMajorTop: 0,
            labelMinorTop: 0,
            line: 0,
            lineMajorWidth: 0,
            lineMinorHeight: 0,
            lineMinorTop: 0,
            lineMinorWidth: 0,
            top: 0
        },
        contentHeight: 0,
        contentLeft: 0,
        contentWidth: 0,
        frameHeight: 0,
        frameWidth: 0,
        groupsLeft: 0,
        groupsWidth: 0,
        items: {
            top: 0
        }
    };
    this.dom.container = container;
    this.options = {
        width: "100%",
        height: "auto",
        minHeight: 0,
        groupMinHeight: 0,
        autoHeight: true,
        eventMargin: 10,
        eventMarginAxis: 20,
        dragAreaWidth: 10,
        min: void 0,
        max: void 0,
        zoomMin: 10,
        zoomMax: 31536e10,
        moveable: true,
        zoomable: true,
        selectable: true,
        unselectable: true,
        editable: false,
        snapEvents: true,
        groupChangeable: true,
        timeChangeable: true,
        showCurrentTime: true,
        showCustomTime: false,
        showMajorLabels: true,
        showMinorLabels: true,
        showNavigation: false,
        showButtonNew: false,
        groupsOnRight: false,
        groupsOrder: true,
        axisOnTop: false,
        stackEvents: true,
        animate: true,
        animateZoom: true,
        cluster: false,
        style: "box",
        customStackOrder: false,
        locale: "en",
        MONTHS: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
        MONTHS_SHORT: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
        DAYS: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
        DAYS_SHORT: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
        ZOOM_IN: "Zoom in",
        ZOOM_OUT: "Zoom out",
        MOVE_LEFT: "Move left",
        MOVE_RIGHT: "Move right",
        NEW: "New",
        CREATE_NEW_EVENT: "Create new event"
    };
    this.setOptions(options);
    this.clientTimeOffset = 0;
    var dom = this.dom;
    while (dom.container.hasChildNodes()) dom.container.removeChild(dom.container.firstChild);
    this.step = new links.Timeline.StepDate();
    this.itemTypes = {
        box: links.Timeline.ItemBox,
        range: links.Timeline.ItemRange,
        floatingRange: links.Timeline.ItemFloatingRange,
        dot: links.Timeline.ItemDot
    };
    this.data = [];
    this.firstDraw = true;
    this.setVisibleChartRange(void 0, void 0, false);
    this.render();
    var me = this;
    setTimeout(function() {
        me.trigger("ready");
    }, 0);
};

links.Timeline.prototype.draw = function(data, options) {
    options && console.log("WARNING: Passing options in draw() is deprecated. Pass options to the constructur or use setOptions() instead!");
    this.setOptions(options);
    this.options.selectable && links.Timeline.addClassName(this.dom.frame, "timeline-selectable");
    this.setData(data);
    options && (options.start || options.end) ? this.setVisibleChartRange(options.start, options.end) : this.firstDraw && this.setVisibleChartRangeAuto();
    this.firstDraw = false;
};

links.Timeline.prototype.setOptions = function(options) {
    if (options) {
        for (var i in options) options.hasOwnProperty(i) && (this.options[i] = options[i]);
        if ("undefined" != typeof links.locales && "en" !== this.options.locale) {
            var localeOpts = links.locales[this.options.locale];
            if (localeOpts) for (var l in localeOpts) localeOpts.hasOwnProperty(l) && (this.options[l] = localeOpts[l]);
        }
        if (void 0 != options.showButtonAdd) {
            this.options.showButtonNew = options.showButtonAdd;
            console.log("WARNING: Option showButtonAdd is deprecated. Use showButtonNew instead");
        }
        if (void 0 != options.intervalMin) {
            this.options.zoomMin = options.intervalMin;
            console.log("WARNING: Option intervalMin is deprecated. Use zoomMin instead");
        }
        if (void 0 != options.intervalMax) {
            this.options.zoomMax = options.intervalMax;
            console.log("WARNING: Option intervalMax is deprecated. Use zoomMax instead");
        }
        options.scale && options.step && this.step.setScale(options.scale, options.step);
    }
    this.options.autoHeight = "auto" === this.options.height;
};

links.Timeline.prototype.getOptions = function() {
    return this.options;
};

links.Timeline.prototype.addItemType = function(typeName, typeFactory) {
    this.itemTypes[typeName] = typeFactory;
};

links.Timeline.mapColumnIds = function(dataTable) {
    var cols = {}, colCount = dataTable.getNumberOfColumns(), allUndefined = true;
    for (var col = 0; colCount > col; col++) {
        var id = dataTable.getColumnId(col) || dataTable.getColumnLabel(col);
        cols[id] = col;
        ("start" == id || "end" == id || "content" == id || "group" == id || "className" == id || "editable" == id || "type" == id) && (allUndefined = false);
    }
    if (allUndefined) {
        cols.start = 0;
        cols.end = 1;
        cols.content = 2;
        colCount > 3 && (cols.group = 3);
        colCount > 4 && (cols.className = 4);
        colCount > 5 && (cols.editable = 5);
        colCount > 6 && (cols.type = 6);
    }
    return cols;
};

links.Timeline.prototype.setData = function(data) {
    this.unselectItem();
    data || (data = []);
    this.stackCancelAnimation();
    this.clearItems();
    this.data = data;
    var items = this.items;
    this.deleteGroups();
    if (google && google.visualization && data instanceof google.visualization.DataTable) {
        var cols = links.Timeline.mapColumnIds(data);
        for (var row = 0, rows = data.getNumberOfRows(); rows > row; row++) items.push(this.createItem({
            start: void 0 != cols.start ? data.getValue(row, cols.start) : void 0,
            end: void 0 != cols.end ? data.getValue(row, cols.end) : void 0,
            content: void 0 != cols.content ? data.getValue(row, cols.content) : void 0,
            group: void 0 != cols.group ? data.getValue(row, cols.group) : void 0,
            className: void 0 != cols.className ? data.getValue(row, cols.className) : void 0,
            editable: void 0 != cols.editable ? data.getValue(row, cols.editable) : void 0,
            type: void 0 != cols.type ? data.getValue(row, cols.type) : void 0
        }));
    } else {
        if (!links.Timeline.isArray(data)) throw "Unknown data type. DataTable or Array expected.";
        for (var row = 0, rows = data.length; rows > row; row++) {
            var itemData = data[row];
            var item = this.createItem(itemData);
            items.push(item);
        }
    }
    this.options.cluster && this.clusterGenerator.setData(this.items);
    this.render({
        animate: false
    });
};

links.Timeline.prototype.getData = function() {
    return this.data;
};

links.Timeline.prototype.updateData = function(index, values) {
    var prop, data = this.data;
    if (google && google.visualization && data instanceof google.visualization.DataTable) {
        var missingRows = index + 1 - data.getNumberOfRows();
        missingRows > 0 && data.addRows(missingRows);
        var cols = links.Timeline.mapColumnIds(data);
        for (prop in values) if (values.hasOwnProperty(prop)) {
            var col = cols[prop];
            if (void 0 == col) {
                var value = values[prop];
                var valueType = "string";
                "number" == typeof value ? valueType = "number" : "boolean" == typeof value ? valueType = "boolean" : value instanceof Date && (valueType = "datetime");
                col = data.addColumn(valueType, prop);
            }
            data.setValue(index, col, values[prop]);
        }
    } else {
        if (!links.Timeline.isArray(data)) throw "Cannot update data, unknown type of data";
        var row = data[index];
        if (void 0 == row) {
            row = {};
            data[index] = row;
        }
        for (prop in values) values.hasOwnProperty(prop) && (row[prop] = values[prop]);
    }
};

links.Timeline.prototype.getItemIndex = function(element) {
    var e = element, dom = this.dom, frame = dom.items.frame, items = this.items, index = void 0;
    while (e.parentNode && e.parentNode !== frame) e = e.parentNode;
    if (e.parentNode === frame) for (var i = 0, iMax = items.length; iMax > i; i++) if (items[i].dom === e) {
        index = i;
        break;
    }
    return index;
};

links.Timeline.prototype.getVisibleItems = function(start, end) {
    var items = this.items;
    var itemsInRange = [];
    if (items) for (var i = 0, iMax = items.length; iMax > i; i++) {
        var item = items[i];
        item.end ? item.start >= start && end >= item.end && itemsInRange.push({
            row: i
        }) : item.start >= start && end >= item.start && itemsInRange.push({
            row: i
        });
    }
    return itemsInRange;
};

links.Timeline.prototype.setSize = function(width, height) {
    if (width) {
        this.options.width = width;
        this.dom.frame.style.width = width;
    }
    if (height) {
        this.options.height = height;
        this.options.autoHeight = "auto" === this.options.height;
        "auto" !== height && (this.dom.frame.style.height = height);
    }
    this.render({
        animate: false
    });
};

links.Timeline.prototype.setVisibleChartRange = function(start, end, redraw) {
    var range = {};
    start && end || (range = this.getDataRange(true));
    if (!start) if (end) if (range.min && range.min.valueOf() < end.valueOf()) start = range.min; else {
        start = new Date(end.valueOf());
        start.setDate(start.getDate() - 7);
    } else {
        start = new Date();
        start.setDate(start.getDate() - 3);
    }
    if (!end) if (range.max) end = range.max; else {
        end = new Date(start.valueOf());
        end.setDate(end.getDate() + 7);
    }
    if (start >= end) {
        end = new Date(start.valueOf());
        end.setDate(end.getDate() + 7);
    }
    var min = this.options.min ? this.options.min : void 0;
    void 0 != min && start.valueOf() < min.valueOf() && (start = new Date(min.valueOf()));
    var max = this.options.max ? this.options.max : void 0;
    void 0 != max && end.valueOf() > max.valueOf() && (end = new Date(max.valueOf()));
    this.applyRange(start, end);
    void 0 == redraw || true == redraw ? this.render({
        animate: false
    }) : this.recalcConversion();
};

links.Timeline.prototype.setVisibleChartRangeAuto = function() {
    var range = this.getDataRange(true);
    this.setVisibleChartRange(range.min, range.max);
};

links.Timeline.prototype.setVisibleChartRangeNow = function() {
    var now = new Date();
    var diff = this.end.valueOf() - this.start.valueOf();
    var startNew = new Date(now.valueOf() - diff / 2);
    var endNew = new Date(startNew.valueOf() + diff);
    this.setVisibleChartRange(startNew, endNew);
};

links.Timeline.prototype.getVisibleChartRange = function() {
    return {
        start: new Date(this.start.valueOf()),
        end: new Date(this.end.valueOf())
    };
};

links.Timeline.prototype.getDataRange = function(withMargin) {
    var items = this.items, min = void 0, max = void 0;
    if (items) for (var i = 0, iMax = items.length; iMax > i; i++) {
        var item = items[i], start = void 0 != item.start ? item.start.valueOf() : void 0, end = void 0 != item.end ? item.end.valueOf() : start;
        void 0 != start && (min = void 0 != min ? Math.min(min.valueOf(), start.valueOf()) : start);
        void 0 != end && (max = void 0 != max ? Math.max(max.valueOf(), end.valueOf()) : end);
    }
    if (min && max && withMargin) {
        var diff = max - min;
        min -= .05 * diff;
        max += .05 * diff;
    }
    return {
        min: void 0 != min ? new Date(min) : void 0,
        max: void 0 != max ? new Date(max) : void 0
    };
};

links.Timeline.prototype.render = function(options) {
    this.reflowFrame();
    this.reflowAxis();
    this.reflowGroups();
    this.reflowItems();
    var animate = this.options.animate;
    options && void 0 != options.animate && (animate = options.animate);
    this.recalcConversion();
    this.clusterItems();
    this.filterItems();
    this.stackItems(animate);
    this.recalcItems();
    var needsReflow = this.repaint();
    if (needsReflow) {
        var renderTimesLeft = options ? options.renderTimesLeft : void 0;
        void 0 == renderTimesLeft && (renderTimesLeft = 5);
        renderTimesLeft > 0 && this.render({
            animate: options ? options.animate : void 0,
            renderTimesLeft: renderTimesLeft - 1
        });
    }
};

links.Timeline.prototype.repaint = function() {
    var frameNeedsReflow = this.repaintFrame();
    var axisNeedsReflow = this.repaintAxis();
    var groupsNeedsReflow = this.repaintGroups();
    var itemsNeedsReflow = this.repaintItems();
    this.repaintCurrentTime();
    this.repaintCustomTime();
    return frameNeedsReflow || axisNeedsReflow || groupsNeedsReflow || itemsNeedsReflow;
};

links.Timeline.prototype.reflowFrame = function() {
    var dom = this.dom, size = (this.options, this.size), resized = false;
    var frameWidth = dom.frame ? dom.frame.offsetWidth : 0, frameHeight = dom.frame ? dom.frame.clientHeight : 0;
    resized = resized || size.frameWidth !== frameWidth;
    resized = resized || size.frameHeight !== frameHeight;
    size.frameWidth = frameWidth;
    size.frameHeight = frameHeight;
    return resized;
};

links.Timeline.prototype.repaintFrame = function() {
    var needsReflow = false, dom = this.dom, options = this.options, size = this.size;
    if (!dom.frame) {
        dom.frame = document.createElement("DIV");
        dom.frame.className = "timeline-frame ui-widget ui-widget-content ui-corner-all";
        dom.container.appendChild(dom.frame);
        needsReflow = true;
    }
    var height = options.autoHeight ? size.actualHeight + "px" : options.height || "100%";
    var width = options.width || "100%";
    needsReflow = needsReflow || dom.frame.style.height != height;
    needsReflow = needsReflow || dom.frame.style.width != width;
    dom.frame.style.height = height;
    dom.frame.style.width = width;
    if (!dom.content) {
        dom.content = document.createElement("DIV");
        dom.content.className = "timeline-content";
        dom.frame.appendChild(dom.content);
        var timelines = document.createElement("DIV");
        timelines.style.position = "absolute";
        timelines.style.left = "0px";
        timelines.style.top = "0px";
        timelines.style.height = "100%";
        timelines.style.width = "0px";
        dom.content.appendChild(timelines);
        dom.contentTimelines = timelines;
        var params = this.eventParams, me = this;
        if (!params.onMouseDown) {
            params.onMouseDown = function(event) {
                me.onMouseDown(event);
            };
            links.Timeline.addEventListener(dom.content, "mousedown", params.onMouseDown);
        }
        if (!params.onTouchStart) {
            params.onTouchStart = function(event) {
                me.onTouchStart(event);
            };
            links.Timeline.addEventListener(dom.content, "touchstart", params.onTouchStart);
        }
        if (!params.onMouseWheel) {
            params.onMouseWheel = function(event) {
                me.onMouseWheel(event);
            };
            links.Timeline.addEventListener(dom.content, "mousewheel", params.onMouseWheel);
        }
        if (!params.onDblClick) {
            params.onDblClick = function(event) {
                me.onDblClick(event);
            };
            links.Timeline.addEventListener(dom.content, "dblclick", params.onDblClick);
        }
        needsReflow = true;
    }
    dom.content.style.left = size.contentLeft + "px";
    dom.content.style.top = "0px";
    dom.content.style.width = size.contentWidth + "px";
    dom.content.style.height = size.frameHeight + "px";
    this.repaintNavigation();
    return needsReflow;
};

links.Timeline.prototype.reflowAxis = function() {
    var resized = false, dom = this.dom, options = this.options, size = this.size, axisDom = dom.axis;
    var characterMinorWidth = axisDom && axisDom.characterMinor ? axisDom.characterMinor.clientWidth : 0, characterMinorHeight = axisDom && axisDom.characterMinor ? axisDom.characterMinor.clientHeight : 0, characterMajorWidth = axisDom && axisDom.characterMajor ? axisDom.characterMajor.clientWidth : 0, characterMajorHeight = axisDom && axisDom.characterMajor ? axisDom.characterMajor.clientHeight : 0, axisHeight = (options.showMinorLabels ? characterMinorHeight : 0) + (options.showMajorLabels ? characterMajorHeight : 0);
    var axisTop = options.axisOnTop ? 0 : size.frameHeight - axisHeight, axisLine = options.axisOnTop ? axisHeight : axisTop;
    resized = resized || size.axis.top !== axisTop;
    resized = resized || size.axis.line !== axisLine;
    resized = resized || size.axis.height !== axisHeight;
    size.axis.top = axisTop;
    size.axis.line = axisLine;
    size.axis.height = axisHeight;
    size.axis.labelMajorTop = options.axisOnTop ? 0 : axisLine + (options.showMinorLabels ? characterMinorHeight : 0);
    size.axis.labelMinorTop = options.axisOnTop ? options.showMajorLabels ? characterMajorHeight : 0 : axisLine;
    size.axis.lineMinorTop = options.axisOnTop ? size.axis.labelMinorTop : 0;
    size.axis.lineMinorHeight = options.showMajorLabels ? size.frameHeight - characterMajorHeight : size.frameHeight;
    size.axis.lineMinorWidth = axisDom && axisDom.minorLines && axisDom.minorLines.length ? axisDom.minorLines[0].offsetWidth : 1;
    size.axis.lineMajorWidth = axisDom && axisDom.majorLines && axisDom.majorLines.length ? axisDom.majorLines[0].offsetWidth : 1;
    resized = resized || size.axis.characterMinorWidth !== characterMinorWidth;
    resized = resized || size.axis.characterMinorHeight !== characterMinorHeight;
    resized = resized || size.axis.characterMajorWidth !== characterMajorWidth;
    resized = resized || size.axis.characterMajorHeight !== characterMajorHeight;
    size.axis.characterMinorWidth = characterMinorWidth;
    size.axis.characterMinorHeight = characterMinorHeight;
    size.axis.characterMajorWidth = characterMajorWidth;
    size.axis.characterMajorHeight = characterMajorHeight;
    var contentHeight = Math.max(size.frameHeight - axisHeight, 0);
    size.contentLeft = options.groupsOnRight ? 0 : size.groupsWidth;
    size.contentWidth = Math.max(size.frameWidth - size.groupsWidth, 0);
    size.contentHeight = contentHeight;
    return resized;
};

links.Timeline.prototype.repaintAxis = function() {
    var needsReflow = false, dom = this.dom, options = this.options, size = this.size, step = this.step;
    var axis = dom.axis;
    if (!axis) {
        axis = {};
        dom.axis = axis;
    }
    size.axis.properties || (size.axis.properties = {});
    axis.minorTexts || (axis.minorTexts = []);
    axis.minorLines || (axis.minorLines = []);
    axis.majorTexts || (axis.majorTexts = []);
    axis.majorLines || (axis.majorLines = []);
    if (!axis.frame) {
        axis.frame = document.createElement("DIV");
        axis.frame.style.position = "absolute";
        axis.frame.style.left = "0px";
        axis.frame.style.top = "0px";
        dom.content.appendChild(axis.frame);
    }
    dom.content.removeChild(axis.frame);
    axis.frame.style.width = size.contentWidth + "px";
    axis.frame.style.height = size.axis.height + "px";
    var start = this.screenToTime(0);
    var end = this.screenToTime(size.contentWidth);
    if (size.axis.characterMinorWidth) {
        this.minimumStep = this.screenToTime(6 * size.axis.characterMinorWidth) - this.screenToTime(0);
        step.setRange(start, end, this.minimumStep);
    }
    var charsNeedsReflow = this.repaintAxisCharacters();
    needsReflow = needsReflow || charsNeedsReflow;
    this.repaintAxisStartOverwriting();
    step.start();
    var xFirstMajorLabel = void 0;
    var max = 0;
    while (!step.end() && 1e3 > max) {
        max++;
        var cur = step.getCurrent(), x = this.timeToScreen(cur), isMajor = step.isMajor();
        options.showMinorLabels && this.repaintAxisMinorText(x, step.getLabelMinor(options));
        if (isMajor && options.showMajorLabels) {
            if (x > 0) {
                void 0 == xFirstMajorLabel && (xFirstMajorLabel = x);
                this.repaintAxisMajorText(x, step.getLabelMajor(options));
            }
            this.repaintAxisMajorLine(x);
        } else this.repaintAxisMinorLine(x);
        step.next();
    }
    if (options.showMajorLabels) {
        var leftTime = this.screenToTime(0), leftText = this.step.getLabelMajor(options, leftTime), width = leftText.length * size.axis.characterMajorWidth + 10;
        (void 0 == xFirstMajorLabel || xFirstMajorLabel > width) && this.repaintAxisMajorText(0, leftText, leftTime);
    }
    this.repaintAxisEndOverwriting();
    this.repaintAxisHorizontal();
    dom.content.insertBefore(axis.frame, dom.content.firstChild);
    return needsReflow;
};

links.Timeline.prototype.repaintAxisCharacters = function() {
    var text, needsReflow = false, dom = this.dom, axis = dom.axis;
    if (!axis.characterMinor) {
        text = document.createTextNode("0");
        var characterMinor = document.createElement("DIV");
        characterMinor.className = "timeline-axis-text timeline-axis-text-minor";
        characterMinor.appendChild(text);
        characterMinor.style.position = "absolute";
        characterMinor.style.visibility = "hidden";
        characterMinor.style.paddingLeft = "0px";
        characterMinor.style.paddingRight = "0px";
        axis.frame.appendChild(characterMinor);
        axis.characterMinor = characterMinor;
        needsReflow = true;
    }
    if (!axis.characterMajor) {
        text = document.createTextNode("0");
        var characterMajor = document.createElement("DIV");
        characterMajor.className = "timeline-axis-text timeline-axis-text-major";
        characterMajor.appendChild(text);
        characterMajor.style.position = "absolute";
        characterMajor.style.visibility = "hidden";
        characterMajor.style.paddingLeft = "0px";
        characterMajor.style.paddingRight = "0px";
        axis.frame.appendChild(characterMajor);
        axis.characterMajor = characterMajor;
        needsReflow = true;
    }
    return needsReflow;
};

links.Timeline.prototype.repaintAxisStartOverwriting = function() {
    var properties = this.size.axis.properties;
    properties.minorTextNum = 0;
    properties.minorLineNum = 0;
    properties.majorTextNum = 0;
    properties.majorLineNum = 0;
};

links.Timeline.prototype.repaintAxisEndOverwriting = function() {
    var num, dom = this.dom, props = this.size.axis.properties, frame = this.dom.axis.frame;
    var minorTexts = dom.axis.minorTexts;
    num = props.minorTextNum;
    while (minorTexts.length > num) {
        var minorText = minorTexts[num];
        frame.removeChild(minorText);
        minorTexts.splice(num, 1);
    }
    var minorLines = dom.axis.minorLines;
    num = props.minorLineNum;
    while (minorLines.length > num) {
        var minorLine = minorLines[num];
        frame.removeChild(minorLine);
        minorLines.splice(num, 1);
    }
    var majorTexts = dom.axis.majorTexts;
    num = props.majorTextNum;
    while (majorTexts.length > num) {
        var majorText = majorTexts[num];
        frame.removeChild(majorText);
        majorTexts.splice(num, 1);
    }
    var majorLines = dom.axis.majorLines;
    num = props.majorLineNum;
    while (majorLines.length > num) {
        var majorLine = majorLines[num];
        frame.removeChild(majorLine);
        majorLines.splice(num, 1);
    }
};

links.Timeline.prototype.repaintAxisHorizontal = function() {
    var axis = this.dom.axis, size = this.size, options = this.options;
    var hasAxis = options.showMinorLabels || options.showMajorLabels;
    if (hasAxis) {
        if (!axis.backgroundLine) {
            var backgroundLine = document.createElement("DIV");
            backgroundLine.className = "timeline-axis";
            backgroundLine.style.position = "absolute";
            backgroundLine.style.left = "0px";
            backgroundLine.style.width = "100%";
            backgroundLine.style.border = "none";
            axis.frame.insertBefore(backgroundLine, axis.frame.firstChild);
            axis.backgroundLine = backgroundLine;
        }
        if (axis.backgroundLine) {
            axis.backgroundLine.style.top = size.axis.top + "px";
            axis.backgroundLine.style.height = size.axis.height + "px";
        }
    } else if (axis.backgroundLine) {
        axis.frame.removeChild(axis.backgroundLine);
        delete axis.backgroundLine;
    }
    if (hasAxis) {
        if (axis.line) {
            var line = axis.frame.removeChild(axis.line);
            axis.frame.appendChild(line);
        } else {
            var line = document.createElement("DIV");
            line.className = "timeline-axis";
            line.style.position = "absolute";
            line.style.left = "0px";
            line.style.width = "100%";
            line.style.height = "0px";
            axis.frame.appendChild(line);
            axis.line = line;
        }
        axis.line.style.top = size.axis.line + "px";
    } else if (axis.line && axis.line.parentElement) {
        axis.frame.removeChild(axis.line);
        delete axis.line;
    }
};

links.Timeline.prototype.repaintAxisMinorText = function(x, text) {
    var label, size = this.size, dom = this.dom, props = size.axis.properties, frame = dom.axis.frame, minorTexts = dom.axis.minorTexts, index = props.minorTextNum;
    if (minorTexts.length > index) label = minorTexts[index]; else {
        var content = document.createTextNode("");
        label = document.createElement("DIV");
        label.appendChild(content);
        label.className = "timeline-axis-text timeline-axis-text-minor";
        label.style.position = "absolute";
        frame.appendChild(label);
        minorTexts.push(label);
    }
    label.childNodes[0].nodeValue = text;
    label.style.left = x + "px";
    label.style.top = size.axis.labelMinorTop + "px";
    props.minorTextNum++;
};

links.Timeline.prototype.repaintAxisMinorLine = function(x) {
    var line, axis = this.size.axis, dom = this.dom, props = axis.properties, frame = dom.axis.frame, minorLines = dom.axis.minorLines, index = props.minorLineNum;
    if (minorLines.length > index) line = minorLines[index]; else {
        line = document.createElement("DIV");
        line.className = "timeline-axis-grid timeline-axis-grid-minor";
        line.style.position = "absolute";
        line.style.width = "0px";
        frame.appendChild(line);
        minorLines.push(line);
    }
    line.style.top = axis.lineMinorTop + "px";
    line.style.height = axis.lineMinorHeight + "px";
    line.style.left = x - axis.lineMinorWidth / 2 + "px";
    props.minorLineNum++;
};

links.Timeline.prototype.repaintAxisMajorText = function(x, text) {
    var label, size = this.size, props = size.axis.properties, frame = this.dom.axis.frame, majorTexts = this.dom.axis.majorTexts, index = props.majorTextNum;
    if (majorTexts.length > index) label = majorTexts[index]; else {
        var content = document.createTextNode(text);
        label = document.createElement("DIV");
        label.className = "timeline-axis-text timeline-axis-text-major";
        label.appendChild(content);
        label.style.position = "absolute";
        label.style.top = "0px";
        frame.appendChild(label);
        majorTexts.push(label);
    }
    label.childNodes[0].nodeValue = text;
    label.style.top = size.axis.labelMajorTop + "px";
    label.style.left = x + "px";
    props.majorTextNum++;
};

links.Timeline.prototype.repaintAxisMajorLine = function(x) {
    var line, size = this.size, props = size.axis.properties, axis = this.size.axis, frame = this.dom.axis.frame, majorLines = this.dom.axis.majorLines, index = props.majorLineNum;
    if (majorLines.length > index) line = majorLines[index]; else {
        line = document.createElement("DIV");
        line.className = "timeline-axis-grid timeline-axis-grid-major";
        line.style.position = "absolute";
        line.style.top = "0px";
        line.style.width = "0px";
        frame.appendChild(line);
        majorLines.push(line);
    }
    line.style.left = x - axis.lineMajorWidth / 2 + "px";
    line.style.height = size.frameHeight + "px";
    props.majorLineNum++;
};

links.Timeline.prototype.reflowItems = function() {
    var i, iMax, group, resized = false, groups = this.groups, renderedItems = this.renderedItems;
    groups && groups.forEach(function(group) {
        group.itemsHeight = 0;
    });
    for (i = 0, iMax = renderedItems.length; iMax > i; i++) {
        var item = renderedItems[i], domItem = item.dom;
        group = item.group;
        if (domItem) {
            var width = domItem ? domItem.clientWidth : 0;
            var height = domItem ? domItem.clientHeight : 0;
            resized = resized || item.width != width;
            resized = resized || item.height != height;
            item.width = width;
            item.height = height;
            item.reflow();
        }
        group && (group.itemsHeight = Math.max(this.options.groupMinHeight, group.itemsHeight ? Math.max(group.itemsHeight, item.height) : item.height));
    }
    return resized;
};

links.Timeline.prototype.recalcItems = function() {
    var i, iMax, item, finalItem, finalItems, group, resized = false, groups = this.groups, size = this.size, options = this.options, renderedItems = this.renderedItems;
    var actualHeight = 0;
    if (0 == groups.length) {
        if (options.autoHeight || options.cluster) {
            var min = 0, max = 0;
            if (this.stack && this.stack.finalItems) {
                finalItems = this.stack.finalItems;
                finalItem = finalItems[0];
                if (finalItem && finalItem.top) {
                    min = finalItem.top;
                    max = finalItem.top + finalItem.height;
                }
                for (i = 1, iMax = finalItems.length; iMax > i; i++) {
                    finalItem = finalItems[i];
                    min = Math.min(min, finalItem.top);
                    max = Math.max(max, finalItem.top + finalItem.height);
                }
            } else {
                item = renderedItems[0];
                if (item && item.top) {
                    min = item.top;
                    max = item.top + item.height;
                }
                for (i = 1, iMax = renderedItems.length; iMax > i; i++) {
                    item = renderedItems[i];
                    if (item.top) {
                        min = Math.min(min, item.top);
                        max = Math.max(max, item.top + item.height);
                    }
                }
            }
            actualHeight = max - min + 2 * options.eventMarginAxis + size.axis.height;
            options.minHeight > actualHeight && (actualHeight = options.minHeight);
            if (size.actualHeight != actualHeight && options.autoHeight && !options.axisOnTop) {
                var diff = actualHeight - size.actualHeight;
                if (this.stack && this.stack.finalItems) {
                    finalItems = this.stack.finalItems;
                    for (i = 0, iMax = finalItems.length; iMax > i; i++) {
                        finalItems[i].top += diff;
                        finalItems[i].item.top += diff;
                    }
                } else for (i = 0, iMax = renderedItems.length; iMax > i; i++) renderedItems[i].top += diff;
            }
        }
    } else {
        actualHeight = size.axis.height + 2 * options.eventMarginAxis;
        for (i = 0, iMax = groups.length; iMax > i; i++) {
            group = groups[i];
            var groupHeight = group.itemsHeight;
            resized = resized || groupHeight != group.height;
            group.height = Math.max(groupHeight, options.groupMinHeight);
            actualHeight += groups[i].height + options.eventMargin;
        }
        var eventMargin = options.eventMargin, top = options.axisOnTop ? options.eventMarginAxis + eventMargin / 2 : size.contentHeight - options.eventMarginAxis + eventMargin / 2, axisHeight = size.axis.height;
        for (i = 0, iMax = groups.length; iMax > i; i++) {
            group = groups[i];
            if (options.axisOnTop) {
                group.top = top + axisHeight;
                group.labelTop = top + axisHeight + (group.height - group.labelHeight) / 2;
                group.lineTop = top + axisHeight + group.height + eventMargin / 2;
                top += group.height + eventMargin;
            } else {
                top -= group.height + eventMargin;
                group.top = top;
                group.labelTop = top + (group.height - group.labelHeight) / 2;
                group.lineTop = top - eventMargin / 2;
            }
        }
        resized = true;
    }
    options.minHeight > actualHeight && (actualHeight = options.minHeight);
    resized = resized || actualHeight != size.actualHeight;
    size.actualHeight = actualHeight;
    return resized;
};

links.Timeline.prototype.clearItems = function() {
    var hideItems = this.renderQueue.hide;
    this.renderedItems.forEach(function(item) {
        hideItems.push(item);
    });
    this.clusterGenerator.clear();
    this.items = [];
};

links.Timeline.prototype.repaintItems = function() {
    var item, index;
    var needsReflow = false, dom = this.dom, size = this.size, timeline = this, renderedItems = this.renderedItems;
    dom.items || (dom.items = {});
    var frame = dom.items.frame;
    if (!frame) {
        frame = document.createElement("DIV");
        frame.style.position = "relative";
        dom.content.appendChild(frame);
        dom.items.frame = frame;
    }
    frame.style.left = "0px";
    frame.style.top = size.items.top + "px";
    frame.style.height = "0px";
    dom.content.removeChild(frame);
    var queue = this.renderQueue;
    var newImageUrls = [];
    needsReflow = needsReflow || queue.show.length > 0 || queue.update.length > 0 || queue.hide.length > 0;
    while (item = queue.show.shift()) {
        item.showDOM(frame);
        item.getImageUrls(newImageUrls);
        renderedItems.push(item);
    }
    while (item = queue.update.shift()) {
        item.updateDOM(frame);
        item.getImageUrls(newImageUrls);
        index = this.renderedItems.indexOf(item);
        -1 == index && renderedItems.push(item);
    }
    while (item = queue.hide.shift()) {
        item.hideDOM(frame);
        index = this.renderedItems.indexOf(item);
        -1 != index && renderedItems.splice(index, 1);
    }
    renderedItems.forEach(function(item) {
        item.updatePosition(timeline);
    });
    this.repaintDeleteButton();
    this.repaintDragAreas();
    dom.content.appendChild(frame);
    if (newImageUrls.length) {
        var callback = function() {
            timeline.render();
        };
        var sendCallbackWhenAlreadyLoaded = false;
        links.imageloader.loadAll(newImageUrls, callback, sendCallbackWhenAlreadyLoaded);
    }
    return needsReflow;
};

links.Timeline.prototype.reflowGroups = function() {
    var resized = false, options = this.options, size = this.size, dom = this.dom;
    var groupsWidth = 0;
    var groups = this.groups;
    var labels = this.dom.groups ? this.dom.groups.labels : [];
    for (var i = 0, iMax = groups.length; iMax > i; i++) {
        var group = groups[i];
        var label = labels[i];
        group.labelWidth = label ? label.clientWidth : 0;
        group.labelHeight = label ? label.clientHeight : 0;
        group.width = group.labelWidth;
        groupsWidth = Math.max(groupsWidth, group.width);
    }
    void 0 !== options.groupsWidth && (groupsWidth = dom.groups.frame ? dom.groups.frame.clientWidth : 0);
    groupsWidth += 1;
    var groupsLeft = options.groupsOnRight ? size.frameWidth - groupsWidth : 0;
    resized = resized || size.groupsWidth !== groupsWidth;
    resized = resized || size.groupsLeft !== groupsLeft;
    size.groupsWidth = groupsWidth;
    size.groupsLeft = groupsLeft;
    return resized;
};

links.Timeline.prototype.repaintGroups = function() {
    var dom = this.dom, timeline = this, options = this.options, size = this.size, groups = this.groups;
    void 0 === dom.groups && (dom.groups = {});
    var labels = dom.groups.labels;
    if (!labels) {
        labels = [];
        dom.groups.labels = labels;
    }
    var labelLines = dom.groups.labelLines;
    if (!labelLines) {
        labelLines = [];
        dom.groups.labelLines = labelLines;
    }
    var itemLines = dom.groups.itemLines;
    if (!itemLines) {
        itemLines = [];
        dom.groups.itemLines = itemLines;
    }
    var frame = dom.groups.frame;
    if (!frame) {
        frame = document.createElement("DIV");
        frame.className = "timeline-groups-axis";
        frame.style.position = "absolute";
        frame.style.overflow = "hidden";
        frame.style.top = "0px";
        frame.style.height = "100%";
        dom.frame.appendChild(frame);
        dom.groups.frame = frame;
    }
    frame.style.left = size.groupsLeft + "px";
    frame.style.width = void 0 !== options.groupsWidth ? options.groupsWidth : size.groupsWidth + "px";
    frame.style.display = 0 == groups.length ? "none" : "";
    var current = labels.length, needed = groups.length;
    for (var i = 0, iMax = Math.min(current, needed); iMax > i; i++) {
        var group = groups[i];
        var label = labels[i];
        label.innerHTML = this.getGroupName(group);
        label.style.display = "";
    }
    for (var i = current; needed > i; i++) {
        var group = groups[i];
        var label = document.createElement("DIV");
        label.className = "timeline-groups-text";
        label.style.position = "absolute";
        void 0 === options.groupsWidth && (label.style.whiteSpace = "nowrap");
        label.innerHTML = this.getGroupName(group);
        frame.appendChild(label);
        labels[i] = label;
        var labelLine = document.createElement("DIV");
        labelLine.className = "timeline-axis-grid timeline-axis-grid-minor";
        labelLine.style.position = "absolute";
        labelLine.style.left = "0px";
        labelLine.style.width = "100%";
        labelLine.style.height = "0px";
        labelLine.style.borderTopStyle = "solid";
        frame.appendChild(labelLine);
        labelLines[i] = labelLine;
        var itemLine = document.createElement("DIV");
        itemLine.className = "timeline-axis-grid timeline-axis-grid-minor";
        itemLine.style.position = "absolute";
        itemLine.style.left = "0px";
        itemLine.style.width = "100%";
        itemLine.style.height = "0px";
        itemLine.style.borderTopStyle = "solid";
        dom.content.insertBefore(itemLine, dom.content.firstChild);
        itemLines[i] = itemLine;
    }
    for (var i = needed; current > i; i++) {
        var label = labels[i], labelLine = labelLines[i], itemLine = itemLines[i];
        frame.removeChild(label);
        frame.removeChild(labelLine);
        dom.content.removeChild(itemLine);
    }
    labels.splice(needed, current - needed);
    labelLines.splice(needed, current - needed);
    itemLines.splice(needed, current - needed);
    links.Timeline.addClassName(frame, options.groupsOnRight ? "timeline-groups-axis-onright" : "timeline-groups-axis-onleft");
    for (var i = 0, iMax = groups.length; iMax > i; i++) {
        var group = groups[i], label = labels[i], labelLine = labelLines[i], itemLine = itemLines[i];
        label.style.top = group.labelTop + "px";
        labelLine.style.top = group.lineTop + "px";
        itemLine.style.top = group.lineTop + "px";
        itemLine.style.width = size.contentWidth + "px";
    }
    if (!dom.groups.background) {
        var background = document.createElement("DIV");
        background.className = "timeline-axis";
        background.style.position = "absolute";
        background.style.left = "0px";
        background.style.width = "100%";
        background.style.border = "none";
        frame.appendChild(background);
        dom.groups.background = background;
    }
    dom.groups.background.style.top = size.axis.top + "px";
    dom.groups.background.style.height = size.axis.height + "px";
    if (!dom.groups.line) {
        var line = document.createElement("DIV");
        line.className = "timeline-axis";
        line.style.position = "absolute";
        line.style.left = "0px";
        line.style.width = "100%";
        line.style.height = "0px";
        frame.appendChild(line);
        dom.groups.line = line;
    }
    dom.groups.line.style.top = size.axis.line + "px";
    if (dom.groups.frame && groups.length) {
        var imageUrls = [];
        links.imageloader.filterImageUrls(dom.groups.frame, imageUrls);
        if (imageUrls.length) {
            var callback = function() {
                timeline.render();
            };
            var sendCallbackWhenAlreadyLoaded = false;
            links.imageloader.loadAll(imageUrls, callback, sendCallbackWhenAlreadyLoaded);
        }
    }
};

links.Timeline.prototype.repaintCurrentTime = function() {
    var options = this.options, dom = this.dom, size = this.size;
    if (!options.showCurrentTime) {
        if (dom.currentTime) {
            dom.contentTimelines.removeChild(dom.currentTime);
            delete dom.currentTime;
        }
        return;
    }
    if (!dom.currentTime) {
        var currentTime = document.createElement("DIV");
        currentTime.className = "timeline-currenttime";
        currentTime.style.position = "absolute";
        currentTime.style.top = "0px";
        currentTime.style.height = "100%";
        dom.contentTimelines.appendChild(currentTime);
        dom.currentTime = currentTime;
    }
    var now = new Date();
    var nowOffset = new Date(now.valueOf() + this.clientTimeOffset);
    var x = this.timeToScreen(nowOffset);
    var visible = x > -size.contentWidth && 2 * size.contentWidth > x;
    dom.currentTime.style.display = visible ? "" : "none";
    dom.currentTime.style.left = x + "px";
    dom.currentTime.title = "Current time: " + nowOffset;
    if (void 0 != this.currentTimeTimer) {
        clearTimeout(this.currentTimeTimer);
        delete this.currentTimeTimer;
    }
    var timeline = this;
    var onTimeout = function() {
        timeline.repaintCurrentTime();
    };
    var interval = 1 / this.conversion.factor / 2;
    30 > interval && (interval = 30);
    this.currentTimeTimer = setTimeout(onTimeout, interval);
};

links.Timeline.prototype.repaintCustomTime = function() {
    var options = this.options, dom = this.dom, size = this.size;
    if (!options.showCustomTime) {
        if (dom.customTime) {
            dom.contentTimelines.removeChild(dom.customTime);
            delete dom.customTime;
        }
        return;
    }
    if (!dom.customTime) {
        var customTime = document.createElement("DIV");
        customTime.className = "timeline-customtime";
        customTime.style.position = "absolute";
        customTime.style.top = "0px";
        customTime.style.height = "100%";
        var drag = document.createElement("DIV");
        drag.style.position = "relative";
        drag.style.top = "0px";
        drag.style.left = "-10px";
        drag.style.height = "100%";
        drag.style.width = "20px";
        customTime.appendChild(drag);
        dom.contentTimelines.appendChild(customTime);
        dom.customTime = customTime;
        this.customTime = new Date();
    }
    var x = this.timeToScreen(this.customTime), visible = x > -size.contentWidth && 2 * size.contentWidth > x;
    dom.customTime.style.display = visible ? "" : "none";
    dom.customTime.style.left = x + "px";
    dom.customTime.title = "Time: " + this.customTime;
};

links.Timeline.prototype.repaintDeleteButton = function() {
    var dom = this.dom, frame = dom.items.frame;
    var deleteButton = dom.items.deleteButton;
    if (!deleteButton) {
        deleteButton = document.createElement("DIV");
        deleteButton.className = "timeline-navigation-delete";
        deleteButton.style.position = "absolute";
        frame.appendChild(deleteButton);
        dom.items.deleteButton = deleteButton;
    }
    var index = this.selection ? this.selection.index : -1, item = this.selection ? this.items[index] : void 0;
    if (item && item.rendered && this.isEditable(item)) {
        var right = item.getRight(this), top = item.top;
        deleteButton.style.left = right + "px";
        deleteButton.style.top = top + "px";
        deleteButton.style.display = "";
        frame.removeChild(deleteButton);
        frame.appendChild(deleteButton);
    } else deleteButton.style.display = "none";
};

links.Timeline.prototype.repaintDragAreas = function() {
    var options = this.options, dom = this.dom, frame = this.dom.items.frame;
    var dragLeft = dom.items.dragLeft;
    if (!dragLeft) {
        dragLeft = document.createElement("DIV");
        dragLeft.className = "timeline-event-range-drag-left";
        dragLeft.style.position = "absolute";
        frame.appendChild(dragLeft);
        dom.items.dragLeft = dragLeft;
    }
    var dragRight = dom.items.dragRight;
    if (!dragRight) {
        dragRight = document.createElement("DIV");
        dragRight.className = "timeline-event-range-drag-right";
        dragRight.style.position = "absolute";
        frame.appendChild(dragRight);
        dom.items.dragRight = dragRight;
    }
    var index = this.selection ? this.selection.index : -1, item = this.selection ? this.items[index] : void 0;
    if (item && item.rendered && this.isEditable(item) && (item instanceof links.Timeline.ItemRange || item instanceof links.Timeline.ItemFloatingRange)) {
        var left = item.getLeft(this), right = item.getRight(this), top = item.top, height = item.height;
        dragLeft.style.left = left + "px";
        dragLeft.style.top = top + "px";
        dragLeft.style.width = options.dragAreaWidth + "px";
        dragLeft.style.height = height + "px";
        dragLeft.style.display = "";
        frame.removeChild(dragLeft);
        frame.appendChild(dragLeft);
        dragRight.style.left = right - options.dragAreaWidth + "px";
        dragRight.style.top = top + "px";
        dragRight.style.width = options.dragAreaWidth + "px";
        dragRight.style.height = height + "px";
        dragRight.style.display = "";
        frame.removeChild(dragRight);
        frame.appendChild(dragRight);
    } else {
        dragLeft.style.display = "none";
        dragRight.style.display = "none";
    }
};

links.Timeline.prototype.repaintNavigation = function() {
    var timeline = this, options = this.options, dom = this.dom, frame = dom.frame, navBar = dom.navBar;
    if (!navBar) {
        var showButtonNew = options.showButtonNew && options.editable;
        var showNavigation = options.showNavigation && (options.zoomable || options.moveable);
        if (showNavigation || showButtonNew) {
            navBar = document.createElement("DIV");
            navBar.style.position = "absolute";
            navBar.className = "timeline-navigation ui-widget ui-state-highlight ui-corner-all";
            options.groupsOnRight ? navBar.style.left = "10px" : navBar.style.right = "10px";
            options.axisOnTop ? navBar.style.bottom = "10px" : navBar.style.top = "10px";
            dom.navBar = navBar;
            frame.appendChild(navBar);
        }
        if (showButtonNew) {
            navBar.addButton = document.createElement("DIV");
            navBar.addButton.className = "timeline-navigation-new";
            navBar.addButton.title = options.CREATE_NEW_EVENT;
            var addIconSpan = document.createElement("SPAN");
            addIconSpan.className = "ui-icon ui-icon-circle-plus";
            navBar.addButton.appendChild(addIconSpan);
            var onAdd = function(event) {
                links.Timeline.preventDefault(event);
                links.Timeline.stopPropagation(event);
                var w = timeline.size.contentWidth;
                var x = w / 2;
                var xstart = timeline.screenToTime(x);
                options.snapEvents && timeline.step.snap(xstart);
                var content = options.NEW;
                var group = timeline.groups.length ? timeline.groups[0].content : void 0;
                var preventRender = true;
                timeline.addItem({
                    start: xstart,
                    content: content,
                    group: group
                }, preventRender);
                var index = timeline.items.length - 1;
                timeline.selectItem(index);
                timeline.applyAdd = true;
                timeline.trigger("add");
                if (timeline.applyAdd) {
                    timeline.render({
                        animate: false
                    });
                    timeline.selectItem(index);
                } else timeline.deleteItem(index);
            };
            links.Timeline.addEventListener(navBar.addButton, "mousedown", onAdd);
            navBar.appendChild(navBar.addButton);
        }
        showButtonNew && showNavigation && links.Timeline.addClassName(navBar.addButton, "timeline-navigation-new-line");
        if (showNavigation) {
            if (options.zoomable) {
                navBar.zoomInButton = document.createElement("DIV");
                navBar.zoomInButton.className = "timeline-navigation-zoom-in";
                navBar.zoomInButton.title = this.options.ZOOM_IN;
                var ziIconSpan = document.createElement("SPAN");
                ziIconSpan.className = "ui-icon ui-icon-circle-zoomin";
                navBar.zoomInButton.appendChild(ziIconSpan);
                var onZoomIn = function(event) {
                    links.Timeline.preventDefault(event);
                    links.Timeline.stopPropagation(event);
                    timeline.zoom(.4);
                    timeline.trigger("rangechange");
                    timeline.trigger("rangechanged");
                };
                links.Timeline.addEventListener(navBar.zoomInButton, "mousedown", onZoomIn);
                navBar.appendChild(navBar.zoomInButton);
                navBar.zoomOutButton = document.createElement("DIV");
                navBar.zoomOutButton.className = "timeline-navigation-zoom-out";
                navBar.zoomOutButton.title = this.options.ZOOM_OUT;
                var zoIconSpan = document.createElement("SPAN");
                zoIconSpan.className = "ui-icon ui-icon-circle-zoomout";
                navBar.zoomOutButton.appendChild(zoIconSpan);
                var onZoomOut = function(event) {
                    links.Timeline.preventDefault(event);
                    links.Timeline.stopPropagation(event);
                    timeline.zoom(-.4);
                    timeline.trigger("rangechange");
                    timeline.trigger("rangechanged");
                };
                links.Timeline.addEventListener(navBar.zoomOutButton, "mousedown", onZoomOut);
                navBar.appendChild(navBar.zoomOutButton);
            }
            if (options.moveable) {
                navBar.moveLeftButton = document.createElement("DIV");
                navBar.moveLeftButton.className = "timeline-navigation-move-left";
                navBar.moveLeftButton.title = this.options.MOVE_LEFT;
                var mlIconSpan = document.createElement("SPAN");
                mlIconSpan.className = "ui-icon ui-icon-circle-arrow-w";
                navBar.moveLeftButton.appendChild(mlIconSpan);
                var onMoveLeft = function(event) {
                    links.Timeline.preventDefault(event);
                    links.Timeline.stopPropagation(event);
                    timeline.move(-.2);
                    timeline.trigger("rangechange");
                    timeline.trigger("rangechanged");
                };
                links.Timeline.addEventListener(navBar.moveLeftButton, "mousedown", onMoveLeft);
                navBar.appendChild(navBar.moveLeftButton);
                navBar.moveRightButton = document.createElement("DIV");
                navBar.moveRightButton.className = "timeline-navigation-move-right";
                navBar.moveRightButton.title = this.options.MOVE_RIGHT;
                var mrIconSpan = document.createElement("SPAN");
                mrIconSpan.className = "ui-icon ui-icon-circle-arrow-e";
                navBar.moveRightButton.appendChild(mrIconSpan);
                var onMoveRight = function(event) {
                    links.Timeline.preventDefault(event);
                    links.Timeline.stopPropagation(event);
                    timeline.move(.2);
                    timeline.trigger("rangechange");
                    timeline.trigger("rangechanged");
                };
                links.Timeline.addEventListener(navBar.moveRightButton, "mousedown", onMoveRight);
                navBar.appendChild(navBar.moveRightButton);
            }
        }
    }
};

links.Timeline.prototype.setCurrentTime = function(time) {
    var now = new Date();
    this.clientTimeOffset = time.valueOf() - now.valueOf();
    this.repaintCurrentTime();
};

links.Timeline.prototype.getCurrentTime = function() {
    var now = new Date();
    return new Date(now.valueOf() + this.clientTimeOffset);
};

links.Timeline.prototype.setCustomTime = function(time) {
    this.customTime = new Date(time.valueOf());
    this.repaintCustomTime();
};

links.Timeline.prototype.getCustomTime = function() {
    return new Date(this.customTime.valueOf());
};

links.Timeline.prototype.setScale = function(scale, step) {
    this.step.setScale(scale, step);
    this.render();
};

links.Timeline.prototype.setAutoScale = function(enable) {
    this.step.setAutoScale(enable);
    this.render();
};

links.Timeline.prototype.redraw = function() {
    this.setData(this.data);
};

links.Timeline.prototype.checkResize = function() {
    this.render();
};

links.Timeline.prototype.isEditable = function(item) {
    if (item) return void 0 != item.editable ? item.editable : this.options.editable;
    return false;
};

links.Timeline.prototype.recalcConversion = function() {
    this.conversion.offset = this.start.valueOf();
    this.conversion.factor = this.size.contentWidth / (this.end.valueOf() - this.start.valueOf());
};

links.Timeline.prototype.screenToTime = function(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

links.Timeline.prototype.timeToScreen = function(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};

links.Timeline.prototype.onTouchStart = function(event) {
    var params = this.eventParams, me = this;
    if (params.touchDown) return;
    params.touchDown = true;
    params.zoomed = false;
    this.onMouseDown(event);
    if (!params.onTouchMove) {
        params.onTouchMove = function(event) {
            me.onTouchMove(event);
        };
        links.Timeline.addEventListener(document, "touchmove", params.onTouchMove);
    }
    if (!params.onTouchEnd) {
        params.onTouchEnd = function(event) {
            me.onTouchEnd(event);
        };
        links.Timeline.addEventListener(document, "touchend", params.onTouchEnd);
    }
    var target = links.Timeline.getTarget(event);
    var item = this.getItemIndex(target);
    params.doubleTapStartPrev = params.doubleTapStart;
    params.doubleTapStart = new Date().valueOf();
    params.doubleTapItemPrev = params.doubleTapItem;
    params.doubleTapItem = item;
    links.Timeline.preventDefault(event);
};

links.Timeline.prototype.onTouchMove = function(event) {
    var params = this.eventParams;
    event.scale && 1 !== event.scale && (params.zoomed = true);
    if (params.zoomed) {
        if (this.options.zoomable) {
            params.zoomed = true;
            var scale = event.scale, oldWidth = params.end.valueOf() - params.start.valueOf(), newWidth = oldWidth / scale, diff = newWidth - oldWidth, start = new Date(parseInt(params.start.valueOf() - diff / 2)), end = new Date(parseInt(params.end.valueOf() + diff / 2));
            this.setVisibleChartRange(start, end);
            this.trigger("rangechange");
        }
    } else this.onMouseMove(event);
    links.Timeline.preventDefault(event);
};

links.Timeline.prototype.onTouchEnd = function(event) {
    var params = this.eventParams;
    var me = this;
    params.touchDown = false;
    params.zoomed && this.trigger("rangechanged");
    if (params.onTouchMove) {
        links.Timeline.removeEventListener(document, "touchmove", params.onTouchMove);
        delete params.onTouchMove;
    }
    if (params.onTouchEnd) {
        links.Timeline.removeEventListener(document, "touchend", params.onTouchEnd);
        delete params.onTouchEnd;
    }
    this.onMouseUp(event);
    var delta = 500;
    var doubleTapEnd = new Date().valueOf();
    var target = links.Timeline.getTarget(event);
    this.getItemIndex(target);
    if (params.doubleTapStartPrev && delta > doubleTapEnd - params.doubleTapStartPrev && params.doubleTapItem == params.doubleTapItemPrev) {
        params.touchDown = true;
        me.onDblClick(event);
        params.touchDown = false;
    }
    links.Timeline.preventDefault(event);
};

links.Timeline.prototype.onMouseDown = function(event) {
    event = event || window.event;
    var params = this.eventParams, options = this.options, dom = this.dom;
    var leftButtonDown = event.which ? 1 == event.which : 1 == event.button;
    if (!leftButtonDown && !params.touchDown) return;
    params.mouseX = links.Timeline.getPageX(event);
    params.mouseY = links.Timeline.getPageY(event);
    params.frameLeft = links.Timeline.getAbsoluteLeft(this.dom.content);
    params.frameTop = links.Timeline.getAbsoluteTop(this.dom.content);
    params.previousLeft = 0;
    params.previousOffset = 0;
    params.moved = false;
    params.start = new Date(this.start.valueOf());
    params.end = new Date(this.end.valueOf());
    params.target = links.Timeline.getTarget(event);
    var dragLeft = dom.items && dom.items.dragLeft ? dom.items.dragLeft : void 0;
    var dragRight = dom.items && dom.items.dragRight ? dom.items.dragRight : void 0;
    params.itemDragLeft = params.target === dragLeft;
    params.itemDragRight = params.target === dragRight;
    params.itemIndex = params.itemDragLeft || params.itemDragRight ? this.selection ? this.selection.index : void 0 : this.getItemIndex(params.target);
    params.customTime = params.target === dom.customTime || params.target.parentNode === dom.customTime ? this.customTime : void 0;
    params.addItem = options.editable && event.ctrlKey;
    if (params.addItem) {
        var x = params.mouseX - params.frameLeft;
        var y = params.mouseY - params.frameTop;
        var xstart = this.screenToTime(x);
        options.snapEvents && this.step.snap(xstart);
        var xend = new Date(xstart.valueOf());
        var content = options.NEW;
        var group = this.getGroupFromHeight(y);
        this.addItem({
            start: xstart,
            end: xend,
            content: content,
            group: this.getGroupName(group)
        });
        params.itemIndex = this.items.length - 1;
        this.selectItem(params.itemIndex);
        params.itemDragRight = true;
    }
    var item = this.items[params.itemIndex];
    var isSelected = this.isSelected(params.itemIndex);
    params.editItem = isSelected && this.isEditable(item);
    if (params.editItem) {
        params.itemStart = item.start;
        params.itemEnd = item.end;
        params.itemGroup = item.group;
        params.itemLeft = item.getLeft(this);
        params.itemRight = item.getRight(this);
    } else this.dom.frame.style.cursor = "move";
    if (!params.touchDown) {
        var me = this;
        if (!params.onMouseMove) {
            params.onMouseMove = function(event) {
                me.onMouseMove(event);
            };
            links.Timeline.addEventListener(document, "mousemove", params.onMouseMove);
        }
        if (!params.onMouseUp) {
            params.onMouseUp = function(event) {
                me.onMouseUp(event);
            };
            links.Timeline.addEventListener(document, "mouseup", params.onMouseUp);
        }
        links.Timeline.preventDefault(event);
    }
};

links.Timeline.prototype.onMouseMove = function(event) {
    event = event || window.event;
    var params = this.eventParams, size = this.size, dom = this.dom, options = this.options;
    var mouseX = links.Timeline.getPageX(event);
    var mouseY = links.Timeline.getPageY(event);
    void 0 == params.mouseX && (params.mouseX = mouseX);
    void 0 == params.mouseY && (params.mouseY = mouseY);
    var diffX = mouseX - params.mouseX;
    mouseY - params.mouseY;
    Math.abs(diffX) >= 1 && (params.moved = true);
    if (params.customTime) {
        var x = this.timeToScreen(params.customTime);
        var xnew = x + diffX;
        this.customTime = this.screenToTime(xnew);
        this.repaintCustomTime();
        this.trigger("timechange");
    } else if (params.editItem) {
        var left, right, item = this.items[params.itemIndex];
        if (params.itemDragLeft && options.timeChangeable) {
            left = params.itemLeft + diffX;
            right = params.itemRight;
            item.start = this.screenToTime(left);
            if (options.snapEvents) {
                this.step.snap(item.start);
                left = this.timeToScreen(item.start);
            }
            if (left > right) {
                left = right;
                item.start = this.screenToTime(left);
            }
        } else if (params.itemDragRight && options.timeChangeable) {
            left = params.itemLeft;
            right = params.itemRight + diffX;
            item.end = this.screenToTime(right);
            if (options.snapEvents) {
                this.step.snap(item.end);
                right = this.timeToScreen(item.end);
            }
            if (left > right) {
                right = left;
                item.end = this.screenToTime(right);
            }
        } else if (options.timeChangeable) {
            left = params.itemLeft + diffX;
            item.start = this.screenToTime(left);
            if (options.snapEvents) {
                this.step.snap(item.start);
                left = this.timeToScreen(item.start);
            }
            if (item.end) {
                right = left + (params.itemRight - params.itemLeft);
                item.end = this.screenToTime(right);
            }
            this.trigger("change");
        }
        item.setPosition(left, right);
        var dragging = params.itemDragLeft || params.itemDragRight;
        if (this.groups.length && !dragging) {
            var y = mouseY - params.frameTop;
            var group = this.getGroupFromHeight(y);
            if (options.groupsChangeable && item.group !== group) {
                var index = this.items.indexOf(item);
                this.changeItem(index, {
                    group: this.getGroupName(group)
                });
            } else {
                this.repaintDeleteButton();
                this.repaintDragAreas();
            }
        } else this.render();
    } else if (options.moveable) {
        var interval = params.end.valueOf() - params.start.valueOf();
        var diffMillisecs = Math.round(-diffX / size.contentWidth * interval);
        var newStart = new Date(params.start.valueOf() + diffMillisecs);
        var newEnd = new Date(params.end.valueOf() + diffMillisecs);
        this.applyRange(newStart, newEnd);
        var appliedDiff = this.start.valueOf() - newStart.valueOf();
        appliedDiff && (diffMillisecs += appliedDiff);
        this.recalcConversion();
        var previousLeft = params.previousLeft || 0;
        var currentLeft = parseFloat(dom.items.frame.style.left) || 0;
        var previousOffset = params.previousOffset || 0;
        var frameOffset = previousOffset + (currentLeft - previousLeft);
        var frameLeft = -diffMillisecs / interval * size.contentWidth + frameOffset;
        dom.items.frame.style.left = frameLeft + "px";
        params.previousOffset = frameOffset;
        params.previousLeft = parseFloat(dom.items.frame.style.left) || frameLeft;
        this.repaintCurrentTime();
        this.repaintCustomTime();
        this.repaintAxis();
        this.trigger("rangechange");
    }
    links.Timeline.preventDefault(event);
};

links.Timeline.prototype.onMouseUp = function(event) {
    var params = this.eventParams, options = this.options;
    event = event || window.event;
    this.dom.frame.style.cursor = "auto";
    if (params.onMouseMove) {
        links.Timeline.removeEventListener(document, "mousemove", params.onMouseMove);
        delete params.onMouseMove;
    }
    if (params.onMouseUp) {
        links.Timeline.removeEventListener(document, "mouseup", params.onMouseUp);
        delete params.onMouseUp;
    }
    if (params.customTime) this.trigger("timechanged"); else if (params.editItem) {
        var item = this.items[params.itemIndex];
        if (params.moved || params.addItem) {
            this.applyChange = true;
            this.applyAdd = true;
            this.updateData(params.itemIndex, {
                start: item.start,
                end: item.end
            });
            this.trigger(params.addItem ? "add" : "changed");
            item = this.items[params.itemIndex];
            if (params.addItem) this.applyAdd ? this.updateData(params.itemIndex, {
                start: item.start,
                end: item.end,
                content: item.content,
                group: this.getGroupName(item.group)
            }) : this.deleteItem(params.itemIndex); else if (this.applyChange) this.updateData(params.itemIndex, {
                start: item.start,
                end: item.end
            }); else {
                delete this.applyChange;
                delete this.applyAdd;
                var item = this.items[params.itemIndex];
                item.dom;
                item.start = params.itemStart;
                item.end = params.itemEnd;
                item.group = params.itemGroup;
                item.setPosition(params.itemLeft, params.itemRight);
            }
            this.options.cluster && this.clusterGenerator.updateData();
            this.render();
        }
    } else if (params.moved || params.zoomed) {
        this.render();
        (params.moved && options.moveable || params.zoomed && options.zoomable) && this.trigger("rangechanged");
    } else if (params.target === this.dom.items.deleteButton) this.selection && this.confirmDeleteItem(this.selection.index); else if (options.selectable) if (void 0 != params.itemIndex) {
        if (!this.isSelected(params.itemIndex)) {
            this.selectItem(params.itemIndex);
            this.trigger("select");
        }
    } else if (options.unselectable) {
        this.unselectItem();
        this.trigger("select");
    }
};

links.Timeline.prototype.onDblClick = function(event) {
    var params = this.eventParams, options = this.options, dom = this.dom;
    this.size;
    event = event || window.event;
    if (void 0 != params.itemIndex) {
        var item = this.items[params.itemIndex];
        item && this.isEditable(item) && this.trigger("edit");
    } else if (options.editable) {
        params.mouseX = links.Timeline.getPageX(event);
        params.mouseY = links.Timeline.getPageY(event);
        var x = params.mouseX - links.Timeline.getAbsoluteLeft(dom.content);
        var y = params.mouseY - links.Timeline.getAbsoluteTop(dom.content);
        var xstart = this.screenToTime(x);
        options.snapEvents && this.step.snap(xstart);
        var content = options.NEW;
        var group = this.getGroupFromHeight(y);
        var preventRender = true;
        this.addItem({
            start: xstart,
            content: content,
            group: this.getGroupName(group)
        }, preventRender);
        params.itemIndex = this.items.length - 1;
        this.selectItem(params.itemIndex);
        this.applyAdd = true;
        this.trigger("add");
        if (this.applyAdd) {
            this.render({
                animate: false
            });
            this.selectItem(params.itemIndex);
        } else this.deleteItem(params.itemIndex);
    }
    links.Timeline.preventDefault(event);
};

links.Timeline.prototype.onMouseWheel = function(event) {
    if (!this.options.zoomable) return;
    event || (event = window.event);
    var delta = 0;
    event.wheelDelta ? delta = event.wheelDelta / 120 : event.detail && (delta = -event.detail / 3);
    if (delta) {
        var timeline = this;
        var zoom = function() {
            var zoomFactor = delta / 5;
            var frameLeft = links.Timeline.getAbsoluteLeft(timeline.dom.content);
            var mouseX = links.Timeline.getPageX(event);
            var zoomAroundDate = void 0 != mouseX && void 0 != frameLeft ? timeline.screenToTime(mouseX - frameLeft) : void 0;
            timeline.zoom(zoomFactor, zoomAroundDate);
            timeline.trigger("rangechange");
            timeline.trigger("rangechanged");
        };
        var scroll = function() {
            timeline.move(delta * -.2);
            timeline.trigger("rangechange");
            timeline.trigger("rangechanged");
        };
        event.shiftKey ? scroll() : zoom();
    }
    links.Timeline.preventDefault(event);
};

links.Timeline.prototype.zoom = function(zoomFactor, zoomAroundDate) {
    void 0 == zoomAroundDate && (zoomAroundDate = new Date((this.start.valueOf() + this.end.valueOf()) / 2));
    zoomFactor >= 1 && (zoomFactor = .9);
    -1 >= zoomFactor && (zoomFactor = -.9);
    0 > zoomFactor && (zoomFactor /= 1 + zoomFactor);
    var startDiff = this.start.valueOf() - zoomAroundDate;
    var endDiff = this.end.valueOf() - zoomAroundDate;
    var newStart = new Date(this.start.valueOf() - startDiff * zoomFactor);
    var newEnd = new Date(this.end.valueOf() - endDiff * zoomFactor);
    var interval = newEnd.valueOf() - newStart.valueOf();
    var zoomMin = Number(this.options.zoomMin) || 10;
    10 > zoomMin && (zoomMin = 10);
    if (interval >= zoomMin) {
        this.applyRange(newStart, newEnd, zoomAroundDate);
        this.render({
            animate: this.options.animate && this.options.animateZoom
        });
    }
};

links.Timeline.prototype.move = function(moveFactor) {
    var diff = this.end.valueOf() - this.start.valueOf();
    var newStart = new Date(this.start.valueOf() + diff * moveFactor);
    var newEnd = new Date(this.end.valueOf() + diff * moveFactor);
    this.applyRange(newStart, newEnd);
    this.render();
};

links.Timeline.prototype.applyRange = function(start, end, zoomAroundDate) {
    var startValue = start.valueOf();
    var endValue = end.valueOf();
    var interval = endValue - startValue;
    var options = this.options;
    var year = 31536e6;
    var zoomMin = Number(options.zoomMin) || 10;
    10 > zoomMin && (zoomMin = 10);
    var zoomMax = Number(options.zoomMax) || 1e4 * year;
    zoomMax > 1e4 * year && (zoomMax = 1e4 * year);
    zoomMin > zoomMax && (zoomMax = zoomMin);
    var min = options.min ? options.min.valueOf() : void 0;
    var max = options.max ? options.max.valueOf() : void 0;
    if (void 0 != min && void 0 != max) {
        if (min >= max) {
            var day = 864e5;
            max = min + day;
        }
        zoomMax > max - min && (zoomMax = max - min);
        zoomMin > max - min && (zoomMin = max - min);
    }
    startValue >= endValue && (endValue += 864e5);
    if (zoomMin > interval) {
        var diff = zoomMin - interval;
        var f = zoomAroundDate ? (zoomAroundDate.valueOf() - startValue) / interval : .5;
        startValue -= Math.round(diff * f);
        endValue += Math.round(diff * (1 - f));
    }
    if (interval > zoomMax) {
        var diff = interval - zoomMax;
        var f = zoomAroundDate ? (zoomAroundDate.valueOf() - startValue) / interval : .5;
        startValue += Math.round(diff * f);
        endValue -= Math.round(diff * (1 - f));
    }
    if (void 0 != min) {
        var diff = startValue - min;
        if (0 > diff) {
            startValue -= diff;
            endValue -= diff;
        }
    }
    if (void 0 != max) {
        var diff = max - endValue;
        if (0 > diff) {
            startValue += diff;
            endValue += diff;
        }
    }
    this.start = new Date(startValue);
    this.end = new Date(endValue);
};

links.Timeline.prototype.confirmDeleteItem = function(index) {
    this.applyDelete = true;
    this.isSelected(index) || this.selectItem(index);
    this.trigger("delete");
    this.applyDelete && this.deleteItem(index);
    delete this.applyDelete;
};

links.Timeline.prototype.deleteItem = function(index, preventRender) {
    if (index >= this.items.length) throw "Cannot delete row, index out of range";
    this.selection && (this.selection.index == index ? this.unselectItem() : this.selection.index > index && this.selection.index--);
    var item = this.items.splice(index, 1)[0];
    this.renderQueue.hide.push(item);
    if (this.data) if (google && google.visualization && this.data instanceof google.visualization.DataTable) this.data.removeRow(index); else {
        if (!links.Timeline.isArray(this.data)) throw "Cannot delete row from data, unknown data type";
        this.data.splice(index, 1);
    }
    this.options.cluster && this.clusterGenerator.updateData();
    preventRender || this.render();
};

links.Timeline.prototype.deleteAllItems = function() {
    this.unselectItem();
    this.clearItems();
    this.deleteGroups();
    if (this.data) if (google && google.visualization && this.data instanceof google.visualization.DataTable) this.data.removeRows(0, this.data.getNumberOfRows()); else {
        if (!links.Timeline.isArray(this.data)) throw "Cannot delete row from data, unknown data type";
        this.data.splice(0, this.data.length);
    }
    this.options.cluster && this.clusterGenerator.updateData();
    this.render();
};

links.Timeline.prototype.getGroupFromHeight = function(height) {
    var i, group, groups = this.groups;
    if (groups.length) {
        if (this.options.axisOnTop) for (i = groups.length - 1; i >= 0; i--) {
            group = groups[i];
            if (height > group.top) return group;
        } else for (i = 0; groups.length > i; i++) {
            group = groups[i];
            if (height > group.top) return group;
        }
        return group;
    }
    return void 0;
};

links.Timeline.Item = function(data, options) {
    if (data) {
        this.start = data.start;
        this.end = data.end;
        this.content = data.content;
        this.className = data.className;
        this.editable = data.editable;
        this.group = data.group;
        this.type = data.type;
    }
    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
    this.lineWidth = 0;
    this.dotWidth = 0;
    this.dotHeight = 0;
    this.rendered = false;
    if (options) for (var option in options) options.hasOwnProperty(option) && (this[option] = options[option]);
};

links.Timeline.Item.prototype.reflow = function() {
    return false;
};

links.Timeline.Item.prototype.getImageUrls = function(imageUrls) {
    this.dom && links.imageloader.filterImageUrls(this.dom, imageUrls);
};

links.Timeline.Item.prototype.select = function() {};

links.Timeline.Item.prototype.unselect = function() {};

links.Timeline.Item.prototype.createDOM = function() {};

links.Timeline.Item.prototype.showDOM = function() {};

links.Timeline.Item.prototype.hideDOM = function() {};

links.Timeline.Item.prototype.updateDOM = function() {};

links.Timeline.Item.prototype.updatePosition = function() {};

links.Timeline.Item.prototype.isRendered = function() {
    return this.rendered;
};

links.Timeline.Item.prototype.isVisible = function() {
    return false;
};

links.Timeline.Item.prototype.setPosition = function() {};

links.Timeline.Item.prototype.getLeft = function() {
    return 0;
};

links.Timeline.Item.prototype.getRight = function() {
    return 0;
};

links.Timeline.Item.prototype.getWidth = function() {
    return this.width || 0;
};

links.Timeline.ItemBox = function(data, options) {
    links.Timeline.Item.call(this, data, options);
};

links.Timeline.ItemBox.prototype = new links.Timeline.Item();

links.Timeline.ItemBox.prototype.reflow = function() {
    var dom = this.dom, dotHeight = dom.dot.offsetHeight, dotWidth = dom.dot.offsetWidth, lineWidth = dom.line.offsetWidth, resized = this.dotHeight != dotHeight || this.dotWidth != dotWidth || this.lineWidth != lineWidth;
    this.dotHeight = dotHeight;
    this.dotWidth = dotWidth;
    this.lineWidth = lineWidth;
    return resized;
};

links.Timeline.ItemBox.prototype.select = function() {
    var dom = this.dom;
    links.Timeline.addClassName(dom, "timeline-event-selected ui-state-active");
    links.Timeline.addClassName(dom.line, "timeline-event-selected ui-state-active");
    links.Timeline.addClassName(dom.dot, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemBox.prototype.unselect = function() {
    var dom = this.dom;
    links.Timeline.removeClassName(dom, "timeline-event-selected ui-state-active");
    links.Timeline.removeClassName(dom.line, "timeline-event-selected ui-state-active");
    links.Timeline.removeClassName(dom.dot, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemBox.prototype.createDOM = function() {
    var divBox = document.createElement("DIV");
    divBox.style.position = "absolute";
    divBox.style.left = this.left + "px";
    divBox.style.top = this.top + "px";
    var divContent = document.createElement("DIV");
    divContent.className = "timeline-event-content";
    divContent.innerHTML = this.content;
    divBox.appendChild(divContent);
    var divLine = document.createElement("DIV");
    divLine.style.position = "absolute";
    divLine.style.width = "0px";
    divBox.line = divLine;
    var divDot = document.createElement("DIV");
    divDot.style.position = "absolute";
    divDot.style.width = "0px";
    divDot.style.height = "0px";
    divBox.dot = divDot;
    this.dom = divBox;
    this.updateDOM();
    return divBox;
};

links.Timeline.ItemBox.prototype.showDOM = function(container) {
    var dom = this.dom;
    dom || (dom = this.createDOM());
    if (dom.parentNode != container) {
        dom.parentNode && this.hideDOM();
        container.appendChild(dom);
        container.insertBefore(dom.line, container.firstChild);
        container.appendChild(dom.dot);
        this.rendered = true;
    }
};

links.Timeline.ItemBox.prototype.hideDOM = function() {
    var dom = this.dom;
    if (dom) {
        dom.parentNode && dom.parentNode.removeChild(dom);
        dom.line && dom.line.parentNode && dom.line.parentNode.removeChild(dom.line);
        dom.dot && dom.dot.parentNode && dom.dot.parentNode.removeChild(dom.dot);
        this.rendered = false;
    }
};

links.Timeline.ItemBox.prototype.updateDOM = function() {
    var divBox = this.dom;
    if (divBox) {
        var divLine = divBox.line;
        var divDot = divBox.dot;
        divBox.firstChild.innerHTML = this.content;
        divBox.className = "timeline-event timeline-event-box ui-widget ui-state-default";
        divLine.className = "timeline-event timeline-event-line ui-widget ui-state-default";
        divDot.className = "timeline-event timeline-event-dot ui-widget ui-state-default";
        if (this.isCluster) {
            links.Timeline.addClassName(divBox, "timeline-event-cluster ui-widget-header");
            links.Timeline.addClassName(divLine, "timeline-event-cluster ui-widget-header");
            links.Timeline.addClassName(divDot, "timeline-event-cluster ui-widget-header");
        }
        if (this.className) {
            links.Timeline.addClassName(divBox, this.className);
            links.Timeline.addClassName(divLine, this.className);
            links.Timeline.addClassName(divDot, this.className);
        }
    }
};

links.Timeline.ItemBox.prototype.updatePosition = function(timeline) {
    var dom = this.dom;
    if (dom) {
        var left = timeline.timeToScreen(this.start), axisOnTop = timeline.options.axisOnTop, axisTop = timeline.size.axis.top, axisHeight = timeline.size.axis.height, boxAlign = timeline.options.box && timeline.options.box.align ? timeline.options.box.align : void 0;
        dom.style.top = this.top + "px";
        dom.style.left = "right" == boxAlign ? left - this.width + "px" : "left" == boxAlign ? left + "px" : left - this.width / 2 + "px";
        var line = dom.line;
        var dot = dom.dot;
        line.style.left = left - this.lineWidth / 2 + "px";
        dot.style.left = left - this.dotWidth / 2 + "px";
        if (axisOnTop) {
            line.style.top = axisHeight + "px";
            line.style.height = Math.max(this.top - axisHeight, 0) + "px";
            dot.style.top = axisHeight - this.dotHeight / 2 + "px";
        } else {
            line.style.top = this.top + this.height + "px";
            line.style.height = Math.max(axisTop - this.top - this.height, 0) + "px";
            dot.style.top = axisTop - this.dotHeight / 2 + "px";
        }
    }
};

links.Timeline.ItemBox.prototype.isVisible = function(start, end) {
    if (this.cluster) return false;
    return this.start > start && end > this.start;
};

links.Timeline.ItemBox.prototype.setPosition = function(left) {
    var dom = this.dom;
    dom.style.left = left - this.width / 2 + "px";
    dom.line.style.left = left - this.lineWidth / 2 + "px";
    dom.dot.style.left = left - this.dotWidth / 2 + "px";
    if (this.group) {
        this.top = this.group.top;
        dom.style.top = this.top + "px";
    }
};

links.Timeline.ItemBox.prototype.getLeft = function(timeline) {
    var boxAlign = timeline.options.box && timeline.options.box.align ? timeline.options.box.align : void 0;
    var left = timeline.timeToScreen(this.start);
    left -= "right" == boxAlign ? width : this.width / 2;
    return left;
};

links.Timeline.ItemBox.prototype.getRight = function(timeline) {
    var boxAlign = timeline.options.box && timeline.options.box.align ? timeline.options.box.align : void 0;
    var left = timeline.timeToScreen(this.start);
    var right;
    right = "right" == boxAlign ? left : "left" == boxAlign ? left + this.width : left + this.width / 2;
    return right;
};

links.Timeline.ItemRange = function(data, options) {
    links.Timeline.Item.call(this, data, options);
};

links.Timeline.ItemRange.prototype = new links.Timeline.Item();

links.Timeline.ItemRange.prototype.select = function() {
    var dom = this.dom;
    links.Timeline.addClassName(dom, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemRange.prototype.unselect = function() {
    var dom = this.dom;
    links.Timeline.removeClassName(dom, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemRange.prototype.createDOM = function() {
    var divBox = document.createElement("DIV");
    divBox.style.position = "absolute";
    var divContent = document.createElement("DIV");
    divContent.className = "timeline-event-content";
    divBox.appendChild(divContent);
    this.dom = divBox;
    this.updateDOM();
    return divBox;
};

links.Timeline.ItemRange.prototype.showDOM = function(container) {
    var dom = this.dom;
    dom || (dom = this.createDOM());
    if (dom.parentNode != container) {
        dom.parentNode && this.hideDOM();
        container.appendChild(dom);
        this.rendered = true;
    }
};

links.Timeline.ItemRange.prototype.hideDOM = function() {
    var dom = this.dom;
    if (dom) {
        dom.parentNode && dom.parentNode.removeChild(dom);
        this.rendered = false;
    }
};

links.Timeline.ItemRange.prototype.updateDOM = function() {
    var divBox = this.dom;
    if (divBox) {
        divBox.firstChild.innerHTML = this.content;
        divBox.className = "timeline-event timeline-event-range ui-widget ui-state-default";
        this.isCluster && links.Timeline.addClassName(divBox, "timeline-event-cluster ui-widget-header");
        this.className && links.Timeline.addClassName(divBox, this.className);
    }
};

links.Timeline.ItemRange.prototype.updatePosition = function(timeline) {
    var dom = this.dom;
    if (dom) {
        var contentWidth = timeline.size.contentWidth, left = timeline.timeToScreen(this.start), right = timeline.timeToScreen(this.end);
        -contentWidth > left && (left = -contentWidth);
        right > 2 * contentWidth && (right = 2 * contentWidth);
        dom.style.top = this.top + "px";
        dom.style.left = left + "px";
        dom.style.width = Math.max(right - left, 1) + "px";
    }
};

links.Timeline.ItemRange.prototype.isVisible = function(start, end) {
    if (this.cluster) return false;
    return this.end > start && end > this.start;
};

links.Timeline.ItemRange.prototype.setPosition = function(left, right) {
    var dom = this.dom;
    dom.style.left = left + "px";
    dom.style.width = right - left + "px";
    if (this.group) {
        this.top = this.group.top;
        dom.style.top = this.top + "px";
    }
};

links.Timeline.ItemRange.prototype.getLeft = function(timeline) {
    return timeline.timeToScreen(this.start);
};

links.Timeline.ItemRange.prototype.getRight = function(timeline) {
    return timeline.timeToScreen(this.end);
};

links.Timeline.ItemRange.prototype.getWidth = function(timeline) {
    return timeline.timeToScreen(this.end) - timeline.timeToScreen(this.start);
};

links.Timeline.ItemFloatingRange = function(data, options) {
    links.Timeline.Item.call(this, data, options);
};

links.Timeline.ItemFloatingRange.prototype = new links.Timeline.Item();

links.Timeline.ItemFloatingRange.prototype.select = function() {
    var dom = this.dom;
    links.Timeline.addClassName(dom, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemFloatingRange.prototype.unselect = function() {
    var dom = this.dom;
    links.Timeline.removeClassName(dom, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemFloatingRange.prototype.createDOM = function() {
    var divBox = document.createElement("DIV");
    divBox.style.position = "absolute";
    var divContent = document.createElement("DIV");
    divContent.className = "timeline-event-content";
    divBox.appendChild(divContent);
    this.dom = divBox;
    this.updateDOM();
    return divBox;
};

links.Timeline.ItemFloatingRange.prototype.showDOM = function(container) {
    var dom = this.dom;
    dom || (dom = this.createDOM());
    if (dom.parentNode != container) {
        dom.parentNode && this.hideDOM();
        container.appendChild(dom);
        this.rendered = true;
    }
};

links.Timeline.ItemFloatingRange.prototype.hideDOM = function() {
    var dom = this.dom;
    if (dom) {
        dom.parentNode && dom.parentNode.removeChild(dom);
        this.rendered = false;
    }
};

links.Timeline.ItemFloatingRange.prototype.updateDOM = function() {
    var divBox = this.dom;
    if (divBox) {
        divBox.firstChild.innerHTML = this.content;
        divBox.className = "timeline-event timeline-event-range ui-widget ui-state-default";
        this.isCluster && links.Timeline.addClassName(divBox, "timeline-event-cluster ui-widget-header");
        this.className && links.Timeline.addClassName(divBox, this.className);
    }
};

links.Timeline.ItemFloatingRange.prototype.updatePosition = function(timeline) {
    var dom = this.dom;
    if (dom) {
        var contentWidth = timeline.size.contentWidth, left = this.getLeft(timeline), right = this.getRight(timeline);
        -contentWidth > left && (left = -contentWidth);
        right > 2 * contentWidth && (right = 2 * contentWidth);
        dom.style.top = this.top + "px";
        dom.style.left = left + "px";
        dom.style.width = Math.max(right - left, 1) + "px";
    }
};

links.Timeline.ItemFloatingRange.prototype.isVisible = function(start, end) {
    if (this.cluster) return false;
    return this.end && this.start ? this.end > start && end > this.start : this.start ? end > this.start : this.end ? this.end > start : true;
};

links.Timeline.ItemFloatingRange.prototype.setPosition = function(left, right) {
    var dom = this.dom;
    dom.style.left = left + "px";
    dom.style.width = right - left + "px";
    if (this.group) {
        this.top = this.group.top;
        dom.style.top = this.top + "px";
    }
};

links.Timeline.ItemFloatingRange.prototype.getLeft = function(timeline) {
    return this.start ? timeline.timeToScreen(this.start) : 0;
};

links.Timeline.ItemFloatingRange.prototype.getRight = function(timeline) {
    return this.end ? timeline.timeToScreen(this.end) : timeline.size.contentWidth;
};

links.Timeline.ItemFloatingRange.prototype.getWidth = function(timeline) {
    return this.getRight(timeline) - this.getLeft(timeline);
};

links.Timeline.ItemDot = function(data, options) {
    links.Timeline.Item.call(this, data, options);
};

links.Timeline.ItemDot.prototype = new links.Timeline.Item();

links.Timeline.ItemDot.prototype.reflow = function() {
    var dom = this.dom, dotHeight = dom.dot.offsetHeight, dotWidth = dom.dot.offsetWidth, contentHeight = dom.content.offsetHeight, resized = this.dotHeight != dotHeight || this.dotWidth != dotWidth || this.contentHeight != contentHeight;
    this.dotHeight = dotHeight;
    this.dotWidth = dotWidth;
    this.contentHeight = contentHeight;
    return resized;
};

links.Timeline.ItemDot.prototype.select = function() {
    var dom = this.dom;
    links.Timeline.addClassName(dom, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemDot.prototype.unselect = function() {
    var dom = this.dom;
    links.Timeline.removeClassName(dom, "timeline-event-selected ui-state-active");
};

links.Timeline.ItemDot.prototype.createDOM = function() {
    var divBox = document.createElement("DIV");
    divBox.style.position = "absolute";
    var divContent = document.createElement("DIV");
    divContent.className = "timeline-event-content";
    divBox.appendChild(divContent);
    var divDot = document.createElement("DIV");
    divDot.style.position = "absolute";
    divDot.style.width = "0px";
    divDot.style.height = "0px";
    divBox.appendChild(divDot);
    divBox.content = divContent;
    divBox.dot = divDot;
    this.dom = divBox;
    this.updateDOM();
    return divBox;
};

links.Timeline.ItemDot.prototype.showDOM = function(container) {
    var dom = this.dom;
    dom || (dom = this.createDOM());
    if (dom.parentNode != container) {
        dom.parentNode && this.hideDOM();
        container.appendChild(dom);
        this.rendered = true;
    }
};

links.Timeline.ItemDot.prototype.hideDOM = function() {
    var dom = this.dom;
    if (dom) {
        dom.parentNode && dom.parentNode.removeChild(dom);
        this.rendered = false;
    }
};

links.Timeline.ItemDot.prototype.updateDOM = function() {
    if (this.dom) {
        var divBox = this.dom;
        var divDot = divBox.dot;
        divBox.firstChild.innerHTML = this.content;
        divBox.className = "timeline-event-dot-container";
        divDot.className = "timeline-event timeline-event-dot ui-widget ui-state-default";
        if (this.isCluster) {
            links.Timeline.addClassName(divBox, "timeline-event-cluster ui-widget-header");
            links.Timeline.addClassName(divDot, "timeline-event-cluster ui-widget-header");
        }
        if (this.className) {
            links.Timeline.addClassName(divBox, this.className);
            links.Timeline.addClassName(divDot, this.className);
        }
    }
};

links.Timeline.ItemDot.prototype.updatePosition = function(timeline) {
    var dom = this.dom;
    if (dom) {
        var left = timeline.timeToScreen(this.start);
        dom.style.top = this.top + "px";
        dom.style.left = left - this.dotWidth / 2 + "px";
        dom.content.style.marginLeft = 1.5 * this.dotWidth + "px";
        dom.dot.style.top = (this.height - this.dotHeight) / 2 + "px";
    }
};

links.Timeline.ItemDot.prototype.isVisible = function(start, end) {
    if (this.cluster) return false;
    return this.start > start && end > this.start;
};

links.Timeline.ItemDot.prototype.setPosition = function(left) {
    var dom = this.dom;
    dom.style.left = left - this.dotWidth / 2 + "px";
    if (this.group) {
        this.top = this.group.top;
        dom.style.top = this.top + "px";
    }
};

links.Timeline.ItemDot.prototype.getLeft = function(timeline) {
    return timeline.timeToScreen(this.start);
};

links.Timeline.ItemDot.prototype.getRight = function(timeline) {
    return timeline.timeToScreen(this.start) + this.width;
};

links.Timeline.prototype.getItem = function(index) {
    if (index >= this.items.length) throw "Cannot get item, index out of range";
    var itemData, data = this.data;
    if (google && google.visualization && data instanceof google.visualization.DataTable) {
        var cols = links.Timeline.mapColumnIds(data);
        itemData = {};
        for (var col in cols) cols.hasOwnProperty(col) && (itemData[col] = this.data.getValue(index, cols[col]));
    } else {
        if (!links.Timeline.isArray(this.data)) throw "Unknown data type. DataTable or Array expected.";
        itemData = links.Timeline.clone(this.data[index]);
    }
    var item = this.items[index];
    itemData.start = new Date(item.start.valueOf());
    item.end && (itemData.end = new Date(item.end.valueOf()));
    itemData.content = item.content;
    item.group && (itemData.group = this.getGroupName(item.group));
    item.className && (itemData.className = item.className);
    "undefined" != typeof item.editable && (itemData.editable = item.editable);
    item.type && (itemData.type = item.type);
    return itemData;
};

links.Timeline.prototype.addItem = function(itemData, preventRender) {
    var itemsData = [ itemData ];
    this.addItems(itemsData, preventRender);
};

links.Timeline.prototype.addItems = function(itemsData, preventRender) {
    var timeline = this, items = this.items;
    itemsData.forEach(function(itemData) {
        var index = items.length;
        items.push(timeline.createItem(itemData));
        timeline.updateData(index, itemData);
    });
    this.options.cluster && this.clusterGenerator.updateData();
    preventRender || this.render({
        animate: false
    });
};

links.Timeline.prototype.createItem = function(itemData) {
    var type = itemData.type || (itemData.end ? "range" : this.options.style);
    var data = links.Timeline.clone(itemData);
    data.type = type;
    data.group = this.getGroup(itemData.group);
    var initialTop, options = this.options;
    initialTop = options.axisOnTop ? this.size.axis.height + options.eventMarginAxis + options.eventMargin / 2 : this.size.contentHeight - options.eventMarginAxis - options.eventMargin / 2;
    if (type in this.itemTypes) return new this.itemTypes[type](data, {
        top: initialTop
    });
    console.log('ERROR: Unknown event type "' + type + '"');
    return new links.Timeline.Item(data, {
        top: initialTop
    });
};

links.Timeline.prototype.changeItem = function(index, itemData, preventRender) {
    var oldItem = this.items[index];
    if (!oldItem) throw "Cannot change item, index out of range";
    var newItem = this.createItem({
        start: itemData.hasOwnProperty("start") ? itemData.start : oldItem.start,
        end: itemData.hasOwnProperty("end") ? itemData.end : oldItem.end,
        content: itemData.hasOwnProperty("content") ? itemData.content : oldItem.content,
        group: itemData.hasOwnProperty("group") ? itemData.group : this.getGroupName(oldItem.group),
        className: itemData.hasOwnProperty("className") ? itemData.className : oldItem.className,
        editable: itemData.hasOwnProperty("editable") ? itemData.editable : oldItem.editable,
        type: itemData.hasOwnProperty("type") ? itemData.type : oldItem.type
    });
    this.items[index] = newItem;
    this.renderQueue.hide.push(oldItem);
    this.renderQueue.show.push(newItem);
    this.updateData(index, itemData);
    this.options.cluster && this.clusterGenerator.updateData();
    if (!preventRender) {
        this.render({
            animate: false
        });
        this.selection && this.selection.index == index && newItem.select();
    }
};

links.Timeline.prototype.deleteGroups = function() {
    this.groups = [];
    this.groupIndexes = {};
};

links.Timeline.prototype.getGroup = function(groupName) {
    var groups = this.groups, groupIndexes = this.groupIndexes, groupObj = void 0;
    var groupIndex = groupIndexes[groupName];
    if (void 0 == groupIndex && void 0 != groupName) {
        groupObj = {
            content: groupName,
            labelTop: 0,
            lineTop: 0
        };
        groups.push(groupObj);
        true == this.options.groupsOrder ? groups = groups.sort(function(a, b) {
            if (a.content > b.content) return 1;
            if (a.content < b.content) return -1;
            return 0;
        }) : "function" == typeof this.options.groupsOrder && (groups = groups.sort(this.options.groupsOrder));
        for (var i = 0, iMax = groups.length; iMax > i; i++) groupIndexes[groups[i].content] = i;
    } else groupObj = groups[groupIndex];
    return groupObj;
};

links.Timeline.prototype.getGroupName = function(groupObj) {
    return groupObj ? groupObj.content : void 0;
};

links.Timeline.prototype.cancelChange = function() {
    this.applyChange = false;
};

links.Timeline.prototype.cancelDelete = function() {
    this.applyDelete = false;
};

links.Timeline.prototype.cancelAdd = function() {
    this.applyAdd = false;
};

links.Timeline.prototype.setSelection = function(selection) {
    if (void 0 != selection && selection.length > 0) {
        if (void 0 != selection[0].row) {
            var index = selection[0].row;
            if (this.items[index]) {
                var item = this.items[index];
                this.selectItem(index);
                var start = item.start;
                var end = item.end;
                var middle;
                middle = void 0 != end ? (end.valueOf() + start.valueOf()) / 2 : start.valueOf();
                var diff = this.end.valueOf() - this.start.valueOf(), newStart = new Date(middle - diff / 2), newEnd = new Date(middle + diff / 2);
                this.setVisibleChartRange(newStart, newEnd);
                return true;
            }
        }
    } else this.unselectItem();
    return false;
};

links.Timeline.prototype.getSelection = function() {
    var sel = [];
    this.selection && sel.push({
        row: this.selection.index
    });
    return sel;
};

links.Timeline.prototype.selectItem = function(index) {
    this.unselectItem();
    this.selection = void 0;
    if (void 0 != this.items[index]) {
        var item = this.items[index];
        item.dom;
        this.selection = {
            index: index
        };
        if (item && item.dom) {
            this.isEditable(item) && (item.dom.style.cursor = "move");
            item.select();
        }
        this.repaintDeleteButton();
        this.repaintDragAreas();
    }
};

links.Timeline.prototype.isSelected = function(index) {
    return this.selection && this.selection.index == index;
};

links.Timeline.prototype.unselectItem = function() {
    if (this.selection) {
        var item = this.items[this.selection.index];
        if (item && item.dom) {
            var domItem = item.dom;
            domItem.style.cursor = "";
            item.unselect();
        }
        this.selection = void 0;
        this.repaintDeleteButton();
        this.repaintDragAreas();
    }
};

links.Timeline.prototype.stackItems = function(animate) {
    void 0 == animate && (animate = false);
    var stack = this.stack;
    if (!stack) {
        stack = {};
        this.stack = stack;
    }
    stack.sortedItems = this.stackOrder(this.renderedItems);
    stack.finalItems = this.stackCalculateFinal(stack.sortedItems);
    if (animate || stack.timer) {
        var timeline = this;
        var step = function() {
            var arrived = timeline.stackMoveOneStep(stack.sortedItems, stack.finalItems);
            timeline.repaint();
            arrived ? delete stack.timer : stack.timer = setTimeout(step, 30);
        };
        stack.timer || (stack.timer = setTimeout(step, 30));
    } else this.stackMoveToFinal(stack.sortedItems, stack.finalItems);
};

links.Timeline.prototype.stackCancelAnimation = function() {
    if (this.stack && this.stack.timer) {
        clearTimeout(this.stack.timer);
        delete this.stack.timer;
    }
};

links.Timeline.prototype.getItemsByGroup = function(items) {
    var itemsByGroup = {};
    for (var i = 0; items.length > i; ++i) {
        var item = items[i];
        var group = "undefined";
        item.group && (group = item.group.content ? item.group.content : item.group);
        itemsByGroup[group] || (itemsByGroup[group] = []);
        itemsByGroup[group].push(item);
    }
    return itemsByGroup;
};

links.Timeline.prototype.stackOrder = function(items) {
    var sortedItems = items.concat([]);
    var f = this.options.customStackOrder && "function" == typeof this.options.customStackOrder ? this.options.customStackOrder : function(a, b) {
        if ((a instanceof links.Timeline.ItemRange || a instanceof links.Timeline.ItemFloatingRange) && !(b instanceof links.Timeline.ItemRange || b instanceof links.Timeline.ItemFloatingRange)) return -1;
        if (!(a instanceof links.Timeline.ItemRange || a instanceof links.Timeline.ItemFloatingRange) && (b instanceof links.Timeline.ItemRange || b instanceof links.Timeline.ItemFloatingRange)) return 1;
        return a.left - b.left;
    };
    sortedItems.sort(f);
    return sortedItems;
};

links.Timeline.prototype.stackCalculateFinal = function(items) {
    var groupedItems, groupFinalItems, size = this.size, options = this.options, axisOnTop = options.axisOnTop, eventMargin = options.eventMargin, eventMarginAxis = options.eventMarginAxis, groupBase = axisOnTop ? size.axis.height + eventMarginAxis + eventMargin / 2 : size.contentHeight - eventMarginAxis - eventMargin / 2, finalItems = [];
    groupedItems = this.getItemsByGroup(items);
    for (j = 0; this.groups.length > j; ++j) {
        var group = this.groups[j];
        if (!groupedItems[group.content]) {
            axisOnTop ? groupBase += options.groupMinHeight + eventMargin : groupBase -= options.groupMinHeight + eventMargin;
            continue;
        }
        groupFinalItems = this.finalItemsPosition(groupedItems[group.content], groupBase, group);
        groupFinalItems.forEach(function(item) {
            finalItems.push(item);
        });
        axisOnTop ? groupBase += group.itemsHeight + eventMargin : groupBase -= group.itemsHeight + eventMargin;
    }
    if (groupedItems["undefined"]) {
        groupFinalItems = this.finalItemsPosition(groupedItems["undefined"], groupBase);
        groupFinalItems.forEach(function(item) {
            finalItems.push(item);
        });
    }
    return finalItems;
};

links.Timeline.prototype.finalItemsPosition = function(items, groupBase, group) {
    var i, iMax, groupFinalItems, options = this.options, axisOnTop = options.axisOnTop, eventMargin = options.eventMargin;
    groupFinalItems = this.initialItemsPosition(items, groupBase);
    for (i = 0, iMax = groupFinalItems.length; iMax > i; i++) {
        var finalItem = groupFinalItems[i];
        var collidingItem = null;
        if (this.options.stackEvents) do {
            collidingItem = this.stackItemsCheckOverlap(groupFinalItems, i, 0, i - 1);
            if (null != collidingItem) {
                finalItem.top = axisOnTop ? collidingItem.top + collidingItem.height + eventMargin : collidingItem.top - finalItem.height - eventMargin;
                finalItem.bottom = finalItem.top + finalItem.height;
            }
        } while (collidingItem);
        group && (group.itemsHeight = axisOnTop ? group.itemsHeight ? Math.max(group.itemsHeight, finalItem.bottom - groupBase) : finalItem.height + eventMargin : group.itemsHeight ? Math.max(group.itemsHeight, groupBase - finalItem.top) : finalItem.height + eventMargin);
    }
    return groupFinalItems;
};

links.Timeline.prototype.initialItemsPosition = function(items, groupBase) {
    var options = this.options, axisOnTop = options.axisOnTop, finalItems = [];
    for (var i = 0, iMax = items.length; iMax > i; ++i) {
        var top, bottom, item = items[i], height = item.height, width = item.getWidth(this), right = item.getRight(this), left = right - width;
        top = axisOnTop ? groupBase : groupBase - height;
        bottom = top + height;
        finalItems.push({
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            height: height,
            item: item
        });
    }
    return finalItems;
};

links.Timeline.prototype.stackMoveOneStep = function(currentItems, finalItems) {
    var arrived = true;
    for (var i = 0, iMax = finalItems.length; iMax > i; i++) {
        var finalItem = finalItems[i], item = finalItem.item;
        var topNow = parseInt(item.top);
        var topFinal = parseInt(finalItem.top);
        var diff = topFinal - topNow;
        if (diff) {
            var step = topFinal == topNow ? 0 : topFinal > topNow ? 1 : -1;
            Math.abs(diff) > 4 && (step = diff / 4);
            var topNew = parseInt(topNow + step);
            topNew != topFinal && (arrived = false);
            item.top = topNew;
            item.bottom = item.top + item.height;
        } else {
            item.top = finalItem.top;
            item.bottom = finalItem.bottom;
        }
        item.left = finalItem.left;
        item.right = finalItem.right;
    }
    return arrived;
};

links.Timeline.prototype.stackMoveToFinal = function(currentItems, finalItems) {
    for (var i = 0, iMax = finalItems.length; iMax > i; i++) {
        var finalItem = finalItems[i], current = finalItem.item;
        current.left = finalItem.left;
        current.top = finalItem.top;
        current.right = finalItem.right;
        current.bottom = finalItem.bottom;
    }
};

links.Timeline.prototype.stackItemsCheckOverlap = function(items, itemIndex, itemStart, itemEnd) {
    var eventMargin = this.options.eventMargin, collision = this.collision;
    var item1 = items[itemIndex];
    for (var i = itemEnd; i >= itemStart; i--) {
        var item2 = items[i];
        if (collision(item1, item2, eventMargin) && i != itemIndex) return item2;
    }
    return void 0;
};

links.Timeline.prototype.collision = function(item1, item2, margin) {
    void 0 == margin && (margin = 0);
    return item1.left - margin < item2.right && item1.right + margin > item2.left && item1.top - margin < item2.bottom && item1.bottom + margin > item2.top;
};

links.Timeline.prototype.trigger = function(event) {
    var properties = null;
    switch (event) {
      case "rangechange":
      case "rangechanged":
        properties = {
            start: new Date(this.start.valueOf()),
            end: new Date(this.end.valueOf())
        };
        break;

      case "timechange":
      case "timechanged":
        properties = {
            time: new Date(this.customTime.valueOf())
        };
    }
    links.events.trigger(this, event, properties);
    google && google.visualization && google.visualization.events.trigger(this, event, properties);
};

links.Timeline.prototype.clusterItems = function() {
    if (!this.options.cluster) return;
    var clusters = this.clusterGenerator.getClusters(this.conversion.factor);
    if (this.clusters != clusters) {
        var queue = this.renderQueue;
        this.clusters && this.clusters.forEach(function(cluster) {
            queue.hide.push(cluster);
            cluster.items.forEach(function(item) {
                item.cluster = void 0;
            });
        });
        clusters.forEach(function(cluster) {
            cluster.items.forEach(function(item) {
                item.cluster = cluster;
            });
        });
        this.clusters = clusters;
    }
};

links.Timeline.prototype.filterItems = function() {
    function filter(arr) {
        arr.forEach(function(item) {
            var rendered = item.rendered;
            var visible = item.isVisible(start, end);
            if (rendered != visible) {
                rendered && queue.hide.push(item);
                visible && -1 == queue.show.indexOf(item) && queue.show.push(item);
            }
        });
    }
    var queue = this.renderQueue, window = this.end - this.start, start = new Date(this.start.valueOf() - window), end = new Date(this.end.valueOf() + window);
    filter(this.items);
    this.clusters && filter(this.clusters);
};

links.Timeline.ClusterGenerator = function(timeline) {
    this.timeline = timeline;
    this.clear();
};

links.Timeline.ClusterGenerator.prototype.clear = function() {
    this.items = [];
    this.groups = {};
    this.clearCache();
};

links.Timeline.ClusterGenerator.prototype.clearCache = function() {
    this.cache = {};
    this.cacheLevel = -1;
    this.cache[this.cacheLevel] = [];
};

links.Timeline.ClusterGenerator.prototype.setData = function(items, options) {
    this.items = items || [];
    this.dataChanged = true;
    this.applyOnChangedLevel = true;
    options && options.applyOnChangedLevel && (this.applyOnChangedLevel = options.applyOnChangedLevel);
};

links.Timeline.ClusterGenerator.prototype.updateData = function() {
    this.dataChanged = true;
    this.applyOnChangedLevel = false;
};

links.Timeline.ClusterGenerator.prototype.filterData = function() {
    var items = this.items || [];
    var groups = {};
    this.groups = groups;
    items.forEach(function(item) {
        var groupName = item.group ? item.group.content : "";
        var group = groups[groupName];
        if (!group) {
            group = [];
            groups[groupName] = group;
        }
        group.push(item);
        item.start && (item.center = item.end ? (item.start.valueOf() + item.end.valueOf()) / 2 : item.start.valueOf());
    });
    for (var groupName in groups) groups.hasOwnProperty(groupName) && groups[groupName].sort(function(a, b) {
        return a.center - b.center;
    });
    this.dataChanged = false;
};

links.Timeline.ClusterGenerator.prototype.getClusters = function(scale) {
    var level = -1, granularity = 2, timeWindow = 0, maxItems = 5;
    if (scale > 0) {
        level = Math.round(Math.log(100 / scale) / Math.log(granularity));
        timeWindow = Math.pow(granularity, level);
    }
    if (this.dataChanged) {
        var levelChanged = level != this.cacheLevel;
        var applyDataNow = this.applyOnChangedLevel ? levelChanged : true;
        if (applyDataNow) {
            this.clearCache();
            this.filterData();
        }
    }
    this.cacheLevel = level;
    var clusters = this.cache[level];
    if (!clusters) {
        clusters = [];
        for (var groupName in this.groups) if (this.groups.hasOwnProperty(groupName)) {
            var items = this.groups[groupName];
            var iMax = items.length;
            var i = 0;
            while (iMax > i) {
                var item = items[i];
                var neighbors = 1;
                var j = i - 1;
                while (j >= 0 && timeWindow / 2 > item.center - items[j].center) {
                    items[j].cluster || neighbors++;
                    j--;
                }
                var k = i + 1;
                while (items.length > k && timeWindow / 2 > items[k].center - item.center) {
                    neighbors++;
                    k++;
                }
                var l = clusters.length - 1;
                while (l >= 0 && timeWindow / 2 > item.center - clusters[l].center) {
                    item.group == clusters[l].group && neighbors++;
                    l--;
                }
                if (neighbors > maxItems) {
                    var num = neighbors - maxItems + 1;
                    var clusterItems = [];
                    var avg = void 0;
                    var min = void 0;
                    var max = void 0;
                    var containsRanges = false;
                    var count = 0;
                    var m = i;
                    while (num > clusterItems.length && items.length > m) {
                        var p = items[m];
                        var start = p.start.valueOf();
                        var end = p.end ? p.end.valueOf() : p.start.valueOf();
                        clusterItems.push(p);
                        avg = count ? count / (count + 1) * avg + 1 / (count + 1) * p.center : p.center;
                        min = void 0 != min ? Math.min(min, start) : start;
                        max = void 0 != max ? Math.max(max, end) : end;
                        containsRanges = containsRanges || p instanceof links.Timeline.ItemRange || p instanceof links.Timeline.ItemFloatingRange;
                        count++;
                        m++;
                    }
                    var cluster;
                    var title = "Cluster containing " + count + " events. Zoom in to see the individual events.";
                    var content = '<div title="' + title + '">' + count + " events</div>";
                    var group = item.group ? item.group.content : void 0;
                    cluster = containsRanges ? this.timeline.createItem({
                        start: new Date(min),
                        end: new Date(max),
                        content: content,
                        group: group
                    }) : this.timeline.createItem({
                        start: new Date(avg),
                        content: content,
                        group: group
                    });
                    cluster.isCluster = true;
                    cluster.items = clusterItems;
                    cluster.items.forEach(function(item) {
                        item.cluster = cluster;
                    });
                    clusters.push(cluster);
                    i += num;
                } else {
                    delete item.cluster;
                    i += 1;
                }
            }
        }
        this.cache[level] = clusters;
    }
    return clusters;
};

links.events = links.events || {
    listeners: [],
    indexOf: function(object) {
        var listeners = this.listeners;
        for (var i = 0, iMax = this.listeners.length; iMax > i; i++) {
            var listener = listeners[i];
            if (listener && listener.object == object) return i;
        }
        return -1;
    },
    addListener: function(object, event, callback) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (!listener) {
            listener = {
                object: object,
                events: {}
            };
            this.listeners.push(listener);
        }
        var callbacks = listener.events[event];
        if (!callbacks) {
            callbacks = [];
            listener.events[event] = callbacks;
        }
        -1 == callbacks.indexOf(callback) && callbacks.push(callback);
    },
    removeListener: function(object, event, callback) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (listener) {
            var callbacks = listener.events[event];
            if (callbacks) {
                var index = callbacks.indexOf(callback);
                -1 != index && callbacks.splice(index, 1);
                0 == callbacks.length && delete listener.events[event];
            }
            var count = 0;
            var events = listener.events;
            for (var e in events) events.hasOwnProperty(e) && count++;
            0 == count && delete this.listeners[index];
        }
    },
    removeAllListeners: function() {
        this.listeners = [];
    },
    trigger: function(object, event, properties) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (listener) {
            var callbacks = listener.events[event];
            if (callbacks) for (var i = 0, iMax = callbacks.length; iMax > i; i++) callbacks[i](properties);
        }
    }
};

links.Timeline.StepDate = function(start, end, minimumStep) {
    this.current = new Date();
    this._start = new Date();
    this._end = new Date();
    this.autoScale = true;
    this.scale = links.Timeline.StepDate.SCALE.DAY;
    this.step = 1;
    this.setRange(start, end, minimumStep);
};

links.Timeline.StepDate.SCALE = {
    MILLISECOND: 1,
    SECOND: 2,
    MINUTE: 3,
    HOUR: 4,
    DAY: 5,
    WEEKDAY: 6,
    MONTH: 7,
    YEAR: 8
};

links.Timeline.StepDate.prototype.setRange = function(start, end, minimumStep) {
    if (!(start instanceof Date && end instanceof Date)) return;
    this._start = void 0 != start ? new Date(start.valueOf()) : new Date();
    this._end = void 0 != end ? new Date(end.valueOf()) : new Date();
    this.autoScale && this.setMinimumStep(minimumStep);
};

links.Timeline.StepDate.prototype.start = function() {
    this.current = new Date(this._start.valueOf());
    this.roundToMinor();
};

links.Timeline.StepDate.prototype.roundToMinor = function() {
    switch (this.scale) {
      case links.Timeline.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.step * Math.floor(this.current.getFullYear() / this.step));
        this.current.setMonth(0);

      case links.Timeline.StepDate.SCALE.MONTH:
        this.current.setDate(1);

      case links.Timeline.StepDate.SCALE.DAY:
      case links.Timeline.StepDate.SCALE.WEEKDAY:
        this.current.setHours(0);

      case links.Timeline.StepDate.SCALE.HOUR:
        this.current.setMinutes(0);

      case links.Timeline.StepDate.SCALE.MINUTE:
        this.current.setSeconds(0);

      case links.Timeline.StepDate.SCALE.SECOND:
        this.current.setMilliseconds(0);
    }
    if (1 != this.step) switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        this.current.setMilliseconds(this.current.getMilliseconds() - this.current.getMilliseconds() % this.step);
        break;

      case links.Timeline.StepDate.SCALE.SECOND:
        this.current.setSeconds(this.current.getSeconds() - this.current.getSeconds() % this.step);
        break;

      case links.Timeline.StepDate.SCALE.MINUTE:
        this.current.setMinutes(this.current.getMinutes() - this.current.getMinutes() % this.step);
        break;

      case links.Timeline.StepDate.SCALE.HOUR:
        this.current.setHours(this.current.getHours() - this.current.getHours() % this.step);
        break;

      case links.Timeline.StepDate.SCALE.WEEKDAY:
      case links.Timeline.StepDate.SCALE.DAY:
        this.current.setDate(this.current.getDate() - 1 - (this.current.getDate() - 1) % this.step + 1);
        break;

      case links.Timeline.StepDate.SCALE.MONTH:
        this.current.setMonth(this.current.getMonth() - this.current.getMonth() % this.step);
        break;

      case links.Timeline.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.current.getFullYear() - this.current.getFullYear() % this.step);
        break;

      default:    }
};

links.Timeline.StepDate.prototype.end = function() {
    return this.current.valueOf() > this._end.valueOf();
};

links.Timeline.StepDate.prototype.next = function() {
    var prev = this.current.valueOf();
    if (6 > this.current.getMonth()) switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        this.current = new Date(this.current.valueOf() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.SECOND:
        this.current = new Date(this.current.valueOf() + 1e3 * this.step);
        break;

      case links.Timeline.StepDate.SCALE.MINUTE:
        this.current = new Date(this.current.valueOf() + 60 * 1e3 * this.step);
        break;

      case links.Timeline.StepDate.SCALE.HOUR:
        this.current = new Date(this.current.valueOf() + 60 * 60 * 1e3 * this.step);
        var h = this.current.getHours();
        this.current.setHours(h - h % this.step);
        break;

      case links.Timeline.StepDate.SCALE.WEEKDAY:
      case links.Timeline.StepDate.SCALE.DAY:
        this.current.setDate(this.current.getDate() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.MONTH:
        this.current.setMonth(this.current.getMonth() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.current.getFullYear() + this.step);
        break;

      default:    } else switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        this.current = new Date(this.current.valueOf() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.SECOND:
        this.current.setSeconds(this.current.getSeconds() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.MINUTE:
        this.current.setMinutes(this.current.getMinutes() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.HOUR:
        this.current.setHours(this.current.getHours() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.WEEKDAY:
      case links.Timeline.StepDate.SCALE.DAY:
        this.current.setDate(this.current.getDate() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.MONTH:
        this.current.setMonth(this.current.getMonth() + this.step);
        break;

      case links.Timeline.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.current.getFullYear() + this.step);
        break;

      default:    }
    if (1 != this.step) switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        this.current.getMilliseconds() < this.step && this.current.setMilliseconds(0);
        break;

      case links.Timeline.StepDate.SCALE.SECOND:
        this.current.getSeconds() < this.step && this.current.setSeconds(0);
        break;

      case links.Timeline.StepDate.SCALE.MINUTE:
        this.current.getMinutes() < this.step && this.current.setMinutes(0);
        break;

      case links.Timeline.StepDate.SCALE.HOUR:
        this.current.getHours() < this.step && this.current.setHours(0);
        break;

      case links.Timeline.StepDate.SCALE.WEEKDAY:
      case links.Timeline.StepDate.SCALE.DAY:
        this.current.getDate() < this.step + 1 && this.current.setDate(1);
        break;

      case links.Timeline.StepDate.SCALE.MONTH:
        this.current.getMonth() < this.step && this.current.setMonth(0);
        break;

      case links.Timeline.StepDate.SCALE.YEAR:
        break;

      default:    }
    this.current.valueOf() == prev && (this.current = new Date(this._end.valueOf()));
};

links.Timeline.StepDate.prototype.getCurrent = function() {
    return this.current;
};

links.Timeline.StepDate.prototype.setScale = function(newScale, newStep) {
    this.scale = newScale;
    newStep > 0 && (this.step = newStep);
    this.autoScale = false;
};

links.Timeline.StepDate.prototype.setAutoScale = function(enable) {
    this.autoScale = enable;
};

links.Timeline.StepDate.prototype.setMinimumStep = function(minimumStep) {
    if (void 0 == minimumStep) return;
    var stepYear = 31104e6;
    var stepMonth = 2592e6;
    var stepDay = 864e5;
    var stepHour = 36e5;
    var stepMinute = 6e4;
    var stepSecond = 1e3;
    var stepMillisecond = 1;
    if (1e3 * stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 1e3;
    }
    if (500 * stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 500;
    }
    if (100 * stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 100;
    }
    if (50 * stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 50;
    }
    if (10 * stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 10;
    }
    if (5 * stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 5;
    }
    if (stepYear > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.YEAR;
        this.step = 1;
    }
    if (3 * stepMonth > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MONTH;
        this.step = 3;
    }
    if (stepMonth > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MONTH;
        this.step = 1;
    }
    if (5 * stepDay > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.DAY;
        this.step = 5;
    }
    if (2 * stepDay > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.DAY;
        this.step = 2;
    }
    if (stepDay > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.DAY;
        this.step = 1;
    }
    if (stepDay / 2 > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.WEEKDAY;
        this.step = 1;
    }
    if (4 * stepHour > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.HOUR;
        this.step = 4;
    }
    if (stepHour > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.HOUR;
        this.step = 1;
    }
    if (15 * stepMinute > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MINUTE;
        this.step = 15;
    }
    if (10 * stepMinute > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MINUTE;
        this.step = 10;
    }
    if (5 * stepMinute > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MINUTE;
        this.step = 5;
    }
    if (stepMinute > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MINUTE;
        this.step = 1;
    }
    if (15 * stepSecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.SECOND;
        this.step = 15;
    }
    if (10 * stepSecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.SECOND;
        this.step = 10;
    }
    if (5 * stepSecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.SECOND;
        this.step = 5;
    }
    if (stepSecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.SECOND;
        this.step = 1;
    }
    if (200 * stepMillisecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MILLISECOND;
        this.step = 200;
    }
    if (100 * stepMillisecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MILLISECOND;
        this.step = 100;
    }
    if (50 * stepMillisecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MILLISECOND;
        this.step = 50;
    }
    if (10 * stepMillisecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MILLISECOND;
        this.step = 10;
    }
    if (5 * stepMillisecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MILLISECOND;
        this.step = 5;
    }
    if (stepMillisecond > minimumStep) {
        this.scale = links.Timeline.StepDate.SCALE.MILLISECOND;
        this.step = 1;
    }
};

links.Timeline.StepDate.prototype.snap = function(date) {
    if (this.scale == links.Timeline.StepDate.SCALE.YEAR) {
        var year = date.getFullYear() + Math.round(date.getMonth() / 12);
        date.setFullYear(Math.round(year / this.step) * this.step);
        date.setMonth(0);
        date.setDate(0);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Timeline.StepDate.SCALE.MONTH) {
        if (date.getDate() > 15) {
            date.setDate(1);
            date.setMonth(date.getMonth() + 1);
        } else date.setDate(1);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Timeline.StepDate.SCALE.DAY || this.scale == links.Timeline.StepDate.SCALE.WEEKDAY) {
        switch (this.step) {
          case 5:
          case 2:
            date.setHours(24 * Math.round(date.getHours() / 24));
            break;

          default:
            date.setHours(12 * Math.round(date.getHours() / 12));
        }
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Timeline.StepDate.SCALE.HOUR) {
        switch (this.step) {
          case 4:
            date.setMinutes(60 * Math.round(date.getMinutes() / 60));
            break;

          default:
            date.setMinutes(30 * Math.round(date.getMinutes() / 30));
        }
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Timeline.StepDate.SCALE.MINUTE) {
        switch (this.step) {
          case 15:
          case 10:
            date.setMinutes(5 * Math.round(date.getMinutes() / 5));
            date.setSeconds(0);
            break;

          case 5:
            date.setSeconds(60 * Math.round(date.getSeconds() / 60));
            break;

          default:
            date.setSeconds(30 * Math.round(date.getSeconds() / 30));
        }
        date.setMilliseconds(0);
    } else if (this.scale == links.Timeline.StepDate.SCALE.SECOND) switch (this.step) {
      case 15:
      case 10:
        date.setSeconds(5 * Math.round(date.getSeconds() / 5));
        date.setMilliseconds(0);
        break;

      case 5:
        date.setMilliseconds(1e3 * Math.round(date.getMilliseconds() / 1e3));
        break;

      default:
        date.setMilliseconds(500 * Math.round(date.getMilliseconds() / 500));
    } else if (this.scale == links.Timeline.StepDate.SCALE.MILLISECOND) {
        var step = this.step > 5 ? this.step / 2 : 1;
        date.setMilliseconds(Math.round(date.getMilliseconds() / step) * step);
    }
};

links.Timeline.StepDate.prototype.isMajor = function() {
    switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        return 0 == this.current.getMilliseconds();

      case links.Timeline.StepDate.SCALE.SECOND:
        return 0 == this.current.getSeconds();

      case links.Timeline.StepDate.SCALE.MINUTE:
        return 0 == this.current.getHours() && 0 == this.current.getMinutes();

      case links.Timeline.StepDate.SCALE.HOUR:
        return 0 == this.current.getHours();

      case links.Timeline.StepDate.SCALE.WEEKDAY:
      case links.Timeline.StepDate.SCALE.DAY:
        return 1 == this.current.getDate();

      case links.Timeline.StepDate.SCALE.MONTH:
        return 0 == this.current.getMonth();

      case links.Timeline.StepDate.SCALE.YEAR:
        return false;

      default:
        return false;
    }
};

links.Timeline.StepDate.prototype.getLabelMinor = function(options, date) {
    void 0 == date && (date = this.current);
    switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        return String(date.getMilliseconds());

      case links.Timeline.StepDate.SCALE.SECOND:
        return String(date.getSeconds());

      case links.Timeline.StepDate.SCALE.MINUTE:
        return this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2);

      case links.Timeline.StepDate.SCALE.HOUR:
        return this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2);

      case links.Timeline.StepDate.SCALE.WEEKDAY:
        return options.DAYS_SHORT[date.getDay()] + " " + date.getDate();

      case links.Timeline.StepDate.SCALE.DAY:
        return String(date.getDate());

      case links.Timeline.StepDate.SCALE.MONTH:
        return options.MONTHS_SHORT[date.getMonth()];

      case links.Timeline.StepDate.SCALE.YEAR:
        return String(date.getFullYear());

      default:
        return "";
    }
};

links.Timeline.StepDate.prototype.getLabelMajor = function(options, date) {
    void 0 == date && (date = this.current);
    switch (this.scale) {
      case links.Timeline.StepDate.SCALE.MILLISECOND:
        return this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2) + ":" + this.addZeros(date.getSeconds(), 2);

      case links.Timeline.StepDate.SCALE.SECOND:
        return date.getDate() + " " + options.MONTHS[date.getMonth()] + " " + this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2);

      case links.Timeline.StepDate.SCALE.MINUTE:
        return options.DAYS[date.getDay()] + " " + date.getDate() + " " + options.MONTHS[date.getMonth()] + " " + date.getFullYear();

      case links.Timeline.StepDate.SCALE.HOUR:
        return options.DAYS[date.getDay()] + " " + date.getDate() + " " + options.MONTHS[date.getMonth()] + " " + date.getFullYear();

      case links.Timeline.StepDate.SCALE.WEEKDAY:
      case links.Timeline.StepDate.SCALE.DAY:
        return options.MONTHS[date.getMonth()] + " " + date.getFullYear();

      case links.Timeline.StepDate.SCALE.MONTH:
        return String(date.getFullYear());

      default:
        return "";
    }
};

links.Timeline.StepDate.prototype.addZeros = function(value, len) {
    var str = "" + value;
    while (len > str.length) str = "0" + str;
    return str;
};

links.imageloader = function() {
    function isLoaded(url) {
        if (true == urls[url]) return true;
        var image = new Image();
        image.src = url;
        if (image.complete) return true;
        return false;
    }
    function isLoading(url) {
        return void 0 != callbacks[url];
    }
    function load(url, callback, sendCallbackWhenAlreadyLoaded) {
        void 0 == sendCallbackWhenAlreadyLoaded && (sendCallbackWhenAlreadyLoaded = true);
        if (isLoaded(url)) {
            sendCallbackWhenAlreadyLoaded && callback(url);
            return;
        }
        if (isLoading(url) && !sendCallbackWhenAlreadyLoaded) return;
        var c = callbacks[url];
        if (!c) {
            var image = new Image();
            image.src = url;
            c = [];
            callbacks[url] = c;
            image.onload = function() {
                urls[url] = true;
                delete callbacks[url];
                for (var i = 0; c.length > i; i++) c[i](url);
            };
        }
        -1 == c.indexOf(callback) && c.push(callback);
    }
    function loadAll(urls, callback, sendCallbackWhenAlreadyLoaded) {
        var urlsLeft = [];
        urls.forEach(function(url) {
            isLoaded(url) || urlsLeft.push(url);
        });
        if (urlsLeft.length) {
            var countLeft = urlsLeft.length;
            urlsLeft.forEach(function(url) {
                load(url, function() {
                    countLeft--;
                    0 == countLeft && callback();
                }, sendCallbackWhenAlreadyLoaded);
            });
        } else sendCallbackWhenAlreadyLoaded && callback();
    }
    function filterImageUrls(elem, urls) {
        var child = elem.firstChild;
        while (child) {
            if ("IMG" == child.tagName) {
                var url = child.src;
                -1 == urls.indexOf(url) && urls.push(url);
            }
            filterImageUrls(child, urls);
            child = child.nextSibling;
        }
    }
    var urls = {};
    var callbacks = {};
    return {
        isLoaded: isLoaded,
        isLoading: isLoading,
        load: load,
        loadAll: loadAll,
        filterImageUrls: filterImageUrls
    };
}();

links.Timeline.addEventListener = function(element, action, listener, useCapture) {
    if (element.addEventListener) {
        void 0 === useCapture && (useCapture = false);
        "mousewheel" === action && navigator.userAgent.indexOf("Firefox") >= 0 && (action = "DOMMouseScroll");
        element.addEventListener(action, listener, useCapture);
    } else element.attachEvent("on" + action, listener);
};

links.Timeline.removeEventListener = function(element, action, listener, useCapture) {
    if (element.removeEventListener) {
        void 0 === useCapture && (useCapture = false);
        "mousewheel" === action && navigator.userAgent.indexOf("Firefox") >= 0 && (action = "DOMMouseScroll");
        element.removeEventListener(action, listener, useCapture);
    } else element.detachEvent("on" + action, listener);
};

links.Timeline.getTarget = function(event) {
    event || (event = window.event);
    var target;
    event.target ? target = event.target : event.srcElement && (target = event.srcElement);
    void 0 != target.nodeType && 3 == target.nodeType && (target = target.parentNode);
    return target;
};

links.Timeline.stopPropagation = function(event) {
    event || (event = window.event);
    event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true;
};

links.Timeline.preventDefault = function(event) {
    event || (event = window.event);
    event.preventDefault ? event.preventDefault() : event.returnValue = false;
};

links.Timeline.getAbsoluteLeft = function(elem) {
    var doc = document.documentElement;
    var body = document.body;
    var left = elem.offsetLeft;
    var e = elem.offsetParent;
    while (null != e && e != body && e != doc) {
        left += e.offsetLeft;
        left -= e.scrollLeft;
        e = e.offsetParent;
    }
    return left;
};

links.Timeline.getAbsoluteTop = function(elem) {
    var doc = document.documentElement;
    var body = document.body;
    var top = elem.offsetTop;
    var e = elem.offsetParent;
    while (null != e && e != body && e != doc) {
        top += e.offsetTop;
        top -= e.scrollTop;
        e = e.offsetParent;
    }
    return top;
};

links.Timeline.getPageY = function(event) {
    "targetTouches" in event && event.targetTouches.length && (event = event.targetTouches[0]);
    if ("pageY" in event) return event.pageY;
    var clientY = event.clientY;
    var doc = document.documentElement;
    var body = document.body;
    return clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
};

links.Timeline.getPageX = function(event) {
    "targetTouches" in event && event.targetTouches.length && (event = event.targetTouches[0]);
    if ("pageX" in event) return event.pageX;
    var clientX = event.clientX;
    var doc = document.documentElement;
    var body = document.body;
    return clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
};

links.Timeline.addClassName = function(elem, className) {
    var classes = elem.className.split(" ");
    var classesToAdd = className.split(" ");
    var added = false;
    for (var i = 0; classesToAdd.length > i; i++) if (-1 == classes.indexOf(classesToAdd[i])) {
        classes.push(classesToAdd[i]);
        added = true;
    }
    added && (elem.className = classes.join(" "));
};

links.Timeline.removeClassName = function(elem, className) {
    var classes = elem.className.split(" ");
    var classesToRemove = className.split(" ");
    var removed = false;
    for (var i = 0; classesToRemove.length > i; i++) {
        var index = classes.indexOf(classesToRemove[i]);
        if (-1 != index) {
            classes.splice(index, 1);
            removed = true;
        }
    }
    removed && (elem.className = classes.join(" "));
};

links.Timeline.isArray = function(obj) {
    if (obj instanceof Array) return true;
    return "[object Array]" === Object.prototype.toString.call(obj);
};

links.Timeline.clone = function(object) {
    var clone = {};
    for (var prop in object) object.hasOwnProperty(prop) && (clone[prop] = object[prop]);
    return clone;
};

links.Timeline.parseJSONDate = function(date) {
    if (void 0 == date) return void 0;
    if (date instanceof Date) return date;
    var m = date.match(/\/Date\((-?\d+)([-\+]?\d{2})?(\d{2})?\)\//i);
    if (m) {
        var offset = m[2] ? 36e5 * m[2] + 6e4 * m[3] * (m[2] / Math.abs(m[2])) : 0;
        return new Date(1 * m[1] + offset);
    }
    return Date.parse(date);
};