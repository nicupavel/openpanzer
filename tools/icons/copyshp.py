import shutil
import os
shp = open('shp.list','r')
#Where the shp are stored
shppath = "f:\Games\panzer-stuff\opengeneral\OpenIcons"
shppath = "/indevel/panic-work/PanzerGeneral/opengeneral/OpenIcons"
#Destination of the copied shp files
#shpdest = 'f:\\temp'
shpdest = './tmp'

for infile in shp:
        f = os.path.join(shppath,infile.rstrip().upper())
        d = os.path.join(shpdest, infile.rstrip().upper())
        shutil.copyfile(f, d)
