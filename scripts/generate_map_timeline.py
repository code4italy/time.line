#!/usr/bin/env python
import re
import json
from time import sleep
from collections import defaultdict
from datetime import date

from SPARQLWrapper import SPARQLWrapper, JSON

CITY_JSON_PATH = "../app/json/capoluoghi.json"

tmpl = """SELECT DISTINCT ?uid ?data ?nomeAtto ?atto
WHERE
{
      ?atto a ocd:atto .
      ?atto dc:title ?nomeAtto .
      ?atto dc:date ?data .
      ?atto dc:identifier ?uid .
      FILTER (regex(?nomeAtto, "%s", "s")) .
} 
ORDER BY ASC(?data)"""

dt_rxp = re.compile("(\d{4})(\d{2})(\d{2})")

def stamp_to_dt(s):
    return date(*(int(el) for el in dt_rxp.match(s).groups()))

def get_cities():
    with open(CITY_JSON_PATH, "r") as fd:
        return sorted(json.loads(fd.read()).keys())

def process_heatmap(heatmap):
    return sorted((k, v) for k, v in heatmap.items())

def main():
    cities = get_cities()
    heatmap = defaultdict(list)
    acts = defaultdict(dict)
    sparql = SPARQLWrapper("http://dati.camera.it/sparql")
    for city in cities:
        print("Getting {0}...".format(city)),
        sparql.setQuery(tmpl % city)
        sparql.setReturnFormat(JSON)
        response = sparql.query().convert()
        results = response["results"]["bindings"]
        for each in results:
            uid = each["uid"]["value"]
            d = each["data"]["value"]
            title = each["nomeAtto"]["value"].encode("utf-8")
            ref = each["atto"]["value"]
            try:
                dt = stamp_to_dt(d).isoformat()
            except ValueError:
                print("Error on: {0} {1} {2} {3}"
                        .format(uid, d, title, ref))
                continue
            heatmap[dt].append(city)
            acts[dt][uid] = {"title": title, "ref": ref}
        else:
            print("done.")
            sleep(1)
    else:
        timeline = process_heatmap(heatmap)
        for name, obj in (("timeline", timeline),
                ("heatmap", heatmap),
                ("acts", acts)):
            with open("{0}.json".format(name), "w") as fd:
                fd.write(json.dumps(obj))

if __name__ == '__main__':
    main()
