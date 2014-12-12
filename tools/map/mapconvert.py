#!/usr/bin/python
#Copyright 2012 Nicu Pavel <npavel@mini-box.com>
#Licensed under GPLv2

# Exports a Panzer General 2 scenario (SCN) to xml

import os, sys, fnmatch
import pprint
from struct import *
from lxml import etree as x
from datetime import date
# spaghetti !
#file specs http://luis-guzman.com/links/PG2_FilesSpec.html#(MAP) file
MAP_IMAGE_URL="resources/maps/images/"
scnlist = []
maplist = []

# gets the real case sensitive file name for a file #TODO maybe cache this
def get_case_sensitive_file_name(fname):
    for root, dirs, files in os.walk("."):
        for name in files:
            if name.lower() == fname.lower():
                return name
    return ""

def iopen(name, mode):
    real_name = get_case_sensitive_file_name(name.strip('\0').rstrip())
    #print "\t Opening %s as %s" % (name, real_name)
    return open(real_name, mode)

# returns a string with all the hexes on the map file
def get_map_hexes(f):
    pos = f.tell()
    f.seek(10) # where the hex info starts
    data = f.read(12600) # 45x40x7 bytes
    f.seek(pos)
    return data

# returns a string with all the hexes on the scenario file
def get_scn_hexes(f):
    pos = f.tell()
    f.seek(22 + 388) # there the hex info starts in scn file
    data = f.read(10800) # 45x40x6 bytes
    f.seek(pos)
    return data

# returns a list with x/y coords of units (65 bytes) in the scenario
# TODO parse nicer
def get_scn_units(f):
    unit_data = {} # Hold all unit data (active, reinforce)
    units = {} # Hold active units per map col/row
    reinforce_turns = {} # Holds reinfocement units per each turn
    u_off_x  = 1 + 1 + 2 + 2 + 1 + 1 + 2 #offset in the 65 bytes struct to X coord
    u_off_y  = u_off_x + 2    #offset in the 65 bytes struct to Y coord
    u_off_id = u_off_y + 2 + 2 + 2 #offset in the 65 bytes struct to unit id
    u_off_own = u_off_id + 6 * 2 + 1 + 1 + 2 # offset in the 65 bytes struct to player owning unit
    u_off_flag = u_off_own + 1 + 1
    u_off_face = u_off_flag + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 5 + 1
    u_off_transport = u_off_id + 2
    u_off_experience = u_off_transport + 2 + 2 + 2
    u_off_leader = u_off_experience + 2 + 2
    u_off_entrenchment = u_off_flag + 6 * 1
    u_off_strength = u_off_flag + 2 * 1
    u_off_reinforce = u_off_face + 2
    pos = f.tell()
    f.seek(22 + 388 + 10800 + 140)
    while True:
	u = f.read(65)
	if not u: break
	col = unpack('h', u[u_off_x:u_off_x + 2])[0]
	row = unpack('h', u[u_off_y:u_off_y + 2])[0]
	uid  = unpack('h', u[u_off_id:u_off_id + 2])[0]
	owner = unpack('b', u[u_off_own:u_off_own + 1])[0]
	flag = unpack('b', u[u_off_flag:u_off_flag + 1])[0]
	face = unpack('h', u[u_off_face:u_off_face + 2])[0]
	transport = unpack('h', u[u_off_transport:u_off_transport + 2])[0]
	carrier = unpack('h', u[u_off_transport + 2:u_off_transport + 4])[0]
	experience = unpack('h', u[u_off_experience:u_off_experience + 2])[0]
	entrenchment = unpack('b', u[u_off_entrenchment:u_off_entrenchment + 1])[0]
	reinforce = unpack('b', u[u_off_reinforce:u_off_reinforce + 1])[0]
	strength = unpack('b', u[u_off_strength:u_off_strength + 1])[0]
	leader = unpack('h', u[u_off_leader:u_off_leader + 2])[0]
	unit_properties = [(uid, owner, flag, face, transport, carrier, experience, entrenchment, strength, leader)]

	# If reinforce is set then add the unit to the reinforce list appending row, col
	if reinforce > 0:
	    if reinforce in reinforce_turns:
		if (col,row) not in reinforce_turns[reinforce]:
		    reinforce_turns[reinforce][(col, row)] = unit_properties
		else:
		    reinforce_turns[reinforce][(col, row)] += unit_properties
	    else:
		reinforce_turns[reinforce] = {}
		reinforce_turns[reinforce][(col, row)] = unit_properties
	    continue # don't add to active unit list

	# Add the unit to the active unit list
	if (col,row) in units:
	    units[(col,row)] += unit_properties
	else:
	    units[(col,row)] = unit_properties
    f.seek(pos)
    unit_data['units'] = units
    unit_data['reinforce_turns'] = reinforce_turns
    return unit_data

# returns map name string UPPERCASE
def get_scn_map_name(f):
    pos = f.tell()
    f.seek(22 + 388 + 10800)
    data = f.read(20)
    f.seek(pos)
    return data.upper().strip('\0')

# return the player information for player number
def get_scn_player_info(scnfile, pnr):
    playerinfo = {}
    pos = scnfile.tell()
    scnfile.seek(22+97*pnr)
    data = scnfile.read(97)
    playerinfo['country'] = unpack('b', data[0])[0]
    playerinfo['side'] = unpack('b', data[16])[0]
    # parse supporting countries (max 4)
    sc = []
    for i in range(4):
	sc.append(unpack('b', data[i + 1])[0])
    playerinfo['support'] = sc;
    playerinfo['airtrans'] = unpack('b', data[6])[0]
    playerinfo['navaltrans'] = unpack('b', data[7])[0]

    # parse player prestige per turn
    tp = []
    for i in range(40):  #40 turns of 2 bytes each
	tp.append(unpack('h', data[i * 2 + 17: i * 2 + 17 + 2])[0])  #skip 17 bytes of data from the top
    playerinfo['turnprestige'] = tp

    scnfile.seek(pos)
    return playerinfo;

# returns scenario name by reading from text (which is read from scen.txt)
# at an offset specified in scn file
def get_scn_name(scnfile, text):
    pos = scnfile.tell()
    scnfile.seek(1 + 2 + 1)
    txtpos = unpack('H', scnfile.read(2))[0]
    name = text[txtpos].rstrip()
    scnfile.seek(pos)
    return name

# returns scenario description 
def get_scn_description(scnfile):
    pos = scnfile.tell()
    scnfile.seek(22 + 388 + 10800 + 20)
    descfile = scnfile.read(20).strip('\0').rstrip()
    desc = "No description"
    #print "\t Opening description file '%s'" % descfile
    try:
	f = iopen(descfile, 'r')
    except IOError:
	try:
	    f = iopen(descfile + ".txt", 'r')
	except IOError:
	    print "\t Can't open description file %s" % descfile
	else:
	    with f:
		desc = f.read()
    else:
	with f:
	    desc = f.read()
    scnfile.seek(pos)
    nstr = desc.replace("\r\n\r\n","<br>").replace("\r\n","");
    return nstr.replace('"', '\\"')

#Gets scenario info like date, ground/atmosferic conditions etc
#TODO merge the multiple get_scn_* functions into one and return a dictionary with properties
def get_scn_info(scnfile):
	info = {}
		
	pos = scnfile.tell()
	scnfile.seek(6)
	data = scnfile.read(16)
	
	info['atmosferic'] = unpack('b', data[0])[0]
	info['latitude'] = unpack('b', data[1])[0]
	# Date (year, month, day)
	d = date(1900 + unpack('H', data[6:8])[0], unpack('H', data[4:6])[0], unpack('H', data[2:4])[0])
	info['date'] = d.strftime("%B %d, %Y")
	info['dayturns'] = unpack('b', data[14])[0]
	info['ground'] = unpack('b', data[15])[0]
	
	scnfile.seek(pos)
	return info
	

# returns scenario victory turns (briliant, victory, tactical)
def get_scn_victory_turns(scnfile):
    pos = scnfile.tell()
    scnfile.seek(1 + 2 + 1 + 2 + 1 + 1 + 2 + 2 + 2 )
    t = scnfile.read(3)
    turns = []
    for i in range(3):
	turns.append(unpack('b', t[i : i+1])[0])
    
    scnfile.seek(pos)
    return turns

# return map image name, cols, rows
def get_map_info(f):
    mapinfo = {}
    pos = f.tell()
    f.seek(0)
    mapimgname = "map_" + str(unpack('h',f.read(2))[0]) + ".png"
    mapinfo['mapimg'] = mapimgname;
    mapinfo['cols'] = unpack('h',f.read(2))[0]
    mapinfo['rows'] = unpack('h',f.read(2))[0]
    f.seek(pos)
    return mapinfo
    
# generate the scenario.js file which is used by js game to list scenarios
# scnlist contains xml filename, scenario, name and an array for eachside
# with a dictionary of each player side with player id and country
#TODO: no a valid JSON because of single quotes
def generate_scn_js_file(scnlist):
    scnjs = open('scenariolist.js','w')
    scnjs.write('//Automatically generated by mapconvert.py\n\n')
    scnjs.write('var scenariolist = [\n');
    for i in scnlist:
	side0 = pprint.pformat(i[3][0])
	side1 = pprint.pformat(i[3][1])
	scnjs.write('[\"%s\", \"%s\", \"%s\", %s, %s ],\n' % (i[0], i[1], i[2], side0, side1))
    scnjs.write(']')

def write_unit_xml(l, tmpnode):
    utmpnode = x.SubElement(tmpnode,"unit")
    utmpnode.set("id", str(l[0]))
    utmpnode.set("owner", str(l[1]))
    if (l[2] != 0): utmpnode.set("flag", str(l[2])) #flags png images start from 1 in js
    utmpnode.set("face", str(l[3]))
    if (l[4] != 0): utmpnode.set("transport", str(l[4])) #assigned ground transport
    if (l[5] != 0): utmpnode.set("carrier", str(l[5])) #air/naval transport
    if (l[6] != 0): utmpnode.set("exp", str(l[6])) # experience
    if (l[7] != 0): utmpnode.set("ent", str(l[7])) # entrenchment
    if (l[8] != 10): utmpnode.set("str", str(l[8])) # original strength
    if (l[9] != 0):  utmpnode.set("ldr", "1") # if unit get a leader or not

for scn in sys.argv[1:]:
#for scn in ["CAENUK.SCN"]:
    print "Processing %s" % scn
    # the corresponding scenarion txt name
    tf = iopen(os.path.splitext(scn)[0] + ".txt",'r')
    sf = iopen(scn, 'rb')

    fmapname = get_scn_map_name(sf)
    #print "File name match for: %s is '%s'" % (fmapname, get_case_sensitive_file_name(fmapname))
    mf = iopen(get_scn_map_name(sf), 'rb')

    # contains all names list from the txt file
    scntext = tf.readlines()

    mapinfo = get_map_info(mf)
    maplist.append(mapinfo['mapimg']); # Add the map image to the list of maps needed to be copied to installation
    rows = mapinfo['rows'];
    cols = mapinfo['cols'];
    scnname = get_scn_name(sf, scntext)
    scndesc = get_scn_description(sf)
    scninfo = get_scn_info(sf)
    xmlname = os.path.splitext(scn)[0].lower() + ".xml"

    #xmlmap = x.Element('map', name="" , description="", rows="", cols="" ,image="")
    xmlmap = x.Element('map')
    xmlmap.set("file", scn)
    xmlmap.set("name", scnname)
    xmlmap.set("turns", str(get_scn_victory_turns(sf))[1:-1])
    xmlmap.set("date", str(scninfo['date']))
    xmlmap.set("dayturns", str(scninfo['dayturns']))
    xmlmap.set("ground", str(scninfo['ground']))
    xmlmap.set("atmosferic", str(scninfo['atmosferic']))
    xmlmap.set("latitude", str(scninfo['latitude']))
    xmlmap.set("rows", str(rows))
    xmlmap.set("cols", str(cols))
    xmlmap.set("image", MAP_IMAGE_URL + mapinfo['mapimg'])

    # Player (id, country) for each side. Only used in scenariolist.js
    sideplayers = [ [ ], [ ] ]
    for i in range(4):
	playerinfo = get_scn_player_info(sf, i)
	if (playerinfo['country'] != 0):
	    tmpnode = x.SubElement(xmlmap,"player")
	    tmpnode.set("id", str(i))
	    tmpnode.set("country", str(playerinfo['country']-1))
	    tmpnode.set("side", str(playerinfo['side']))
	    tmpnode.set("airtrans", str(playerinfo['airtrans']))
	    tmpnode.set("navaltrans", str(playerinfo['navaltrans']))
	    tmpnode.set("support", str(playerinfo['support'])[1:-1]) #slice off []
	    tmpnode.set("turnprestige", str(playerinfo['turnprestige'])[1:-1]) #slice off []
	    tmpdict = {}
	    tmpdict["id"] = i
	    tmpdict["country"] = playerinfo['country'] - 1 # TODO Bad export from a old pg2 version
	    sideplayers[playerinfo['side']].append(tmpdict)

    # Add to scenariolist.js list
    scnlist.append((xmlname, scnname, scndesc, sideplayers))

    col = row = 0
    # maps always define 45x40 hexes x 7 bytes first 2 being terrain and road
    # need to skip those rows,cols that aren't needed
    maphdata = get_map_hexes(mf)
    scnhdata = get_scn_hexes(sf)
    unit_data = get_scn_units(sf)
    units = unit_data['units']
    reinforce_turns = unit_data['reinforce_turns']

    #Write the reinforcement list
    for turn in reinforce_turns:
	tmpnode = x.SubElement(xmlmap, "reinforce")
	tmpnode.set("turn", str(turn))
	for pos in reinforce_turns[turn]:
	    ptmpnode = x.SubElement(tmpnode, "at")
	    ptmpnode.set("row", str(pos[1]))
	    ptmpnode.set("col", str(pos[0]))
	    for u in reinforce_turns[turn][pos]:
		write_unit_xml(u, ptmpnode)


    mapoffset = 0
    scnoffset = 0
    while True:
	terrain = road = flag = hexowner = 0;
	name = "";
	hexvictoryowner = deploy = -1;
	
	try:
	    hm = unpack('HHHc', maphdata[mapoffset:mapoffset + 7])
	except:
	    print "Can't unpack data"
	    break

        hs = unpack('BBBBH', scnhdata[scnoffset:scnoffset + 6])
	terrain,road =  hm[0:2]
	flag = hs[0] & 0x1f
	hexowner = (hs[0] & 0xe0) >> 5
	if (hs[2] & (1<<1)): hexvictoryowner = 0
	if (hs[2] & (1<<4)): hexvictoryowner = 1
	
	if (hs[3] & (1 << 2)): deploy = 0
	if (hs[3] & (1 << 3)): deploy = 1
	if (hs[3] & (1 << 4)): deploy = 2
	if (hs[3] & (1 << 5)): deploy = 3
	
	textpos = hs[4] - 1  #file index to array index
	if textpos > 0 and textpos < len(scntext):
	    name = scntext[textpos].rstrip()
	#if hs[0] > 0:
	#    print name, hs[0]
	# Reduce xml size by not creating hex elements that only have default values
	if (terrain != 0 or road != 0 or flag != 0 or hexowner != 0 or hexvictoryowner != -1 or (col,row) in units):
	    tmpnode = x.SubElement(xmlmap, "hex")
	    tmpnode.set("row", str(row))
	    tmpnode.set("col", str(col))
	    # to reduce xml size further only set attributes if different than a default value
	    if (terrain != 0): tmpnode.set("terrain", str(terrain))
	    if (road != 0): tmpnode.set("road", str(road))
	    if (name != ""): tmpnode.set("name", str(name))
	    if (flag != 0): tmpnode.set("flag", str(flag - 1)) #flags start from 0 in js
	    if (hexowner != 0): tmpnode.set("owner", str(hexowner - 1)) #owner starts from 0 in js
	    if (hexvictoryowner != -1): tmpnode.set("victory", str(hexvictoryowner))
	    if (deploy != -1): tmpnode.set("deploy", str(deploy))
	    if (col,row) in units:
		for l in units[(col,row)]:
		    write_unit_xml(l, tmpnode)
        col = col + 1
        mapoffset = mapoffset + 7
        scnoffset = scnoffset + 6
        if col == cols:
            col = 0
            row = row + 1
            mapoffset = mapoffset + (45 - cols) * 7
            scnoffset = scnoffset + (45 - cols) * 6
            #print mapoffset, scnoffset
            #print
        if row == rows:
            break 
            
    xml = x.ElementTree(xmlmap)
    xml.write(xmlname, pretty_print=True, xml_declaration=True)
    generate_scn_js_file(scnlist)

print "Maps to copy to openpanzer installation: "
for m in maplist:
    print  "%s " % m,