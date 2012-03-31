#Copyright 2012 Nicu Pavel <npavel@mini-box.com>
#Licensed under GPLv2
#import csv
import json
import itertools
from pprint import pprint


#As exported by SuitePG2 Report Items with Known Data
# originally exported with id = Code, name = Denomination
# if key starts with __SKIP it won't get exported to json

unitkeys = [ "id",
         "name",
         "class",
         "softatk",
         "hardatk",
         "airatk",
         "navalatk",
         "grounddef",
         "airdef",
         "closedef",
         "target",
         "initiative",
         "gunrange",
         "spotrange",
         "rangedefmod",
         "___SKIPmovemode",
         "movmethod",
         "movpoints",
         "fuel",
         "ammo",
         "cost",
         "__SKIPMonthExpired",
         "__SKIPMonthAvaible",
         "__SKIPYearAvaible",
         "__SKIPYearExpired",
         "__SKIPOrganic Transport",
         "country",
         "__SKIPSpecial1",
         "__SKIPSpecial2",
         "bombercode",
         "icon",
         "__SKIPatkMel",
         "__SKIPmovMel",
         "__SKIPdieMel" ]


# a reduced version used by HTML5 PG
odict = {}
# a dictionary with all values from the SuitePG2 exported csv
unitdict = dict.fromkeys(unitkeys)
# final equipment dictionary
eqdict = {}
# List with SHP files that will need to be converted (will be used by convert.py script)
shplist = []
#from where the html code will load the images of the units
imgpath = "resources/units/images/"
imgext = ".png"
out = ""


f = open( 'Equip97_REPORT.csv', 'r' )
o = open( 'equipment.js', 'w');
shp = open( '../icons/shp.list', 'w')

#reader = csv.DictReader( f, delimiter=';', fieldnames = keys)

for line in f:
    unitvalues = line.split(';')
    unitdict = dict(itertools.izip(unitkeys, unitvalues))

    # make proper values for our js
    for k,v in unitdict.iteritems():
        if "__SKIP" not in k:
            if k == "name":
                odict[k] = v
            elif k == "icon":
                odict[k] = imgpath + v + imgext
                shplist.append(v + ".SHP")
            else:
                odict[k] = int(v)
                
    eqdict[odict["id"]] = odict.copy()

#pprint(eqdict)
out = json.dumps(eqdict, sort_keys=True, indent=4)
o.write(out)
for i in shplist:
    shp.write("%s\n" % i)
