/**
 * hackaton #code4italy @montecitorio 17/5/2014
 * author: emanuele de cupis
 * e.decup.is
 *
 */

var csv = require('csv');
var fs = require('fs');
var _ = require('underscore');
var DATA_DIR = '../data';
var WEB_DIR = '../app/json';

function j1(o, endOfDay) {
    console.log(o);
    var y = o.slice(0, 4);
    var m = o.slice(4, 6);
    var d = o.substring(6);

    if (endOfDay) {
        return new Date(y, m, d, 23, 59, 59);
    } else {
        return new Date(y, m, d, 0, 0, 0);
    }
}

function j2(o, endOfDay) {
    console.log(o);
    o = o.split('/');
    var y = o[2];
    var m = o[1];
    var d = o[0];

    if (endOfDay) {
        return new Date(y, m, d, 23, 59, 59);
    } else {
        return new Date(y, m, d, 0, 0, 0);
    }
}


var getCsvRows = function(separator, cb) {


    var source = DATA_DIR + '/atti_ultimaLeg_xGG.csv';

    //leggere csv raw data
    csv().from(source).options({
        delimiter: separator
    }).to(function(e) {

        var rows = e.split('\n')
        var header = rows.shift();

        cb && cb(rows);



    });

};

function getSourceFile(type) {
    return DATA_DIR + '/' + type + '.csv';
}


function getDestinationFile(type) {
    return WEB_DIR + '/data_' + type + '.json';
}


var ReadAndSave = function(fn, type) {

    csv().from(getSourceFile(type), {
        delimiter: ';'
    }).to(function(e) {
        console.log('ciao');
        console.log(type);
        var rows = e.split('\n')
        var header = rows.shift();



        var o = _.map(rows, fn);

        fs.writeFile(getDestinationFile(type), JSON.stringify(o), function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
            }
        });

    });


};

var fn = {
    'elezioni': function() {

        ReadAndSave(function(r) {
            row = r.split(';');
            return {
                "start": j2(row[1]),
                "content": {
                    "title": row[0],
                    "type": 'elezioni'
                }
            }
        }, 'elezioni');


    },
    'governi': function() {
        ReadAndSave(function(r) {
            row = r.split(';');
            return {
                "start": j2(row[1]),
                "content": {
                    "title": row[0],
                    "type": 'governi'
                }
            }
        }, 'governi');


    },
    'referendum': function() {

        ReadAndSave(function(r) {
            row = r.split(';');
            return {
                "start": j2(row[1]),
                "content": {
                    "title": row[0],
                    "type": 'referendum'
                }
            }
        }, 'referendum');


    }

};

var t = ['elezioni', 'governi', 'referendum'];


_.each(t, function(x) {
    fn[x]();
});