/**
 * hackaton #code4italy @montecitorio 17/5/2014
 * author: emanuele de cupis
 * e.decup.is
 *
 */


var csv = require('csv');
var _ = require('underscore');


/**
 * utility che trasforma una stringa 20140315 in un oggetto Date()
 * @param  {[type]} s [description]
 * @return {[type]}   [description]
 */
var toDate = function(o, endOfDay) {
    // console.log(o);
    var y = o.slice(0, 4);
    var m = o.slice(4, 6);
    var d = o.substring(6);

    if (endOfDay) {
        return new Date(y, m, d, 23, 59, 59);
    } else {
        return new Date(y, m, d, 0, 0, 0);
    }
};

/**
 * raggruppa gli atti della camera dei deputati per mese
 * @param  {[type]} rows [description]
 * @return {[type]}      [description]
 */
exports.mensile = function(rows, title) {
    //definisco il range globale

    var count = rows.length;
    var first = rows[0];
    var last = rows[count - 1];

    //  console.log('first: ' + first);

    //array dei risultati filtrati per mese e anno
    var r = {};


    //creo la clusterizzazione
    _.each(rows, function(e) {
        var e = e.split(',');
        var q = e[0];
        var d = toDate(e[1]);

        //   console.log('q: ' + q + ' d: ' + d);

        //prendo l'anno di riferimento 
        var y = d.getFullYear();

        //se non l'ho già istanziato, lo aggiungo
        if (!r[y]) {
            r[y] = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0
            };
        }

        //prendo il mese di riferimento (che è base 0)
        var m0 = d.getMonth();
        var m1 = d.getMonth() + 1;

        //   console.log('m0: ' + m0);

        //sommo 
        var v = r[y][m1];
        if (_.isNumber(v)) {
            r[y][m1] = v + Number(q);
        } else {
            r[y][m1] = Number(q);
        }



    });

    //esplodo il file flat
    var output = [];


    // console.log(JSON.stringify(r));

    for (var year in r) {
        var months = r[year];



        for (var month in months) {

            var count = months[month];


            var startDate = new Date(year, month, 1);

            var _endDate;
            if (month == 12) {
                _endDate = new Date(Number(year) + 1, 1, 1);
            } else {
                _endDate = new Date(year, Number(month) + 1, 1);
            }

            //il primo giorno del mese successivo meno un secondo
            endDate = new Date(_endDate.setSeconds(_endDate.getSeconds() - 1));
            //  console.log(startDate.toString());
            //  console.log(endDate.toString());
            output.push({
                'start': startDate,
                'end': endDate,
                'content': {
                    title: title || 'atti',
                    count: count
                }
            });

        }

    }



    // output = [_.last(output)];

    //filtro
    /*   output = _.filter(output, function(i) {
        var start = new Date(i['start']);
        var end = new Date(i['start']);
        var now = new Date();

        if (now < start) {
            return false;
        } else if (start.getFullYear() < 2013) {
            return false;
        }
        return true



    });*/

    console.log('****' + title + '****');
    //  console.log(output);

    return output;


}