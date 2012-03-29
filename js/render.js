function Render(mapObj)
{
	var map = mapObj;
	
	var imgUnits = {};
	var imgCursor;
	var imgFlags;
	var imgCountryFlags;
	
	var lastCursorCell = null; //Last cell for which the cursor was built
	var lastCursorImage = null;//last cursor image
	var lastCursorUnit = null; //last unit for which a cursor was generated
	
	var ch; // The hexes canvas element
	var cm; // The map canvas element
	var ca; // The animation canvas element.Also used as cursor coords but c canvas can be used as well
	var cbb; //A backbuffer canvas for dynamically creating images (as in cursor image)
	var c = null; //This is the context where the main drawing takes place
	var cb = null;//This is the context where the map image is drawn. Can be made a background of the main drawing
	var a = null; //This is where the animations(explosions/fire/etc) are drawn. Also used as cursor coords but c canvas can be used as well
	var bb = null; //Backbuffer context
	
	//Hex sizes compatible with PG2 sizes
	var s = 30;  //hexagon segment size                    |\  
	var h = s/2; //hexagon height h = sin(30)*s           r| \ s
	var r = 25;  //hexagon radius r = cos(30)*s ~ s*0.833  -h-
	
	// Canvas offset from the browser window (leaves space for top menu)
	var canvasOffsetX = 0;
	var canvasOffsetY = 30;
	// Where to start rendering respective to the canvas
	// Since PG2 maps define even the half and "quarter" hexes that form at the edges we need to offset those
	var renderOffsetX = - (s + h);
	var renderOffsetY = - r;
	
	//The rendering style
	this.style = new RenderStyle();
	
	createLayers(); //Creates canvas layers
	drawMapImage(map.terrainImage); //Draws the map background
			
	this.render = function()
	{
		var x0;
		var y0;
		var style;
		var hex;
		
		c.clearRect(0, 0, c.canvas.width, c.canvas.height);
		
		for (row = 0; row < map.rows; row++) 
		{
			//we space the hexagons on each line next column being on the row below 
			for (col = 0; col < map.cols; col++) 
			{
				hex = map.map[row][col];
				style = this.style.generic;
				//flat-out hex layout
				if (col & 1) // odd column
				{
					//y0 =  row * 2 * r + r; //without PG2 Offset
					//x0 =  col * (s + h) + h;
					y0 =  row * 2 * r + r + renderOffsetY;
					x0 =  col * (s + h) + h + renderOffsetX;
				}
				else
				{
					//y0 = renderOriginY + row * 2 * r;  //without PG2 Offset
					//x0 = renderOriginX + col * (s + h) + h;
					y0 = row * 2 * r  + renderOffsetY;
					x0 = col * (s + h) + h + renderOffsetX;
				}
				//TODO read text color from a country list
				if (hex.isMoveSel) { style = this.style.selected; }
				if (hex.isAttackSel) { style = this.style.attack; }
				if (hex.isCurrent) { style = this.style.current; }
				drawHexDecals(x0, y0, hex);
				drawHexGrid(x0, y0, style);
				if (hex.unit !== null) { drawHexUnit(x0, y0, hex.unit); }
				
			}
		}
	}
		

	//Renders attack or transport move cursor 
	this.drawCursor = function(cell)
	{
		var row = cell.row;
		var col = cell.col;
		var hex = map.map[row][col];
		var curw = bb.canvas.width; //cursor width
		var curh = bb.canvas.height; //cursor height
		
		var redraw = false;
		
		if (lastCursorUnit !== map.currentHex.hex.unit)
		{ 
			redraw = true; //Redraw because a new unit has been selected
		}
		
		//Check if we should generate an attack cursor
		if (hex.isAttackSel && !map.currentHex.hex.unit.hasFired)
		{	
			//check cell if a cursor should be generated again	
			if ((redraw === true) || (lastCursorCell === null) || (lastCursorImage === null) ||
				(lastCursorCell.row !== row) || (lastCursorCell.col !== col))
			{ 
				redraw = true; //Redraw because a mouse is over a new cell
				var atkunit = map.currentHex.hex.unit;
				var defunit = hex.unit;
				lastCursorUnit = atkunit;
				lastCursorCell = cell;
				var atkflag = map.getPlayer(atkunit.owner).country;
				var defflag = map.getPlayer(defunit.owner).country;
				var cr = GameRules.calculateAttackResults(atkunit, map.currentHex.row, map.currentHex.col, defunit, row, col);
				lastCursorImage = generateAttackCursor(cr.kills, cr.losses, atkflag, defflag);
			}
			//only assign a new css cursor if needed (to reduce html element load)
			if ((ca.style.cursor === 'default') || (ca.style.cursor === 'pointer')
				|| (ca.style.cursor === 'auto') || (redraw === true))
			{
				//cursor data, hotspot x, hotspot y, fallback cursor image
				ca.style.cursor = "url('" + lastCursorImage + "') " + curw/2 + " " + curh/2 +", auto";
			}
		}
		else
		{
			//TODO transport cursor
			ca.style.cursor = 'default';
		}
		
	}
	//Converts from screen x,y to row,col in map array
	this.screenToCell = function(x, y)
	{
		var vrow, vcol; //virtual graphical rows/cols
		var trow, tcol; //true map rows/cols
		
		//a graphical column in the grid not the array column
		//vcol = parseInt((x - renderOffsetX) / (s + h)); //without PG2 offset
		vcol = Math.round((x - renderOffsetX) / (s + h)) - 1;
		//real array column
		tcol = vcol;
		// a graphical row not the array row
		//vrow = parseInt((y - renderOriginY) / r); //Half hexes //without PG2 offset
		vrow = Math.round((y - renderOffsetY * (~vcol & 1)) / r); //Half hexes add r if col is odd
		
		//shift to correct row index	
		//trow = parseInt(vrow/2) - 1 * (~vrow & 1) * (vcol & 1); //without PG2 offset
		trow = Math.round(vrow/2) - 1 * (vrow & 1);
		if (trow < 0) { trow = 0; }
		
		var cell = new Cell(trow, tcol);
		//console.log("Hex is at [" +  trow + "][" + tcol + "] Virtual [" + vrow + "][" + vcol + "]");
		return cell;
	}
	
	//Caches images, func a function to call upon cache completion
	this.cacheImages = function(func)
	{
		imgCursor = new Image();
		imgCursor.src = "resources/ui/cursors/attack.png";
		
		imgFlags = new Image();
		imgFlags.src = "resources/ui/flags/flags_med.png";
		
		imgCountryFlags = new Image();
		imgCountryFlags.src = "resources/ui/flags/flags_big.png";
		
		cacheUnitImages(map.unitImagesList, func);
	}
	
	this.getHexesCanvas = function() { return ch; }
	this.getMapCanvas = function() { return cm; }
	this.getCursorCanvas = function() { return ca; }
	this.getHexS = function() { return s;}
	this.getHexH = function() { return h;}
	this.getHexR = function() { return r;}
	
	// "Private"
	function createLayers()
	{
		//Map image as background
		cm = document.createElement('canvas');
		cm.id = "map";
		cm.style.cssText = 'z-index: 0;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		document.getElementById("game").appendChild(cm);
		// Hexes/units/flags
		ch = document.createElement('canvas');
		ch.id = "hexes";
		ch.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX + 'px;top:'+ canvasOffsetY + 'px;';
		document.getElementById("game").appendChild(ch);
		// Animation and cursor
		ca = document.createElement('canvas');
		ca.id = "cursor";
		ca.style.cssText = 'z-index: 2;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		document.getElementById("game").appendChild(ca);
		// backbuffer
		cbb = document.createElement('canvas');
		cbb.id = "backbuffer";
		
		
		cb = cm.getContext('2d');
		c = ch.getContext('2d');
		a = ca.getContext('2d');
		bb = cbb.getContext('2d');
		bb.canvas.width = bb.canvas.height = 54; //Currently the size of the cursor
	}
	
	function drawMapImage(imgFile)
	{
		img = new Image();
		img.onload = function() 
		{
			c.canvas.width = cb.canvas.width = a.canvas.width = img.width;
			c.canvas.height = cb.canvas.height = a.canvas.height = img.height;
			
			cb.drawImage(img, 0, 0);
			canvasOffsetX = window.innerWidth/2 - img.width/2;
			if (canvasOffsetX < 0) { canvasOffsetX = 0;}
			console.log("Offset X:" + canvasOffsetX + " Offset Y:" + canvasOffsetY);
			
			// Center the canvases
			cm.style.cssText = 'z-index: 0;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
			ch.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
			ca.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		}
		img.src = imgFile;
	}
	
	//Generates an attack cursor on backbuffer canvas
	function generateAttackCursor(kills, losses, atkflag, defflag)
	{
		var flw = 21; //one flag width
		var flh = 14; //flag height
		var bbw = bb.canvas.width;
		var bbh = bb.canvas.height;

		bb.clearRect(0, 0, bbw, bbh);
		bb.drawImage(imgCursor, bbw/2 - imgCursor.width/2, bbh/2 - imgCursor.height/2);
		bb.drawImage(imgFlags, flw*atkflag, 0, flw, flh, 0, 0, flw, flh)
		bb.drawImage(imgFlags, flw*defflag, 0, flw, flh, bbw - flw, 0, flw, flh);
		
		//estimated losses and kills
		bb.font = "12px monospace";
		bb.fillStyle = "yellow";
		bb.textBaseline = "top";
		
		var tx = flw/2 - bb.measureText(losses).width/2;
		var ty = flh;
		bb.strokeText(losses, tx+1, ty+1);
		bb.fillText(losses, tx, ty);
		tx = bbw - flw/2 - bb.measureText(kills).width/2;
		bb.strokeText(kills, tx+1, ty+1);
		bb.fillText(kills, tx, ty);
		
		return cbb.toDataURL(); //return canvas pixels encoded to base64
	}
	
	//imgList a list of image file names, func a function to call upon cache completion
	//Units are saved from Luiz Guzman SHPTool to a 1x9 sprites bmp and 
	//converted to transparent png by convert.py
	function cacheUnitImages(imgList, func)
	{
		var loaded = 0;
		for (var i = 0; i < imgList.length; i++)
		{
			imgUnits[imgList[i]] = new Image();
			imgUnits[imgList[i]].onload = function() 
			{
				loaded++;  
				if (loaded == imgList.length)
				{
					//console.log("Loaded " +loaded+"/"+imgList.length + " done caching");
					func();
				}
			}
			imgUnits[imgList[i]].src = imgList[i];
		}	
	}
	
	function drawHexDecals(x0, y0, hex)
	{
		if (hex.flag !== -1) 
		{ 
			var flw = 21; //one flag width
			var flh = 14; //flag height
			var tx = x0 +  s/2 - flw/2;
			var ty = y0 + 2 * r - flh - 2;
			
			c.drawImage(imgFlags, flw * hex.flag, 0, flw, flh, tx, ty, flw, flh)
			
			if (hex.victorySide !== -1)
			{
				c.beginPath();
				c.lineWidth = 2;
				c.strokeStyle = "rgba(139,0,0,1)";
				c.strokeRect  (tx-1, ty-1, flw+2, flh+2);
				c.strokeStyle = "rgba(127,255,0,1)";
				c.strokeRect  (tx-3, ty-3, flw+6, flh+6);
				c.strokeStyle = "rgba(0,0,0,1)";
				c.lineWidth = 1;
				c.strokeRect  (tx-4, ty-4, flw+8, flh+8);
				c.closePath();
			}
			
			
		}
		//TODO draw bridge/blown bridges decals
	}
	
	function drawHexUnit(x0, y0, unit)
	{
		image = imgUnits[unit.getIcon()];
		if (image) 
		{
			// TODO Units have 15 possible orientations 
			// there are 9 sprites each 80x50 in 1 row. to get the rest of the orientations
			// the sprite must be mirrored
			facing = unit.facing;
			if (facing > 8) { facing = facing - 7; } //TODO mirroring
			imgidx = 80 * facing;
			imagew = 80;
			imageh = 50;
			c.drawImage(image, imgidx , 0, imagew, imageh, x0 - 25, y0 - 10, imagew, imageh);
		}
		//Write unit strength in a box below unit
		//TODO center by using measureText
		c.font = "10px sans-serif";
		var text = "" + unit.strength;
		var textcolor = "black"
		var textSize = c.measureText(text).width;
		var tx = x0 + h/2;
		var ty = y0 + 2 * r - 12;
		
		var side =  parseInt(map.getPlayer(unit.owner).side);
		if (side === 1) { textcolor = "green"; }
		
		c.moveTo(tx, ty);
		c.fillStyle = textcolor;
		c.fillRect  (tx, ty, textSize + 2, 10);
		c.fillStyle = "white";
		c.fillText(text, tx, ty + 8);
		//TODO draw indicator for unit.hasFired
		
	}
	
	function drawHexGrid(x0, y0, style)
	{
		c.lineWidth = style.lineWidth; 
		c.lineJoin = style.lineJoin; 
		c.strokeStyle = style.lineColor;
		c.beginPath();
		c.moveTo(x0, y0);
		c.lineTo(x0 + s, y0);
		c.lineTo(x0 + s + h, y0 + r);
		c.lineTo(x0 + s, y0 + 2 * r);
		c.lineTo(x0, y0 + 2 * r);
		c.lineTo(x0 - h, y0 + r);
		if ((c.fillStyle = style.fillColor) !== null) {  c.fill(); }
		c.closePath();
		c.stroke();
	}
}
