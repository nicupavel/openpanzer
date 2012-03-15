import os, sys
from pprint import pprint
from struct import *
#based on http://luis-guzman.com/links/PG2_FilesSpec.html#(MAP) file

# list of tuples (terrain, road)
h = []

for map in sys.argv[1:]:
    print "Processing %s\n" % map
    f = open(map, 'r')
    mapnr = unpack('h',f.read(2))[0]
    cols = unpack('h',f.read(2))[0]
    rows = unpack('h',f.read(2))[0]
    print "Map: %d Cols: %d Rows: %d \n" % (mapnr,cols,rows)
    f.seek(f.tell() + 2 + 2) # skip unknown fields
    skip = f.tell()
    col = row = 0
    # maps always define 45x40 hexes x 7 bytes
    while f.tell() < 45*40*7 + skip:
	data = unpack('HHHc', f.read(7))
	print data[0:2],
	col = col + 1
	if col == cols:
	    col = 0
	    row = row + 1
	    f.seek(f.tell() + (45 - cols) *7)
	    print
	    print
	    #print "jumped to %d\n" % f.tell()
	if row == rows:
	    break
	
	#h.append(data[0:2]) #only terrain type and road
	
    #for i in range (rows-1):
	#print h[i*cols: i*cols+cols]
