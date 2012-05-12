#Copyright 2012 Nicu Pavel <npavel@mini-box.com>
#Licensed under GPLv2
#Converts *.bmp files exported from OpenGeneral to *.png files used by OpenPanzer
import shutil
import os, sys
import time, datetime, os
from pprint import pprint
import Image
import re
import itertools
from subprocess import call

# PG2 "transparent" palette colors
pg2r = 248
pg2g = 228
pg2b = 216

#Program to optimise png file
PNGOPT = "/usr/bin/optipng"

fshp = open('shp.list','r')
shp = fshp.readlines()

# icon names from original PG2 equipment are replaced in OpenGeneral icons with different names
# If USE_REPLACED_ICONS is set to true the new icons will be used but saved with old names
USE_REPLACED_ICONS = True

#Where the OpenGeneral .bmp files are stored
BMPPATH = "/indevel/panic-work/PanzerGeneral/openicons-extracted"

#Destination of the png files
DESTPATH = 'icon-export-' + datetime.date.today().isoformat()


if not os.path.exists(DESTPATH):
    os.makedirs(DESTPATH)


if (USE_REPLACED_ICONS):
    replacedshp = []

    #What file holds the replacement information
    fopenshp = open('OpenIcons.txt', 'r');

    # read the OpenIcons file into a dictionary for easy access
    openshp = {}
    for line in fopenshp:
	if "replaced" in line:
	    key, val = line.strip().split(':', 1)
	    openshp[key] = val

    #pprint(openshp)
    regex = re.compile('replaced by (.*)')
    for icon in shp:
	name = os.path.splitext(icon)[0];
	if name in openshp:
	    m = re.search(regex, openshp[name]).groups()[0]
	    if m:
		replacedshp.append(m + ".bmp")
	    else:
		replacedshp.append(name + ".bmp")
	else:
	    replacedshp.append(name + ".bmp")

icon_list = []
input_icons = []
output_icons = []

if (USE_REPLACED_ICONS):
    icon_list = replacedshp
else:
    icon_list = shp

# Generate the list of input icon names and output icon names
for icon, origicon in itertools.izip_longest(replacedshp, shp):
    i = os.path.join(BMPPATH, icon.rstrip())

    outname = os.path.splitext(origicon.rstrip().lower())[0]
    outname += ".png"
    o = os.path.join(DESTPATH, outname)

    input_icons.append(i)
    output_icons.append(o)

#pprint(input_icons)
#pprint(output_icons)
nul = open(os.devnull, 'w')
#Convert bmp to png with transparency
for infile, outfile in itertools.izip_longest(input_icons, output_icons):
    print "Processing %s ...." %infile,
    simg = Image.open(infile).convert("RGBA").save(outfile,"PNG")
    dimg = Image.open(outfile)
    dimg.load()
    src = dimg.split()
    R, G, B, A = 0, 1, 2, 3
    mr = src[R].point(lambda i: i != pg2r and 255)
    mg = src[G].point(lambda i: i != pg2g and 255)
    mb = src[B].point(lambda i: i != pg2b and 255)
    dimg = Image.merge(dimg.mode, (src[R], src[G], src[B], mr and mg and mb)) 
    dimg.save(outfile, "PNG")
    print " done"
    print "Optimising %s ...." %outfile,
    call([PNGOPT, "-o7", outfile], stdout=nul, stderr=nul)
    print " done"
