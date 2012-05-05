/**`
 * UI - handles mouse and dialog boxes
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function UI(scenario)
{
	var map = new Map();
	var l = new MapLoader();
	var uiAirMode = false; //flag used to select between overlapping ground/air units
	var countries = []; //array for countries in this scenario
	map = GameState.restore();
		
	if (map === null) 
	{
		l.loadMap(scenario);
		map = l.buildMap();
	}
	map.dumpMap();

	var r = new Render(map);
	r.cacheImages(function() { r.render(); });
	var canvas = r.getCursorCanvas();
	
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	canvas.addEventListener("mousedown", handleMouseClick, false);
	canvas.addEventListener("mousemove", handleMouseMove, false);
	
	countries = map.getCountries();
	buildMainMenu();
	buildEquipmentWindow();
	
	this.mainMenuButton = function(id) { mainMenuButton(id); } //Hack to bring up the mainmenu //TODO remove this

function handleMouseClick(e) 
{
	var hex;
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	hex = map.map[row][col];
	unit = hexUnit(hex);
	
	//Right click only to show unit info
	if (minfo.rclick) 
	{ 
		if (unit) updateUnitInfoWindow(unit);
		return true;
	}
	
	//Clicked hex has a unit ?
	if (unit) 
	{
		if ((map.currentUnit !== null) && (hex.isAttackSel))
		{	//attack an allowed hex unit
			if (!map.currentUnit.hasFired)
			{
				r.drawAnimation(row, col);		
				map.attackUnit(map.currentUnit, unit);
			}
		}	
		else //Select the new unit
		{
			map.selectUnit(unit, row, col);
		}
		/*
		var c  = hex.unit.player.country;
		$('eqSelCountry').country = c + 1;
		//TODO make unitList show strength/movement/attack status and update it on all actions
		updateEquipmentWindow(hex.unit.unitData().class); 
		*/
	}	
	else
	{
		//Do we already have a selected unit ?
		if (map.currentUnit != null)
		{	
			//move to an allowed hex
			if (hex.isMoveSel && !map.currentUnit.hasMoved) 
			{
				var win = map.moveUnit(map.currentUnit, row, col);
				if (win >= 0) 
				{ 
					uiMessage("Victory","Side " + sidesName[win] + " wins by capturing all victory hexes"); 
				}
			} 		
			map.delCurrentUnit();
		}
		else
		{
			console.log("No unit at:" + cell.row + "," + cell.col);
		}
		map.delMoveSel();
		map.delAttackSel();
	}
	//ToDo partial screen updates
	r.render(); 
}

function handleMouseMove(e) 
{
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	var hex = map.map[row][col];
	var text = terrainNames[hex.terrain] + " (" + row + "," + col + ")";
	if (hex.name !== null)	{  text = hex.name + " " + text; }
	if (hex.unit !== null)	{  text = " Unit: " + hex.unit.unitData().name + " " + text; }
	if (map.currentUnit != null) { r.drawCursor(cell); }
	$('locmsg').innerHTML = text;
}

function buildMainMenu()
{
	//menu buttons div with id is the filename from resources/ui/menu/images
	var menubuttons = [["buy","Requisition Units(TBD)"],["inspectunit","Unit Info"],["hex","Toggle Showing of Hexes"],
					   ["air","Toggle Air More On (TBD)"],["zoom","Zoom Map"],["undo","Undo Last Move(TBD)"],
					   ["endturn","End turn"], ["mainmenu", "Main Menu"]];
					   
	var sd = addTag('menu','div');
	sd.id = "statusmsg";
	sd.className = "message";
	sd.innerHTML = sidesName[map.currentSide] + " side Turn: " + map.turn + "  " + map.description;
	
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
		
		div.onclick = function() { mainMenuButton(this.id); }
		div.onmouseover = function() { hoverin(this.firstChild); }
		div.onmouseout = function() { hoverout(this.firstChild); }
	}
	
	var ld = addTag('menu','div');
	ld.id = "locmsg"
	ld.className = "message";
}

function mainMenuButton(id)
{
	switch(id) 
	{
		case 'air':
		{
			uiAirMode = !uiAirMode;
			console.log("Air mode changed to:" + uiAirMode);
			break;
		}
		case 'hex':
		{
			r.style.toggleHexes();
			r.render();
			break;
		}
		case 'zoom':
		{	
			var zoom = Math.min(window.innerWidth/canvas.width*100, window.innerHeight/canvas.height*100);
			if ($('game').style.zoom === "100%" || $('game').style.zoom === '' )
			{ 
				$('game').style.zoom = zoom + "%"; 
				r.isZoomed = true;
			}
			else 
			{ 
				$('game').style.zoom = "100%";
				r.isZoomed = false;
			}
			r.render();
			break;
		}
		case 'inspectunit':
		{
			var v = $('unit-info').style.visibility;
			
			if (v == "visible") 
			{ 
				$('unit-info').style.visibility = "hidden"; 
			}
			else 
			{
				//Just to show some window with dummy data if user press with no unit selected
				$('unit-info').style.visibility = "visible"; 
				if (map.currentUnit != null) 
				{ 
					updateUnitInfoWindow(map.currentUnit);
				}
			}
			break;
		}
		case 'buy':
		{
			var v = $('equipment').style.visibility;
			
			if (v == "visible") 
			{ 
				$('equipment').style.visibility = "hidden"; 
				$('container-unitlist').style.visibility = "hidden"; 
			}
			else 
			{ 
				$('equipment').style.visibility = "visible"; 
				$('container-unitlist').style.visibility = "visible"; 
				updateEquipmentWindow(unitClass.tank);
			}
			break;
		}
		case 'endturn':
		{
			map.endTurn();
			GameState.save(map);
			$('statusmsg').innerHTML = sidesName[map.currentSide] + " side Turn: " + map.turn + "  " + map.description;
			uiMessage(sidesName[map.currentSide] + " Side Turn " + map.turn, uiEndTurnInfo());
			r.render();
			break;
		}
		case 'mainmenu':
		{
			uiMessage("Open Panzer version " + VERSION, "Copyright 2012 Nicu Pavel <br> " +
			"npavel@linuxconsulting.ro <br><br><br> Available scenarios:<br>");
			
			var scnSel = addTag('message', 'select');
			scnSel.onchange = function(){ newScenario(this.options[this.selectedIndex].value);}
			
			for (var i = 0; i < scenariolist.length; i++)
			{
				var scnOpt = addTag(scnSel, 'option');
				scnOpt.value = "resources/scenarios/xml/" + scenariolist[i][0];
				scnOpt.text =  scenariolist[i][1];
			}		
			break;
		}
	}
}

function updateUnitInfoWindow(u)
{
	var isEqUnit = false;
	var uinfo, ammo, fuel;
	$('unit-info').style.visibility  = "visible";
	
	//Call from equipment window
	if (typeof (u.unitData) === 'undefined') 
	{
		uinfo = u;
		u.flag = u.country;
		u.strength = 10;
		isEqUnit = true;
		ammo = u.ammo;
		fuel = u.fuel;
	}
	else 
	{	
		uinfo = u.unitData(); 
		ammo = u.getAmmo();
		fuel = u.getFuel();
	}
	
	$('unit-image').style.backgroundImage = "url(" + uinfo.icon +")";
	$('unit-flag').style.backgroundImage = "url('resources/ui/flags/flag_big_" + u.flag +".png')";
	$('unit-name').innerHTML = uinfo.name;
	$('fuel').innerHTML = fuel;
	$('ammo').innerHTML = ammo;
	$('str').innerHTML = u.strength + "/10";
	$('gunrange').innerHTML = uinfo.gunrange;
	$('ini').innerHTML = uinfo.initiative;
	$('spot').innerHTML = uinfo.spotrange;
	$('ahard').innerHTML = uinfo.hardatk;
	$('asoft').innerHTML = uinfo.softatk;
	$('aair').innerHTML = uinfo.airatk;
	$('anaval').innerHTML = uinfo.navalatk;
	$('dhard').innerHTML = uinfo.grounddef;
	$('dair').innerHTML = uinfo.airdef;
	$('dclose').innerHTML = uinfo.closedef;
	$('drange').innerHTML = uinfo.rangedefmod;

	$('iokbut').onclick = function() { $('unit-info').style.visibility = "hidden"; }
	$('imountbut').className = "";
	$('iresupbut').className = "";
	$('ireinfbut').className = "";
	
	if (isEqUnit) return;
	if (u.player.side != map.currentSide) return;
	
	if (GameRules.canMount(u))
	{
		$('imountbut').className = "enabled";
		$('imountbut').title = "Mount this unit into a transport";
		$('imountbut').onclick = function() {unitInfoButton('mount', u);}
	}
	
	if (GameRules.canResupply(map.map, u))
	{
		$('iresupbut').className = "enabled";
		$('iresupbut').title = "Resupply Ammo and Fuel for this unit";
		$('iresupbut').onclick = function() {unitInfoButton('resupply', u);}
	}

	if (GameRules.canReinforce(map.map, u)) 
	{
		$('ireinfbut').className = "enabled";
		$('ireinfbut').title = "Reinforce unit strength";
		$('ireinfbut').onclick = function() {unitInfoButton('reinforce', u);}
	}
	
	console.log(u);
}

function unitInfoButton(action, unit)
{
	switch (action)
	{
		case 'mount':
		{
			if (unit.isMounted)
				map.unmountUnit(unit);
			else
				map.mountUnit(unit);
			break;
		}
		case 'resupply':
		{
			map.resupplyUnit(unit);
			break;
		}
		case 'reinforce':
		{
			map.reinforceUnit(unit);
			break;
		}
	}
	$('unit-info').style.visibility = "hidden";
	r.render();
}

function buildEquipmentWindow()
{
	//Build the class selection buttons [button name, description, unit class id from equipment.js]
	var eqClassButtons = [['but-aa','Air defence', 9],['but-at', 'Anti-tank', 4],['but-arty', 'Artillery', 8],
					  ['but-inf', 'Infantry', 1],['but-rcn','Recon', 3],['but-tank', 'Tank', 2],
					  ['but-af','Air Fighter', 10], ['but-ab','Air Bomber', 11]];
	
	//The default selected country in the div
	var c = 0;
	var pos = -21 * countries[c];
	$('eqSelCountry').country = c;
	$('eqSelCountry').owner = 0;
	$('eqSelCountry').style.backgroundPosition = "" + pos + "px 0px";
	$('eqSelCountry').title = 'Click to change country';
	$('eqSelCountry').onclick = function() 
		{
			var c = this.country; 
			if (c >= countries.length - 1) c = 0; 
			else c++;
			var flagPos = -21 * countries[c];
			this.style.backgroundPosition = "" + flagPos +"px 0px";
			this.country = c; 
			updateEquipmentWindow(unitClass.tank);
		};
	//Unit Class buttons	
	for (b in eqClassButtons)
	{
		var div = addTag('eqSelClass','div');
		var img = addTag(div, 'img');
		
		var id = eqClassButtons[b][0];
		div.id = id;
		div.title = eqClassButtons[b][1];
		div.eqclass = eqClassButtons[b][2]; //Hack to get parameter passed
		img.id = id;
		img.src = "resources/ui/dialogs/equipment/images/" + id + ".png";
		div.onclick = function() { updateEquipmentWindow(this.eqclass); }
		div.onmouseover = function() { hoverin(this.firstChild); }
		div.onmouseout = function() { hoverout(this.firstChild); }
	}
	
	//Bottom buttons
	$('eqNewBut').title = "Buy unit as a new unit";
	$('eqUpgradeBut').title = "Upgrade selected unit to this unit";
	$('eqUpgradeBut').onclick = function()
		{
			//TODO Test change it
			var id = $('eqUserSel').userunit;
			var eqid = $('eqUserSel').equnit;
			if (id == undefined || eqid == undefined)
				return;
			console.log("Upgrading unit: " + id + " to equipment id:" + eqid);
			map.upgradeUnit(id, eqid);
			//Need to cache new image
			r.cacheImages(function() { r.render(); });
		}
		
	$('eqOkBut').title = "Close";
	$('eqOkBut').onclick = function() 
		{ 
			$('equipment').style.visibility = "hidden"; 
			$('container-unitlist').style.visibility = "hidden"; 
		}
}

function updateEquipmentWindow(eqclass)
{
	//Remove older entries
	$('unitlist').innerHTML = "";
	$('eqUnitList').innerHTML = "";
	
	//The current selected coutry in the div
	var c = $('eqSelCountry').country;
	var country = parseInt(countries[c]) + 1; //country id that is saved on unit data starts from 1 
	
	//The actual units on the map
	var userUnitSelected = $('eqUserSel').userunit;
	//console.log("User Selected Unit:" + userUnitSelected);
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		//TODO should check owners not countries
		var u = unitList[i];
		var ud = u.unitData();
		if (ud.country == country)
		{
			var div = addTag('unitlist', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			
			if (u.id == userUnitSelected)
				div.title = u.name; //This is a hack to apply the .eqUnitBox[title] css style for selected unit
				
			img.src = ud.icon;
			txt.innerHTML = ud.name;
			div.unitid = u.id;
			div.eqclass = ud.class;
			div.country = ud.country;
			div.onclick = function() 
				{ 
					$('eqUserSel').userunit = this.unitid; //save selected player unit 
					updateEquipmentWindow(this.eqclass);
				}
		}
	}
	
	//Don't change the listing on dummy class
	if (eqclass == 0) return;
	
	var eqUnitSelected = $('eqUserSel').equnit;
	//console.log("Selected unit:" + eqUnitSelected);
	//Units in equipment
	for (var i in equipment)
	{
		var u = equipment[i];
		if ((u.class == eqclass) && (u.country == country))
		{
			var div = addTag('eqUnitList', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			
			if (u.id == eqUnitSelected)
				div.title = u.name; //This is a hack to apply the .eqUnitBox[title] css style for selected unit
				
			div.equnitid = u.id;
			img.src = u.icon;
			txt.innerHTML = u.name + " - " + u.cost*12 + " ";
			txt.innerHTML += "<img src='resources/ui/dialogs/equipment/images/currency.png'/>";
			div.onclick = function() 
				{ 
					$('eqUserSel').equnit = this.equnitid; //save the selected unit in the equipment list
					updateUnitInfoWindow(equipment[this.equnitid]); 
					updateEquipmentWindow(eqclass); //To "unselect" previous selected unit
				};
			
		}
	}
}

function uiMessage(title, message)
{
	$('title').innerHTML = title;
	$('message').innerHTML = message;
	$('ui-message').style.visibility = "visible"
	$('uiokbut').onclick = function() { $('ui-message').style.visibility = "hidden"; }
}

//Returns air or ground unit on a hex depending on 
//main menu Air mode button
function hexUnit(hex)
{
	if (hex == undefined || hex == null)
		return null;
	if (hex.unit !== null && hex.airunit !== null)
	{
		if (uiAirMode)
			return hex.airunit;
		else
			return hex.unit;
	}
	
	if (hex.unit !== null)
		return hex.unit;
		
	if (hex.airunit !== null)
		return hex.airunit;
	
	return null;
}

function uiEndTurnInfo()
{
	var playerList = map.getPlayers();
	var infoStr = "";
	for (var i = 0; i < playerList.length; i++)
	{
		infoStr +=  playerList[i].getCountryName() + " player on " +  sidesName[playerList[i].side]
					+ " side has " + map.sidesVictoryHexes[playerList[i].side] + " victory points to conquer <br/>";
	}
	return infoStr;	
}

function newScenario(scenario)
{
	//TODO add getCountries/build equipment windows calls to fix equipment window
	GameState.clear();
	l.loadMap(scenario);
	map = l.buildMap();
	map.dumpMap();
	r.setNewMap(map);
	r.cacheImages(function() { r.render(); });
	countries = map.getCountries(); 
	$('statusmsg').innerHTML = sidesName[map.currentSide] + " side Turn: " + map.turn + "  " + map.description;
}

function getMouseInfo(canvas, e)
{
	var mx, my, rclick;
	if (e.which) rclick = (e.which == 3);
	else if (e.button) rclick = (e.button == 2);				
	mx = e.clientX - canvas.offsetLeft + document.body.scrollLeft + document.documentElement.scrollLeft;
	my = e.clientY - canvas.offsetTop + document.body.scrollTop + document.documentElement.scrollTop;;	
	
	return new mouseInfo(mx, my, rclick);
}

} //End of UI class

function gameStart()
{
	rng = Math.round(Math.random() * (scenariolist.length - 1))
	scenario = "resources/scenarios/xml/" +  scenariolist[rng][0];
	//console.log("Number: " + rng + " Scenario:" + scenario);
	
	scenario="resources/scenarios/xml/tutorial.xml";
	ui = new UI(scenario);
	//Bring up the "Main Menu"
	ui.mainMenuButton('mainmenu');
}