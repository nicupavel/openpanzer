import shutil
import os
shp = open('shp.list','r')
#Where the shp are stored
shppath = "f:\Games\panzer-stuff\opengeneral\OpenIcons"
#Destination of the copied shp files
shpdest = 'f:\\temp'

for infile in shp:
        f = os.path.join(shppath,infile.rstrip())
        d = os.path.join(shpdest, infile.rstrip())
        shutil.copyfile(f, d)
