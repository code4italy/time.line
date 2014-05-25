"undefined" == typeof links && (links = {});

"undefined" == typeof google && (google = void 0);

links.Graph = function(container) {
    this.containerElement = container;
    this.width = "100%";
    this.height = "300px";
    this.start = null;
    this.end = null;
    this.autoDataStep = true;
    this.moveable = true;
    this.zoomable = true;
    this.showTooltip = true;
    this.redrawWhileMoving = true;
    this.legend = void 0;
    this.line = {};
    this.lines = [];
    this.defaultColors = [ "#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#0099C6", "#DD4477", "#66AA00", "#B82E2E", "#316395", "#994499", "#22AA99", "#AAAA11", "#6633CC", "#E67300", "#8B0707" ];
    this.axisMargin = 800;
    this.mainPadding = 8;
    this.data = [];
    this._create();
};

links.Graph.prototype.draw = function(data, options) {
    this._readData(data);
    if (void 0 != options) {
        void 0 != options.width && (this.width = options.width);
        void 0 != options.height && (this.height = options.height);
        void 0 != options.start && (this.start = options.start);
        void 0 != options.end && (this.end = options.end);
        void 0 != options.min && (this.min = options.min);
        void 0 != options.max && (this.max = options.max);
        void 0 != options.zoomMin && (this.zoomMin = options.zoomMin);
        void 0 != options.zoomMax && (this.zoomMax = options.zoomMax);
        void 0 != options.scale && (this.scale = options.scale);
        void 0 != options.step && (this.step = options.step);
        void 0 != options.autoDataStep && (this.autoDataStep = options.autoDataStep);
        void 0 != options.moveable && (this.moveable = options.moveable);
        void 0 != options.zoomable && (this.zoomable = options.zoomable);
        void 0 != options.line && (this.line = options.line);
        void 0 != options.lines && (this.lines = options.lines);
        void 0 != options.vStart && (this.vStart = options.vStart);
        void 0 != options.vEnd && (this.vEnd = options.vEnd);
        void 0 != options.vMin && (this.vMinFixed = options.vMin);
        void 0 != options.vMax && (this.vMaxFixed = options.vMax);
        void 0 != options.vStep && (this.vStepSize = options.vStep);
        void 0 != options.vPrettyStep && (this.vPrettyStep = options.vPrettyStep);
        void 0 != options.vAreas && (this.vAreas = options.vAreas);
        void 0 != options.legend && (this.legend = options.legend);
        if (void 0 != options.tooltip) {
            this.showTooltip = false != options.tooltip;
            "function" == typeof options.tooltip && (this.tooltipFormatter = options.tooltip);
        }
        if (void 0 != options.intervalMin) {
            this.zoomMin = options.intervalMin;
            console.log("WARNING: Option intervalMin is deprecated. Use zoomMin instead");
        }
        if (void 0 != options.intervalMax) {
            this.zoomMax = options.intervalMax;
            console.log("WARNING: Option intervalMax is deprecated. Use zoomMax instead");
        }
    }
    var redrawNow = false;
    this.setSize(this.width, this.height);
    this.setVisibleChartRange(this.start, this.end, redrawNow);
    this.scale && this.step && this.hStep.setScale(this.scale, this.step);
    this.redraw();
    this.trigger("ready");
};

links.Graph.prototype.trigger = function(event, params) {
    links.events.trigger(this, event, params);
    google && google.visualization && google.visualization.events && google.visualization.events.trigger(this, event, params);
};

links.Graph.prototype._readData = function(data) {
    if (google && google.visualization && google.visualization.DataTable && data instanceof google.visualization.DataTable) {
        this.data = [];
        for (var col = 1, cols = data.getNumberOfColumns(); cols > col; col++) {
            var dataset = [];
            for (var row = 0, rows = data.getNumberOfRows(); rows > row; row++) dataset.push({
                date: data.getValue(row, 0),
                value: data.getValue(row, col)
            });
            var graph = {
                label: data.getColumnLabel(col),
                type: void 0,
                dataRange: void 0,
                rowRange: void 0,
                visibleRowRange: void 0,
                data: dataset
            };
            this.data.push(graph);
        }
    } else this.data = data || [];
    for (var i = 0, len = this.data.length; len > i; i++) {
        var graph = this.data[i];
        var fields;
        fields = "area" == graph.type ? [ "start", "end" ] : [ "date" ];
        graph.dataRange = this._getDataRange(graph.data);
        graph.rowRange = this._getRowRange(graph.data, fields);
    }
};

links.Graph.StepDate = function(start, end, minimumStep) {
    this.current = new Date();
    this._start = new Date();
    this._end = new Date();
    this.autoScale = true;
    this.scale = links.Graph.StepDate.SCALE.DAY;
    this.step = 1;
    this.setRange(start, end, minimumStep);
};

links.Graph.StepDate.SCALE = {
    MILLISECOND: 1,
    SECOND: 2,
    MINUTE: 3,
    HOUR: 4,
    DAY: 5,
    WEEKDAY: 6,
    MONTH: 7,
    YEAR: 8
};

links.Graph.StepDate.prototype.setRange = function(start, end, minimumStep) {
    if (!(start instanceof Date && end instanceof Date)) return;
    this._start = void 0 != start ? new Date(start.valueOf()) : new Date();
    this._end = void 0 != end ? new Date(end.valueOf()) : new Date();
    this.autoScale && this.setMinimumStep(minimumStep);
};

links.Graph.StepDate.prototype.start = function() {
    this.current = new Date(this._start.valueOf());
    this.roundToMinor();
};

links.Graph.StepDate.prototype.roundToMinor = function() {
    switch (this.scale) {
      case links.Graph.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.step * Math.floor(this.current.getFullYear() / this.step));
        this.current.setMonth(0);

      case links.Graph.StepDate.SCALE.MONTH:
        this.current.setDate(1);

      case links.Graph.StepDate.SCALE.DAY:
      case links.Graph.StepDate.SCALE.WEEKDAY:
        this.current.setHours(0);

      case links.Graph.StepDate.SCALE.HOUR:
        this.current.setMinutes(0);

      case links.Graph.StepDate.SCALE.MINUTE:
        this.current.setSeconds(0);

      case links.Graph.StepDate.SCALE.SECOND:
        this.current.setMilliseconds(0);
    }
    if (1 != this.step) switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        this.current.setMilliseconds(this.current.getMilliseconds() - this.current.getMilliseconds() % this.step);
        break;

      case links.Graph.StepDate.SCALE.SECOND:
        this.current.setSeconds(this.current.getSeconds() - this.current.getSeconds() % this.step);
        break;

      case links.Graph.StepDate.SCALE.MINUTE:
        this.current.setMinutes(this.current.getMinutes() - this.current.getMinutes() % this.step);
        break;

      case links.Graph.StepDate.SCALE.HOUR:
        this.current.setHours(this.current.getHours() - this.current.getHours() % this.step);
        break;

      case links.Graph.StepDate.SCALE.WEEKDAY:
      case links.Graph.StepDate.SCALE.DAY:
        this.current.setDate(this.current.getDate() - 1 - (this.current.getDate() - 1) % this.step + 1);
        break;

      case links.Graph.StepDate.SCALE.MONTH:
        this.current.setMonth(this.current.getMonth() - this.current.getMonth() % this.step);
        break;

      case links.Graph.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.current.getFullYear() - this.current.getFullYear() % this.step);
        break;

      default:    }
};

links.Graph.StepDate.prototype.end = function() {
    return this.current.valueOf() > this._end.valueOf();
};

links.Graph.StepDate.prototype.next = function() {
    var prev = this.current.valueOf();
    if (6 > this.current.getMonth()) switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        this.current = new Date(this.current.valueOf() + this.step);
        break;

      case links.Graph.StepDate.SCALE.SECOND:
        this.current = new Date(this.current.valueOf() + 1e3 * this.step);
        break;

      case links.Graph.StepDate.SCALE.MINUTE:
        this.current = new Date(this.current.valueOf() + 60 * 1e3 * this.step);
        break;

      case links.Graph.StepDate.SCALE.HOUR:
        this.current = new Date(this.current.valueOf() + 60 * 60 * 1e3 * this.step);
        var h = this.current.getHours();
        this.current.setHours(h - h % this.step);
        break;

      case links.Graph.StepDate.SCALE.WEEKDAY:
      case links.Graph.StepDate.SCALE.DAY:
        this.current.setDate(this.current.getDate() + this.step);
        break;

      case links.Graph.StepDate.SCALE.MONTH:
        this.current.setMonth(this.current.getMonth() + this.step);
        break;

      case links.Graph.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.current.getFullYear() + this.step);
        break;

      default:    } else switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        this.current = new Date(this.current.valueOf() + this.step);
        break;

      case links.Graph.StepDate.SCALE.SECOND:
        this.current.setSeconds(this.current.getSeconds() + this.step);
        break;

      case links.Graph.StepDate.SCALE.MINUTE:
        this.current.setMinutes(this.current.getMinutes() + this.step);
        break;

      case links.Graph.StepDate.SCALE.HOUR:
        this.current.setHours(this.current.getHours() + this.step);
        break;

      case links.Graph.StepDate.SCALE.WEEKDAY:
      case links.Graph.StepDate.SCALE.DAY:
        this.current.setDate(this.current.getDate() + this.step);
        break;

      case links.Graph.StepDate.SCALE.MONTH:
        this.current.setMonth(this.current.getMonth() + this.step);
        break;

      case links.Graph.StepDate.SCALE.YEAR:
        this.current.setFullYear(this.current.getFullYear() + this.step);
        break;

      default:    }
    if (1 != this.step) switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        this.current.getMilliseconds() < this.step && this.current.setMilliseconds(0);
        break;

      case links.Graph.StepDate.SCALE.SECOND:
        this.current.getSeconds() < this.step && this.current.setSeconds(0);
        break;

      case links.Graph.StepDate.SCALE.MINUTE:
        this.current.getMinutes() < this.step && this.current.setMinutes(0);
        break;

      case links.Graph.StepDate.SCALE.HOUR:
        this.current.getHours() < this.step && this.current.setHours(0);
        break;

      case links.Graph.StepDate.SCALE.WEEKDAY:
      case links.Graph.StepDate.SCALE.DAY:
        this.current.getDate() < this.step + 1 && this.current.setDate(1);
        break;

      case links.Graph.StepDate.SCALE.MONTH:
        this.current.getMonth() < this.step && this.current.setMonth(0);
        break;

      case links.Graph.StepDate.SCALE.YEAR:
        break;

      default:    }
    this.current.valueOf() == prev && (this.current = new Date(this._end.valueOf()));
};

links.Graph.StepDate.prototype.getCurrent = function() {
    return this.current;
};

links.Graph.StepDate.prototype.setScale = function(newScale, newStep) {
    this.scale = newScale;
    newStep > 0 && (this.step = newStep);
    this.autoScale = false;
};

links.Graph.StepDate.prototype.setAutoScale = function(enable) {
    this.autoScale = enable;
};

links.Graph.StepDate.prototype.setMinimumStep = function(minimumStep) {
    if (void 0 == minimumStep) return;
    var stepYear = 31104e6;
    var stepMonth = 2592e6;
    var stepDay = 864e5;
    var stepHour = 36e5;
    var stepMinute = 6e4;
    var stepSecond = 1e3;
    var stepMillisecond = 1;
    if (1e3 * stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 1e3;
    }
    if (500 * stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 500;
    }
    if (100 * stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 100;
    }
    if (50 * stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 50;
    }
    if (10 * stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 10;
    }
    if (5 * stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 5;
    }
    if (stepYear > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.YEAR;
        this.step = 1;
    }
    if (3 * stepMonth > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MONTH;
        this.step = 3;
    }
    if (stepMonth > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MONTH;
        this.step = 1;
    }
    if (5 * stepDay > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.DAY;
        this.step = 5;
    }
    if (2 * stepDay > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.DAY;
        this.step = 2;
    }
    if (stepDay > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.DAY;
        this.step = 1;
    }
    if (stepDay / 2 > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.WEEKDAY;
        this.step = 1;
    }
    if (4 * stepHour > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.HOUR;
        this.step = 4;
    }
    if (stepHour > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.HOUR;
        this.step = 1;
    }
    if (15 * stepMinute > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MINUTE;
        this.step = 15;
    }
    if (10 * stepMinute > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MINUTE;
        this.step = 10;
    }
    if (5 * stepMinute > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MINUTE;
        this.step = 5;
    }
    if (stepMinute > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MINUTE;
        this.step = 1;
    }
    if (15 * stepSecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.SECOND;
        this.step = 15;
    }
    if (10 * stepSecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.SECOND;
        this.step = 10;
    }
    if (5 * stepSecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.SECOND;
        this.step = 5;
    }
    if (stepSecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.SECOND;
        this.step = 1;
    }
    if (200 * stepMillisecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MILLISECOND;
        this.step = 200;
    }
    if (100 * stepMillisecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MILLISECOND;
        this.step = 100;
    }
    if (50 * stepMillisecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MILLISECOND;
        this.step = 50;
    }
    if (10 * stepMillisecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MILLISECOND;
        this.step = 10;
    }
    if (5 * stepMillisecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MILLISECOND;
        this.step = 5;
    }
    if (stepMillisecond > minimumStep) {
        this.scale = links.Graph.StepDate.SCALE.MILLISECOND;
        this.step = 1;
    }
};

links.Graph.StepDate.prototype.snap = function(date) {
    if (this.scale == links.Graph.StepDate.SCALE.YEAR) {
        var year = date.getFullYear() + Math.round(date.getMonth() / 12);
        date.setFullYear(Math.round(year / this.step) * this.step);
        date.setMonth(0);
        date.setDate(0);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Graph.StepDate.SCALE.MONTH) {
        if (date.getDate() > 15) {
            date.setDate(1);
            date.setMonth(date.getMonth() + 1);
        } else date.setDate(1);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Graph.StepDate.SCALE.DAY || this.scale == links.Graph.StepDate.SCALE.WEEKDAY) {
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
    } else if (this.scale == links.Graph.StepDate.SCALE.HOUR) {
        switch (this.step) {
          case 4:
            date.setMinutes(60 * Math.round(date.getMinutes() / 60));
            break;

          default:
            date.setMinutes(30 * Math.round(date.getMinutes() / 30));
        }
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == links.Graph.StepDate.SCALE.MINUTE) {
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
    } else if (this.scale == links.Graph.StepDate.SCALE.SECOND) switch (this.step) {
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
    } else if (this.scale == links.Graph.StepDate.SCALE.MILLISECOND) {
        var step = this.step > 5 ? this.step / 2 : 1;
        date.setMilliseconds(Math.round(date.getMilliseconds() / step) * step);
    }
};

links.Graph.StepDate.prototype.isMajor = function() {
    switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        return 0 == this.current.getMilliseconds();

      case links.Graph.StepDate.SCALE.SECOND:
        return 0 == this.current.getSeconds();

      case links.Graph.StepDate.SCALE.MINUTE:
        return 0 == this.current.getHours() && 0 == this.current.getMinutes();

      case links.Graph.StepDate.SCALE.HOUR:
        return 0 == this.current.getHours();

      case links.Graph.StepDate.SCALE.WEEKDAY:
      case links.Graph.StepDate.SCALE.DAY:
        return 1 == this.current.getDate();

      case links.Graph.StepDate.SCALE.MONTH:
        return 0 == this.current.getMonth();

      case links.Graph.StepDate.SCALE.YEAR:
        return false;

      default:
        return false;
    }
};

links.Graph.StepDate.prototype.getLabelMinor = function(date) {
    var MONTHS_SHORT = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    var DAYS_SHORT = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
    void 0 == date && (date = this.current);
    switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        return String(date.getMilliseconds());

      case links.Graph.StepDate.SCALE.SECOND:
        return String(date.getSeconds());

      case links.Graph.StepDate.SCALE.MINUTE:
        return this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2);

      case links.Graph.StepDate.SCALE.HOUR:
        return this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2);

      case links.Graph.StepDate.SCALE.WEEKDAY:
        return DAYS_SHORT[date.getDay()] + " " + date.getDate();

      case links.Graph.StepDate.SCALE.DAY:
        return String(date.getDate());

      case links.Graph.StepDate.SCALE.MONTH:
        return MONTHS_SHORT[date.getMonth()];

      case links.Graph.StepDate.SCALE.YEAR:
        return String(date.getFullYear());

      default:
        return "";
    }
};

links.Graph.StepDate.prototype.getLabelMajor = function(date) {
    var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    var DAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
    void 0 == date && (date = this.current);
    switch (this.scale) {
      case links.Graph.StepDate.SCALE.MILLISECOND:
        return this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2) + ":" + this.addZeros(date.getSeconds(), 2);

      case links.Graph.StepDate.SCALE.SECOND:
        return date.getDate() + " " + MONTHS[date.getMonth()] + " " + this.addZeros(date.getHours(), 2) + ":" + this.addZeros(date.getMinutes(), 2);

      case links.Graph.StepDate.SCALE.MINUTE:
        return DAYS[date.getDay()] + " " + date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();

      case links.Graph.StepDate.SCALE.HOUR:
        return DAYS[date.getDay()] + " " + date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();

      case links.Graph.StepDate.SCALE.WEEKDAY:
      case links.Graph.StepDate.SCALE.DAY:
        return MONTHS[date.getMonth()] + " " + date.getFullYear();

      case links.Graph.StepDate.SCALE.MONTH:
        return String(date.getFullYear());

      default:
        return "";
    }
};

links.Graph.StepDate.prototype.addZeros = function(value, len) {
    var str = "" + value;
    while (len > str.length) str = "0" + str;
    return str;
};

links.Graph.StepNumber = function(start, end, step, prettyStep) {
    this._start = 0;
    this._end = 0;
    this._step = 1;
    this.prettyStep = true;
    this.precision = 5;
    this._current = 0;
    this._setRange(start, end, step, prettyStep);
};

links.Graph.StepNumber.prototype._setRange = function(start, end, step, prettyStep) {
    this._start = start ? start : 0;
    this._end = end ? end : 0;
    this.setStep(step, prettyStep);
};

links.Graph.StepNumber.prototype.setStep = function(step, prettyStep) {
    if (void 0 == step || 0 >= step) return;
    this.prettyStep = prettyStep;
    this._step = true == this.prettyStep ? links.Graph.StepNumber._calculatePrettyStep(step) : step;
    this._end / this._step > Math.pow(10, this.precision) && (this.precision = void 0);
};

links.Graph.StepNumber._calculatePrettyStep = function(step) {
    log10 = function(x) {
        return Math.log(x) / Math.LN10;
    };
    var step1 = 1 * Math.pow(10, Math.round(log10(step / 1)));
    var step2 = 2 * Math.pow(10, Math.round(log10(step / 2)));
    var step5 = 5 * Math.pow(10, Math.round(log10(step / 5)));
    var prettyStep = step1;
    Math.abs(step2 - step) <= Math.abs(prettyStep - step) && (prettyStep = step2);
    Math.abs(step5 - step) <= Math.abs(prettyStep - step) && (prettyStep = step5);
    0 >= prettyStep && (prettyStep = 1);
    return prettyStep;
};

links.Graph.StepNumber.prototype.getCurrent = function() {
    return this.precision ? Number(this._current.toPrecision(this.precision)) : this._current;
};

links.Graph.StepNumber.prototype.getStep = function() {
    return this._step;
};

links.Graph.StepNumber.prototype.start = function() {
    this._current = this.prettyStep ? this._start - this._start % this._step : this._start;
};

links.Graph.StepNumber.prototype.next = function() {
    this._current += this._step;
};

links.Graph.StepNumber.prototype.end = function() {
    return this._current > this._end;
};

links.Graph.prototype.setScale = function(scale, step) {
    this.hStep.setScale(scale, step);
    this.redraw();
};

links.Graph.prototype.setAutoScale = function(enable) {
    this.hStep.setAutoScale(enable);
    this.redraw();
};

links.Graph.px = function(x) {
    return Math.round(x) + "px";
};

links.Graph.prototype._calcConversionFactor = function() {
    this.ttsOffset = this.start.valueOf();
    this.ttsFactor = this.frame.clientWidth / (this.end.valueOf() - this.start.valueOf());
};

links.Graph.prototype._screenToTime = function(x) {
    return new Date(x / this.ttsFactor + this.ttsOffset);
};

links.Graph.prototype.timeToScreen = function(time) {
    return (time.valueOf() - this.ttsOffset) * this.ttsFactor || null;
};

links.Graph.prototype._create = function() {
    while (this.containerElement.hasChildNodes()) this.containerElement.removeChild(this.containerElement.firstChild);
    this.main = document.createElement("DIV");
    this.main.className = "graph-frame";
    this.main.style.position = "relative";
    this.main.style.overflow = "hidden";
    this.containerElement.appendChild(this.main);
    this.frame = document.createElement("DIV");
    this.frame.style.overflow = "hidden";
    this.frame.style.position = "relative";
    this.frame.style.height = "200px";
    this.main.appendChild(this.frame);
    this.frame.background = document.createElement("DIV");
    this.frame.background.className = "graph-canvas";
    this.frame.background.style.position = "relative";
    this.frame.background.style.left = links.Graph.px(0);
    this.frame.background.style.top = links.Graph.px(0);
    this.frame.background.style.width = "100%";
    this.frame.appendChild(this.frame.background);
    this.frame.vgrid = document.createElement("DIV");
    this.frame.vgrid.className = "graph-axis-grid";
    this.frame.vgrid.style.position = "absolute";
    this.frame.vgrid.style.left = links.Graph.px(0);
    this.frame.vgrid.style.top = links.Graph.px(0);
    this.frame.vgrid.style.width = "100%";
    this.frame.appendChild(this.frame.vgrid);
    this.frame.canvas = document.createElement("DIV");
    this.frame.canvas.style.position = "absolute";
    this.frame.canvas.style.left = links.Graph.px(0);
    this.frame.canvas.style.top = links.Graph.px(0);
    this.frame.appendChild(this.frame.canvas);
    this.frame.canvas.axis = document.createElement("DIV");
    this.frame.canvas.axis.style.position = "relative";
    this.frame.canvas.axis.style.left = links.Graph.px(0);
    this.frame.canvas.axis.style.top = links.Graph.px(0);
    this.frame.canvas.appendChild(this.frame.canvas.axis);
    this.majorLabels = [];
    this.frame.canvas.graph = document.createElement("canvas");
    this.frame.canvas.graph.style.position = "absolute";
    this.frame.canvas.graph.style.left = links.Graph.px(0);
    this.frame.canvas.graph.style.top = links.Graph.px(0);
    this.frame.canvas.appendChild(this.frame.canvas.graph);
    isIE = /MSIE/.test(navigator.userAgent) && !window.opera;
    isIE && "undefined" != typeof G_vmlCanvasManager && (this.frame.canvas.graph = G_vmlCanvasManager.initElement(this.frame.canvas.graph));
    var me = this;
    var onmousedown = function(event) {
        me._onMouseDown(event);
    };
    var onmousewheel = function(event) {
        me._onWheel(event);
    };
    var ontouchstart = function(event) {
        me._onTouchStart(event);
    };
    if (this.showTooltip) {
        var onmouseout = function(event) {
            me._onMouseOut(event);
        };
        var onmousehover = function(event) {
            me._onMouseHover(event);
        };
    }
    links.Graph.addEventListener(this.frame, "mousedown", onmousedown);
    links.Graph.addEventListener(this.frame, "mousemove", onmousehover);
    links.Graph.addEventListener(this.frame, "mouseout", onmouseout);
    links.Graph.addEventListener(this.frame, "mousewheel", onmousewheel);
    links.Graph.addEventListener(this.frame, "touchstart", ontouchstart);
    links.Graph.addEventListener(this.frame, "mousedown", function() {
        me._checkSize();
    });
    this.hStep = new links.Graph.StepDate();
    this.vStep = new links.Graph.StepNumber();
    this.eventsSorted = [];
};

links.Graph.prototype.setSize = function(width, height) {
    this.containerElement.style.width = width;
    this.containerElement.style.height = height;
    this.main.style.width = width;
    this.main.style.height = height;
    this.frame.style.width = links.Graph.px(this.main.clientWidth);
    this.frame.style.height = links.Graph.px(this.main.clientHeight);
    this.frame.canvas.style.width = links.Graph.px(this.frame.clientWidth);
    this.frame.canvas.style.height = links.Graph.px(this.frame.clientHeight);
};

links.Graph.prototype._zoom = function(zoomFactor, zoomAroundDate) {
    void 0 == zoomAroundDate && (zoomAroundDate = new Date((this.start.valueOf() + this.end.valueOf()) / 2));
    zoomFactor >= 1 && (zoomFactor = .9);
    -1 >= zoomFactor && (zoomFactor = -.9);
    0 > zoomFactor && (zoomFactor /= 1 + zoomFactor);
    var startDiff = parseFloat(this.start.valueOf() - zoomAroundDate.valueOf());
    var endDiff = parseFloat(this.end.valueOf() - zoomAroundDate.valueOf());
    var newStart = new Date(this.start.valueOf() - startDiff * zoomFactor);
    var newEnd = new Date(this.end.valueOf() - endDiff * zoomFactor);
    var interval = newEnd.valueOf() - newStart.valueOf();
    var zoomMin = Number(this.zoomMin) || 10;
    10 > zoomMin && (zoomMin = 10);
    if (interval >= zoomMin) {
        this._applyRange(newStart, newEnd, zoomAroundDate);
        this._redrawHorizontalAxis();
        this._redrawData();
        this._redrawDataTooltip();
    }
};

links.Graph.prototype._move = function(moveFactor) {
    var diff = parseFloat(this.end.valueOf() - this.start.valueOf());
    var newStart = new Date(this.start.valueOf() + diff * moveFactor);
    var newEnd = new Date(this.end.valueOf() + diff * moveFactor);
    this._applyRange(newStart, newEnd);
    this._redrawHorizontalAxis();
    this._redrawData();
};

links.Graph.prototype._applyRange = function(start, end, zoomAroundDate) {
    var startValue = start.valueOf();
    var endValue = end.valueOf();
    var interval = endValue - startValue;
    var year = 31536e6;
    var zoomMin = Number(this.zoomMin) || 10;
    10 > zoomMin && (zoomMin = 10);
    var zoomMax = Number(this.zoomMax) || 1e4 * year;
    zoomMax > 1e4 * year && (zoomMax = 1e4 * year);
    zoomMin > zoomMax && (zoomMax = zoomMin);
    var min = this.min ? this.min.valueOf() : void 0;
    var max = this.max ? this.max.valueOf() : void 0;
    if (min && max) {
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
    if (min) {
        var diff = startValue - min;
        if (0 > diff) {
            startValue -= diff;
            endValue -= diff;
        }
    }
    if (max) {
        var diff = max - endValue;
        if (0 > diff) {
            startValue += diff;
            endValue += diff;
        }
    }
    this.start = new Date(startValue);
    this.end = new Date(endValue);
};

links.Graph.prototype._zoomVertical = function(zoomFactor, zoomAroundValue) {
    void 0 == zoomAroundValue && (zoomAroundValue = (this.vStart + this.vEnd) / 2);
    zoomFactor >= 1 && (zoomFactor = .9);
    -1 >= zoomFactor && (zoomFactor = -.9);
    0 > zoomFactor && (zoomFactor /= 1 + zoomFactor);
    var startDiff = this.vStart - zoomAroundValue;
    var endDiff = this.vEnd - zoomAroundValue;
    var newStart = this.vStart - startDiff * zoomFactor;
    var newEnd = this.vEnd - endDiff * zoomFactor;
    if (newStart >= newEnd) return;
    this.vMin > newStart && (newStart = this.vMin);
    newEnd > this.vMax && (newEnd = this.vMax);
    this.vStart = newStart;
    this.vEnd = newEnd;
    this._redrawVerticalAxis();
    this._redrawHorizontalAxis();
    this._redrawData();
    this._redrawDataTooltip();
};

links.Graph.prototype.redraw = function() {
    this._initSize();
    this._redrawVerticalAxis();
    this._redrawHorizontalAxis();
    this._redrawData();
    this._redrawDataTooltip();
    this.lastMainWidth = this.main.clientWidth;
    this.lastMainHeight = this.main.clientHeight;
};

links.Graph.prototype._initSize = function() {
    var charText = document.createTextNode("0");
    var charDiv = document.createElement("DIV");
    charDiv.className = "graph-axis-text";
    charDiv.appendChild(charText);
    charDiv.style.position = "absolute";
    charDiv.style.visibility = "hidden";
    charDiv.style.padding = "0px";
    this.frame.canvas.axis.appendChild(charDiv);
    this.axisCharWidth = parseInt(charDiv.clientWidth);
    this.axisCharHeight = parseInt(charDiv.clientHeight);
    charDiv.style.padding = "";
    charDiv.className = "graph-axis-text graph-axis-text-minor";
    this.axisTextMinorHeight = parseInt(charDiv.offsetHeight);
    charDiv.className = "graph-axis-text graph-axis-text-major";
    this.axisTextMajorHeight = parseInt(charDiv.offsetHeight);
    this.frame.canvas.axis.removeChild(charDiv);
    this.axisOffset = this.main.clientHeight - this.axisTextMinorHeight - this.axisTextMajorHeight - 2 * this.mainPadding;
    if (this.data.length > 0) {
        var verticalRange = null;
        for (var i = 0, imax = this.data.length; imax > i; i++) {
            var dataRange = this.data[i].dataRange;
            if (dataRange) if (verticalRange) {
                verticalRange.min = Math.min(verticalRange.min, dataRange.min);
                verticalRange.max = Math.max(verticalRange.max, dataRange.max);
            } else verticalRange = {
                min: dataRange.min,
                max: dataRange.max
            };
        }
        this.verticalRange = verticalRange || {
            min: -10,
            max: 10
        };
    } else this.verticalRange = {
        min: -10,
        max: 10
    };
    var range = this.verticalRange.max - this.verticalRange.min;
    0 >= range && (range = 1);
    var avg = (this.verticalRange.max + this.verticalRange.min) / 2;
    this.vMin = void 0 != this.vMinFixed ? this.vMinFixed : avg - 1.05 * (range / 2);
    this.vMax = void 0 != this.vMaxFixed ? this.vMaxFixed : avg + 1.05 * (range / 2);
    this.vMax <= this.vMin && (this.vMax = this.vMin + 1);
};

links.Graph.prototype._redrawHorizontalAxis = function() {
    new Date();
    while (this.frame.canvas.axis.hasChildNodes()) this.frame.canvas.axis.removeChild(this.frame.canvas.axis.lastChild);
    this.majorLabels = [];
    this.frame.style.top = links.Graph.px(this.mainPadding);
    this.frame.style.height = links.Graph.px(this.main.clientHeight - 2 * this.mainPadding);
    this.frame.style.width = links.Graph.px(this.main.clientWidth - this.main.axisLeft.clientWidth - this.legendWidth - 2 * this.mainPadding - 2);
    this.frame.canvas.style.width = links.Graph.px(this.frame.clientWidth);
    this.frame.canvas.style.height = links.Graph.px(this.axisOffset);
    this.frame.background.style.height = links.Graph.px(this.axisOffset);
    this._calcConversionFactor();
    var start = this._screenToTime(-this.axisMargin);
    var end = this._screenToTime(this.frame.clientWidth + this.axisMargin);
    this.frame.clientWidth + 2 * this.axisMargin;
    var yvalueMinor = this.axisOffset;
    var yvalueMajor = this.axisOffset + this.axisTextMinorHeight;
    this.minimumStep = this._screenToTime(6 * this.axisCharWidth).valueOf() - this._screenToTime(0).valueOf();
    this.hStep.setRange(start, end, this.minimumStep);
    if (this.leftMajorLabel) {
        this.frame.canvas.removeChild(this.leftMajorLabel);
        this.leftMajorLabel = void 0;
    }
    var leftDate = this.hStep.getLabelMajor(this._screenToTime(0));
    var content = document.createTextNode(leftDate);
    this.leftMajorLabel = document.createElement("DIV");
    this.leftMajorLabel.className = "graph-axis-text graph-axis-text-major";
    this.leftMajorLabel.appendChild(content);
    this.leftMajorLabel.style.position = "absolute";
    this.leftMajorLabel.style.left = links.Graph.px(0);
    this.leftMajorLabel.style.top = links.Graph.px(yvalueMajor);
    this.leftMajorLabel.title = leftDate;
    this.frame.canvas.appendChild(this.leftMajorLabel);
    this.hStep.start();
    var count = 0;
    while (!this.hStep.end() && 200 > count) {
        count++;
        var x = this.timeToScreen(this.hStep.getCurrent());
        var hvline = this.hStep.isMajor() ? this.frame.clientHeight : this.axisOffset + this.axisTextMinorHeight;
        var vline = document.createElement("DIV");
        vline.className = this.hStep.isMajor() ? "graph-axis-grid graph-axis-grid-major" : "graph-axis-grid graph-axis-grid-minor";
        vline.style.position = "absolute";
        vline.style.borderLeftStyle = "solid";
        vline.style.top = links.Graph.px(0);
        vline.style.width = links.Graph.px(0);
        vline.style.height = links.Graph.px(hvline);
        vline.style.left = links.Graph.px(x - vline.offsetWidth / 2);
        this.frame.canvas.axis.appendChild(vline);
        if (this.hStep.isMajor()) {
            var content = document.createTextNode(this.hStep.getLabelMajor());
            var majorValue = document.createElement("DIV");
            this.frame.canvas.axis.appendChild(majorValue);
            majorValue.className = "graph-axis-text graph-axis-text-major";
            majorValue.appendChild(content);
            majorValue.style.position = "absolute";
            majorValue.style.width = links.Graph.px(majorValue.clientWidth);
            majorValue.style.left = links.Graph.px(x);
            majorValue.style.top = links.Graph.px(yvalueMajor);
            majorValue.title = this.hStep.getCurrent();
            majorValue.x = x;
            this.majorLabels.push(majorValue);
        }
        var content = document.createTextNode(this.hStep.getLabelMinor());
        var minorValue = document.createElement("DIV");
        minorValue.appendChild(content);
        minorValue.className = "graph-axis-text graph-axis-text-minor";
        minorValue.style.position = "absolute";
        minorValue.style.left = links.Graph.px(x);
        minorValue.style.top = links.Graph.px(yvalueMinor);
        minorValue.title = this.hStep.getCurrent();
        this.frame.canvas.axis.appendChild(minorValue);
        this.hStep.next();
    }
    var line = document.createElement("DIV");
    line.className = "graph-axis";
    line.style.position = "absolute";
    line.style.borderTopStyle = "solid";
    line.style.top = links.Graph.px(0);
    line.style.left = links.Graph.px(this.timeToScreen(start));
    line.style.width = links.Graph.px(this.timeToScreen(end) - this.timeToScreen(start));
    line.style.height = links.Graph.px(0);
    this.frame.canvas.axis.appendChild(line);
    var line = document.createElement("DIV");
    line.className = "graph-axis";
    line.style.position = "absolute";
    line.style.borderTopStyle = "solid";
    line.style.top = links.Graph.px(this.axisOffset);
    line.style.left = links.Graph.px(this.timeToScreen(start));
    line.style.width = links.Graph.px(this.timeToScreen(end) - this.timeToScreen(start));
    line.style.height = links.Graph.px(0);
    this.frame.canvas.axis.appendChild(line);
    this._redrawAxisLeftMajorLabel();
    new Date();
};

links.Graph.prototype._redrawAxisLeftMajorLabel = function() {
    var offset = parseFloat(this.frame.canvas.axis.style.left);
    var lastBelowZero = null;
    var firstAboveZero = null;
    var xPrev = null;
    for (var i in this.majorLabels) if (this.majorLabels.hasOwnProperty(i)) {
        var label = this.majorLabels[i];
        0 > label.x + offset && (lastBelowZero = label);
        label.x + offset > 0 && (null == xPrev || 0 > xPrev + offset) && (firstAboveZero = label);
        xPrev = label.x;
    }
    lastBelowZero && (lastBelowZero.style.visibility = "hidden");
    firstAboveZero && (firstAboveZero.style.visibility = "visible");
    if (firstAboveZero && this.leftMajorLabel.clientWidth > firstAboveZero.x + offset) this.leftMajorLabel.style.visibility = "hidden"; else {
        var leftTime = this.hStep.getLabelMajor(this._screenToTime(-offset));
        this.leftMajorLabel.title = leftTime;
        this.leftMajorLabel.innerHTML = leftTime;
        "visible" != this.leftMajorLabel.style.visibility && (this.leftMajorLabel.style.visibility = "visible");
    }
};

links.Graph.prototype._redrawVerticalAxis = function() {
    var i;
    if (this.main.axisLeft) while (this.main.axisLeft.hasChildNodes()) this.main.axisLeft.removeChild(this.main.axisLeft.lastChild); else {
        this.main.axisLeft = document.createElement("DIV");
        this.main.axisLeft.style.position = "absolute";
        this.main.axisLeft.style.display = "none";
        this.main.axisLeft.className = "graph-axis graph-axis-vertical";
        this.main.axisLeft.style.borderRightStyle = "solid";
        this.main.appendChild(this.main.axisLeft);
    }
    if (!this.main.axisRight) {
        this.main.axisRight = document.createElement("DIV");
        this.main.axisRight.style.position = "absolute";
        this.main.axisRight.className = "graph-axis graph-axis-vertical";
        this.main.axisRight.style.borderRightStyle = "solid";
        this.main.appendChild(this.main.axisRight);
    }
    if (!this.main.zoomButtons) {
        this.main.zoomButtons = document.createElement("DIV");
        this.main.zoomButtons.className = "graph-axis-button-menu";
        this.main.zoomButtons.style.position = "absolute";
        var graph = this;
        var zoomIn = document.createElement("DIV");
        zoomIn.innerHTML = "+";
        zoomIn.title = "Zoom in vertically (shift + scroll wheel)";
        zoomIn.className = "graph-axis-button";
        this.main.zoomButtons.appendChild(zoomIn);
        links.Graph.addEventListener(zoomIn, "mousedown", function(event) {
            graph._zoomVertical(.2);
            links.Graph.preventDefault(event);
        });
        var zoomOut = document.createElement("DIV");
        zoomOut.innerHTML = "&minus;";
        zoomOut.className = "graph-axis-button";
        zoomOut.title = "Zoom out vertically (shift + scroll wheel)";
        this.main.zoomButtons.appendChild(zoomOut);
        links.Graph.addEventListener(zoomOut, "mousedown", function(event) {
            graph._zoomVertical(-.2);
            links.Graph.preventDefault(event);
        });
    }
    while (this.frame.vgrid.hasChildNodes()) this.frame.vgrid.removeChild(this.frame.vgrid.lastChild);
    this.vStart = void 0 != this.vStart && this.vStart < this.vMax ? this.vStart : this.vMin;
    this.vEnd = void 0 != this.vEnd && this.vEnd > this.vMin ? this.vEnd : this.vMax;
    this.vStart = Math.max(this.vStart, this.vMin);
    this.vEnd = Math.min(this.vEnd, this.vMax);
    var start = this.vStart;
    var end = this.vEnd;
    var stepnum = parseInt(this.axisOffset / 40);
    var step = this.vStepSize || (this.vEnd - this.vStart) / stepnum;
    var prettyStep = true;
    this.vStep._setRange(start, end, step, prettyStep);
    if (this.vEnd > this.vStart) {
        var graphBottom = this.axisOffset;
        var graphTop = 0;
        var yScale = (graphTop - graphBottom) / (this.vEnd - this.vStart);
        var yShift = graphBottom - this.vStart * yScale;
        this.yToScreen = function(y) {
            return y * yScale + yShift;
        };
        this.screenToY = function(ys) {
            return (ys - yShift) / yScale;
        };
    } else {
        this.yToScreen = function() {
            return 0;
        };
        this.screenToY = function() {
            return 0;
        };
    }
    if (this.vAreas && !this.frame.background.childNodes.length) for (i = 0; this.vAreas.length > i; i++) {
        var area = this.vAreas[i];
        var divArea = document.createElement("DIV");
        divArea.className = "graph-background-area";
        divArea.start = null != area.start ? Number(area.start) : null;
        divArea.end = null != area.end ? Number(area.end) : null;
        area.className && (divArea.className += " " + area.className);
        area.color && (divArea.style.backgroundColor = area.color);
        this.frame.background.appendChild(divArea);
    }
    if (this.frame.background.childNodes.length) {
        var childs = this.frame.background.childNodes;
        for (i = 0; childs.length > i; i++) {
            var child = childs[i];
            var areaStart = this.yToScreen(null != child.start ? Math.max(child.start, this.vStart) : this.vStart);
            var areaEnd = this.yToScreen(null != child.end ? Math.min(child.end, this.vEnd) : this.vEnd);
            child.style.top = areaEnd + "px";
            child.style.height = Math.max(areaStart - areaEnd, 0) + "px";
        }
    }
    var maxWidth = 0;
    var count = 0;
    this.vStep.start();
    this.yToScreen(this.vStep.getCurrent()) > this.axisOffset && this.vStep.next();
    while (!this.vStep.end() && 100 > count) {
        count++;
        var y = this.vStep.getCurrent();
        var yScreen = this.yToScreen(y);
        Math.abs(y) > 1e6 ? y = y.toExponential() : 1e-4 > Math.abs(y) && (y = Math.abs(y) > this.vStep.getStep() / 2 ? y.toExponential() : 0);
        var content = document.createTextNode(y);
        var labelText = document.createElement("DIV");
        labelText.appendChild(content);
        labelText.className = "graph-axis-text graph-axis-text-vertical";
        labelText.style.position = "absolute";
        labelText.style.whiteSpace = "nowrap";
        labelText.style.textAlign = "right";
        this.main.axisLeft.appendChild(labelText);
        var labelLine = document.createElement("DIV");
        labelLine.className = "graph-axis-grid graph-axis-grid-vertical";
        labelLine.style.position = "absolute";
        labelLine.style.borderTopStyle = "solid";
        labelLine.style.width = "5px";
        this.main.axisLeft.appendChild(labelLine);
        var labelGridLine = document.createElement("DIV");
        labelGridLine.className = 0 != y ? "graph-axis-grid graph-axis-grid-minor" : "graph-axis-grid graph-axis-grid-major";
        labelGridLine.style.position = "absolute";
        labelGridLine.style.left = "0px";
        labelGridLine.style.width = "100%";
        labelGridLine.style.borderTopStyle = "solid";
        this.frame.vgrid.appendChild(labelGridLine);
        var h = labelText.offsetHeight;
        labelText.style.top = links.Graph.px(yScreen - h / 2);
        labelLine.style.top = links.Graph.px(yScreen);
        labelGridLine.style.top = links.Graph.px(yScreen);
        maxWidth = Math.max(maxWidth, labelText.offsetWidth);
        this.vStep.next();
    }
    maxWidth += this.main.zoomButtons.clientWidth;
    for (i = 0; this.main.axisLeft.childNodes.length > i; i++) this.main.axisLeft.childNodes[i].style.left = links.Graph.px(maxWidth - this.main.axisLeft.childNodes[i].offsetWidth);
    this.main.axisLeft.style.left = 0;
    this.main.axisLeft.style.top = links.Graph.px(this.mainPadding);
    this.main.axisLeft.style.height = links.Graph.px(this.axisOffset + 1);
    this.main.axisLeft.style.width = links.Graph.px(maxWidth);
    this.main.axisRight.style.left = 0;
    this.main.axisRight.style.top = links.Graph.px(this.mainPadding);
    this.main.axisRight.style.height = links.Graph.px(this.axisOffset + 1);
};

links.Graph.prototype._redrawData = function() {
    this._calcConversionFactor();
    var start = this._screenToTime(-this.axisMargin);
    var end = this._screenToTime(this.frame.clientWidth + this.axisMargin);
    var graph = this.frame.canvas.graph;
    var ctx = graph.getContext("2d");
    ctx.clearRect(0, 0, graph.height, graph.width);
    var left = this.timeToScreen(start);
    var right = this.timeToScreen(end);
    var graphWidth = right - left;
    var height = this.axisOffset;
    graph.style.left = links.Graph.px(left);
    graph.width = graphWidth;
    graph.height = height;
    var offset = parseFloat(graph.style.left);
    for (var col = 0, colCount = this.data.length; colCount > col; col++) {
        var style = this._getLineStyle(col);
        var color = this._getLineColor(col);
        var textColor = this._getTextColor(col);
        var font = this._getFont(col);
        var width = this._getLineWidth(col);
        var radius = this._getLineRadius(col);
        var visible = this._getLineVisible(col);
        var type = this.data[col].type || "line";
        var data = this.data[col].data;
        var d;
        var rowRange = this._getVisbleRowRange(data, start, end, type, this.data[col].visibleRowRange);
        this.data[col].visibleRowRange = rowRange;
        var rowStep = this._calculateRowStep(rowRange);
        if (visible && rowRange) switch (type) {
          case "line":
            if ("line" == style || "dot-line" == style) {
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.beginPath();
                var row = rowRange.start;
                while (rowRange.end >= row) {
                    while (rowRange.end >= row && null == data[row].value) row += rowStep;
                    if (rowRange.end >= row) {
                        value = data[row].value;
                        var x = this.timeToScreen(data[row].date) - offset;
                        var y = this.yToScreen(value);
                        ctx.moveTo(x, y);
                        row += rowStep;
                    }
                    while (rowRange.end >= row && null != (value = data[row].value)) {
                        x = this.timeToScreen(data[row].date) - offset;
                        y = this.yToScreen(value);
                        ctx.lineTo(x, y);
                        row += rowStep;
                    }
                }
                ctx.stroke();
            }
            if ("line" == type && ("dot" == style || "dot-line" == style)) {
                var diameter = 2 * radius;
                ctx.fillStyle = color;
                for (row = rowRange.start; rowRange.end >= row; row += rowStep) {
                    var value = data[row].value;
                    if (null != value) {
                        x = this.timeToScreen(data[row].date) - offset;
                        y = this.yToScreen(value);
                        ctx.fillRect(x - radius, y - radius, diameter, diameter);
                    }
                }
            }
            break;

          case "area":
            for (row = rowRange.start; rowRange.end >= row; row += rowStep) {
                d = data[row];
                ctx.fillStyle = d.color || color;
                var xStart = this.timeToScreen(d.start) - offset;
                var yStart = this.timeToScreen(d.end) - offset;
                ctx.fillRect(xStart, 0, yStart - xStart, height);
                if (d.text) {
                    ctx.font = d.font || font;
                    ctx.textAlign = "left";
                    ctx.textBaseline = "top";
                    ctx.fillStyle = d.textColor || textColor;
                    ctx.fillText(d.text, xStart + 2, 0);
                }
            }
            break;

          case "event":
            for (row = rowRange.start; rowRange.end >= row; row += rowStep) {
                d = data[row];
                ctx.fillStyle = d.color || color;
                var dWidth = d.width || width;
                xStart = this.timeToScreen(d.date) - offset;
                ctx.fillRect(xStart - dWidth / 2, 0, dWidth, height);
                if (d.text) {
                    ctx.font = d.font || font;
                    ctx.textAlign = "left";
                    ctx.textBaseline = "top";
                    ctx.fillStyle = d.textColor || textColor;
                    ctx.fillText(d.text, xStart + dWidth / 2 + 2, 0);
                }
            }
            break;

          default:
            throw new Error('Unknown type of dataset "' + type + '". ' + 'Choose "line" or "area"');
        }
    }
};

links.Graph.prototype._calculateRowStep = function(rowRange) {
    var rowStep;
    if (this.autoDataStep && rowRange) {
        var rowCount = rowRange.end - rowRange.start;
        var canvasWidth = this.frame.clientWidth + 2 * this.axisMargin;
        rowStep = Math.max(Math.floor(rowCount / canvasWidth), 1);
    } else rowStep = 1;
    return rowStep;
};

links.Graph.prototype._redrawDataTooltip = function() {
    var tooltip = this.tooltip;
    if (this.showTooltip && tooltip) {
        var dataPoint = tooltip.dataPoint;
        if (dataPoint) {
            var dot = tooltip.dot;
            var label = tooltip.label;
            var graph = this.frame.canvas.graph;
            var offset = parseFloat(graph.style.left) + this.axisMargin;
            var radius = dataPoint.radius || 4;
            var color = dataPoint.color || "#4d4d4d";
            var left = this.timeToScreen(dataPoint.date) + offset;
            var top = void 0 != dataPoint.value ? this.yToScreen(dataPoint.value) : 16;
            if (!dot) {
                dot = document.createElement("div");
                dot.className = "graph-tooltip-dot";
                tooltip.dot = dot;
            }
            dot.style.borderColor != color && dot.parentNode && dot.parentNode.removeChild(dot);
            dot.parentNode || this.frame.canvas.appendChild(dot);
            if (!label) {
                label = document.createElement("div");
                label.className = "graph-tooltip-label";
                tooltip.label = label;
            }
            label.parentNode || this.frame.canvas.appendChild(label);
            dot.style.left = left + "px";
            dot.style.top = top + "px";
            dot.style.borderColor = color;
            dot.style.borderRadius = radius + "px";
            dot.style.borderWidth = radius + "px";
            dot.style.marginLeft = -radius + "px";
            dot.style.marginTop = -radius + "px";
            dot.style.display = dataPoint.title ? "none" : "";
            var html;
            if (this.tooltipFormatter) html = this.tooltipFormatter(dataPoint); else {
                html = '<table style="color: ' + color + '">';
                if (dataPoint.title) html += "<tr><td>" + dataPoint.title + "</td></tr>"; else {
                    html += "<tr><td>Date:</td><td>" + dataPoint.date + "</td></tr>";
                    void 0 != dataPoint.value && (html += "<tr><td>Value:</td><td>" + dataPoint.value.toPrecision(4) + "</td></tr>");
                }
                html += "</table>";
            }
            label.innerHTML = html;
            var width = label.clientWidth;
            var graphWidth = this.timeToScreen(this.end) - this.timeToScreen(this.start);
            var height = label.clientHeight;
            var margin = 10;
            var showAbove = top - height - margin > 0;
            var showRight = graphWidth > left + width + margin;
            label.style.top = (showAbove ? top - height - radius : top + radius) + "px";
            label.style.left = (showRight ? left + radius : left - width - radius) + "px";
        } else {
            if (tooltip.dot && tooltip.dot.parentNode) {
                tooltip.dot.parentNode.removeChild(tooltip.dot);
                tooltip.dot = void 0;
            }
            if (tooltip.label && tooltip.label.parentNode) {
                tooltip.label.parentNode.removeChild(tooltip.label);
                tooltip.label = void 0;
            }
        }
    }
};

links.Graph.prototype._setTooltip = function(dataPoint) {
    this.tooltip || (this.tooltip = {});
    this.tooltip.dataPoint = dataPoint;
    this._redrawDataTooltip();
};

links.Graph.prototype._findClosestDataPoint = function(date, value) {
    function isVisible(dataPoint) {
        return dataPoint.date >= graph.start && dataPoint.date <= graph.end && dataPoint.value >= graph.vStart && dataPoint.value <= graph.vEnd;
    }
    var maxDistance = 30;
    var winner = void 0;
    var graph = this;
    for (var col = 0, colCount = this.data.length; colCount > col; col++) {
        var visible = this._getLineVisible(col);
        var rowRange = this.data[col].visibleRowRange;
        var data = this.data[col].data;
        var type = this.data[col].type;
        if (visible && rowRange) {
            var rowStep = this._calculateRowStep(rowRange);
            var row = rowRange.start;
            while (rowRange.end >= row) {
                var dataPoint = data[row];
                "event" == type ? dataPoint = {
                    date: dataPoint.date,
                    value: this.screenToY(16),
                    text: dataPoint.text,
                    title: dataPoint.title
                } : "area" == type && (dataPoint = {
                    date: dataPoint.start,
                    value: this.screenToY(16),
                    text: dataPoint.text,
                    title: dataPoint.title
                });
                if (null != dataPoint.value) {
                    var dateDistance = Math.abs(dataPoint.date - date) * this.ttsFactor;
                    if (maxDistance > dateDistance) {
                        var valueDistance = Math.abs(this.yToScreen(dataPoint.value) - this.yToScreen(value));
                        if (maxDistance > valueDistance && isVisible(dataPoint)) {
                            var distance = Math.sqrt(dateDistance * dateDistance + valueDistance * valueDistance);
                            if (!winner || winner.distance > distance) {
                                var color = this._getLineColor(col);
                                var radius;
                                if ("event" == type || "area" == type) {
                                    radius = this._getLineWidth(col);
                                    color = this._getTextColor(col);
                                } else radius = "line" == this._getLineStyle(col) ? 2 * this._getLineWidth(col) : 2 * this._getLineRadius(col);
                                radius = Math.max(radius, 4);
                                winner = {
                                    distance: distance,
                                    dataPoint: {
                                        date: dataPoint.date,
                                        value: dataPoint.value,
                                        title: dataPoint.title,
                                        text: dataPoint.text,
                                        color: color,
                                        radius: radius,
                                        line: col
                                    }
                                };
                            }
                        }
                    } else dataPoint.date > date && (row = rowRange.end);
                }
                row += rowStep;
            }
        }
    }
    return winner ? winner.dataPoint : void 0;
};

links.Graph.prototype._average = function(data, start, length) {
    var sumDate = 0;
    var countDate = 0;
    var sumValue = 0;
    var countValue = 0;
    for (var row = start, end = Math.min(start + length, data.length); end > row; row++) {
        var d = data[row];
        if (void 0 != d.date) {
            sumDate += d.date.valueOf();
            countDate += 1;
        }
        if (void 0 != d.value) {
            sumValue += d.value;
            countValue += 1;
        }
    }
    var avgDate = new Date(Math.round(sumDate / countDate));
    var avgValue = sumValue / countValue;
    return {
        date: avgDate,
        value: avgValue
    };
};

links.Graph.prototype._redrawLegend = function() {
    var legendCount = 0;
    for (var col = 0, len = this.data.length; len > col; col++) true == this._getLineLegend(col) && legendCount++;
    if (0 == legendCount || this.legend && false === this.legend.visible) {
        if (this.main.legend) {
            this.main.removeChild(this.main.legend);
            this.main.legend = void 0;
        }
        this.legendWidth = 0;
        return;
    }
    var scrollTop = 0;
    if (this.main.legend) {
        scrollTop = this.main.legend.scrollTop;
        while (this.main.legend.hasChildNodes()) this.main.legend.removeChild(this.main.legend.lastChild);
    } else {
        this.main.legend = document.createElement("DIV");
        this.main.legend.className = "graph-legend";
        this.main.legend.style.position = "absolute";
        this.main.legend.style.overflowY = "auto";
        this.main.appendChild(this.main.legend);
    }
    var maxWidth = 0;
    for (var col = 0, len = this.data.length; len > col; col++) {
        var showLegend = this._getLineLegend(col);
        if (showLegend) {
            var color = this._getLineColor(col);
            var label = this.data[col].label;
            var divLegendItem = document.createElement("DIV");
            divLegendItem.className = "graph-legend-item";
            this.main.legend.appendChild(divLegendItem);
            if (this.legend && this.legend.toggleVisibility) {
                var chkShow = document.createElement("INPUT");
                chkShow.type = "checkbox";
                chkShow.checked = this._getLineVisible(col);
                chkShow.defaultChecked = this._getLineVisible(col);
                chkShow.style.marginRight = links.Graph.px(this.mainPadding);
                chkShow.col = col;
                var me = this;
                chkShow.onmousedown = function() {
                    me._setLineVisible(this.col, !this.checked);
                    me._checkSize();
                    me.redraw();
                };
                divLegendItem.appendChild(chkShow);
            }
            var spanColor = document.createElement("SPAN");
            spanColor.style.backgroundColor = color;
            spanColor.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
            divLegendItem.appendChild(spanColor);
            var text = document.createTextNode(" " + label);
            divLegendItem.appendChild(text);
            maxWidth = Math.max(maxWidth, divLegendItem.clientWidth);
        }
    }
    this.main.legend.style.top = links.Graph.px(this.mainPadding);
    this.main.legend.style.height = "auto";
    var scroll = false;
    if (this.main.legend.clientHeight > this.axisOffset - 1) {
        this.main.legend.style.height = links.Graph.px(this.axisOffset - 1);
        scroll = true;
    }
    if (this.legend && this.legend.width) this.main.legend.style.width = this.legend.width; else if (scroll) {
        this.main.legend.style.width = "auto";
        this.main.legend.style.width = links.Graph.px(this.main.legend.clientWidth + 40);
    } else {
        this.main.legend.style.width = "auto";
        this.main.legend.style.width = links.Graph.px(this.main.legend.clientWidth + 5);
    }
    this.legendWidth = (this.main.legend.offsetWidth ? this.main.legend.offsetWidth : this.main.legend.clientWidth) + this.mainPadding;
    this.main.legend.style.left = links.Graph.px(this.main.clientWidth - this.legendWidth);
    scrollTop && (this.main.legend.scrollTop = scrollTop);
};

links.Graph.prototype._getVisbleRowRange = function(data, start, end, type, oldRowRange) {
    data || (data = []);
    var fieldStart = "date";
    var fieldEnd = "date";
    if ("area" == type) {
        fieldStart = "start";
        fieldEnd = "end";
    }
    var rowCount = data.length;
    var rowRange = {
        start: 0,
        end: rowCount - 1
    };
    if (null != oldRowRange) {
        rowRange.start = oldRowRange.start;
        rowRange.end = oldRowRange.end;
    }
    rowRange.start > rowCount - 1 && rowCount > 0 && (rowRange.start = rowCount - 1);
    rowRange.end > rowCount - 1 && (rowRange.end = rowCount - 1);
    while (rowRange.start > 0 && data[rowRange.start][fieldStart].valueOf() > start.valueOf()) rowRange.start--;
    while (rowCount - 1 > rowRange.start && data[rowRange.start][fieldStart].valueOf() < start.valueOf()) rowRange.start++;
    while (rowRange.end > rowRange.start && data[rowRange.end][fieldEnd].valueOf() > end.valueOf()) rowRange.end--;
    while (rowCount - 1 > rowRange.end && data[rowRange.end][fieldEnd].valueOf() < end.valueOf()) rowRange.end++;
    return rowRange;
};

links.Graph.prototype._getRowRange = function(data, fields) {
    data || (data = []);
    fields || (fields = [ "date" ]);
    var rowRange = {
        min: void 0,
        max: void 0
    };
    if (data.length > 0) for (var f = 0; fields.length > f; f++) {
        var field = fields[f];
        rowRange.min = data[0][field].valueOf();
        rowRange.max = data[0][field].valueOf();
        for (var row = 1, rows = data.length; rows > row; row++) {
            var d = data[row][field];
            if (void 0 != d) {
                rowRange.min = Math.min(d.valueOf(), rowRange.min);
                rowRange.max = Math.max(d.valueOf(), rowRange.max);
            }
        }
    }
    if (null != rowRange.min && !isNaN(rowRange.min) && null != rowRange.max && !isNaN(rowRange.max)) return {
        min: new Date(rowRange.min),
        max: new Date(rowRange.max)
    };
    return null;
};

links.Graph.prototype._getDataRange = function(data) {
    data || (data = []);
    var dataRange = null;
    for (var row = 0, rows = data.length; rows > row; row++) {
        var value = data[row].value;
        if (void 0 != value) if (dataRange) {
            dataRange.min = Math.min(value, dataRange.min);
            dataRange.max = Math.max(value, dataRange.max);
        } else dataRange = {
            min: value,
            max: value
        };
    }
    if (dataRange && null != dataRange.min && !isNaN(dataRange.min) && null != dataRange.max && !isNaN(dataRange.max)) return dataRange;
    return null;
};

links.Graph.prototype._getLineStyle = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.style) return line.style.toLowerCase();
    }
    if (this.line && void 0 != this.line.style) return this.line.style.toLowerCase();
    return "line";
};

links.Graph.prototype._getLineColor = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.color) return line.color;
    }
    if (this.line && void 0 != this.line.color) return this.line.color;
    if (this.defaultColors.length > column) return this.defaultColors[column];
    return "black";
};

links.Graph.prototype._getTextColor = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.textColor) return line.textColor;
    }
    if (this.line && void 0 != this.line.textColor) return this.line.textColor;
    return "#4D4D4D";
};

links.Graph.prototype._getFont = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.font) return line.font;
    }
    if (this.line && void 0 != this.line.font) return this.line.font;
    return "13px arial";
};

links.Graph.prototype._getLineWidth = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.width) return parseFloat(line.width);
    }
    if (this.line && void 0 != this.line.width) return parseFloat(this.line.width);
    return 2;
};

links.Graph.prototype._getLineRadius = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.radius) return parseFloat(line.radius);
    }
    if (this.line && void 0 != this.line.radius) return parseFloat(this.line.radius);
    return 3;
};

links.Graph.prototype._getLineLegend = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.legend) return line.legend;
    }
    if (this.line && void 0 != this.line.legend) return this.line.legend;
    return true;
};

links.Graph.prototype._getLineVisible = function(column) {
    if (this.lines && this.lines.length > column) {
        var line = this.lines[column];
        if (line && void 0 != line.visible) return line.visible;
    }
    if (this.line && void 0 != this.line.visible) return this.line.visible;
    return true;
};

links.Graph.prototype._setLineVisible = function(column, visible) {
    column = parseInt(column);
    if (0 > column) return;
    this.lines || (this.lines = []);
    this.lines[column] || (this.lines[column] = {});
    this.lines[column].visible = visible;
};

links.Graph.prototype._checkSize = function() {
    if (this.lastMainWidth != this.main.clientWidth || this.lastMainHeight != this.main.clientHeight) {
        var diff = this.main.clientWidth - this.lastMainWidth;
        this.end = new Date((this.frame.clientWidth + diff) / this.frame.clientWidth * (this.end.valueOf() - this.start.valueOf()) + this.start.valueOf());
        this.startEnd && (this.startEnd = new Date((this.frame.clientWidth + diff) / this.frame.clientWidth * (this.startEnd.valueOf() - this.start.valueOf()) + this.start.valueOf()));
        this.redraw();
    }
};

links.Graph.prototype._onMouseDown = function(event) {
    event = event || window.event;
    if (!this.moveable) return;
    this.leftButtonDown && this.onMouseUp(event);
    this.leftButtonDown = event.which ? 1 == event.which : 1 == event.button;
    if (!this.leftButtonDown && !this.touchDown) return;
    this._checkSize();
    this.startMouseX = links.Graph._getPageX(event);
    this.startMouseY = links.Graph._getPageY(event);
    this.startStart = new Date(this.start.valueOf());
    this.startEnd = new Date(this.end.valueOf());
    this.startVStart = this.vStart;
    this.startVEnd = this.vEnd;
    this.startGraphLeft = parseFloat(this.frame.canvas.graph.style.left);
    this.startAxisLeft = parseFloat(this.frame.canvas.axis.style.left);
    this.frame.style.cursor = "move";
    var me = this;
    if (!this.onmousemove) {
        this.onmousemove = function(event) {
            me._onMouseMove(event);
        };
        links.Graph.addEventListener(document, "mousemove", this.onmousemove);
    }
    if (!this.onmouseup) {
        this.onmouseup = function(event) {
            me._onMouseUp(event);
        };
        links.Graph.addEventListener(document, "mouseup", this.onmouseup);
    }
    links.Graph.preventDefault(event);
};

links.Graph.prototype._onMouseMove = function(event) {
    event = event || window.event;
    var mouseX = links.Graph._getPageX(event);
    var mouseY = links.Graph._getPageY(event);
    var diffX = mouseX - this.startMouseX;
    var diffY = this.screenToY(this.startMouseY) - this.screenToY(mouseY);
    mouseY - this.startMouseY;
    var diffMillisecs = -diffX / this.frame.clientWidth * (this.startEnd.valueOf() - this.startStart.valueOf());
    var newStart = new Date(this.startStart.valueOf() + Math.round(diffMillisecs));
    var newEnd = new Date(this.startEnd.valueOf() + Math.round(diffMillisecs));
    this._applyRange(newStart, newEnd);
    var appliedDiff = this.start.valueOf() - newStart.valueOf();
    if (appliedDiff) {
        diffMillisecs += appliedDiff;
        diffX = -diffMillisecs * this.frame.clientWidth / (this.startEnd.valueOf() - this.startStart.valueOf());
    }
    var vStartNew = this.startVStart + diffY;
    var vEndNew = this.startVEnd + diffY;
    var d;
    if (this.vMin > vStartNew) {
        d = this.vMin - vStartNew;
        vStartNew += d;
        vEndNew += d;
    }
    if (vEndNew > this.vMax) {
        d = vEndNew - this.vMax;
        vStartNew -= d;
        vEndNew -= d;
    }
    var epsilon = (this.vEnd - this.vStart) / 1e6;
    var movedVertically = Math.abs(vStartNew - this.vStart) > epsilon || Math.abs(vEndNew - this.vEnd) > epsilon;
    if (movedVertically) {
        this.vStart = vStartNew;
        this.vEnd = vEndNew;
    }
    if (this.redrawWhileMoving && !(Math.abs(this.startAxisLeft + diffX) < this.axisMargin) || movedVertically) {
        this._redrawVerticalAxis();
        this.frame.canvas.axis.style.left = links.Graph.px(0);
        this.startAxisLeft = -diffX;
        this._redrawHorizontalAxis();
        this.frame.canvas.graph.style.left = links.Graph.px(0);
        this.startGraphLeft = -diffX - this.axisMargin;
        this._redrawData();
    } else {
        this.frame.canvas.axis.style.left = links.Graph.px(this.startAxisLeft + diffX);
        this.frame.canvas.graph.style.left = links.Graph.px(this.startGraphLeft + diffX);
    }
    this._redrawAxisLeftMajorLabel();
    this._redrawDataTooltip();
    var properties = {
        start: new Date(this.start.valueOf()),
        end: new Date(this.end.valueOf())
    };
    this.trigger("rangechange", properties);
    links.Graph.preventDefault(event);
};

links.Graph.prototype._onMouseOut = function(event) {
    event = event || window.event;
    var me = this;
    if (event.which > 0 && "mouseout" == event.type) {
        if (!this.onmouseupoutside) {
            this.onmouseupoutside = function(event) {
                me._onMouseOut(event);
            };
            links.Graph.addEventListener(document, "mouseup", this.onmouseupoutside);
        }
        return;
    }
    if ("mouseup" == event.type && this.onmouseupoutside) {
        links.Graph.removeEventListener(document, "mouseup", this.onmouseupoutside);
        this.onmouseupoutside = void 0;
    }
    links.Graph.isOutside(event, this.frame) && this._setTooltip(void 0);
};

links.Graph.prototype._onMouseHover = function(event) {
    event = event || window.event;
    if (this.leftButtonDown) return;
    var mouseX = links.Graph._getPageX(event);
    var mouseY = links.Graph._getPageY(event);
    var offsetX = links.Graph._getAbsoluteLeft(this.frame.canvas);
    var offsetY = links.Graph._getAbsoluteTop(this.frame.canvas);
    var date = this._screenToTime(mouseX - offsetX);
    var value = this.screenToY(mouseY - offsetY);
    var dataPoint = this._findClosestDataPoint(date, value);
    this._setTooltip(dataPoint);
};

links.Graph.prototype._onMouseUp = function(event) {
    this.frame.style.cursor = "auto";
    this.leftButtonDown = false;
    this.frame.canvas.axis.style.left = links.Graph.px(0);
    this._redrawHorizontalAxis();
    this.frame.canvas.graph.style.left = links.Graph.px(0);
    this._redrawData();
    var properties = {
        start: new Date(this.start.valueOf()),
        end: new Date(this.end.valueOf())
    };
    this.trigger("rangechanged", properties);
    if (this.onmousemove) {
        links.Graph.removeEventListener(document, "mousemove", this.onmousemove);
        this.onmousemove = void 0;
    }
    if (this.onmouseup) {
        links.Graph.removeEventListener(document, "mouseup", this.onmouseup);
        this.onmouseup = void 0;
    }
    links.Graph.preventDefault(event);
};

links.Graph.prototype._onTouchStart = function(event) {
    links.Graph.preventDefault(event);
    if (this.touchDown) return;
    this.touchDown = true;
    var me = this;
    if (!this.ontouchmove) {
        this.ontouchmove = function(event) {
            me._onTouchMove(event);
        };
        links.Graph.addEventListener(document, "touchmove", this.ontouchmove);
    }
    if (!this.ontouchend) {
        this.ontouchend = function(event) {
            me._onTouchEnd(event);
        };
        links.Graph.addEventListener(document, "touchend", this.ontouchend);
    }
    this._onMouseDown(event);
};

links.Graph.prototype._onTouchMove = function(event) {
    links.Graph.preventDefault(event);
    this._onMouseMove(event);
};

links.Graph.prototype._onTouchEnd = function(event) {
    links.Graph.preventDefault(event);
    this.touchDown = false;
    if (this.ontouchmove) {
        links.Graph.removeEventListener(document, "touchmove", this.ontouchmove);
        this.ontouchmove = void 0;
    }
    if (this.ontouchend) {
        links.Graph.removeEventListener(document, "touchend", this.ontouchend);
        this.ontouchend = void 0;
    }
    this._onMouseUp(event);
};

links.Graph.prototype._onWheel = function(event) {
    event = event || window.event;
    if (!this.zoomable) return;
    var delta = 0;
    event.wheelDelta ? delta = event.wheelDelta / 120 : event.detail && (delta = -event.detail / 3);
    if (delta) {
        this._checkSize();
        var zoomFactor = delta / 5;
        if (event.shiftKey) {
            var zoomAroundValue;
            var frameTop = links.Graph._getAbsoluteTop(this.frame);
            if (void 0 != event.clientY && void 0 != frameTop) {
                var y = event.clientY - frameTop;
                zoomAroundValue = this.screenToY(y);
            } else zoomAroundValue = void 0;
            this._zoomVertical(zoomFactor, zoomAroundValue);
        } else {
            var zoomAroundDate;
            var frameLeft = links.Graph._getAbsoluteLeft(this.frame);
            if (void 0 != event.clientX && void 0 != frameLeft) {
                var x = event.clientX - frameLeft;
                zoomAroundDate = this._screenToTime(x);
            } else zoomAroundDate = void 0;
            this._zoom(zoomFactor, zoomAroundDate);
            var properties = {
                start: new Date(this.start.valueOf()),
                end: new Date(this.end.valueOf())
            };
            this.trigger("rangechange", properties);
            this.trigger("rangechanged", properties);
        }
    }
    event.preventDefault && event.preventDefault();
    event.returnValue = false;
};

links.Graph._getAbsoluteLeft = function(elem) {
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

links.Graph._getAbsoluteTop = function(elem) {
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

links.Graph._getPageY = function(event) {
    "targetTouches" in event && event.targetTouches.length && (event = event.targetTouches[0]);
    if ("pageY" in event) return event.pageY;
    var clientY = event.clientY;
    var doc = document.documentElement;
    var body = document.body;
    return clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
};

links.Graph._getPageX = function(event) {
    "targetTouches" in event && event.targetTouches.length && (event = event.targetTouches[0]);
    if ("pageX" in event) return event.pageX;
    var clientX = event.clientX;
    var doc = document.documentElement;
    var body = document.body;
    return clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
};

links.Graph.prototype.setVisibleChartRange = function(start, end, redrawNow) {
    var col, cols, rowRange, d;
    if (null != start) start = new Date(start.valueOf()); else {
        var startValue = null;
        for (col = 0, cols = this.data.length; cols > col; col++) {
            rowRange = this.data[col].rowRange;
            if (rowRange) {
                d = rowRange.min;
                void 0 != d && (startValue = void 0 != startValue ? Math.min(startValue, d.valueOf()) : d.valueOf());
            }
        }
        start = void 0 != startValue ? new Date(startValue) : new Date();
    }
    if (null != end) end = new Date(end.valueOf()); else {
        var endValue = null;
        for (col = 0, cols = this.data.length; cols > col; col++) {
            rowRange = this.data[col].rowRange;
            if (rowRange) {
                d = rowRange.max;
                void 0 != d && (endValue = void 0 != endValue ? Math.max(endValue, d.valueOf()) : d);
            }
        }
        if (void 0 != endValue) end = new Date(endValue); else {
            end = new Date();
            end.setDate(this.end.getDate() + 20);
        }
    }
    if (end.valueOf() <= start.valueOf()) {
        end = new Date(start.valueOf());
        end.setDate(end.getDate() + 20);
    }
    this._applyRange(start, end);
    this._calcConversionFactor();
    void 0 == redrawNow && (redrawNow = true);
    redrawNow && this.redraw();
};

links.Graph.prototype.setVisibleChartRangeAuto = function() {
    this.setVisibleChartRange(void 0, void 0);
};

links.Graph.prototype.setVisibleChartRangeNow = function() {
    var now = new Date();
    var diff = this.end.valueOf() - this.start.valueOf();
    var startNew = new Date(now.valueOf() - diff / 2);
    var endNew = new Date(startNew.valueOf() + diff);
    this.setVisibleChartRange(startNew, endNew);
};

links.Graph.prototype.getVisibleChartRange = function() {
    return {
        start: new Date(this.start.valueOf()),
        end: new Date(this.end.valueOf())
    };
};

links.Graph.prototype.getValueRange = function() {
    return {
        start: this.vStart,
        end: this.vEnd
    };
};

links.Graph.prototype.setValueRange = function(start, end, redrawNow) {
    this.vStart = start ? Number(start) : void 0;
    this.vEnd = end ? Number(end) : void 0;
    this.vEnd <= this.vStart && (this.vEnd = void 0);
    void 0 == redrawNow && (redrawNow = true);
    redrawNow && this.redraw();
};

links.Graph.prototype.setValueRangeAuto = function() {
    this.setValueRange(void 0, void 0);
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
            for (var event in events) events.hasOwnProperty(event) && count++;
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

links.Graph.addEventListener = function(element, action, listener, useCapture) {
    if (element.addEventListener) {
        void 0 == useCapture && (useCapture = false);
        "mousewheel" == action && navigator.userAgent.indexOf("Firefox") >= 0 && (action = "DOMMouseScroll");
        element.addEventListener(action, listener, useCapture);
    } else element.attachEvent("on" + action, listener);
};

links.Graph.removeEventListener = function(element, action, listener, useCapture) {
    if (element.removeEventListener) {
        void 0 == useCapture && (useCapture = false);
        "mousewheel" == action && navigator.userAgent.indexOf("Firefox") >= 0 && (action = "DOMMouseScroll");
        element.removeEventListener(action, listener, useCapture);
    } else element.detachEvent("on" + action, listener);
};

links.Graph.stopPropagation = function(event) {
    event || (event = window.event);
    event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true;
};

links.Graph.preventDefault = function(event) {
    event || (event = window.event);
    event.preventDefault ? event.preventDefault() : event.returnValue = false;
};

links.Graph.isOutside = function(event, parent) {
    var elem = event.relatedTarget || event.toElement || event.fromElement;
    while (elem && elem !== parent) elem = elem.parentNode;
    return elem !== parent;
};