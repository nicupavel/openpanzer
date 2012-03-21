function Render(mapObj)
{
	var imgCache = {};
	var imgCursor;
	var imgFlags;
	var map = mapObj;
	
	var lastCursorCell = null; //Last cell for which the cursor was built
	var lastCursorImage = null;//last cursor image
	
	var ch; // The hexes canvas element
	var cm; // The map canvas element
	var ca; // The animation canvas element.Also used as cursor coords but c canvas can be used as well
	var cbb; //A backbuffer canvas for dynamically creating images (as in cursor image)
	var c = null; //This is the context where the main drawing takes place
	var cb = null;//This is the context where the map image is drawn. Can be made a background of the main drawing
	var a = null; //This is where the animations(explosions/fire/etc) are drawn. Also used as cursor coords but c canvas can be used as well
	var bb = null; //Backbuffer context
	
	//TODO fix this on screentocell where calculation was made with r as h and viceversa
	var s = 30;   //hexagon segment size   
	var h = s/2;  //hexagon height
	var r = s * 0.886025404; //maybe do it s/4 
	
	// Canvas offset from the browser window
	var canvasOffsetX = 0;
	var canvasOffsetY = 30;
	// Where to start rendering inside the canvas
	var renderOriginX = 0;
	var renderOriginY = 0;
	
	//The rendering style
	this.style = new RenderStyle();
	
	createLayers(); //Creates canvas layers
	drawMapImage(map.terrainImage); //Draws the map background
	
		
	this.render = function()
	{
		var posx;
		var posy;
		var text;
		var image;
		var hex;
		var textColor; //Actually the color of the unit strenth box
		
		c.clearRect(0, 0, c.canvas.width, c.canvas.height);
		
		for (row = 0; row < map.rows; row++) 
		{
			//we space the hexagons on each line next column being on the row below 
			for (col = 0; col < map.cols; col++) 
			{
				image = null;
				text = null;
				textColor = "black";
				hex = map.map[row][col];

				if (hex.unit !== null) 
				{ 
					image = imgCache[hex.unit.getIcon()]; 
					text = "" + hex.unit.strength;
					if (hex.unit.owner == 1) { textColor = "green"; }
				}
				//TODO read text color from a country list
				if (hex.isCurrent) { this.drawHex(row, col, this.style.current, text, textColor, image); }
				else 
				{
					if (hex.isSelected) { this.drawHex(row, col, this.style.selected, text, textColor, image); }
					else { this.drawHex(row, col, this.style.generic, text, textColor, image); }
				}
			}
		}
	}
	
	//TODO textColor should be read from a country colors list
	this.drawHex = function (row, col, style, text, textColor, image )
	{
		//flat-out hex layout
		if (col & 1) // odd column
		{
			y0 = renderOriginY + row * 2 * r + r;
			x0 = renderOriginX + col * (s + h) + h;
		}
		else
		{
			y0 = renderOriginY + row * 2 * r;
			x0 = renderOriginX + col * (s + h) + h;
			
		}

		c.lineWidth = style.lineWidth; 
		c.lineJoin = style.lineJoin; 
		c.strokeStyle = style.lineColor;
		c.beginPath();
		c.moveTo(x0, y0);
		c.lineTo(x0 + s, y0);
		c.lineTo(x0 + s + h, y0 + r);
		c.lineTo(x0 + s, y0 + 2 * r);
		c.lineTo(x0, y0 + 2 *r);
		c.lineTo(x0 - h, y0 + r);
	    if ((c.fillStyle = style.fillColor) !== null) {  c.fill(); }
				
		if (image) 
		{
			// TODO Units have 9 possible orientations (
			// 1 sprite is ~80x50 (and are 9 sprites in 1 row)
			orientation = 80 * 2;
			imagew = 80;
			imageh = 50;
			c.drawImage(image, orientation , 0, imagew, imageh, x0 - 25, y0, imagew, imageh);
		}
		c.closePath();
		c.stroke();
		
		
		if (text)
		{
			var tx = x0 + h/2;
			var ty = y0 + 2 * r - 12;
			c.moveTo(tx, ty);
			c.fillStyle = textColor;
			c.fillRect  (tx, ty, 15, 10);
			c.font = "10px sans-serif";
			c.fillStyle = "white";
			c.fillText(text, tx + 1, ty + 8);
		}
    }
	
	//Renders attack cursor 
	this.drawCursor = function(minfo, cell)
	{
		var px = minfo.x;
		var py = minfo.y;
		var row = cell.row;
		var col = cell.col;
		var hex = map.map[row][col];
		var flw = 20; //one flag width
		var flh = 14; //flag height
		var bbw = bb.canvas.width;
		var bbh = bb.canvas.height;
		var redraw = false;

		if (hex.unit !== null && hex.unit.owner != map.currentHex.unit.owner)
		{	
			//check cell if a cursor should be generated again	
			if ((lastCursorCell === null) || (lastCursorImage === null) ||
				(lastCursorCell.row !== row) || (lastCursorCell.col !== col))
			{ 
				var atkunit =  map.currentHex.unit;
				var defunit = hex.unit;
				redraw = true;
				bb.clearRect(0, 0, bbw, bbh);
				//TODO read country code from scenario and choose proper flag
				bb.drawImage(imgCursor, bbw/2 - imgCursor.width/2, bbh/2 - imgCursor.height/2);
				bb.drawImage(imgFlags, flw*atkunit.owner, 0, flw, flh, 0, 0, flw, flh)
				bb.drawImage(imgFlags, flw*defunit.owner, 0, flw, flh, bbw - flw, 0, flw, flh);
				//estimated losses and kills
				bb.font = "12px monospace";
				bb.fillStyle = "yellow";
				bb.textBaseline = "top";
				//TODO guess the formula is a little more complicated ?
				var kills = atkunit.unitData.softatk - defunit.unitData.grounddef;
				var losses = defunit.unitData.softatk - atkunit.unitData.grounddef;
				if (kills < 0) { kills = 0;}
				if (losses < 0) { losses = 0;}
			
				var tx = flw/2 - bb.measureText(losses).width/2;
				var ty = flh;

				bb.strokeText(losses, tx+1, ty+1);
				bb.fillText(losses, tx, ty);
				
				tx = bbw - flw/2 - bb.measureText(kills).width/2;

				bb.strokeText(kills, tx+1, ty+1);
				bb.fillText(kills, tx, ty);
				
				//c.drawImage(image, orientation , 0, imagew, imageh, x0 - 25, y0, imagew, imageh);
				lastCursorImage = cbb.toDataURL();
				lastCursorCell = cell;
			}
			
			//only assign a new css cursor if needed (to reduce html element load)
			if ((ca.style.cursor === 'default') || (ca.style.cursor === 'pointer')
				|| (ca.style.cursor === 'auto') || (redraw === true))
			{
				//cursor data, hotspot x, hotspot y, fallback cursor image
				ca.style.cursor = "url('" + lastCursorImage + "') " + bbw/2 + " " + bbh/2 +", auto";
			}
		}
		else
		{
			ca.style.cursor = 'default';
		}
		
	}
	//Converts from screen x,y to row,col in map array
	this.screenToCell = function(x, y)
	{
		var vrow, vcol; //virtual graphical rows/cols
		var trow, tcol; //true map rows/cols
		
		//a graphical column in the grid not the array column
		vcol = parseInt((x - renderOriginX) / (s + h)); 
		//real array column
		tcol = vcol;
		// a graphical row not the array row
		vrow = parseInt((y - renderOriginY) / r); //Half hexes
		
		//shift to correct row index
		//if (vcol & 1) { trow = parseInt(vrow/2) - 1 * (~vrow & 1); }
		//else { trow = parseInt(vrow/2) };
		trow = parseInt(vrow/2) - 1 * (~vrow & 1) * (vcol & 1);
		if (trow < 0) { trow = 0; }
		
		var cell = new Cell(trow, tcol);
		//console.log("Hex is at [" +  trow + "][" + tcol + "] Virtual [" + vrow + "][" + vcol + "]");
		return cell;
	}
	
	this.getHexesCanvas = function() { return ch; }
	this.getMapCanvas = function() { return cm; }
	this.getCursorCanvas = function() { return ca; }
	this.getHexS = function() { return s;}
	this.getHexH = function() { return h;}
	this.getHexR = function() { return r;}
	
	//imgList a list of image file names, func a function to call upon cache completion
	//Units are saved from Luiz Guzman SHPTool to a 1x9 sprites bmp and 
	//converted to transparent png by convert.py
	this.cacheUnitImages = function (imgList, func)
	{
		var loaded = 0;
		//TODO this should be done elsewhere
		imgCursor = new Image();
		imgCursor.src = "resources/ui/cursors/attack.png";
		//TODO this should be done elsewhere
		imgFlags = new Image();
		imgFlags.src = "resources/ui/flags/flag_med.png";

		for (var i = 0; i < imgList.length; i++)
		{
			imgCache[imgList[i]] = new Image();
			imgCache[imgList[i]].onload = function() 
			{
				loaded++;  
				if (loaded == imgList.length)
				{
					// TODO resource caching should be done elsewhere
					//console.log("Loaded " +loaded+"/"+imgList.length + " done caching");
					func();
				}
			}
			imgCache[imgList[i]].src = imgList[i];
		}
			
		
	}
	
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
		ch.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
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
		bb.canvas.width = bb.canvas.height = 54;
	}
	
	
	
	function drawMapImage(imgFile)
	{
		img = new Image();
		img.onload = function() 
		{
			c.canvas.width = cb.canvas.width = a.canvas.width = img.width;
			c.canvas.height = cb.canvas.height = a.canvas.height = img.height;
			cb.drawImage(img, renderOriginX, renderOriginY);
			canvasOffsetX = window.innerWidth/2 - img.width/2;
			
			// Center the canvases
			cm.style.cssText = 'z-index: 0;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
			ch.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
			ca.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		}
		img.src = imgFile;		
	}
}
