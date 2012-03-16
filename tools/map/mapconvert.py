import os, sys
from pprint import pprint
from struct import *
from lxml import etree as x
# spaghetti !
#file specs http://luis-guzman.com/links/PG2_FilesSpec.html#(MAP) file
MAP_IMAGE_URL="resources/maps/images/"

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
def get_scn_units(f):
    units = {}
    u_off_x  = 1 + 1 + 2 + 2 + 1 + 1 + 2 #offset in the 65 bytes struct to X coord
    u_off_y  = u_off_x + 2    #offset in the 65 bytes struct to Y coord
    u_off_id = u_off_y + 2 + 2 + 2 #offset in the 65 bytes struct to unit id
    u_off_own = u_off_id + 6 * 2 + 1 + 1 + 2 # offset in the 65 bytes struct to player owning unit
    pos = f.tell()
    f.seek(22 + 388 + 10800 + 140)
    while True:
	u = f.read(65)
	if not u: break
	col = unpack('h', u[u_off_x:u_off_x + 2])[0]
	row = unpack('h', u[u_off_y:u_off_y + 2])[0]
	uid  = unpack('h', u[u_off_id:u_off_id + 2])[0]
	owner = unpack('b', u[u_off_own:u_off_own + 1])[0]
	units[(col,row)] = (uid, owner)
    f.seek(pos)
    return units

# returns map name string UPPERCASE
def get_scn_map_name(f):
    pos = f.tell()
    f.seek(22 + 388 + 10800)
    data = f.read(20)
    f.seek(pos)
    return data.upper().strip('\0')


# returns scenario description
def get_scn_description(scnfile, text):
    pos = scnfile.tell()
    scnfile.seek(1+2+1)
    txtpos = unpack('H', scnfile.read(2))[0]
    desc = text[txtpos].rstrip()
    scnfile.seek(pos)
    return desc

# return map image name, cols and rows
def get_map_info(f):
    mapinfo = []
    pos = f.tell()
    f.seek(0)
    mapimgname = "map_" + str(unpack('h',f.read(2))[0]) + ".png"
    mapinfo.append(mapimgname)
    mapinfo.append(unpack('h',f.read(2))[0])
    mapinfo.append(unpack('h',f.read(2))[0])
    f.seek(pos)
    return mapinfo

for scn in sys.argv[1:]:
#for scn in ["CAENUK.SCN"]:
    print "Processing %s\n" % scn
    # the corresponding scenarion txt name
    tf = open(os.path.splitext(scn)[0] + ".TXT",'r')
    sf = open(scn, 'rb')
    mf = open(get_scn_map_name(sf), 'rb')
    # contains all names list from the txt file
    scntext = tf.readlines()
    
    mapimgname, cols, rows = get_map_info(mf)
    scndesc = get_scn_description(sf, scntext)
    
    #xmlmap = x.Element('map', name="" , description="", rows="", cols="" ,image="")
    xmlmap = x.Element('map')
    xmlmap.set("name", scn)
    xmlmap.set("description", scndesc)
    xmlmap.set("rows", str(rows))
    xmlmap.set("cols", str(cols))
    xmlmap.set("image", MAP_IMAGE_URL + mapimgname)
    
    col = row = 0
    # maps always define 45x40 hexes x 7 bytes first 2 being terrain and road
    # need to skip those rows,cols that aren't needed
    maphdata = get_map_hexes(mf)
    scnhdata = get_scn_hexes(sf)
    units = get_scn_units(sf)
    mapoffset = 0
    scnoffset = 0
    while True:
        hm = unpack('HHHc', maphdata[mapoffset:mapoffset + 7])
        hs = unpack('bbbbH', scnhdata[scnoffset:scnoffset + 6])
	terrain,road =  hm[0:2]
	name = ""
	textpos = hs[4] - 1  #file index to array index
	if textpos > 0:
	    name = scntext[textpos].rstrip()
	#if hs[0] > 0:
	#    print name, hs[0]
	tmpnode = x.SubElement(xmlmap, "hex")
	tmpnode.set("row", str(row))
	tmpnode.set("col", str(col))
	tmpnode.set("terrain", str(terrain))
	tmpnode.set("road", str(road))
	tmpnode.set("name", str(name))
	
	if (col,row) in units:
	    utmpnode = x.SubElement(tmpnode,"unit")
	    utmpnode.set("id",str(units[(col,row)][0]))
	    utmpnode.set("owner", str(units[(col,row)][1]))
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
    xml.write(os.path.splitext(scn)[0].lower() + ".xml", pretty_print=True, xml_declaration=True)