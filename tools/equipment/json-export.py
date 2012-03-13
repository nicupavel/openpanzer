import csv
import json

f = open( 'Equip97_SEL_REPORT.csv', 'r' )
o = open( 'equipment.js', 'w');
out = ""
# There are some spelling error on top of PG2Suite exported csv
keys = ( "Code",
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
         "dieMel" )

reader = csv.DictReader( f, delimiter=';', fieldnames = keys)

out = json.dumps([row for row in reader], sort_keys=True, indent=4)
    
o.write(out)
