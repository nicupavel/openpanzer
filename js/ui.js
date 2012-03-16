

function UI(map)
{
	var turn = 0;
	
	var l = new MapLoader();
	l.loadMap(map);
	var map = l.buildMap();
	//map.dumpMap();
	buildInterface();
	var r = new Render(map);
	r.cacheUnitImages(map.unitImagesList, function() { r.render(); });
	var canvas = r.getHexesCanvas();
	canvas.addEventListener("mousedown", handleMouseClick, false);
	canvas.addEventListener("mousemove", handleMouseMove, false);

function handleMouseClick(e) 
{
	var hex;
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	hex = map.map[row][col];
	
	//Selected hex has a unit ?
	if (hex.unit) 
	{
		map.delCurrentHex();
		map.setCurrentHex(row, col);
		map.delSelected();
		if (!hex.unit.hasMoved) { map.setHexRange(row, col, hex.unit.unitData.movpoints); }
		else  { if (!hex.unit.hasFired) { map.setHexRange(row, col, hex.unit.unitData.gunrange); } }
	}	
	else
	{
		//Do we already have a selected unit ?
		if (map.currentHex != null)
		{	
			console.log("A unit is selected");
			srcHex = map.currentHex;
			//move to an allowed hex
			if (hex.isSelected && !srcHex.unit.hasMoved) 
			{
				//TODO a move function in map class
				//value copy 
				hex.unit = srcHex.unit;
				hex.unit.hasMoved = true;
				srcHex.delUnit();
			} else {		//attack an allowed hex
				if (hex.isSelected && !srcHex.unit.hasFired && hex.unit != null)
				{
					//attack function
					console.log("attacking: " + hex.unit);
				}
			}
			
			map.delCurrentHex();
		}
		else
		{
			console.log("No unit selected");
		}
		map.delSelected();
	}

	//ToDo partial screen updates
	r.render(); 
}

function handleMouseMove(e) 
{
	var hex;
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	hex = map.map[row][col];
	var text = terrainNames[hex.terrain] + " (" + row + "," + col + ") ";
	if (hex.name !== null)
	{
	    text = text + hex.name;
	}
	
	if (hex.unit != null)
	{
		text = text + " Unit: " + hex.unit.unitData.name;
		text = text + " Player: " + hex.unit.owner;
	}
	$('locmsg').innerHTML = text;
				
	
}

function buildInterface()
{
	var div1 = addTag('div');
	var div2 = addTag('div');
	var div3 = addTag('div');
	var div4 = addTag('div');
	div1.id = "statusmsg";
	div1.className = "message";
	div1.innerHTML = " Turn: " + turn + "  " + map.description;
		
	div2.id = "locmsg"
	div2.className = "message";
	
	div3.id = "endturn";
	div3.className = "button";
	div3.innerHTML = "end turn";
	div3.onclick = function() { UI:button(div3.id); }
	
	div4.id = "info";
	div4.className = "button";
	div4.innerHTML = "info";
	div4.onclick = function() { UI:button(div4.id); }
	
	$('menu').appendChild(div1);
	$('menu').appendChild(div2);
	$('menu').appendChild(div3);
	$('menu').appendChild(div4);
}

function button(id)
{
	console.log("Clicked button: " + id);
	switch(id) 
	{
		case 'endturn':
		{
			map.resetUnits();
			map.delSelected();
			map.delCurrentHex();
			turn++;
			$('statusmsg').innerHTML = " Turn: " + turn + "  " + map.description;
			r.render();
			break;
		}
		
		case 'info':
		{
			var text = "No unit selected";
			if (map.currentHex != null && map.currentHex.unit != null)
			{
				var u = map.currentHex.unit;
				
				text = "Player: " + u.owner;
				text += " Ammo: " + u.ammo;
				text += " Strength: " + u.strength;
				text += " Fuel: " + u.fuel;
				text += " Has moved: " + u.hasMoved;
				text += " Has fired: " + u.hasFired;
				text += " Has resupplied: " + u.hasRessuplied;
			}
			
			alert(text);
			break;
		}
	}
}

function getMouseInfo(canvas, e)
{
	var mx, my, rclick;
	if (e.which) rclick = (e.which == 3);
	else if (e.button) rclick = (e.button == 2);
						
	mx = e.clientX - canvas.offsetLeft + document.body.scrollLeft + document.documentElement.scrollLeft;
	my = e.clientY - canvas.offsetTop + document.body.scrollTop + document.documentElement.scrollTop;;	
	
	var minfo =  new mouseInfo(mx, my, rclick);
	return minfo;
}
}
function gameStart()
{
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	
	/*
	$('game').innerHTML = '<select id=scnselect> \
	<option value=caenuk.xml>caenuk</option> \
	<option value=cauldron.xml>cauldron</option> \
	<option value=ciechan.xml>ciechan</option> \
	</select> \
	<br/> <input type=button value=\'Start\' onclick=\'javascript:e=document.getElementById("scnselect");ui = new UI("resources/scenarios/xml/"+e.options[e.selectedIndex].value);\'>'
	*/
	ui = new UI("resources/scenarios/xml/prok1.xml");
}