#Copyright 2012 Nicu Pavel <npavel@mini-box.com>
#Licensed under GPLv2
#import csv
import json
import itertools
from pprint import pprint


#As exported by SuitePG2 Report Items with Known Data
# originally exported with id = Code, name = Denomination
# if key starts with __SKIP it won't get exported to json
# this corresponts to column not actual names that CSV lists on header
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


# hash for unit properties used by HTML5 PG (not all properties exported ATM see __SKIP entries above)
odict = {}
# list for unit properties used as an alternative to the above hash
olist = [];
# a dictionary with all values from the SuitePG2 exported csv
unitdict = dict.fromkeys(unitkeys)
# final equipment dictionary hash of hash results in a big dile > 300k
eqdict = {}
# final equipment dictionary using the hash of list as alternative to the above hash
eqcdict = {}
# List with SHP files that will need to be converted (will be used by convert.py script)
shplist = []
#from where the html code will load the images of the units
imgpath = "resources/units/images/"
imgext = ".png"
out = ""


f = open( 'Equip97_REPORT.csv', 'r' )
o = open( 'equipment.js', 'w'); # file that list each property as a hash, nice but big >300k
oc = open ('equipment-condensed.js', 'w'); # a condensed version that list properties in an array
shp = open( '../icons/shp.list', 'w')

#reader = csv.DictReader( f, delimiter=';', fieldnames = keys)

for line in f:
    unitvalues = line.split(';')
    unitdict = dict(itertools.izip(unitkeys, unitvalues))
    olist = []
    # make proper values for our js
    for k,v in unitdict.iteritems():
        if "__SKIP" not in k:
            if k == "name":
                odict[k] = v
                olist.append(v);
            elif k == "icon":
                odict[k] = imgpath + v + imgext
                olist.append(imgpath + v + imgext)
                shplist.append(v + ".SHP")
            else:
                odict[k] = int(v)
                olist.append(int(v))
    eqdict[odict["id"]] = odict.copy()
    eqcdict[odict["id"]] = olist

#pprint(eqdict)
#pprint(eqcdict)
out = json.dumps(eqdict, sort_keys=True, indent=4)
o.write(out)

out = json.dumps(eqcdict, sort_keys=True, separators=(',',':'))
oc.write(out)

for i in shplist:
    shp.write("%s\n" % i)
