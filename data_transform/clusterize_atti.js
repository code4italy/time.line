/**
 * hackaton #code4italy @montecitorio 17/5/2014
 * author: emanuele de cupis
 * e.decup.is
 *
 */

var clusterize = require('./lib/clusterize');
var csv = require('csv');
var fs = require('fs');
var _ = require('underscore');
var DATA_DIR = '../data';
var WEB_DIR = '../app/json';



function ReadAndWrite(source, destination, fn, cb) {
    //leggere csv raw data
    csv().from(source).to(function(e) {

        var rows = e.split('\n')
        var header = rows.shift();

        console.log(source);
        console.log(destination);
        console.log(rows.length);
        var o = fn(rows);
        console.log(Boolean(o));
        // console.log(JSON.stringify(o));

        fs.writeFile(destination, JSON.stringify(o), function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
            }
            cb && cb();
        });


    });

}





/**
 * funzioni di clusterizzazione
 * mi aspetto un array di stringhe in formato
 * @type {Object}
 */
var generators = {
    'mensile': function(rows) {

        var t = 'mensile'
        var source = DATA_DIR + '/atti_ultimaLeg_xGG.csv';
        var destination = WEB_DIR + '/data_cluster_' + t + '.json';
        var fn = function(rows) {
            return clusterize.mensile(rows);

        }

        ReadAndWrite(source, destination, fn)


    },
    'mensile_pdl': function(rows) {
        var t = 'mensile_pdl';
        var source = DATA_DIR + '/atti_ultimaLeg_xGG_piuDati.csv';
        var destination = WEB_DIR + '/data_cluster_' + t + '.json';
        var fn = function(rows) {
            rows = _.filter(rows, function(r) {
                r = r.split(',');
                console.log(r[2]);
                return r[2] == "Proposta di legge ordinaria";
            });

            return clusterize.mensile(rows, "Proposta di legge ordinaria");

        }

        ReadAndWrite(source, destination, fn)


    },
    'mensile_ddl': function(rows) {
        var t = 'mensile_ddl';
        var source = DATA_DIR + '/atti_ultimaLeg_xGG_piuDati.csv';
        var destination = WEB_DIR + '/data_cluster_' + t + '.json';
        var fn = function(rows) {
            rows = _.filter(rows, function(r) {
                r = r.split(',');
                console.log(r[2]);

                return r[2] == "Disegno di legge ordinario";
            });
            return clusterize.mensile(rows, "Disegno di legge ordinario");

        }

        ReadAndWrite(source, destination, fn)

    },
    'mensile_pdlc': function(rows) {
        var t = 'mensile_pdlc';
        var source = DATA_DIR + '/atti_ultimaLeg_xGG_piuDati.csv';
        var destination = WEB_DIR + '/data_cluster_' + t + '.json';
        var fn = function(rows) {
            rows = _.filter(rows, function(r) {
                r = r.split(',');
                console.log(r[2]);
                return r[2] == "Proposta di legge costituzionale";
            });
            return clusterize.mensile(rows, "Proposta di legge costituzionale");

        }

        ReadAndWrite(source, destination, fn)

    },
    'trimestrale': function() {},
    'semestrale': function() {}
};


//per ogni livello di cluster (mensile, trimestrale, semestrale) generare file json per Timelinejs
for (var c in generators) {
    console.log(c);
    var fn = generators[c];
    if (fn) {
        var o = fn();

    }
}