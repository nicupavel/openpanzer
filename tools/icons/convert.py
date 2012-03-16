import os, sys
import Image

# PG2 "transparent" colors
pg2r = 248
pg2g = 228
pg2b = 216

infile = "test.bmp"
#TODO parse shp files directly and work with palette
for infile in sys.argv[1:]:
        f, e = os.path.splitext(infile)
        outfile = f.lower() + ".png"
        if infile != outfile:
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
