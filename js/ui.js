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
	var uiSettings = 
	{
		airMode:false, //flag used to select between overlapping ground/air units
		mapZoom:false, //flag used to draw map in zoomed mode or not
		hexGrid:true // flag to notify render if it should draw or not hex grid
	};
	var map = new Map();
	var l = new MapLoader();	
	var countries = []; //array for countries in this scenario
	var win = -1; //Neither side has won yet
	map = GameState.restore();
		
	if (map === null) 
	{
		l.loadMap(scenario);
		map = l.buildMap();
	}
	map.dumpMap();

	var r = new Render(map);
	r.setUISettings(uiSettings);
	r.cacheImages(function() { r.render(); });
	var canvas = r.getCursorCanvas();
	
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	canvas.addEventListener("mousedown", handleMouseClick, false);
	canvas.addEventListener("mousemove", handleMouseMove, false);
	
	countries = map.getCountries();
	buildMainMenu();
	buildEquipmentWindow();
	selectStartingUnit();
	
	this.mainMenuButton = function(id) { mainMenuButton(id); } //Hack to bring up the mainmenu //TODO remove this
	
	
function handleMouseClick(e) 
{
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	var hex = map.map[row][col];
	if (typeof hex === "undefined")
	{
		console.log("Undefined hex:" + row + "," + col);
		return true;
	}
	
	var clickedUnit = hex.getUnit(uiSettings.airMode);
	
	//Right click to show unit info or clear current selection
	if (minfo.rclick) 
	{ 
		if (clickedUnit) 
			updateUnitInfoWindow(clickedUnit);
		else 
		{
			map.delCurrentUnit();
			r.render();
		}
		return true;
	}
	
	//Clicked hex has a unit ?
	if (clickedUnit) 
	{
		if (map.currentUnit !== null)
		{
			//attack an allowed hex unit
			if (hex.isAttackSel && !map.currentUnit.hasFired)
				handleUnitAttack(row, col);
			else
				if (hex.isMoveSel) //Move unit over/under clickedUnit
					handleUnitMove(row, col);
				else 
					handleUnitSelect(row, col);
		}	
		else //No current unit select new one
		{
			handleUnitSelect(row, col);
		}
	}	
	else //No unit on clicked hex
	{
		//move to an empty allowed hex
		if (hex.isMoveSel && !map.currentUnit.hasMoved && map.currentUnit !== null)
			handleUnitMove(row, col);
		else //remove current selection
			map.delCurrentUnit();
	}

	//TODO make unitList equipment window show strength/movement/attack status and update it on all actions
	
	//Set the airMode depending on current unit automatically
	if (GameRules.isAir(map.currentUnit)) 
	{
			uiSettings.airMode = true; //If clicked unit is air select airmode automatically
			hoverin($('air').firstChild); //Change air button to ON in UI
	}
	else
	{
			uiSettings.airMode = false; //If clicked unit is air select airmode automatically
			hoverout($('air').firstChild); //Change air button to ON in UI
	}
	
	//TODO partial screen updates (can update only attack or move selected hexes)
	r.render(); 
}

function handleMouseMove(e) 
{
	var minfo = getMouseInfo(canvas, e);
	var c = r.screenToCell(minfo.x, minfo.y);
	var unit = null;
	var hex = map.map[c.row][c.col];
	var text = terrainNames[hex.terrain] + " (" + c.row + "," + c.col + ")";
	if (hex.name !== null)	{  text = hex.name + " " + text; }
	if ((unit = hex.getUnit(uiSettings.airMode)) !== null) {  text = " Unit: " + unit.unitData().name + " " + text; }
	if (map.currentUnit != null) { r.drawCursor(c); }
	$('locmsg').innerHTML = text;
}

//handle the selection of a new unit
function handleUnitSelect(row, col)
{
	var hex = map.map[row][col];
	if (!map.selectUnit(hex.getUnit(uiSettings.airMode))) //can fail if clickedUnit is on enemy side
		map.selectUnit(hex.getUnit(!uiSettings.airMode)); //try the other unit on hex

	if (map.currentUnit === null) 
		return;
	//Select unit on equipment window
	$('eqUserSel').userunit = map.currentUnit.id; //save selected player unit
	if ($('equipment').style.visibility == "visible")
		updateEquipmentWindow(map.currentUnit.unitData().class);	
}

//handle the move of currently selected unit to row,col destination
function handleUnitMove(row, col)
{
	var s = map.currentUnit.getPos();
	//TODO surprise contact
	var c = GameRules.getShortestPath(s, new Cell(row, col), map.getCurrentMoveRange());
	r.moveAnimation(map.currentUnit, c);
	win = map.moveUnit(map.currentUnit, row, col);
	if (win >= 0) 
		uiMessage("Victory","Side " + sidesName[win] + " wins by capturing all victory hexes"); 
}

//handle attack performed by currently selected unit on row,col unit
function handleUnitAttack(row, col)
{
	var hex = map.map[row][col];
	if ((enemyUnit = hex.getAttackableUnit(map.currentUnit, uiSettings.airMode)) !== null) //Select which unit to attack depending on uiSettings.airMode
	{
		var cpos = map.currentUnit.getPos();
		var cclass = map.currentUnit.unitData().class;
		var eclass = enemyUnit.unitData().class;

		var supportUnits = GameRules.getSupportFireUnits(map.getUnits(), map.currentUnit, enemyUnit);
		//Support Fire
		for (var u in supportUnits)
		{
			var sp = supportUnits[u].getPos();
			var sclass = supportUnits[u].unitData().class;
			if (map.currentUnit.destroyed)
				break;
 			map.attackUnit(supportUnits[u], map.currentUnit, true);
			r.addAnimation(sp.row, sp.col, attackAnimationByClass[sclass], supportUnits[u].facing ); //Hits by supporting units
		}
		if (map.currentUnit.destroyed) //TODO Do this better
		{
			map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
			r.drawCursor(cell, uiSettings.airMode); //refresh cursor or it gets stuck in attack cursor
			r.addAnimation(cpos.row, cpos.col, "explosion");
		}
		else //Can we still attack ?
		{
			var cr = map.attackUnit(map.currentUnit, enemyUnit, false); //Only attack an enemy unit on that hex
			r.addAnimation(cpos.row, cpos.col, attackAnimationByClass[cclass], map.currentUnit.facing);
			if (map.currentUnit.destroyed) //TODO Do this better
			{
				map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
				r.drawCursor(cell, uiSettings.airMode); //refresh cursor or it gets stuck in attack cursor
				r.addAnimation(cpos.row, cpos.col, "explosion");
			}
			if (enemyUnit.destroyed)
				r.addAnimation(row, col, "explosion");
			else
				if (cr.defcanfire)
					r.addAnimation(row, col, attackAnimationByClass[eclass], enemyUnit.facing); //Hits to the unit being attacked
		}
		r.runAnimation();
	}
}

function buildMainMenu()
{
	//menu buttons div with id is the filename from resources/ui/menu/images
	var menubuttons = [["buy","Upgrade/Buy Units(WIP)"],["inspectunit","Inspect Unit"],["hex","Toggle Hex Grid"],
					   ["air","Toggle Air More On"],["zoom","Strategic Map"],["undo","Undo Last Move(TBD)"],
					   ["endturn","End Turn"], ["mainmenu", "Main Menu"]];
					   
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
		//Keep selection for toggle buttons
		div.onmouseout = function() 
			{ 
				if (uiSettings.airMode && this.id == "air") 
					return;
				if (uiSettings.mapZoom && this.id == "zoom") 
					return;
				if (uiSettings.hexGrid && this.id == "hex") 
					return;	
				hoverout(this.firstChild); 
			}
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
			uiSettings.airMode = !uiSettings.airMode;
			r.render();
			break;
		}
		case 'hex':
		{
			uiSettings.hexGrid = !uiSettings.hexGrid;
			r.render();
			break;
		}
		case 'zoom':
		{	
			var zoom = Math.min(window.innerWidth/canvas.width*100, window.innerHeight/canvas.height*100);
			if ($('game').style.zoom === "100%" || $('game').style.zoom === '' )
			{ 
				$('game').style.zoom = zoom + "%"; 
				uiSettings.mapZoom = true;
			}
			else 
			{ 
				$('game').style.zoom = "100%";
				uiSettings.mapZoom = false;
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
			selectStartingUnit();
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
	if (typeof u.unitData === "undefined") 
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
	$('eqSelCountry').country = 0;
	$('eqSelCountry').owner = 0;
	$('eqSelCountry').title = 'Click to change country';
	$('eqSelCountry').onclick = function() 
		{
			if (this.country >= countries.length - 1) this.country = 0; 
			else this.country++;
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
			if (typeof id === "undefined" || typeof eqid === "undefined")
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
	$('eqSelCountry').style.backgroundPosition = "" + countries[c] * -21 + "px 0px"; //Update flag
	
	//The actual units on the map
	var userUnitSelected = $('eqUserSel').userunit;
	//console.log("User Selected Unit:" + userUnitSelected);
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		var u = unitList[i];
		var ud = u.unitData();
		if (u.player.side == map.currentSide)
		{
			var div = addTag('unitlist', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			
			if (u.id == userUnitSelected)
			{	
				div.title = u.name; //apply the .eqUnitBox[title] css style to make unit appear selected
				map.selectUnit(u); //select unit on map
				r.render(); //refresh so the new selection appear
			}
				
			img.src = ud.icon;
			txt.innerHTML = ud.name;
			div.unitid = u.id;
			div.eqclass = ud.class;
			div.country = u.player.country;
			div.onclick = function() 
				{ 
					c = map.getCountries();
					for (i = 0; i < c.length; i++)
						if (c[i] == this.country) break;
					$('eqSelCountry').country = i;	
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

//Selects the first unit that belongs to the currently playing side
function selectStartingUnit()
{
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		if (unitList[i].player.side == map.currentSide)
		{
			map.selectUnit(unitList[i]);
			break;
		}
	}
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
	win = -1;
	selectStartingUnit();
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