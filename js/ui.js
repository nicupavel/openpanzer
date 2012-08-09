/**
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
		hexGrid:false, // flag to notify render if it should draw or not hex grid
		deployMode:false, //used for unit deployment
		hasTouch: hasTouch(),
	};
	
	var currencyIcon = "<img src='resources/ui/dialogs/equipment/images/currency.png'/>";

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
	r.cacheImages(function() 
		{ 
			selectStartingUnit(); //select the first available unit for the current side
			uiSetUnitOnViewPort(map.currentUnit);
			r.render();  
		});
		
	var canvas = r.getCursorCanvas();
	
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	canvas.addEventListener("mousedown", handleMouseClick, false);
	if (!uiSettings.hasTouch) canvas.addEventListener("mousemove", handleMouseMove, false);
	
	countries = map.getCountriesBySide(map.currentPlayer.side);
	buildMainMenu();
	buildEquipmentWindow();
	
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
		{
			$('unit-info').style.visibility = "visible";
			updateUnitInfoWindow(clickedUnit);
		}
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
		updateUnitInfoWindow(clickedUnit);
			
		if (map.currentUnit !== null && !uiSettings.deployMode )
		{
			//attack an allowed hex unit
			if (hex.isAttackSel && !map.currentUnit.hasFired)
				handleUnitAttack(map.currentUnit, row, col);
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

	//Set the airMode depending on current unit automatically
	uiSettings.airMode = GameRules.isAir(map.currentUnit);
	toggleButton($('air').firstChild, uiSettings.airMode);
	updateUnitContextWindow(map.currentUnit);
	//TODO make unitList equipment window show strength/movement/attack status and update it on all actions	
	//TODO partial screen updates (can update only attack or move selected hexes)
	r.render(); 
}

function handleMouseMove(e) 
{
	var unit, text, hex;
	var minfo = getMouseInfo(canvas, e);
	var c = r.screenToCell(minfo.x, minfo.y);

	if (map.currentUnit != null) { r.drawCursor(c); }
	updateStatusBarLocation(c.row, c.col);
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
		
	//Update unit contextual window
	updateUnitContextWindow(map.currentUnit);
	//Select unit on equipment window
	$('eqUserSel').userunit = map.currentUnit.id; //save selected player unit
	updateEquipmentWindow(map.currentUnit.unitData().uclass);
	//Display selected unit on status bar
	updateStatusBarLocation(row, col);
}

//handle the move of currently selected unit to row,col destination
function handleUnitMove(row, col)
{
	var s = map.currentUnit.getPos();
	var mm = map.currentUnit.unitData().movmethod;
	var mr = map.moveUnit(map.currentUnit, row, col);
	var moveAnimationCBData = 
	{
		unit: map.currentUnit,
		moveResults: mr,
		cbfunc: uiMoveAnimationFinished,
	}
	
	soundData[moveSoundByMoveMethod[mm]].play();
	r.moveAnimation(moveAnimationCBData);
}

//Called when move animation finishes
function uiMoveAnimationFinished(moveAnimationCBData)
{
	r.render();
	var mr = moveAnimationCBData.moveResults;
	var unit = moveAnimationCBData.unit;
	var cell = mr.surpriseCell;
	if (mr.isSurprised)
	{
		var pos = r.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, "Surprised !");
		moveAnimationCBData.unit.isSurprised = true;
		handleUnitAttack(moveAnimationCBData.unit, cell.row, cell.col); //TODO select which unit has surprised (air / ground)
	}
	if (mr.isVictorySide >= 0) 
		uiMessage("Victory","Side " + sideNames[mr.isVictorySide] + " wins by capturing all victory hexes");
}


//handle attack performed by attacking unit on row,col unit
//TODO most of the code here pertaining to support fire should be moved to map object
function handleUnitAttack(attackingUnit, row, col)
{
	var hex = map.map[row][col];
	if ((enemyUnit = hex.getAttackableUnit(attackingUnit, uiSettings.airMode)) !== null) //Select which unit to attack depending on uiSettings.airMode
	{
		GameRules.calculateCombatResults(attackingUnit, enemyUnit, map.getUnits());
		var cpos = attackingUnit.getPos();
		var cclass = attackingUnit.unitData().uclass;
		var eclass = enemyUnit.unitData().uclass;
		var animationCBData = 
		{
			units: [attackingUnit, enemyUnit],
			oldstr: [attackingUnit.strength, enemyUnit.strength],
			cbfunc: uiAttackAnimationFinished,
		}
		//Support Fire if attacking unit wasn't surprised
		if (!attackingUnit.isSurprised)
		{
			var supportUnits = GameRules.getSupportFireUnits(map.getUnits(), attackingUnit, enemyUnit);
			for (var u in supportUnits)
			{
				var sp = supportUnits[u].getPos();
				var sclass = supportUnits[u].unitData().uclass;
				if (attackingUnit.destroyed)
					break;
				map.attackUnit(supportUnits[u], attackingUnit, true);
				r.addAnimation(sp.row, sp.col, attackAnimationByClass[sclass], supportUnits[u].facing ); //Hits by supporting units
			}
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
	attackingUnit.isSurprised = false; //When combat ends unit is no longer surprised
}

//Called when attack animation finishes 
function uiAttackAnimationFinished(animationCBData)
{
	for (var i = 0; i < animationCBData.units.length; i++)
	{
		if (animationCBData.units[i].destroyed)	continue;
		var loss = animationCBData.units[i].strength - animationCBData.oldstr[i];
		if (loss == 0) continue;
		var cell = animationCBData.units[i].getPos();
		var pos = r.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, loss);
	}
}

function buildMainMenu()
{
	//menu buttons div with id the image filename from resources/ui/menu/images
	//format is <id>, <title>, <0/1 if should be placed in slide div or not>
	var menubuttons = [ ["inspectunit","Inspect Unit", 0], ["endturn","End Turn", 0],["mainmenu", "Main  Menu", 0],
						["buy","Upgrade/Buy Units(WIP)", 1],["hex","Toggle Hex Grid", 1], ["air","Toggle Air Mode On", 1],
					    ["zoom","Strategic Map", 1], ["options","Options", 1]];
					   
	var sd = addTag('statusbar','div');
	sd.id = "statusmsg";
	sd.className = "message";
	sd.innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "  " + map.description;
	
	var ld = addTag('statusbar','div');
	ld.id = "locmsg"
	ld.className = "message";

	for (var b = 0; b < menubuttons.length; b++) 
	{
		var div;
		
		if (menubuttons[b][2])	//should be placed on slide div
			div = addTag('slidemenu','div');
		else
			div = insertTag('menu', 'div', 'slidemenu');
		
		var img = addTag(div, 'img');
		var id = menubuttons[b][0];
		var title = menubuttons[b][1];
		
		div.id = id;
		div.title = title;
		div.className = "button";
		img.id = id;
		img.src = "resources/ui/menu/images/" + id + ".png";
		
		div.onclick = function() { mainMenuButton(this.id); }
	}
}

function mainMenuButton(id)
{
	switch(id) 
	{
		case 'air':
		{
			uiSettings.airMode = !uiSettings.airMode;
			toggleButton($('air').firstChild, uiSettings.airMode);
			r.render();
			break;
		}
		case 'hex':
		{
			uiSettings.hexGrid = !uiSettings.hexGrid;
			toggleButton($('hex').firstChild, uiSettings.hexGrid);
			r.render();
			break;
		}
		case 'zoom':
		{	
			var zoom = Math.min(window.innerWidth/canvas.width*100, window.innerHeight/canvas.height*100) >> 0;
			
			if ($('game').style.zoom == "100%" || $('game').style.zoom == '' )
			{ 
				$('game').style.zoom = zoom + "%";
				$('game').style.width = ((window.innerWidth * 100 / zoom) >> 0) + 100 + "px";
				$('game').style.height = ((window.innerHeight * 100 / zoom) >> 0) + 100 + "px";

				uiSettings.mapZoom = true;
			}
			else 
			{ 
				$('game').style.width = window.innerWidth + "px";
				$('game').style.height = window.innerHeight + "px";
				$('game').style.zoom = "100%";
				uiSettings.mapZoom = false;
			}
			toggleButton($('zoom').firstChild, uiSettings.mapZoom);
			r.render();
			break;
		}
		case 'inspectunit':
		{
			var v = $('unit-info').style.visibility;
			
			if (v == "visible")
			{
				$('unit-info').style.visibility = "hidden"; 
				toggleButton($('inspectunit').firstChild, false);
			}
			else 
			{
				$('unit-info').style.visibility = "visible";
				toggleButton($('inspectunit').firstChild, true);
			}
			break;
		}
		case 'buy':
		{
			var v = $('equipment').style.display;
			if (v != "" && v != "none")
			{
				$('equipment').style.display = "none"; 
				$('container-unitlist').style.display = "none";
				uiSettings.deployMode = false;
				toggleButton($('buy').firstChild, false);
			}
			else 
			{
				$('equipment').style.display = "inline"; 
				$('container-unitlist').style.display = "inline";
				$('unit-info').style.visibility = "visible"; 
				updateEquipmentWindow(unitClass.tank);
				toggleButton($('buy').firstChild, true);
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
			updateUnitContextWindow();
			selectStartingUnit();
			
			$('statusmsg').innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "  " + map.description;
			uiMessage(map.currentPlayer.getCountryName() + " player on " 
				+ map.currentPlayer.getSideName() +" side  Turn " + map.turn, uiEndTurnInfo());
			
			r.render();
			break;
		}
		case 'mainmenu':
		{
			var v = $('slidemenu').style.visibility;
			
			if (v == "visible")
			{
				$('slidemenu').style.visibility = "hidden";
				toggleButton($('mainmenu').firstChild, false);
			}
			else
			{
				$('slidemenu').style.visibility = "visible";
				toggleButton($('mainmenu').firstChild, true);
			}
			break;
		}
		case 'options':
		{
			uiMessage("Open Panzer version " + VERSION, "Copyright 2012 Nicu Pavel <br> " +
			"npavel@linuxconsulting.ro <br><br> UI icons by Luca Iulian<br> lucaiuli@gmail.com<br><br> Available scenarios:<br>");
			
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

function updateUnitContextWindow(u)
{
	var div;
	var nbuttons = 0;
	clearTag('unit-context');
	
	if (!u || !u.player || u.player.id != map.currentPlayer.id) 
	{
		$('unit-context').style.visibility = "hidden";
		return;
	}
	
	if (GameRules.canMount(u))
	{
		nbuttons++;
		div = addTag('unit-context', 'div');
		div.className = "unit-context-buttons";
		div.id = "unit-context-mount";
		div.title = "Mount this unit into a transport";
		div.onclick = function() {unitContextButton('mount', u);}
	}
	
	if (GameRules.canResupply(map.map, u))
	{
		nbuttons++;
		div = addTag('unit-context', 'div');
		div.className = "unit-context-buttons";
		div.id = "unit-context-resupply";
		div.title = "Resupply Ammo and Fuel for this unit";
		div.onclick = function() {unitContextButton('resupply', u);}
	}

	if (GameRules.canReinforce(map.map, u)) 
	{
		nbuttons++;
		div = addTag('unit-context', 'div');
		div.className = "unit-context-buttons";
		div.id = "unit-context-reinforce";
		div.title = "Reinforce unit strength";
		div.onclick = function() {unitContextButton('reinforce', u);}
	}
	
	if (map.canUndoMove(u))
	{
		nbuttons++;
		div = addTag('unit-context', 'div');
		div.className = "unit-context-buttons";
		div.id = "unit-context-undo";
		div.title = "Undo last move";
		div.onclick = function() { unitContextButton('undo', u); }
	}
	
	if (nbuttons > 0) 
		$('unit-context').style.visibility = "visible";
	else
		$('unit-context').style.visibility = "hidden";
}

function updateUnitInfoWindow(u)
{
	var isEqUnit = false;
	var uinfo, ammo, fuel, exp, ent;

	if ($('unit-info').style.visibility == "hidden") return;

	//Call from equipment window fill with default values (instead of creating a new unit object)
	if (typeof u.unitData === "undefined") 
	{
		isEqUnit = true;
		uinfo = u;
		u.flag = u.country;
		u.strength = 10;
		ammo = u.ammo;
		if (u.fuel == 0)
			fuel = "-";
		else
			fuel = u.fuel;
		exp = 0;
		ent = 0;
	}
	else 
	{	
		uinfo = u.unitData(); 
		ammo = u.getAmmo();
		if (GameRules.unitUsesFuel(u))
			fuel = u.getFuel();
		else
			fuel = "-";
		exp = u.experience;
		ent = u.entrenchment;
	}
	
	if (ammo < 5) ammo = "<span style='color: #FF6347'>" + ammo + "</span>";
	if (fuel < 15) fuel =  "<span style='color: #FF6347'>" + fuel + "</span>";
	if (uinfo.gunrange == 0) uinfo.gunrange = 1;
	
	$('uImage').style.backgroundImage = "url(" + uinfo.icon +")";
	$('uFlag').style.backgroundImage = "url('resources/ui/flags/flag_big_" + u.flag +".png')";
	$('uFlag').innerHTML = countryNames[u.flag - 1];
	$('uName').innerHTML = uinfo.name + " " + unitClassNames[uinfo.uclass];
	//$('uClass').innerHTML = uinfo.uclass;
	$('uTarget').innerHTML = unitTypeNames[uinfo.target];
	$('uMoveType').innerHTML = movMethodNames[uinfo.movmethod];
	
	$('uStr').innerHTML = u.strength + "/10";
	$('uFuel').innerHTML = fuel;
	$('uAmmo').innerHTML = ammo;
	$('uGunRange').innerHTML = uinfo.gunrange;
	$('uMovement').innerHTML = uinfo.movpoints;
	
	$('uExp').innerHTML = exp;
	$('uEnt').innerHTML = ent;
	$('uIni').innerHTML = uinfo.initiative;
	$('uSpot').innerHTML = uinfo.spotrange;
	
	$('uAHard').innerHTML = uinfo.hardatk;
	$('uASoft').innerHTML = uinfo.softatk;
	$('uAAir').innerHTML = uinfo.airatk;
	$('uANaval').innerHTML = uinfo.navalatk;
	
	$('uDHard').innerHTML = uinfo.grounddef;
	$('uDAir').innerHTML = uinfo.airdef;
	$('uDClose').innerHTML = uinfo.closedef;
	$('uDRange').innerHTML = uinfo.rangedefmod;
	
	if (isEqUnit) return;
	
	$('uTransport').className = " ";
	
	//Add button to see transport/unit properties depending on unit state
	if (u.transport)
	{
		var simulateMount;
		
		if ( !u.isMounted)
		{
			$('uTransport').className = "toTransport";
			simulateMount = true;
		}
		else
		{
			$('uTransport').className = "toUnit";
			simulateMount = false; 
		}
		
		$('uTransport').onclick = function() 
		{
				var s = u.isMounted;
				u.isMounted = simulateMount;
				updateUnitInfoWindow(u);
				u.isMounted = s;
		}		
	}
	//TODO Add unit kills/medals	
}

function unitContextButton(action, unit)
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
		case 'undo':
		{
			map.undoLastMove();
			break;
		}
	}
	updateUnitContextWindow(unit);
	updateUnitInfoWindow(unit);
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
			$('eqUserSel').userunit = -1; //Clear existing unit selection when changing country
			$('eqUserSel').equnit = -1;
			updateEquipmentWindow(unitClass.tank);
		};
	//Unit Class buttons	
	for (var b in eqClassButtons)
	{
		var div = addTag('eqSelClass','div');
		var img = addTag(div, 'img');
		
		var id = eqClassButtons[b][0];
		div.id = id;
		div.className = "eqSelClassBut";
		div.title = eqClassButtons[b][1];
		div.eqclass = eqClassButtons[b][2]; //Hack to get parameter passed
		img.id = id;
		img.src = "resources/ui/dialogs/equipment/images/" + id + ".png";
		div.onclick = function() 
		{
			$('eqUserSel').userunit = -1; //Clear existing unit selections when changing class
			$('eqUserSel').equnit = -1;
			$('eqUserSel').eqtransport = -1;
			updateEquipmentWindow(this.eqclass); 
		}
	}
	
	//Bottom buttons
	$('eqNewBut').title = "Buy unit as a new unit";
	$('eqNewBut').onclick = function()
		{
				var eqUnit = $('eqUserSel').equnit;
				var eqTransport = $('eqUserSel').eqtransport;
				
				if (typeof eqUnit === "undefined" || eqUnit <= 0)
					return;

				if (typeof eqTransport === "undefined" || eqTransport == "")
					eqTransport = -1;

				var ret = map.currentPlayer.buyUnit(eqUnit, eqTransport); //TODO transport
				if (ret)
					console.log("Player:" + map.currentPlayer.getCountryName() + " bought unit id: " + eqUnit + " with transport:" + eqTransport);
				else
					console.log("Can't buy a new unit");
					
				updateEquipmentWindow(equipment[eqUnit].uclass);
		}
	$('eqUpgradeBut').title = "Upgrade selected unit to this unit";
	$('eqUpgradeBut').onclick = function()
		{
			var id = $('eqUserSel').userunit;
			var eqUnit = $('eqUserSel').equnit;
			var eqTransport = $('eqUserSel').eqtransport;
			
			if (typeof id === "undefined")
				return;

			if (typeof eqTransport === "undefined" || eqTransport == "")
					eqTransport = -1;

			console.log("Upgrading unit: " + id + " to equipment id:" + eqUnit + " with transport:" + eqTransport);

			if (map.upgradeUnit(id, eqUnit, eqTransport))
			{
				r.cacheImages(function() { r.render(); }); //Need to cache new image
				if (eqUnit > 0 ) updateEquipmentWindow(equipment[eqUnit].uclass);
			}
		}
	
	$('eqCloseBut').title = "Close";
	$('eqCloseBut').onclick = function() { $('equipment').style.display = "none"; }
}

//TODO function too large break it
//TODO index equipment array
//TODO/REVIEW clear onclick functions when using clearTag
function updateEquipmentWindow(eqclass)
{
	if ($('container-unitlist').style.display == "none") 
		return;
		
	//Remove older entries
	clearTag('unitlist');
	clearTag('eqUnitList');
	clearTag('eqTransportList');
	
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
			var div = uiAddUnitBox('unitlist', ud, false);
			div.unitid = i;
			div.eqclass = ud.uclass;
			div.country = map.currentPlayer.country;
			if (i == deployUnitSelected)
				div.title = ud.name; //apply the .eqUnitBox[title] css style to make unit appear selected

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
		var unitList = map.getUnits();
		var forcedScroll;
		uiSettings.deployMode = false;
		
		for (var i = 0; i < unitList.length; i++)
		{
			var u = unitList[i];
			var ud = u.unitData();
			if (u.player.id == map.currentPlayer.id)
			{
				var div = uiAddUnitBox('unitlist', ud, false);
				div.unitid = u.id;
				div.uniteqid = u.eqid;
				div.eqclass = ud.uclass;
				div.country = u.player.country;
				if (u.id == userUnitSelected)
				{	
					//Automatically set transport on transport list if user has not selected a new transport
					if (u.transport !== null && $('eqUserSel').eqtransport == -1)
					{
						//Check if user selected equipment unit for upgrade can be transported
						if ($('eqUserSel').equnit == -1 || GameRules.isTransportable($('eqUserSel').equnit))
							$('eqUserSel').eqtransport = u.transport.eqid;
					}
					div.title = ud.name; //apply the .eqUnitBox[title] css style to make unit appear selected
					eqclass = ud.uclass; //Force unit class for equipment display
					map.selectUnit(u); //select unit on map
					r.render(); //refresh so the new selection appear
					uiSetUnitOnViewPort(u); //bring the unit into map view
					//This unit will be the last in div since the div is being built and we can use offsetWidth of the
					//containing div to get offset from the position 0. This value will be used to scroll the div when 
					//a unit is selected from the map not from the unit list ui div 
					forcedScroll = $('unitlist').offsetWidth - ($('container-unitlist').offsetWidth + div.offsetWidth)/2;
				}
				div.onclick = function() 
				{ 
					c = map.getCountriesBySide(map.currentPlayer.side);
					for (i = 0; i < c.length; i++)
						if (c[i] == this.country) break;
					$('eqSelCountry').country = i;
					$('eqUserSel').eqtransport = -1; //clear transport selection on new unit selection 
					$('eqUserSel').equnit = -1; //clear equipment unit selection on new unit selection 
					$('eqUserSel').userunit = this.unitid; //save selected player unit
					$('eqUserSel').unitscroll = $('hscroll-unitlist').scrollLeft; //save scroll position so at refresh we autoscroll 
					updateUnitInfoWindow(equipment[this.uniteqid]);
					updateEquipmentWindow(this.eqclass);
					$('hscroll-unitlist').scrollLeft = $('eqUserSel').unitscroll; //scroll to the selected unit
				}
			}
		}
		//Force scrolling when units are selected from the map to bring them into unit list view
		$('hscroll-unitlist').scrollLeft = forcedScroll;
	}
	//Don't change the listing on dummy class
	if (eqclass == 0) return;
	
	//Units in equipment
	var eqUnitSelected = $('eqUserSel').equnit;
	for (var i in equipment)
	{
		var u = equipment[i];
		if ((u.uclass == eqclass) && (u.country == country))
		{
			//Add the unit to the list
			var div = uiAddUnitBox('eqUnitList', u, true);
			div.equnitid = u.id;
			if (u.id == eqUnitSelected)
				div.title = u.name; //This is a hack to apply the .eqUnitBox[title] css style for selected unit
			div.onclick = function() 
			{ 
					$('eqUserSel').equnit = this.equnitid; //save the selected unit in the equipment list
					$('eqUserSel').eqtransport = -1; //clear transport selection on new unit selection 
					$('eqUserSel').eqscroll  = $('hscroll-eqUnitList').scrollLeft; //save scroll position so at refresh we autoscroll 
					updateUnitInfoWindow(equipment[this.equnitid]); 
					updateEquipmentWindow(eqclass); //To "unselect" previous selected unit
					$('hscroll-eqUnitList').scrollLeft = $('eqUserSel').eqscroll; //scroll to the selected unit
			};
		}
	}
	//Add the transport to the list if unit can be transported
	var eqTransportSelected = $('eqUserSel').eqtransport;
	if (GameRules.isTransportable(eqUnitSelected) || eqTransportSelected > 0)
	{
		for (var i in equipment)
		{
			var t = equipment[i];
			if ((t.uclass == unitClass.groundTransport) && (t.country == country))
			{
				var tdiv = uiAddUnitBox('eqTransportList', t, true);
				tdiv.eqtransportid = t.id;
				if (t.id == eqTransportSelected)
					tdiv.title = t.name;
				tdiv.onclick = function()
				{
					//handle deselect of transport
					if ($('eqUserSel').eqtransport == this.eqtransportid)
						$('eqUserSel').eqtransport = -1;
					else
						$('eqUserSel').eqtransport = this.eqtransportid; //save the selected unit in the equipment list 
					updateUnitInfoWindow(equipment[this.eqtransportid]); 
					updateEquipmentWindow(eqclass); //To "unselect" previous selected unit
				};
			}
		}
	}
	updateEquipmentCosts();
}

//Updates the costs of user selected units in equipment window
function updateEquipmentCosts()
{
	var eqUnitSelected = $('eqUserSel').equnit;
	var eqTransportSelected = $('eqUserSel').eqtransport;
	var userUnitSelected = $('eqUserSel').userunit;
	var buyCost =0;
	var upCost = 0;
	var prestige = map.currentPlayer.prestige;
	if (eqUnitSelected != -1)
		buyCost = GameRules.calculateUnitCosts(eqUnitSelected, eqTransportSelected);
		
	//TODO/REVIEW: We assume that selecting a unit on current units lists selects a map unit 
	//Actually we should do  map.findUnitById(userUnitSelected)
	if (map.currentUnit !== null && userUnitSelected != -1)
		upCost = GameRules.calculateUpgradeCosts(map.currentUnit, eqUnitSelected, eqTransportSelected);
	
	if (buyCost > 0 && buyCost <= prestige) 
	{
		$('eqNewText').innerHTML = "New unit cost: " + buyCost + currencyIcon;
		$('eqNewBut').style.visibility = "visible";
	}
	else
	{
		if (buyCost > prestige)
		{
			var diff = buyCost - prestige;
			$('eqNewText').innerHTML = "<span style='color:#FF6347'>Need " + diff + " more prestige to buy</span>";
		}
		else
		{
			$('eqNewText').innerHTML = "";
		}
		$('eqNewBut').style.visibility = "hidden";
	}
	
	if (upCost > 0 && upCost <= prestige)
	{
		$('eqUpgradeText').innerHTML = " Upgrade unit cost: " + upCost + currencyIcon;
		$('eqUpgradeBut').style.visibility = "visible";
	}
	else
	{
		if (upCost > prestige)
		{
			var diff = upCost - prestige;
			$('eqUpgradeText').innerHTML = "<span style='color:#FF6347'>Need " + diff + " more prestige to upgrade</span>";
		}
		else
		{
			$('eqUpgradeText').innerHTML = "";
		}	
		$('eqUpgradeBut').style.visibility = "hidden";
	}
	
	$('currentPrestige').innerHTML = "Available prestige: " + prestige + currencyIcon;
}

function updateStatusBarLocation(row, col)
{
	var hex = map.map[row][col];
	if (!hex || typeof hex === "undefined")
		return false;
	var text = terrainNames[hex.terrain] + " (" + row + "," + col + ")";

	if (hex.name !== null)	{  text = hex.name + " " + text; }
	
	if ((unit = hex.getUnit(uiSettings.airMode)) !== null 
		&& (hex.isSpotted(map.currentPlayer.side) || unit.tempSpotted 
			|| unit.player.side == map.currentPlayer.side)) 
	{
		text = " Unit: " + unit.unitData().name + " " + text; 
	}
	$('locmsg').innerHTML = text;
}
//Simple function to list a unit in a graphical unit box returns a DOM object
function uiAddUnitBox(parentTagName, unitData, withPrice)
{
	var div = addTag(parentTagName, 'div');
	var img = addTag(div, 'img');
	var txt = addTag(div, 'div');
	
	div.className = "eqUnitBox";
	img.src = unitData.icon;
	txt.innerHTML = unitData.name;
	if (withPrice) 
		txt.innerHTML += " - " + unitData.cost * CURRENCY_MULTIPLIER + currencyIcon;
	
	return div;
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
	$('game').scrollLeft = pos.x - window.innerWidth/2;
	$('game').scrollTop = pos.y - window.innerHeight/2;
}

//Selects the first unit that belongs to the currently playing side
function selectStartingUnit()
{
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		if (unitList[i].player.id == map.currentPlayer.id)
		{
			pos = unitList[i].getPos();
			handleUnitSelect(pos.row, pos.col);
			updateUnitInfoWindow(unitList[i]);
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
	r.cacheImages(function() 
	{ 
		selectStartingUnit(); 
		uiSetUnitOnViewPort(map.currentUnit);
		r.render(); 
	});
	countries = map.getCountriesBySide(map.currentPlayer.side);
	updateEquipmentWindow(unitClass.tank); //Refresh equipment window	
	$('statusmsg').innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "  " + map.description;
}

function getMouseInfo(canvas, e)
{
	var mx, my, rclick;
	var vp = $('game');
	if (e.which) rclick = (e.which == 3);
	else if (e.button) rclick = (e.button == 2);	
	
	mx = e.pageX - canvas.offsetLeft - vp.clientLeft - vp.offsetLeft + vp.scrollLeft;
	my = e.pageY - canvas.offsetTop - vp.clientTop - vp.offsetTop + vp.scrollTop;

	return new mouseInfo(mx, my, rclick);
}

} //End of UI class

function gameStart()
{
	var rng = Math.round(Math.random() * (scenariolist.length - 1))
	var scenario = "resources/scenarios/xml/" +  scenariolist[rng][0];
	//console.log("Number: " + rng + " Scenario:" + scenario);

	scenario="resources/scenarios/xml/tutorial.xml";
	var ui = new UI(scenario);
	//Bring up the "Main Menu"
	ui.mainMenuButton('options');
}
