#Copyright 2012 Nicu Pavel <npavel@mini-box.com>
#Licensed under GPLv2
import shutil
import os
shp = open('shp.list','r')
#Where the shp are stored
#shppath = "f:\Games\panzer-stuff\opengeneral\OpenIcons"
shppath = "/indevel/panic-work/PanzerGeneral/openicons-extracted"
#Destination of the copied shp files
#shpdest = 'f:\\temp'
shpdest = './tmp'
os.makedirs(shpdest)
for infile in shp:
        f = os.path.join(shppath,infile.rstrip())
        d = os.path.join(shpdest, infile.rstrip())
        shutil.copyfile(f, d)
