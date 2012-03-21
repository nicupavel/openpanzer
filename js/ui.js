function UI(map)
{
	var turn = 0;
	
	var l = new MapLoader();
	l.loadMap(map);
	var map = l.buildMap();
	//map.dumpMap();
	buildMainMenu();
	
	var r = new Render(map);
	r.cacheUnitImages(map.unitImagesList, function() { r.render(); });
	var canvas = r.getCursorCanvas();
	
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
	
	//Clicked hex has a unit ?
	if (hex.unit) 
	{
		if ((map.currentHex !== null) && (map.currentHex.unit.owner !== hex.unit.owner))
		{	//attack an allowed hex
			//TODO check unitAllowedAttackHexes (see map.js)
			if (!map.currentHex.unit.hasFired)
			{
				//attack function
				console.log("attacking: " + row + "," +col);
				map.currentHex.unit.hasFired = true;
				map.delSelected();
				alert("Peace bro");
			}
		}	
		else 
		{
			map.delCurrentHex();
			map.setCurrentHex(row, col);
			map.delSelected();
		
			if (!hex.unit.hasMoved) 
			{ 
				map.setHexRange(row, col, hex.unit.unitData.movpoints); 
			}
			else  
			{ 
				if (!hex.unit.hasFired) 
				{ 
					var gunrange = hex.unit.unitData.gunrange;
					if (gunrange === 0) { gunrange = 1; }
					map.setHexRange(row, col, gunrange); 
				} 
			}
		}
		if (minfo.rclick) { updateUnitInfoWindow(hex.unit);}
	}	
	else
	{
		//Do we already have a selected unit ?
		if (map.currentHex != null)
		{	
			srcHex = map.currentHex;
			//move to an allowed hex
			if (hex.isSelected && !srcHex.unit.hasMoved) 
			{
				//TODO a move function in map class
				hex.unit = srcHex.unit;
				hex.unit.hasMoved = true;
				srcHex.delUnit();
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
	if (hex.name !== null)	{  text = hex.name + " " + text; }
	if (hex.unit != null)	{  text = " Unit: " + hex.unit.unitData.name + " " + text;	}
	if (map.currentHex != null) { r.drawCursor(cell); }
	$('locmsg').innerHTML = text;
				
	
}

function buildMainMenu()
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
			{ $('game').style.zoom = "30%"; }
			else { $('game').style.zoom = "100%"; }
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
			var v = $('unit-info').style.visibility;
			
			if (v === "visible") { $('unit-info').style.visibility = "hidden"; }
			else 
			{
				//Just to show some window with dummy data if user press with no unit selected
				$('unit-info').style.visibility = "visible"; 
				if (map.currentHex != null && map.currentHex.unit != null) 
				{ 
					updateUnitInfoWindow(map.currentHex.unit);
				}
			}
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
function updateUnitInfoWindow(u)
{
	$('unit-info').style.visibility  = "visible";
	
	$('unit-image').style.backgroundImage = "url(" + u.unitData.icon +")";
	$('unit-name').innerHTML = u.unitData.name;
	$('fuel').innerHTML = u.fuel;
	$('ammo').innerHTML = u.ammo;
	$('str').innerHTML = u.strength + "/10";
	$('gunrange').innerHTML = u.unitData.gunrange;
	$('ini').innerHTML = u.unitData.initiative;
	$('spot').innerHTML = u.unitData.spotrange;
	$('ahard').innerHTML = u.unitData.hardatk;
	$('asoft').innerHTML = u.unitData.softatk;
	$('aair').innerHTML = u.unitData.airatk;
	$('anaval').innerHTML = u.unitData.navalatk;
	$('dhard').innerHTML = u.unitData.grounddef;
	$('dair').innerHTML = u.unitData.airdef;
	$('dclose').innerHTML = u.unitData.closedef;
	$('drange').innerHTML = u.unitData.rangedefmod;
	$('iokbut').onclick = function() { $('unit-info').style.visibility = "hidden"; }
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