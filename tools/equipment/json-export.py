import csv
import json
import itertools
from pprint import pprint

f = open( 'Equip97_SEL_REPORT.csv', 'r' )
o = open( 'equipment.js', 'w');
out = ""

unitkeys = [ "Code",
         "Denomination",
         "Class",
         "SoftAtk",
         "HardAtk",
         "AirAtk",
         "NavalAtk",
         "GroundDef",
         "AirDef",
         "CloseDef",
         "Target",
         "Initiative",
         "GunRange",
         "SpotRange",
         "RangeDefMod",
         "MoveMode",
         "MovMethod",
         "MovPoints",
         "Fuel",
         "Ammo",
         "Cost",
         "MonthExpired",
         "MonthAvaible",
         "YearAvaible",
         "YearExpired",
         "Organic Transport",
         "Country",
         "Special1",
         "Special2",
         "bomberCode",
         "Icon",
         "atkMel",
         "movMel",
         "dieMel" ]

unitdict = dict.fromkeys(unitkeys)
eqdict = {}

#reader = csv.DictReader( f, delimiter=';', fieldnames = keys)

for line in f:
    unitvalues = line.split(';')
    unitdict = dict(itertools.izip(unitkeys, unitvalues))
    eqdict[unitdict["Code"]] = unitdict

out = json.dumps(eqdict, sort_keys=True, indent=4)
o.write(out)
