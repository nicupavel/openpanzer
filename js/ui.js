

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
	var text = terrainNames[hex.terrain] + " (" + row + "," + col + ")";
	if (hex.name !== null)
	{
	    text = hex.name + " " + text;
	}
	
	if (hex.unit != null)
	{
		text = " Unit: " + hex.unit.unitData.name + " " + text;
		//text = text + " Player: " + hex.unit.owner;
	}
	$('locmsg').innerHTML = text;
				
	
}

//TODO use style.js for buttons
function buildInterface()
{
	//menu buttons div with id is the filename from resources/ui/menu/images
	var menubuttons = [["buy","Requisition Units"],["inspectunit","Unit Info"],["hex","Toggle Showing of Hexes"],["air","Toggle Air More On"],["zoom","Zoom Map"],["undo","Undo Last Move"],["endturn","End turn"]];
	var sd = addTag('menu','div');
	sd.id = "statusmsg";
	sd.className = "message";
	sd.innerHTML = " Turn: " + turn + "  " + map.description;
	
	for (b in menubuttons) 
	{
		var div = addTag('menu','div');
		var img = addTag(div, 'img');
		
		var id = menubuttons[b][0];
		var title = menubuttons[b][1];
		div.id = id;
		div.title = title;
		div.className = "button";
		img.id = id;
		img.src = "resources/ui/menu/images/" + id + ".png";
		
		//js pass-by-ref evaluation and eventhandler ?
		//can't use UI:button(id) will put the last id in menubuttons array
		//can use an anonymous function or global evenhandler
		div.onclick = function() { UI:button(this.id); }
		div.onmouseover = function() { hoverin(this.firstChild); }
		div.onmouseout = function() { hoverout(this.firstChild); }
	}
	
	var ld = addTag('menu','div');
	ld.id = "locmsg"
	ld.className = "message";
}

function button(id)
{
	console.log("Clicked button: " + id);
	switch(id) 
	{
		case 'hex':
		{
			r.style.toggleHexes();
			r.render();
			break;
		}
		case 'zoom':
		{	
			//TODO maybe use transform on canvas this doesn't work in Firefox
			if ($('game').style.zoom === "100%" || $('game').style.zoom === '' )
			{$('game').style.zoom = "30%" }
			else {$('game').style.zoom = "100%" }
			break;
		}
		
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
		
		case 'inspectunit':
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
	rng = Math.round(Math.random() * (scenariolist.length - 1))
	scenario = "resources/scenarios/xml/" +  scenariolist[rng];
	console.log("Number: " + rng + " Scenario:" + scenario);
	ui = new UI(scenario);
}