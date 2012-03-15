import os, sys
from pprint import pprint
from struct import *

#file specs http://luis-guzman.com/links/PG2_FilesSpec.html#(MAP) file

# list of tuples (terrain, road)
h = []

#for map in sys.argv[1:]:
for map in ["DESSAU.MAP"]:
    print "Processing %s\n" % map
    f = open(map, 'rb')
    mapnr = unpack('h',f.read(2))[0]
    cols = unpack('h',f.read(2))[0]
    rows = unpack('h',f.read(2))[0]
    print "Map: %d Cols: %d Rows: %d \n" % (mapnr,cols,rows)
    f.seek(f.tell() + 2 + 2) # skip unknown fields
    col = row = 0
    # maps always define 45x40 hexes x 7 bytes first 2 being terrain and road
    data = f.read(12600)
    offset = 0
    while True:
        s = unpack('HHHc', data[offset:offset+7])
        print s[0:2],    
        col = col + 1
        offset = offset + 7
        if col == cols:
            col = 0
            row = row + 1
            offset = offset + (45 - cols)*7
            print offset
            print
        if row == rows:
            break 
           
    #h.append(data[0:2]) #only terrain type and road
    
    #for i in range (rows-1):
    #print h[i*cols: i*cols+cols]
