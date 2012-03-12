function Render(mapObj)
{
	var imgCache = {};
	var map = mapObj;
	
	var ch; // The hexes canvas element
	var cm; // The map canvas element
	var c = null; //This is the context where the main drawing takes place
	var cb = null;//This is the context where the map image is drawn.
		
	var s = 36;   //hexagon segment size   
	var h = s/2;  //hexagon height
	var r = s * 0.886025404; //maybe do it s/4 
	
	// Canvas offset from the browser window
	var canvasOffsetX = 0;
	var canvasOffsetY = 40;
	// Where to start rendering inside the canvas
	var renderOriginX = 0;
	var renderOriginY = 0;
	
	createLayers(); //Creates canvas layers
	drawMapImage(map.terrainImage); //Draws the map background
	
		
	this.render = function()
	{
		var posx;
		var posy;
		var text;
		var image;
		var hex;
		var fColor;
		
		c.clearRect(0, 0, c.canvas.width, c.canvas.height);
		
		for (row = 0; row < map.rows; row++) 
		{
			//we space the hexagons on each line next column being on the row below 
			for (col = 0; col < map.cols; col++) 
			{
				image = null;
				text = null;
				fColor = "black";
				hex = map.map[row][col];

				if (hex.unit !== null) 
				{ 
					image = imgCache[hex.unit.getIcon()]; 
					text = "" + hex.unit.strength;
					if (hex.unit.belongsTo == 1) { fColor = "green"; }
				}
				
				
				//text = "(" + row + "," + col + ")";
				// TODO implement styles
				if (hex.isCurrent)
				{	
					this.drawHex(row, col, null, "rgba(255,255,255,0.8)", fColor, text, image, 3, "round");
				}
				else 
				{
					if (hex.isSelected) 
					{ 
						this.drawHex(row, col, "rgba(100,180,0,0.3)", "yellow", fColor, text, image);
					}
					else 
					{
						this.drawHex(row, col, null, "rgba(255,255,255,0.8)", fColor, text, image);
					}
				}
			}
		}
	}
	
	//tColor = tile fill color, sColor = lines stroke color, fColor = font Color
	this.drawHex = function (row, col, tColor, sColor, fColor, text, image, lineWidth, lineJoin)
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

		if (lineWidth) { c.lineWidth = lineWidth; }
		else { c.lineWidth = 1.0; }
		if (lineJoin) { c.lineJoin = lineJoin; }
		else { c.lineJoin = "miter"; }
		
		c.strokeStyle = sColor;
		c.beginPath();
		c.moveTo(x0, y0);
		c.lineTo(x0 + s, y0);
		c.lineTo(x0 + s + h, y0 + r);
		c.lineTo(x0 + s, y0 + 2 * r);
		c.lineTo(x0, y0 + 2 *r);
		c.lineTo(x0 - h, y0 + r);
		
		if (tColor)
		{
		    c.fillStyle = tColor;
		    c.fill();
		}
		
		if (image) 
		{
			c.drawImage(image, x0, y0 + 20);
		}
		c.closePath();
		c.stroke();
		
		
		if (text)
		{
			var tx = x0 + h/2;
			var ty = y0 + 2 * r - 14;
			c.moveTo(tx, ty);
			c.fillStyle = fColor;
			c.fillRect  (tx, ty, 15, 10);
		    c.font = "10px sans-serif"
		    c.fillStyle = "white";
		    c.fillText(text, tx + 1, ty + 8);
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
	this.getHexS = function() { return s;}
	this.getHexH = function() { return h;}
	this.getHexR = function() { return r;}
	
	//imgList a list of image file names, func a function to call upon cache completion
	this.cacheImages = function (imgList, func)
	{
		var loaded = 0;
		
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
	
	// Private
	function createLayers()
	{
		cm = document.createElement('canvas');
		cm.id = "map";
		cm.style.cssText = 'z-index: 0;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		document.getElementById("game").appendChild(cm);
				
		ch = document.createElement('canvas');
		ch.id = "hexes";
		ch.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		document.getElementById("game").appendChild(ch);
		
		cb = cm.getContext('2d');
		c = ch.getContext('2d');
	}
	
	
	
	function drawMapImage(imgFile)
	{
		img = new Image();
		img.onload = function() 
		{
			c.canvas.width = cb.canvas.width = img.width;
			c.canvas.height = cb.canvas.height = img.height;
			cb.drawImage(img, renderOriginX, renderOriginY);
		}
		img.src = imgFile;		
	}
}
