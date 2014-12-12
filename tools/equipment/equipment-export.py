#!/usr/bin/python
#Copyright 2012 Nicu Pavel <npavel@mini-box.com>
#Licensed under GPLv2
#import csv
import json
import itertools
from pprint import pprint

#MAX_ID_TO_EXPORT=3000
MAX_ID_TO_EXPORT=3959

#As exported by SuitePG2 Report Items ALL Data or Known Data
# originally exported with id = Code, name = Denomination
# if key starts with __SKIP it won't get exported to json
# this corresponts to column order not actual names that CSV lists on header
unitkeys_known_data = [ 
	"id",			# Code
        "name", 			# Denomination
        "uclass",			# Class
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
        "yearavailable",		#YearAvailable
        "yearexpired",			#YearExpired
        "__SKIPOrganic Transport",
        "country",
        "__SKIPSpecial1",
        "__SKIPSpecial2",
        "__SKIPbombercode",
        "icon",
        "__SKIPatkMel",
        "__SKIPmovMel",
        "__SKIPdieMel" ]

unitkeys = [
	"id",			# Code
        "name", 			# Denomination
        "uclass",			# Class
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
	"__SKIPbyteB21",
	"cost",
	"__SKIPbyteB23,24",
	"__SKIPbyteB25",
        "__SKIPMonthExpired",
        "__SKIPMonthAvaible",
        "yearavailable",		#YearAvailable
        "yearexpired",			#YearExpired
        "__SKIPOrganic Transport",
        "country",
        "Special1",
        "Special2",
	"Special3",		#Was byteB37
	"__SKIPbyteB38",
	"__SKIPbombercode",
        "icon",
        "__SKIPatkMel",
        "__SKIPmovMel",
        "__SKIPdieMel",
	"groundweight", 		#Byte52
	"airseaweight",			#Byte53
	"__SKIPbyte54",
	"__SKIPbyte55",
	"__SKIPbyte56",
	"__SKIPbyte57",
	"__SKIPbyte58",
	"__SKIPbyte59",
	"__SKIPbyte60",
	"__SKIPbyte61",
	"__SKIPbyte62",
	"__SKIPbyte63",
	"__SKIPbyte64",
	"__SKIPbyte65",
	"__SKIPbyte66",
	"__SKIPbyte67",
	"__SKIPbyte68",
	"__SKIPbyte69",
	"__SKIPbyte70",
	"__SKIPbyte71",
	"__SKIPbyte72",
	"__SKIPbyte73"
]


#country hash for splitting equipment by country as an alternative format
countrydict = {}
# dict for building indexes on each country dict
unitclass_index = {}
# hash for unit properties used by HTML5 PG (not all properties exported ATM see __SKIP entries above)
odict = {}
# list for unit properties used as an alternative to the above hash
olist = []
# a dictionary with all values from the SuitePG2 exported csv
unitdict = dict.fromkeys(unitkeys)
# final equipment dictionary hash of hash results in a big file > 300k
eqdict = {}
# final equipment dictionary using the hash of list as alternative to the above hash
eqcdict = {}
# Hold the dictionary <-> array key order
parsehints = []
# Unique set with SHP files that will need to be converted (will be used by convert-icons.py script)
shplist = set()
#from where the html code will load the images of the units
imgpath = "resources/units/images/"
imgext = ".png"
out = ""


f = open('EQUIP97_REPORT.csv', 'r' )
next(f) # skip header
next(f) # skip entry 0
o = open('equipment.js', 'w') # file that list each property as a hash, nice but big >300k
oc = open ('equipment-condensed.js', 'w') # a condensed version that list properties in an array
shp = open('../icons/shp.list', 'w')

#reader = csv.DictReader( f, delimiter=';', fieldnames = keys)

# Returns value shifted with 0, 8, 16 bits depending on Special<N> type
def get_special_attr(k, v):
    if k == "Special1":
	return int(v)
    if k == "Special2":
	return int (v) << 8
    if k == "Special3":
	return int(v) << 16


for line in f:
    unitvalues = line.split(';')
    unitdict = dict(itertools.izip(unitkeys, unitvalues))
    olist = []
    parsehints = []
    countrykey = "country-0"  # key for storing into countrydict
    extendedAttr = 0 # for storing the 3 byte special bits
    unitid = 0 # the unit equipment id
    # make proper values for our js
    for k,v in unitdict.iteritems():
        if "__SKIP" not in k:
	    
	    if k == "id":
		unitid = int(v)
		continue

    	    # From the 3 Special attributes bytes we make 1 big 32 bit integer so we don't add each
	    if "Special" not in k:
		parsehints.append(k)

            if k == "name":
		unicodestr = unicode(v, "latin1").encode("utf-8")
                odict[k] = unicodestr
                olist.append(unicodestr)
            elif k == "icon":
                odict[k] = imgpath + v.lower() + imgext
                olist.append(imgpath + v.lower() + imgext)
                shplist.add(v.upper()) #Only add file name without extension since some might be bmp or png
            elif k == "yearavailable" or k == "yearexpired": # PG2 exports only last 2 digits of the year add 1900 to that
		odict[k] = int(v) + 1900
		olist.append(int(v) + 1900)
	    elif "Special" in k:
		extendedAttr += get_special_attr(k, v)
            else:
                odict[k] = int(v)
                olist.append(int(v))
                if k == "country":
                    countrykey = "country-" + v
                    if not countrydict.has_key(countrykey):
                        countrydict[countrykey] = {}
                        countrydict[countrykey]["units"] = {} # the units in this country equipment
			countrydict[countrykey]["parsehints"] = parsehints # save the mapping between array index and hash names for unit keys(generic but saved in all files)
                        countrydict[countrykey]["indexes"] = {} # the indexes for quick lookups by category
                        countrydict[countrykey]["indexes"]["unitclass"] = {} # unitclass index (the only index defined atm)

    # Add extended unit attributes at the end of the list to maintain compatibility
    parsehints.append("attr")
    odict["attr"] = extendedAttr
    olist.append(extendedAttr)


    if unitid < MAX_ID_TO_EXPORT and odict["name"].lower() != "free slot":
	eqdict[unitid] = odict.copy()
        eqcdict[unitid] = olist
	countrydict[countrykey]["units"][unitid] = olist
	if not countrydict[countrykey]["indexes"]["unitclass"].has_key(odict["uclass"]):
    	    countrydict[countrykey]["indexes"]["unitclass"][odict["uclass"]] = []
	countrydict[countrykey]["indexes"]["unitclass"][odict["uclass"]].append(unitid)

	#Add mapping in all countries dicts
	#if not countrydict[countrykey]["parsehints"]:
	#    eqkeymap = []
	#    for k in odict:
	#	eqkeymap.append(k)
	#	print "%s " % k,
	#    countrydict[countrykey]["parsehints"] = eqkeymap

# build the loader for condensed equipment js mapping key order from dictionary to array index
jsloader = "\nvar equipment = {};\n"
jsloader += "for (var i in equipment_condensed)\n"
jsloader += "{\n"
jsloader +="\tvar ud = {};\n"
jsloader +="\tvar e = equipment_condensed[i];\n"

idx = 0
for k in parsehints:
    jsloader += "\tud." + k + " = e[" + str(idx) + "];\n"
    idx = idx + 1
jsloader += "\tequipment[ud.id] = ud;\n"
jsloader += "}\n"
jsloader += "delete equipment_condensed;\n"
jsloader += "equipment_condensed = null;\n"

#pprint(eqdict)
#pprint(eqcdict)

o.write("//Automatically generated by tools/equipment/equipment-export.py\n")
o.write("var equipment = ")
out = json.dumps(eqdict, sort_keys=True, indent=4, ensure_ascii=False)
o.write(out)



oc.write("//Automatically generated by tools/equipment/equipment-export.py\n")
oc.write("equipment_condensed = ")
out = json.dumps(eqcdict, sort_keys=True, separators=(',',':'), ensure_ascii=False)
oc.write(out)
oc.write(jsloader)


#Save equipment in a separate file for each country
for k in countrydict:
    fcd = open("equipment-" + k + ".json", "w")
    out = json.dumps(countrydict[k], sort_keys=True, separators=(',',':'), ensure_ascii=False)
    out = out.replace('{', '{\n').replace('}', '}\n').replace('],', '],\n') #TODO compile a regex
    fcd.write(out)

for i in shplist:
    shp.write("%s\n" % i)
