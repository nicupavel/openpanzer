import json
import itertools
from pprint import pprint

testdata = { 1 : {"attackRadius": 2, "icon": "ger-tank-1.png", "id": 1, "maxAmmo": 16, "maxFuel": 60, "moveRadius": 3,"name": "Panzer III", "type": 0} }
unitkeys = ("attackRadius","icon","id","maxAmmo","maxFuel","moveRadius","name","type")
unitvalues = [2, "ger-tank-2.png", 2, 10, 20, 4, "Panzer IV", 0]
#unitdict = dict.fromkeys(unitkeys)
eqdict = {}
js = open('equipment-template.js')
ojs = open('equipment-test.js', 'w')
d = json.load(js)
js.close()
unitdict  = dict(itertools.izip(unitkeys, unitvalues))
eqdict[1] = unitdict
eqdict[2] = unitdict
pprint(d)
pprint(testdata)
pprint(unitdict)
pprint(eqdict)

out = json.dumps(eqdict, sort_keys = True, indent = 4)
ojs.write(out)

