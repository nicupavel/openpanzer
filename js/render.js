/**
 * Render - draws the graphic elements on canvases
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function Render(mapObj)
{
	var map = mapObj;
	
	var imgUnits = {};
	var imgAttackCursor;
	var imgFlags;
	var imgMapBackground;
	var imgUnitFire;
		
	var drawnHexGrid = false; //Force first time rendering of hex grid but prevent redraw if no changes
	var lastCursorCell = null; //Last cell for which the cursor was built
	var lastCursorImage = null;//last cursor image
	var lastCursorUnit = null; //last unit for which a cursor was generated
	
	var ch; // The hexes canvas element
	var cm; // The map canvas element
	var ca; // The animation canvas element.Also used as cursor coords but c canvas can be used as well
	var cbb; //A backbuffer canvas for dynamically creating images (as in cursor image)
	var cubb; //A backbuffer canvas for dynamically creating unit images //TODO: merge the 2 backbuffers into one
	var c = null; //This is the context where the main drawing takes place (units, move and attack selection)
	var cb = null;//This is the context where the map image and hex grid is drawn.
	var a = null; //This is where the animations(explosions/fire/etc) are drawn. Also used as cursor coords but c canvas can be used as well
	var bb = null; //Backbuffer context
	var ubb = null; //Backbuffer for unit rendering
	
	//Hex sizes compatible with PG2 sizes
	var s = 30;  //hexagon segment size                    |\  
	var h = s/2; //hexagon height h = sin(30)*s           r| \ s
	var r = 25;  //hexagon radius r = cos(30)*s ~ s*0.833  -h-
	
	//Medium flag sizes used to mark objectives on map
	var flw = 21; //Flag width
	var flh = 14; //Flag height
	
	// Canvas offset from the browser window (leaves space for top menu)
	var canvasOffsetX = 0;
	var canvasOffsetY = 30;
	// Where to start rendering respective to the canvas
	// Since PG2 maps define even the half and "quarter" hexes that form at the edges we need to offset those
	var renderOffsetX = - (s + h);
	var renderOffsetY = - r;
	
	//we slice the screen in columns of s + h size
	var colSlice = s + h; 
	//add an offset for better rounding of mouse position in a column
	var mousePrecisionOffset = s/100;
	//Unit strength text size (px)
	var unitTextHeight = 8;	
	//Animation Chain
	var animationChain = new AnimationChain();
	
	//Show bounding boxes for partial renderer
	var partialRenderDebug = false;
	//Log render speed
	var logRenderSpeed = false;

	createLayers(); //Creates canvas layers
	
	//Renders the units/decals/hexgrid if orow,ocol and range are defined then it will
	//only partially render the canvas around orow,ocol with range around this location
	this.render = function(orow, ocol, range)
	{
		if (logRenderSpeed) console.time("render timer");
		
		var x0, y0;
		
		//Since cellToScreen returns top left corner of a hex in range we need to increase the range with at least 1 hex
		//but since the clearing rectangle can half clear staggered hexes we render by 2 more hexes in each direction but
		//we only clear a 1 hex smaller area in each direction
		var clearZone = getZoneRangeLimits(orow, ocol, range + 1); //the map (cell) coords that will be cleared by clearRect
		var renderZone = getZoneRangeLimits(orow, ocol, range + 2); //the map (cell) coords that will be rendered hex by hex
					
		var hex;
		var current = null;
		var unit = null;
		var drawHexGrid = false;
		
		if (uiSettings.hexGrid != drawnHexGrid)
		{
			drawnHexGrid = drawHexGrid = uiSettings.hexGrid;			
			cb.clearRect(0, 0, cb.canvas.width, cb.canvas.height);
		}
		
		if (map.currentUnit !== null)
			current = map.currentUnit.getPos();

		var spos = cellToScreen(clearZone.srow, clearZone.scol, false);
		var epos = cellToScreen(clearZone.erow, clearZone.ecol, false);

		c.clearRect(spos.x, spos.y, epos.x - spos.x, epos.y - spos.y);
		
		if (partialRenderDebug)			
		{
			console.log("Origin: %d,%d, range: %d render zone: %o, clear zone: %o, clear box: %o, %o", orow, ocol, range, renderZone, clearZone, spos, epos);
			c.fillStyle = "rgba(" + Math.floor(Math.random() * 255) + ","+ Math.floor(Math.random() * range) + "," + Math.floor(Math.random() * 255) +", 0.9)";
			c.fillRect(spos.x, spos.y, epos.x - spos.x, epos.y - spos.y);
		}
		
		for (var row = renderZone.srow; row < renderZone.erow; row++) 
		{
			//we space the hexagons on each line next column being on the row below 
			for (var col = renderZone.scol; col < renderZone.ecol; col++) 
			{
				hex = map.map[row][col];

				//flat-out hex layout //inline for performance gain
				if (col & 1) // odd column
				{
					y0 =  row * 2 * r + r + renderOffsetY;
					x0 =  col * (s + h) + h + renderOffsetX;
				}
				else
				{
					y0 = row * 2 * r  + renderOffsetY;
					x0 = col * (s + h) + h + renderOffsetX;
				}

				if ((current !== null) && (typeof current !== "undefined") 
					&& (row == current.row) && (col == current.col))
					drawHex(c, x0, y0, hexstyle.current);

				//Only show deployment hexes not move/attack hexes on deploy mode
				if (uiSettings.deployMode)
				{
					if (hex.isDeployment > -1 && map.getPlayer(hex.isDeployment).side == map.currentPlayer.side)
						drawHex(c, x0, y0, hexstyle.deploy);
				}
				else
				{
					//Don't show move/attack hexes for non local players
					if (map.currentPlayer.side == game.spotSide)
					{
						if (hex.isMoveSel)
							drawHex(c, x0, y0, hexstyle.move);

						if (hex.isAttackSel)
							drawHex(c, x0, y0, hexstyle.attack);
					}
				}

				if (uiSettings.mapZoom) 
				{
					drawHexZoomDecals(x0, y0, hex); 
					continue;  
				}
				else
				{
					drawHexDecals(x0, y0, hex);
				}

				if (drawHexGrid)
					drawHex(cb, x0, y0, hexstyle.generic);

				
				//Don't render unit if it has a move animation or it's not spotted by
				//the local playing player side
				unit = hex.getUnit(!uiSettings.airMode);
				if (unit !== null && !unit.hasAnimation
						&& (hex.isSpotted(game.spotSide) || unit.tempSpotted 
								|| unit.player.side == game.spotSide))
				{
					if (uiSettings.markOwnUnits && unit.player.id == map.currentPlayer.id)
						drawHex(c, x0, y0, hexstyle.ownunit);
					drawHexUnit(c, x0, y0, unit, false); //Unit below depending on airMode without strength box
				}

				unit = hex.getUnit(uiSettings.airMode);
				if (unit !== null && !unit.hasAnimation 
						&& (hex.isSpotted(game.spotSide) || unit.tempSpotted 
								|| unit.player.side == game.spotSide))
					drawHexUnit(c, x0, y0, unit, true); //Unit above with strength box drawn

				if (uiSettings.hasTouch && hex.isAttackSel && map.currentUnit) //For touchScreens where we can't have mousecursors
				{	
					var atkunit = map.currentUnit;
					var defunit = hex.getAttackableUnit(atkunit, uiSettings.airMode)
					var ctx = generateAttackCursor(atkunit, defunit, false);
					var localx = x0 - s/2;
					var localy = y0;
					c.drawImage(ctx, localx, localy);
				}
			}	
		}

		if (logRenderSpeed) console.log("called from: " + arguments.callee.caller.name);
		if (logRenderSpeed) console.timeEnd("render timer");
		
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

		if (lastCursorUnit !== map.currentUnit)
			redraw = true; //Redraw because a new unit has been selected

		//Check if we should generate an ATTACK cursor
		if (hex.isAttackSel && map.currentUnit !== null &&  !map.currentUnit.hasFired)
		{	
			//check cell if a cursor should be generated again	
			if ((redraw == true) || (lastCursorCell === null) || (lastCursorImage === null) ||
				(lastCursorCell.row != row) || (lastCursorCell.col != col))
			{ 
				//TODO check unit mounted/unmounted 
				redraw = true; //Force css cursor assignment
				var atkunit = map.currentUnit;
				var defunit = hex.getAttackableUnit(atkunit, uiSettings.airMode);
				lastCursorUnit = atkunit;
				lastCursorCell = cell;
				lastCursorImage = generateAttackCursor(atkunit, defunit, true);
			}
			//only assign a new css cursor if needed (to reduce html element load)
			if ((ca.style.cursor == 'default') || (ca.style.cursor == 'pointer')
				|| (ca.style.cursor == 'auto') || (redraw == true))
			{
				//cursor data, hotspot x, hotspot y, fallback cursor image
				ca.style.cursor = "url('" + lastCursorImage + "') " + curw/2 + " " + curh/2 +", auto";
			}
		}
		else
		{
			//TODO PG2 default cursor
			ca.style.cursor = 'default';
		}
	}
	
	//Runs all animations in order that they were added and then delete all animations
	this.runAnimation = function(animationCBData)
	{
		animationChain.start(animationCBData);
	}
	
	//Adds an animation to the list
	this.addAnimation = function(row, col, animationName, facing)
	{
		if (! (animationName in animationsData))
			return false;
		
		if (typeof facing === "undefined")
			facing = direction.N;
		var anim = animationsData[animationName];
		var pos = cellToScreen(row, col);
		var y0 = (pos.y - anim.image.height/2 + r) >> 0;
		var x0 = (pos.x - anim.width/2 + s/2) >> 0;

		animationChain.add({
			ctx:a, 
			x:x0, 
			y:y0, 
			rotate: directionToRadians[facing],
			sprite: anim
		});
		
		return true;
	}
	
	//TODO stop another running animation 
	this.moveAnimation = function(moveAnimationCBData)
	{
		if (moveAnimationCBData.unit === null) return;
		var ma = new MoveAnimation(moveAnimationCBData);
		ma.movTimer = setInterval( function() { ma.start();}, 30);
	}
	
	//Animates the unit moving thru a list of cells
	function MoveAnimation (moveAnimationCBData)
	{
		var animSteps = 5;
		var movIndex = 0;
		var movStep = 0;
		var unit = moveAnimationCBData.unit;
		var cellList = moveAnimationCBData.moveResults.passedCells;
		var cPos, dPos;
		var xstep, ystep;
		
		this.movTimer = null;
		
		//Directly blits the unit to the animation canvas (slow on Android)
		this.directDraw = function(cPos, unit)
		{
			a.clearRect(cPos.x - 20, cPos.y - 20, 80, 70); //hex size + 20
			cPos.x += xstep;
			cPos.y += ystep;
			drawHexUnit(a, cPos.x, cPos.y, unit, false);
		}
		//Blits unit image to a separate canvas and animates using css properties
		this.cssDraw = function(cPos, unit, needRedraw)
		{
			if (needRedraw)
			{
				ubb.clearRect(0, 0, ubb.canvas.width, ubb.canvas.height);
				//Offset the sprite drawing on canvas otherwise it will be clipped 
				drawUnitSprite(ubb, -renderOffsetX, -renderOffsetY, unit);
			}
			cubb.style.display = "inline";
			cPos.x += xstep ;
			cPos.y += ystep;
			if (!uiSettings.use3D)
			{
				cubb.style.top = cPos.y + canvasOffsetY + renderOffsetY + "px";
				cubb.style.left = cPos.x + canvasOffsetX + renderOffsetX + "px"; 
			}
			else
			{
				//TODO: Any use of "3D accelerated function" regress the performance on iOS
				//var transform = "translate3d(" + 1*(cPos.x + renderOffsetX) + "px, " + 1*(cPos.y + renderOffsetY) + "px, 0)";
				var transform = "translate(" + 1*(cPos.x + renderOffsetX) + "px, " + 1*(cPos.y + renderOffsetY) + "px)";
				
				if (cubb.style.transition != "linear")
				{
					cubb.style.MozTransition = "linear";
					cubb.style.webkitTransition = "linear";
					cubb.style.oTransition = "linear";
					cubb.style.transition = "linear";
				}
				
				cubb.style.MozTransform = transform;
				cubb.style.webkitTransform = transform;
				cubb.style.oTransform = transform;
				cubb.style.transform = transform;
			}
		}
		
		this.start = function()
		{
			var needRedraw = true;
			if (movIndex >= cellList.length - 1)
			{
				movStep = 0;
				movIndex = 0;
				clearInterval(this.movTimer);
				unit.hasAnimation = false;
				cubb.style.display = "none";
				moveAnimationCBData.cbfunc(moveAnimationCBData);
				//console.log("Stopping animation for unit id:" + unit.id);
				return;
			}
		
			if (movStep == 0)
			{
				var cCell = cellList[movIndex];
				var dCell = cellList[movIndex + 1];
			
				cPos = cellToScreen(cCell.row, cCell.col);
				dPos = cellToScreen(dCell.row, dCell.col);
				
				xstep = ((dPos.x - cPos.x)/animSteps) >> 0;
				ystep = ((dPos.y - cPos.y)/animSteps) >> 0;
				
				var actualFacing = GameRules.getDirection(cCell.row, cCell.col, dCell.row, dCell.col); 
			
				if (Math.abs(actualFacing - unit.facing) > 1) 
				{
					unit.facing = actualFacing;
					needRedraw = true;
				}
			}
			
			//this.directDraw(cPos, unit);
			this.cssDraw(cPos, unit, needRedraw);
			
			needRedraw = false;
			movStep++;
			
			if (movStep >= animSteps) 
			{
				movIndex++;
				movStep = 0;
			}
		}
	}
		
	//Converts from screen x,y to row,col in map array
	this.screenToCell = function(x, y)
	{
		var vrow; //virtual graphical rows
		var trow, tcol; //true map rows/cols

		//If we're in tactical map scale the values coresponding to zoom level
		if (uiSettings.mapZoom)
		{
			//Add difference between canvasOffset when zoomed and when not because zoom changes offsets
			x = (x  + canvasOffsetX) * uiSettings.zoomLevel - canvasOffsetX;
			y = (y  + canvasOffsetY) * uiSettings.zoomLevel - canvasOffsetY;
		}

		tcol = Math.round((x - renderOffsetX) / colSlice + mousePrecisionOffset) - 1;
		//a graphical row (half hex) not the array row
		vrow = (y - renderOffsetY * (~tcol & 1)) / r; //Half hexes add r if col is odd
		//shift to correct row index	
		trow = Math.round(vrow/2 - 1 * (vrow & 1));
		if (trow < 0) { trow = 0; }
		if (trow > map.rows - 1) trow = map.rows - 1;
		if (tcol > map.cols - 1) tcol = map.cols - 1;
		//console.log("Hex is at [" +  trow + "][" + tcol + "] Virtual [" + vrow + "][" + tcol + "]");
		return new Cell(trow, tcol);
	}
	
	//Returns the top corner position of a hex in screen coordinates relative to canvas
	//if absolute is set canvas offsets are added to positions
	function cellToScreen(row, col, absolute)
	{
		var x0, y0;
		
		if (col & 1) // odd column
		{
			y0 =  row * 2 * r + r + renderOffsetY;
			x0 =  col * (s + h) + h + renderOffsetX;
		}
		else
		{
			y0 = row * 2 * r  + renderOffsetY;
			x0 = col * (s + h) + h + renderOffsetX;
		}
		
		if (absolute)
		{ 
			var vp = $('game');
			x0 += canvasOffsetX - vp.clientLeft - vp.offsetLeft;
			y0 += canvasOffsetY - vp.clientTop - vp.offsetTop;
		}
		
		return new screenPos(x0, y0);
	}
	this.cellToScreen = function(row, col, absolute) { return cellToScreen(row, col, absolute); }
	
	//Caches images, func a function to call upon cache completion
	this.cacheImages = function(func)
	{
		imgAttackCursor = new Image();
		imgAttackCursor.src = "resources/ui/cursors/attack.png";
		
		imgFlags = new Image();
		imgFlags.src = "resources/ui/flags/flags_med.png";
		
		imgUnitFire = new Image();
		imgUnitFire.src = "resources/ui/indicators/unit-fire.png";
		
		imgMapBackground = new Image();
		imgMapBackground.src = map.terrainImage;
		imgMapBackground.onload = function() { setupLayers(); func(); }
		
		cacheUnitImages(map.getUnitImagesList(), func);
	}
	
	//Returns canvases 
	this.getHexesCanvas = function() { return ch; }
	this.getMapCanvas = function() { return cm; }
	this.getCursorCanvas = function() { return ca; }
	//Sets a new map for rendering. Only used to dinamically change the map being rendered
	this.setNewMap = function(mapObj) { map = mapObj; drawnHexGrid = false;}
	
		
	// "Private"
	function createLayers()
	{
		//Check if the canvases already exists in the curent document to prevent 
		//overlaying multiple rendering instances
		//Map image as background
		if ((cm = $('map')) === null) cm = addTag('game', 'canvas');
		cm.id = "map";
		// Hexes/units/flags
		if ((ch = $('hexes')) === null) ch = addTag('game', 'canvas');
		ch.id = "hexes";
		// Animation and cursors
		if ((ca = $('cursor')) === null) ca = addTag('game', 'canvas');
		ca.id = "cursor";
		// Backbuffer (not added as child to DOM)
		cbb = addTag(null, 'canvas'); 
		cbb.id = "backbuffer";
		
		// Unit Backbuffer used for moving units as css sprites
		if ((cubb = $('unitbackbuffer')) === null) cubb = addTag('game', 'canvas'); 
		cubb.id = "unitbackbuffer";

		cb = cm.getContext('2d');
		c = ch.getContext('2d');
		a = ca.getContext('2d');
		bb = cbb.getContext('2d');
		ubb = cubb.getContext('2d');
	}
	
	//Draws map background image and sets canvases dimesions and position on screen
	function setupLayers()
	{
		c.canvas.width = cb.canvas.width = a.canvas.width = imgMapBackground.width;
		c.canvas.height = cb.canvas.height = a.canvas.height = imgMapBackground.height;
		
		bb.canvas.width = bb.canvas.height = 54; //Currently the size of the attack cursor
		ubb.canvas.width = ubb.canvas.height = 120; //Currently the max size of a unit sprite //TODO compute this
		
		canvasOffsetX = window.innerWidth/2 - imgMapBackground.width/2;
		if (canvasOffsetX < 0) { canvasOffsetX = 0;}
					
		// Center the canvases
		cm.style.cssText = 'z-index: 0;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		ch.style.cssText = 'z-index: 1;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		ca.style.cssText = 'z-index: 2;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px;';
		cubb.style.cssText = 'z-index: 3;position:absolute;left:' + canvasOffsetX +'px;top:'+ canvasOffsetY + 'px; display: none;';
		//Add map image as background
		//cb.drawImage(imgMapBackground, 0, 0);
		cm.style.cssText += "background-image:url('" + imgMapBackground.src + "');"
				+ "background-size: 100% 100%;"
				+ "background-repeat: no-repeat;"
				+ "background-attachment: scroll;";
		
		//Set the width/height of the container div to browser window width/height
		//This improves the performance. User will scroll the div instead of window
		$('game').style.width = window.innerWidth + "px";
		$('game').style.height = window.innerHeight + "px";
		$('game').tabIndex = 1; //For focusing the game area
		$('game').focus();
	}

	//Generates an attack cursor on backbuffer canvas
	function generateAttackCursor(atkunit, defunit, asDataURL)
	{
		var bbw = bb.canvas.width;
		var bbh = bb.canvas.height;

		if (!atkunit || !defunit)
			return null;
		
		var atkflag = atkunit.flag - 1; //flags from 1-25, array from 0-24
		var defflag = defunit.flag - 1;
		var cr = GameRules.calculateCombatResults(atkunit, defunit, map.getUnits(), false);
		
		bb.clearRect(0, 0, bbw, bbh);
		bb.drawImage(imgAttackCursor, bbw/2 - imgAttackCursor.width/2, bbh/2 - imgAttackCursor.height/2);
		bb.drawImage(imgFlags, flw*atkflag, 0, flw, flh, 0, 0, flw, flh)
		bb.drawImage(imgFlags, flw*defflag, 0, flw, flh, bbw - flw, 0, flw, flh);
		
		//estimated losses and kills
		bb.font = unitTextHeight + "px coreUnitFont, sans-serif";
		bb.fillStyle = "yellow";
		bb.textBaseline = "top";
		
		var tx = flw/2 - bb.measureText(cr.losses).width/2;
		var ty = flh;
		bb.strokeText(cr.losses, tx+1, ty+1);
		bb.fillText(cr.losses, tx, ty);
		tx = bbw - flw/2 - bb.measureText(cr.kills).width/2;
		bb.strokeText(cr.kills, tx+1, ty+1);
		bb.fillText(cr.kills, tx, ty);
		
		if (asDataURL)
			return cbb.toDataURL(); //return canvas pixels encoded to base64
		else
			return cbb;	//return the canvas
	}
	
	//imgList a list of image file names, func a function to call upon cache completion
	//Units are saved from Luiz Guzman SHPTool to a 1x9 sprites bmp and 
	//converted to transparent png by convert.py
	function cacheUnitImages(imgList, func)
	{
		var loaded = 0;
		var toLoad = Object.keys(imgList).length; //Size of the "hash"

		for (var i in imgList)
		{
			if (typeof imgUnits[imgList[i]] !== "undefined" )
			{
				//console.log("Already loaded");
				loaded++;
				continue;
			}
			
			imgUnits[imgList[i]] = new Image();
			imgUnits[imgList[i]].onload = function() 
			{
				loaded++;  
				if (loaded == toLoad)
					func();
			}
			imgUnits[imgList[i]].src = imgList[i];
		}	
	}
	
	function drawHexDecals(x0, y0, hex)
	{
		if (hex.flag != -1) 
		{ 
			var tx = (x0 +  s/2 - flw/2) >> 0;
			var ty = (y0 + 2 * r - flh - 2) >> 0;

			c.drawImage(imgFlags, flw * hex.flag, 0, flw, flh, tx, ty, flw, flh);

			if (hex.victorySide != -1)
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
	
	function drawHexZoomDecals(x0, y0, hex)
	{
		var tx = (x0 +  (s - h)/2 - flw/2) >> 0;
		var ty = (y0 +  r - flh - 2 ) >> 0;
		
		var flag = -1;
		var scale = 0;
		var unit = null;
		
		c.save();
		//Only renders flag for air or ground units not both if they are spotted
		if (hex.isSpotted(map.currentPlayer.side))
		{
			if (uiSettings.airMode)
				unit = hex.airunit;
			else
				unit = hex.unit;
		
			
			if (unit !== null)
			{
				flag = unit.player.country;
				scale = 1.4;
				if (unit.hasMoved)
					c.globalAlpha = 0.6;
			}
		}
		if (hex.flag != -1 && hex.victorySide != -1) 
		{ 
			flag = hex.flag;
			scale = 3;
		}
		if (flag == -1) return;
		
		c.drawImage(imgFlags, flw * flag, 0, flw, flh, tx, ty, scale * s, scale * s/(flw/flh));
		c.restore();
	}
	
	//TODO performance render unit to a backbuffer and on main render function render
	// units in order of their image id so we can save some translate/rotate operations
	function drawUnitSprite(c, x0, y0, unit)
	{
		if (unit === null)
		    return false;

		var image = imgUnits[unit.getIcon()];
		
		if (!image)
			return false;
		
		// Units have 15 possible orientations there are 9 sprites each ~80x50 in 1 row
		// to get the rest of the orientations the sprite must be mirrored
		var mirror = false;
		var imagew = image.width/9; //Some images have bigger width
		var imageh = image.height;
		//Offset the transparent regions of the unit sprite
		var ix0 = (x0 - imagew/2 + s/2) >> 0;
		var iy0 = (y0 - imageh/2 + r - unitTextHeight) >> 0;
		var facing = unit.facing;
		if (facing > 8)
		{
			facing = 16 - facing; 
			mirror = true;
		}
		var imgidx = imagew * facing;
		if (mirror)
		{
			var flip = ix0 + imagew/2;
			c.save();
			c.translate(flip, 0);
			c.scale(-1,1);
			c.translate(-flip,0);
		}
		c.drawImage(image, imgidx , 0, imagew, imageh, ix0, iy0, imagew, imageh);
		
		if (mirror) c.restore();
		
		return true;
	}
	
	function drawHexUnit(c, x0, y0, unit, drawIndicators)
	{
		if (!drawUnitSprite(c, x0, y0, unit)) return;
		if (!drawIndicators || unit.strength < 1) return;
		//TODO performance, consider caching glyphs digits and use drawImage/putImageData
		//Currently fillText and fillRect doubles the rendering time
		
		//Write unit strength in a box below unit
		if (game.campaign !== null) //Campaign mode
		{
			if (unit.isCore)
				c.font = unitTextHeight + "px coreUnitFont, sans-serif";
			else
				c.font = unitTextHeight + "px unitInfo, sans-serif"; //normal units
		}
		else //Scenario mode
		{
			c.font = unitTextHeight + "px coreUnitFont, sans-serif";
		}

		var text = "" + unit.strength;
		var tx = (x0 + h/2) >> 0;
		var ty = y0 + 2 * r - (unitTextHeight + 2); //text size + spacing
		var side = unit.player.side;
		var boxWidth = 17;  // c.measureText(text).width + 2 too slow
		if (unit.strength < 10) boxWidth = 9;

		c.fillStyle = unitstyle.axisBox;
		if (side == 1)
		{
			if (uiSettings.markEnemyUnits)
				c.fillStyle = unitstyle.alliedBoxMarked;
			else
				c.fillStyle = unitstyle.alliedBox;
		}
		c.fillRect(tx, ty - 1, boxWidth, unitTextHeight + 2); //Add one row of pixels above and below unit strength
		
		if (unit.player.id != map.currentPlayer.id && unit.player.side == map.currentPlayer.side)
			c.fillStyle = unitstyle.alliedPlayerText;
		else
			c.fillStyle = unitstyle.playerText;

		if (unit.hasMoved && unit.player.id == map.currentPlayer.id)
			c.fillStyle = unitstyle.movedUnitText; 

		c.fillText(text, tx, ty + 8);

		//draw indicator for unit.hasFired
		if (!unit.hasFired && side == map.currentPlayer.side)
			c.drawImage(imgUnitFire, x0 - 1, y0 + 2 * r - unitTextHeight);
	}
	
	function drawHex(ctx, x0, y0, style)
	{
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x0 + s, y0);
		ctx.lineTo(x0 + s + h, y0 + r);
		ctx.lineTo(x0 + s, y0 + 2 * r);
		ctx.lineTo(x0, y0 + 2 * r);
		ctx.lineTo(x0 - h, y0 + r);
		if (style.fillColor !== null) 
		{
			ctx.fillStyle = style.fillColor;
			ctx.fill();
		}
		
		ctx.closePath();
		
		if (style.lineWidth > 0)
		{
			ctx.lineWidth = style.lineWidth;
			ctx.lineJoin = style.lineJoin; 
			ctx.strokeStyle = style.lineColor;
			ctx.stroke();
		}
	}
	
	//Returns min and max row,col for a range around a cell(row,col)
	function getZoneRangeLimits(row, col, range)
	{
		var z = { srow: 0, scol: 0, erow: map.rows, ecol: map.cols };
		
		if (row === null || col === null)
			row = col = 0;
		
		if (range !== null && range >= 0)
		{
			z.srow = row - range;
			z.scol = col - range;
			z.erow = row + range;
			z.ecol = col + range;
		
			if (z.srow < 0) z.srow = 0;
			if (z.scol < 0) z.scol = 0;
			if (z.erow > map.rows) z.erow = map.rows;
			if (z.ecol > map.cols) z.ecol = map.cols;
		}
		else
		{
			if (logRenderSpeed) console.log("Full zone canvas render");
		}
		return z;
	}
}
