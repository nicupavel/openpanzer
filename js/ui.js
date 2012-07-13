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
		hexGrid:true, // flag to notify render if it should draw or not hex grid
		deployMode:false, //used for unit deployment
		hasTouch: hasTouch(),
	};
	
	var map = new Map();
	var l = new MapLoader();	
	var countries = []; //array for countries in this scenario
	map = GameState.restore();
		
	if (map === null) 
	{
		l.loadMap(scenario);
		map = l.buildMap();
	}
	map.dumpMap();

	var r = new Render(map);
	r.setUISettings(uiSettings);
	//redraw screen and center unit on screen when images have finished loading
	r.cacheImages(function() { r.render(); uiSetUnitOnViewPort(map.currentUnit); });
	var canvas = r.getCursorCanvas();
	
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	canvas.addEventListener("mousedown", handleMouseClick, false);
	if (!uiSettings.hasTouch) canvas.addEventListener("mousemove", handleMouseMove, false);
	
	countries = map.getCountriesBySide(map.currentPlayer.side);
	buildMainMenu();
	buildEquipmentWindow();
	selectStartingUnit(); //select the first available unit for the current side
	
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
		if (map.currentUnit !== null && !uiSettings.deployMode )
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
		if (uiSettings.deployMode && hex.isDeployment > -1
				&& map.getPlayer(hex.isDeployment).side == map.currentPlayer.side)
			handleUnitDeployment(row, col); //Allow deployment on deployment hexes if on same side
		else
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
	var unit, text, hex;
	var minfo = getMouseInfo(canvas, e);
	var c = r.screenToCell(minfo.x, minfo.y);

	if (map.currentUnit != null) { r.drawCursor(c); }

	hex = map.map[c.row][c.col];
	if (!hex || typeof hex === "undefined")
		return;

	text = terrainNames[hex.terrain] + " (" + c.row + "," + c.col + ")";

	if (hex.name !== null)	{  text = hex.name + " " + text; }
	
	if ((unit = hex.getUnit(uiSettings.airMode)) !== null 
		&& (hex.isSpotted(map.currentPlayer.side) || unit.tempSpotted 
			|| unit.player.side == map.currentPlayer.side)) 
	{
		text = " Unit: " + unit.unitData().name + " " + text; 
	}
	$('locmsg').innerHTML = text;
}

//handle unit deployment
function handleUnitDeployment(row, col)
{
	var deployUnit = $('eqUserSel').deployunit; //TODO make this into a UI member
	var ret = map.deployPlayerUnit(map.currentPlayer, deployUnit, row, col);
	if (ret)
		r.cacheImages(function() { r.render(); updateEquipmentWindow(map.currentUnit.unitData().uclass); });
	else 
		console.log("Can't deploy unit in that location");
	
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
		updateEquipmentWindow(map.currentUnit.unitData().uclass);
}

//handle the move of currently selected unit to row,col destination
function handleUnitMove(row, col)
{
	var s = map.currentUnit.getPos();
	var mm = map.currentUnit.unitData().movmethod;
	var mr = map.moveUnit(map.currentUnit, row, col);
	
	soundData[moveSoundByMoveMethod[mm]].play();
	r.moveAnimation(map.currentUnit, mr.passedCells);
	
	if (mr.isVictorySide >= 0) 
		uiMessage("Victory","Side " + sideNames[mr.isVictorySide] + " wins by capturing all victory hexes"); 
}

//handle attack performed by currently selected unit on row,col unit
//TODO most of the code here pertaining to support fire should be moved to map object
function handleUnitAttack(row, col)
{
	var hex = map.map[row][col];
	var attackingUnit = map.currentUnit;
	if ((enemyUnit = hex.getAttackableUnit(attackingUnit, uiSettings.airMode)) !== null) //Select which unit to attack depending on uiSettings.airMode
	{
		console.log(enemyUnit);
		var cpos = attackingUnit.getPos();
		var cclass = attackingUnit.unitData().uclass;
		var eclass = enemyUnit.unitData().uclass;
		var supportUnits = GameRules.getSupportFireUnits(map.getUnits(), attackingUnit, enemyUnit);
		var animationCBData = 
		{
			units: [attackingUnit, enemyUnit],
			oldstr: [attackingUnit.strength, enemyUnit.strength],
			cbfunc: uiAnimationFinished,
		}
		//Support Fire
		for (var u in supportUnits)
		{
			var sp = supportUnits[u].getPos();
			var sclass = supportUnits[u].unitData().uclass;
			if (attackingUnit.destroyed)
				break;
 			map.attackUnit(supportUnits[u], attackingUnit, true);
			r.addAnimation(sp.row, sp.col, attackAnimationByClass[sclass], supportUnits[u].facing ); //Hits by supporting units
		}
		if (attackingUnit.destroyed) //TODO Do this better
		{
			map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
			r.drawCursor(cpos, uiSettings.airMode); //refresh cursor or it gets stuck in attack cursor
			r.addAnimation(cpos.row, cpos.col, "explosion");
		}
		else //Can we still attack ?
		{
			var cr = map.attackUnit(attackingUnit, enemyUnit, false); //Only attack an enemy unit on that hex
			r.addAnimation(cpos.row, cpos.col, attackAnimationByClass[cclass], attackingUnit.facing);
			if (enemyUnit.destroyed)
				r.addAnimation(row, col, "explosion");
			else
				if (cr.defcanfire)
					r.addAnimation(row, col, attackAnimationByClass[eclass], enemyUnit.facing); //Hits to the unit being attacked
			
			if (attackingUnit.destroyed) //TODO Do this better
			{
				map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
				r.drawCursor(cpos, uiSettings.airMode); //refresh cursor or it gets stuck in attack cursor
				r.addAnimation(cpos.row, cpos.col, "explosion");
			}
		}
		r.runAnimation(animationCBData);
	}
}

//Called when attack animation finishes 
function uiAnimationFinished(animationCBData)
{
	for (var i = 0; i < animationCBData.units.length; i++)
	{
		if (animationCBData.units[i].destroyed)	continue;
		var loss = animationCBData.units[i].strength - animationCBData.oldstr[i];
		if (loss == 0) continue;
		var cell = animationCBData.units[i].getPos();
		var pos = r.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
		var cdiv = addTag('mainbody', 'div');		
		var ldiv = addTag(cdiv, 'div');
		cdiv.style.cssText = "position:absolute; top:"+ pos.y + "px; left:" + pos.x + "px";
		//CSS AnimationEvent callback to delete the created parent div
		ldiv.addEventListener("animationend", function() { delTag(this.parentNode); }, false); //mozilla
		ldiv.addEventListener("webkitAnimationEnd", function() { delTag(this.parentNode); }, false); //webkit
		ldiv.className = "combat-loss";
		ldiv.innerHTML = loss;
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
	sd.innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "  " + map.description;
	
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
				if (map.currentUnit != null) updateUnitInfoWindow(map.currentUnit);
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
				uiSettings.deployMode = false;
				
			}
			else 
			{ 
				$('equipment').style.visibility = "visible"; 
				$('container-unitlist').style.visibility = "visible"; 
				updateEquipmentWindow(unitClass.tank);
			}
			r.render();
			break;
		}
		case 'endturn':
		{
			map.endTurn();
			GameState.save(map);
			countries = map.getCountriesBySide(map.currentPlayer.side);
			updateEquipmentWindow(unitClass.tank); //Refresh equipment window for the new player
			selectStartingUnit();
			
			$('statusmsg').innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "  " + map.description;
			uiMessage(map.currentPlayer.getCountryName() + " player on " 
				+ map.currentPlayer.getSideName() +" side  Turn " + map.turn, uiEndTurnInfo());
			
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
	if (u.player.id != map.currentPlayer.id) return;
	
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
	$('eqNewBut').onclick = function()
		{
				var eqid = $('eqUserSel').equnit;
				if (typeof eqid === "undefined")
					return;
				var ret = map.currentPlayer.buyUnit(eqid, 0); //TODO transport
				if (ret)
					console.log("Player:" + map.currentPlayer.getCountryName() + " bought unit id: " + eqid);
				else
					console.log("Can't buy a new unit");
				updateEquipmentWindow(equipment[eqid].uclass);
		}
	$('eqUpgradeBut').title = "Upgrade selected unit to this unit";
	$('eqUpgradeBut').onclick = function()
		{
			var id = $('eqUserSel').userunit;
			var eqid = $('eqUserSel').equnit;
			
			if (typeof id === "undefined" || typeof eqid === "undefined")
				return;
			console.log("Upgrading unit: " + id + " to equipment id:" + eqid);
			if (map.upgradeUnit(id, eqid))
			{
				r.cacheImages(function() { r.render(); }); //Need to cache new image
				updateEquipmentWindow(equipment[eqid].uclass);
			}
		}
		
	$('eqOkBut').title = "Close";
	$('eqOkBut').onclick = function() { mainMenuButton("buy"); }
}

//TODO function too large break it
function updateEquipmentWindow(eqclass)
{
	if ($('equipment').style.visibility !== "visible") 
		return;
		
	var currencyIcon = "<img src='resources/ui/dialogs/equipment/images/currency.png'/>";
	//Remove older entries
	$('unitlist').innerHTML = "";
	$('eqUnitList').innerHTML = "";
	$('currentPrestige').innerHTML = map.currentPlayer.prestige + currencyIcon;
	
	//The current selected coutry in the div
	var c = $('eqSelCountry').country;
	var country = parseInt(countries[c]) + 1; //country id that is saved on unit data starts from 1 
	$('eqSelCountry').style.backgroundPosition = "" + countries[c] * -21 + "px 0px"; //Update flag

	if (map.currentPlayer.deploymentList.length > 0)
	{
		//The units that current player hasn't deployed yet
		var deployUnitSelected = $('eqUserSel').deployunit;
		var deployList = map.currentPlayer.deploymentList;
		uiSettings.deployMode = true;
		
		for (var i = 0; i < deployList.length; i++)
		{
			var ud = equipment[deployList[i][0]];
			var div = addTag('unitlist', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			img.src = ud.icon;
			txt.innerHTML = ud.name;
			div.unitid = i;
			div.eqclass = ud.uclass;
			div.country = map.currentPlayer.country;
			if (i == deployUnitSelected)
			{	
					div.title = ud.name; //apply the .eqUnitBox[title] css style to make unit appear selected
			}
			
			div.onclick = function() 
					{ 
						$('eqUserSel').deployunit = this.unitid; //save selected player unit
						updateEquipmentWindow(this.eqclass); //make selection appear
						r.render(); //make the deployment mode appear
					}
		}
	}
	else
	{
		//The actual units on the map
		var userUnitSelected = $('eqUserSel').userunit;
		//console.log("User Selected Unit:" + userUnitSelected);
		var unitList = map.getUnits(); 
		uiSettings.deployMode = false;
		
		for (var i = 0; i < unitList.length; i++)
		{
			var u = unitList[i];
			var ud = u.unitData();
			if (u.player.id == map.currentPlayer.id)
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
					//bring the unit box into unit list view by scrolling
					$('hscroll-unitlist').scrollLeft = $('unitlist').offsetWidth;
					//bring the unit into map view
					uiSetUnitOnViewPort(u);
				}
					
				img.src = ud.icon;
				txt.innerHTML = ud.name;
				div.unitid = u.id;
				div.eqclass = ud.uclass;
				div.country = u.player.country;
				div.onclick = function() 
					{ 
						c = map.getCountriesBySide(map.currentPlayer.side);
						for (i = 0; i < c.length; i++)
							if (c[i] == this.country) break;
						$('eqSelCountry').country = i;
						$('eqUserSel').userunit = this.unitid; //save selected player unit
						updateEquipmentWindow(this.eqclass);
					}
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
		if ((u.uclass == eqclass) && (u.country == country))
		{
			var div = addTag('eqUnitList', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			
			if (u.id == eqUnitSelected)
				div.title = u.name; //This is a hack to apply the .eqUnitBox[title] css style for selected unit
				
			div.equnitid = u.id;
			img.src = u.icon;
			txt.innerHTML = u.name + " - " + u.cost * CURRENCY_MULTIPLIER;
			txt.innerHTML += currencyIcon;
			div.onclick = function() 
				{ 
					$('eqUserSel').equnit = this.equnitid; //save the selected unit in the equipment list
					$('eqUserSel').eqoffset  = $('eqUnitList').scrollTop; //save scroll position so at refresh we autoscroll 
					updateUnitInfoWindow(equipment[this.equnitid]); 
					updateEquipmentWindow(eqclass); //To "unselect" previous selected unit
					$('eqUnitList').scrollTop = $('eqUserSel').eqoffset; //scroll to the selected unit
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
		infoStr +=  playerList[i].getCountryName() + " player on " +  playerList[i].getSideName()
			+ " side has " + map.sidesVictoryHexes[playerList[i].side] + " victory points to conquer <br/>";
	}
	return infoStr;	
}


function uiSetUnitOnViewPort(unit)
{
	if (!unit) return;
	var cell = unit.getPos();
	if (!cell || typeof cell === "undefined") return;
	var pos = r.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
	document.body.scrollLeft = pos.x - window.innerWidth/2;
	document.body.scrollTop = pos.y - window.innerHeight/2;
}

//Selects the first unit that belongs to the currently playing side
function selectStartingUnit()
{
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		if (unitList[i].player.id == map.currentPlayer.id)
		{
			map.selectUnit(unitList[i]);
			$('eqUserSel').userunit = unitList[i].id; //save selected player unit
			break;
		}
	}
}

function newScenario(scenario)
{
	GameState.clear();
	l.loadMap(scenario);
	map = l.buildMap();
	map.dumpMap();
	r.setNewMap(map);
	r.cacheImages(function() { r.render(); uiSetUnitOnViewPort(map.currentUnit); });
	countries = map.getCountriesBySide(map.currentPlayer.side);
	updateEquipmentWindow(unitClass.tank); //Refresh equipment window
	selectStartingUnit();
	$('statusmsg').innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "  " + map.description;
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