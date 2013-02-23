/**
 * UI - handles ui actions
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function UI(game)
{
	var map = game.scenario.map;
	var R = new Render(map);
	var countries = map.getCountriesBySide(game.spotSide); //array for current side countries

	//redraw screen and center unit on screen when images have finished loading
	R.cacheImages(function() 
		{ 
			selectStartingUnit(); //select the first available unit for the current side
			uiSetUnitOnViewPort(map.currentUnit);
			R.render();  //Full page rendering
		});
		
	var canvas = R.getCursorCanvas();
	canvas.addEventListener("mousedown", handleMouseClick, false);

	uiSettings.hasTouch = hasTouch();
	if (!uiSettings.hasTouch) canvas.addEventListener("mousemove", handleMouseMove, false);
	
	if (uiSettings.hasTouch && hasBrokenScroll())
	{
		touchScroll("game");
		touchScroll("hscroll-unitlist");
		touchScroll("hscroll-eqUnitList");
		touchScroll("hscroll-eqTransportList");
	}

	toggleRightClick(false);
	
	UIBuilder.buildStartMenu();
	UIBuilder.buildMainMenu();
	UIBuilder.buildUnitInfoWindow();
	UIBuilder.buildEquipmentWindow();

	uiTurnInfo();
	uiShowDeploymentWindow();
	updateEquipmentWindow(); //Update after making deploy/current unit list visible or it won't update

function handleMouseClick(e)
{
	if (!game.gameStarted || game.gameEnded)
		return false;
	
	var minfo = getMouseInfo(canvas, e);
	var cell = R.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	var hex = map.map[row][col];
	if (typeof hex === "undefined")
	{
		console.log("Undefined hex:" + row + "," + col);
		return true; //handled
	}

	if (uiSettings.mapZoom)
	{
		uiToggleMapZoom();
		uiSetCellOnViewPort(cell);
		return true;
	}

	var clickedUnit = hex.getUnit(uiSettings.airMode);
	
	//Right click to show unit info or clear current selection
	if (minfo.rclick) 
	{ 
		if (clickedUnit)
		{
			makeVisible('unit-info');
			updateUnitInfoWindow(clickedUnit);
		}
		else 
		{
			handleUnitDeselect();
		}
		return true;
	}

	if (clickedUnit) 
	{
		updateUnitInfoWindow(clickedUnit); //Also update for clicks on enemy units
			
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
				handleUnitDeselect();
	}

	//Set the airMode depending on current unit automatically
	uiSettings.airMode = GameRules.isAir(map.currentUnit);
	toggleButton($('air'), uiSettings.airMode);
	updateUnitContextWindow(map.currentUnit); //Update after an action not only on select/deselect
	//TODO make unitList equipment window show strength/movement/attack status and update it on all actions
	return true;
}

function handleMouseMove(e) 
{
	var unit, text, hex;
	var minfo = getMouseInfo(canvas, e);
	var c = R.screenToCell(minfo.x, minfo.y);

	if (map.currentUnit != null && !uiSettings.mapZoom) { R.drawCursor(c); }
	updateStatusBarLocation(c.row, c.col);
}

//handle unit deployment
function handleUnitDeployment(row, col)
{
	var deployUnit = $('eqUserSel').deployunit;
	var ret = map.deployPlayerUnit(map.currentPlayer, deployUnit, row, col);
	if (ret)
		R.cacheImages(function() { R.render(); updateEquipmentWindow(unitClass.tank); });
	else 
		console.log("Can't deploy unit in that location");
	
}

//Deselects a previously selected unit. Can't have row,col as params since user can click or rightclick
//everywhere on empty terrain to deselect a unit
function handleUnitDeselect()
{
	if (map.currentUnit !== null)
	{
		var p = map.currentUnit.getPos();
		var r = getRenderRange(map.currentUnit);
		map.delCurrentUnit(); //deselect from map array before render
		R.render(p.row, p.col, r);
	}
}

//handle the selection of a new unit
function handleUnitSelect(row, col)
{
	if (map.currentPlayer.type != playerType.humanLocal)
		return false;
	
	var hex = map.map[row][col];	
	var unit = hex.getUnit(uiSettings.airMode)

	if (unit == null || unit.player.id != map.currentPlayer.id) //Can't select units from other players
	{
		unit = hex.getUnit(!uiSettings.airMode); //try the other unit on hex
		if (unit == null || unit.player.id != map.currentPlayer.id)
			return false;
	}

	//Select unit on equipment window (can't be in uiUnitSelect because will loop in updateEquipmentWindow())
	$('eqUserSel').userunit = unit.id; //save selected player unit
	updateEquipmentWindow(unit.unitData(true).uclass);
	
	return uiUnitSelect(unit);
}
function uiUnitSelect(unit)
{
	if (unit === null) 
		return false;
	
	var p = unit.getPos();
	handleUnitDeselect();
	map.selectUnit(unit);

	updateUnitContextWindow(unit); //Update unit contextual window
	updateStatusBarLocation(p.row, p.col); //Display selected unit on status bar
	var r = getRenderRange(unit);
	R.render(p.row, p.col, r);

	return true;
}

//handle the move of a unit to row,col destination
this.uiUnitMove = function(unit, row, col) { return uiUnitMove(unit, row, col); }
function handleUnitMove(row, col) { return uiUnitMove(map.currentUnit, row, col); }
function uiUnitMove(unit, row, col)
{
	var mm = unit.unitData().movmethod;
	//Save render properties before moving
	var r = getRenderRange(unit);
	var oldpos = unit.getPos();
	var mr = map.moveUnit(unit, row, col);

	var moveAnimationCBData = 
	{
		unit: unit,
		moveResults: mr,
		cbfunc: uiMoveAnimationFinished,
	}
	
	soundData[moveSoundByMoveMethod[mm]].play();
	unit.hasAnimation = true; //signal render that unit is going to be move animated
	R.moveAnimation(moveAnimationCBData);
	R.render(oldpos.row, oldpos.col, r);
	
	return true;
}
//Called when move animation finishes
function uiMoveAnimationFinished(moveAnimationCBData)
{
	var mr = moveAnimationCBData.moveResults;
	var unit = moveAnimationCBData.unit;
	var r = getRenderRange(unit);
	var p = unit.getPos();
	
	R.render(p.row, p.col, r);
	
	if (unit.isSurprised)
	{
		var cell = mr.surpriseCell;
		var pos = R.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, "Surprised!");
		handleUnitAttack(moveAnimationCBData.unit, cell.row, cell.col); //TODO select which unit has surprised (air / ground)
	}
	if (mr.isVictorySide >= 0)
	{
		var victoryType = game.scenario.checkVictory();
		if (game.campaign !== null)
		{
			game.continueCampaign(victoryType); //TODO move logic to game.js //Does his own uiMessage
		}
		else
		{
			uiMessage(outcomeNames[victoryType],
				map.currentPlayer.getCountryName() + " on " + sideNames[mr.isVictorySide]
				+ " side wins by capturing all victory hexes");

			game.gameEnded = true;
		}
	}
	game.waitUIAnimation = false;
}


//handle attack performed by attacking unit on row,col unit
//TODO most of the code here pertaining to support fire should be moved to map object
this.uiUnitAttack = function(attackingUnit, enemyUnit) { return uiUnitAttack(attackingUnit, enemyUnit); }
function handleUnitAttack(attackingUnit, row, col)
{
	var hex = map.map[row][col];
	var enemyUnit = null;
	if ((enemyUnit = hex.getAttackableUnit(attackingUnit, uiSettings.airMode)) !== null) //Select which unit to attack depending on uiSettings.airMode
		return uiUnitAttack(attackingUnit, enemyUnit);
	return false;
}

function uiUnitAttack(attackingUnit, enemyUnit)
{
	var cpos = attackingUnit.getPos();
	var epos = enemyUnit.getPos();
	if (!cpos || !epos)
	{
		console.log("No attacking or defending unit, skipping attack");
		return false;
	}
	var row = epos.row;
	var col = epos.col;
	var cclass = attackingUnit.unitData().uclass;
	var eclass = enemyUnit.unitData().uclass;
	var animationCBData = 
	{
		attacking: {unit: attackingUnit, cell: cpos, oldstr: attackingUnit.strength },
		defending: {unit: enemyUnit, cell: epos, oldstr: enemyUnit.strength },
		cbfunc: uiAttackAnimationFinished,
	}

	UIBuilder.showAttackInfo(attackingUnit, enemyUnit); //Show info on status bar

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
			R.addAnimation(sp.row, sp.col, attackAnimationByClass[sclass], supportUnits[u].facing ); //Hits by supporting units
		}
	}
	if (!attackingUnit.destroyed) //Can we still attack ?
	{
		var cr = map.attackUnit(attackingUnit, enemyUnit, false); //Only attack an enemy unit on that hex
		R.addAnimation(cpos.row, cpos.col, attackAnimationByClass[cclass], attackingUnit.facing);

		if (!enemyUnit.destroyed && cr.defcanfire)
			R.addAnimation(row, col, attackAnimationByClass[eclass], enemyUnit.facing); //Hits to the unit being attacked

	}
	//Render so new unit facings are shown correctly 7 is the biggest attack range including support fire
	R.render(cpos.row, cpos.col, 7); //TODO compute
	R.runAnimation(animationCBData);
	attackingUnit.isSurprised = false; //When combat ends unit is no longer surprised
	return true;
}

//Called when attack animation finishes 
function uiAttackAnimationFinished(animationCBData)
{
	var cell, loss, pos;
	var refreshRender = false;
	var renderRange = 1;

	var a = animationCBData.attacking;
	var d = animationCBData.defending;

	loss = a.unit.strength - a.oldstr;
	if (loss < 0 && -loss < a.oldstr)
	{
		pos = R.cellToScreen(a.cell.row, a.cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, loss);
	}

	loss = d.unit.strength - d.oldstr;
	if (loss < 0 && -loss < d.oldstr)
	{
		pos = R.cellToScreen(d.cell.row, d.cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, loss);
	}


	if (a.unit.destroyed || d.unit.destroyed) //Cleanup dead units
	{
		map.updateUnitList();
		refreshRender = true;
	}

	//Do explosion animation along with deleting units from map and refreshing selection
	if (a.unit.destroyed)
	{
		R.addAnimation(a.cell.row, a.cell.col, "explosion");
		R.runAnimation(null);
	}

	if (d.unit.destroyed)
	{
		R.addAnimation(d.cell.row, d.cell.col, "explosion");
		R.runAnimation(null);
	}

	//Refresh map selections
	if (map.currentUnit && map.currentUnit.id == a.unit.id) //Do we still have the unit selected
	{
		if (a.unit.destroyed)
		{
			map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
			R.drawCursor(a.cell); //refresh cursor or it gets stuck in attack cursor
			renderRange = 7; //TODO compute this
		}
		else
		{
			if (!a.unit.hasMoved && d.unit.destroyed) //refresh move range if unit has destroyed another unit
			{
				map.setMoveRange(a.unit);
				var tmp = getRenderRange(a.unit);
				if (tmp > renderRange) renderRange = tmp;
				refreshRender = true;
			}
		}
	}

	if (refreshRender)
		R.render(a.cell.row, a.cell.col, renderRange);

	game.waitUIAnimation = false;
	uiTurnInfo();
}

this.setNewScenario = function()
{
	map = game.scenario.map;
	R.setNewMap(map);
	R.cacheImages(function()
	{
		selectStartingUnit();
		uiSetUnitOnViewPort(map.currentUnit);
		R.render(); //Full page render on new map
	});
	countries = map.getCountriesBySide(game.spotSide);
	updateEquipmentWindow(unitClass.tank); //Refresh equipment window
	uiTurnInfo();
	uiShowDeploymentWindow();
	uiMessage(game.scenario.name, game.scenario.getDescription());
}

this.startMenuButton = function(id)
{
	switch(id) 
	{
		case 'newcampaign':
		{
			makeHidden('smMain');
			makeVisible('smCamp');
			//Make the current campaign selected
			if (game.campaign === null) //Select first campaign in list
				setSelectOption($('smCampSel').firstChild, $('smCampSel').firstChild.options[0].text);
			else //Select saved campaign
				setSelectOption($('smCampSel').firstChild, game.campaign.name);
			break;
		}
		case 'newscenario':
		{
			makeHidden('smMain');
			makeVisible('smScen');
			//Make the current scenarion selected
			setSelectOption($('smScenSel').firstChild, map.name);
			break;
		}
		case 'continuegame':
		{
			makeHidden('startmenu');
			toggleButton($('options'), false);
			break;
		}
		case 'settings':
		{
			makeHidden('smMain');
			makeVisible('smSettings');
		}
		
	}
}

this.mainMenuButton = function(id)
{
	switch(id) 
	{
		case 'air':
		{
			uiSettings.airMode = !uiSettings.airMode;
			toggleButton($('air'), uiSettings.airMode);
			R.render(); //Full page rendering
			break;
		}
		case 'hex':
		{
			uiSettings.hexGrid = !uiSettings.hexGrid;
			toggleButton($('hex'), uiSettings.hexGrid);
			R.render(); //Full page rendering
			break;
		}
		case 'zoom':
		{	
			uiToggleMapZoom();
			R.render(); //Full page rendering
			break;
		}
		case 'inspectunit':
		{
			if (isVisible('unit-info'))
			{
				makeHidden('unit-info');
				toggleButton($('inspectunit'), false);
			}
			else 
			{
				makeVisible('unit-info');
				if (map.currentUnit !== null) updateUnitInfoWindow(map.currentUnit);
				toggleButton($('inspectunit'), true);
			}
			break;
		}
		case 'buy':
		{
			if (map.currentPlayer.type != playerType.humanLocal)
				return;

			if (isVisible('equipment'))
			{
				makeHidden('equipment'); 
				makeHidden('container-unitlist');
				uiSettings.deployMode = false;
				toggleButton($('buy'), false);
				uiTurnInfo(); //Write back the turn info since we change the info when we open equipment window
			}
			else 
			{
				makeVisible('unit-info');
				makeVisible('container-unitlist');
				makeVisible('equipment'); 
				updateEquipmentWindow(unitClass.tank);
				toggleButton($('buy'), true);
			}
			R.render(); //Full page render is needed for showing/hiding deployment hexes over all map
			break;
		}
		case 'endturn':
		{
			uiEndTurn();
			break;
		}
		case 'mainmenu':
		{
			if (isVisible('slidemenu'))
			{
				makeHidden('slidemenu');
				toggleButton($('mainmenu'), false);
			}
			else
			{
				makeVisible('slidemenu');
				toggleButton($('mainmenu'), true);
			}
			break;
		}
		case 'options':
		{
			if (isVisible('startmenu'))
			{
				makeHidden('smMain');
				makeHidden('smScen');
				makeHidden('smSettings');
				makeHidden('startmenu');
				toggleButton($('options'), false);
			}
			else
			{
				makeVisible('startmenu');
				makeVisible('smMain');
				toggleButton($('options'), true);
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
		makeHidden('unit-context');
		return;
	}
	
	if (GameRules.canMount(u))
	{
		nbuttons++;
		div = addTag('unit-context', 'div');
		div.className = "unit-context-buttons";
		div.id = "unit-context-mount";
		div.title = "Mount/Umount this unit in/from a transport";
		div.onclick = function() {unitContextButton('mount', u);}
	}
	
	if (GameRules.canEmbark(map.map, u) || GameRules.canDisembark(map.map, u))
	{
		nbuttons++;
		div = addTag('unit-context', 'div');
		div.className = "unit-context-buttons";
		div.id = "unit-context-embark";
		div.title = "Embark/DisEmbark this unit in/from a air/naval transport";
		div.onclick = function() {unitContextButton('embark', u);}
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
		makeVisible('unit-context');
	else
		makeHidden('unit-context');
}

//Updates the unit stats info window
function updateUnitInfoWindow(u)
{
	var isEqUnit = false;
	var uinfo, ammo, fuel = "-", exp = 0, ent = 0;

	if (!isVisible('unit-info')) return;

	//Call from equipment window fill with default values (instead of creating a new unit object)
	if (typeof u.unitData === "undefined") 
	{
		isEqUnit = true;
		uinfo = u;
		u.flag = u.country;
		u.strength = 10;
		ammo = u.ammo;
		if (u.fuel != 0)
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

	if (!isEqUnit && u.isCore)
		$('uName').innerHTML += " (Core Unit)";

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
	//Remember the render range and position of unit before actions
	var r = getRenderRange(unit);
	var p = unit.getPos();
	var refreshRender = false; //If a unit gets a new range after action
	
	switch (action)
	{
		case 'mount': //Can get a bigger range on mount
		{
			if (unit.isMounted)
				map.unmountUnit(unit);
			else
				map.mountUnit(unit);
			refreshRender = true;
			break;
		}
		case 'embark':
		{
			if (unit.carrier != -1)
				map.disembarkUnit(unit);
			else
				map.embarkUnit(unit);
			refreshRender = true;
			break;
		}
		case 'resupply': //same location same range
		{
			map.resupplyUnit(unit);
			break;
		}
		case 'reinforce': //same location same range
		{
			map.reinforceUnit(unit);
			break;
		}
		case 'undo': //new location different range
		{
			map.undoLastMove();
			refreshRender = true;
			break;
		}
	}
	updateUnitContextWindow(unit);
	updateUnitInfoWindow(unit);
	R.render(p.row, p.col, r); //remove old range
	if (refreshRender)
	{
		r = getRenderRange(unit); //probably different range
		p = unit.getPos(); //undoLastMove changes location
		R.render(p.row, p.col, r); //render new range changes
	}
}

this.equipmentWindowButtons = function(id)
{
	switch(id)
	{
		case 'changecountry':
		{
			if ($('eqSelCountry').country >= countries.length - 1) $('eqSelCountry').country = 0;
			else $('eqSelCountry').country++;
			$('eqUserSel').userunit = -1; //Clear existing unit selection when changing country
			$('eqUserSel').equnit = -1;
			game.ui.updateEquipmentWindow($('eqUserSel').eqclass || unitClass.tank); //previous class or tank class
			break;
		}
		case 'buy':
		{
			var eqUnit = $('eqUserSel').equnit;
			var eqTransport = $('eqUserSel').eqtransport;

			if (typeof eqUnit === "undefined" || eqUnit <= 0)
				return;

			if (typeof eqTransport === "undefined" || eqTransport == "")
				eqTransport = -1;

			var ret = map.currentPlayer.buyUnit(eqUnit, eqTransport);
			if (ret)
				console.log("Bought unit id: " + eqUnit + " with transport:" + eqTransport);
			else
				console.log("Can't buy a new unit");

			updateEquipmentWindow(Equipment.equipment[eqUnit].uclass);

			break;
		}
		case 'upgrade':
		{
			var id = $('eqUserSel').userunit; //real unit id on map
			var deployid = $('eqUserSel').deployunit; //id for units on deployment list

			var eqUnit = $('eqUserSel').equnit; //Can be undefined as we can only upgrade transport
			var eqTransport = $('eqUserSel').eqtransport;

			var p = map.currentPlayer;
			var u = null;

			if (typeof eqTransport === "undefined" || eqTransport == "")
				eqTransport = -1;

			if (typeof id === "undefined" || id == -1) //Upgrade an undeployed unit
			{
				console.log("Upgrading undeployed unit: " + deployid + " to equipment id:" + eqUnit + " with transport:" + eqTransport);
				u = p.getCoreUnitList()[deployid];
				if (p.upgradeUnit(u, eqUnit, eqTransport))
				{
					updateEquipmentWindow(Equipment.equipment[u.eqid].uclass);
				}
			}
			else //Upgrade a unit already on map
			{
				console.log("Upgrading unit: " + id + " to equipment id:" + eqUnit + " with transport:" + eqTransport);
				if (map.upgradeUnit(id, eqUnit, eqTransport))
				{
					R.cacheImages(function() { R.render(); }); //Need to cache new image
					if (eqUnit > 0 ) updateEquipmentWindow(Equipment.equipment[eqUnit].uclass);
				}

			}

		}
	}

}

this.updateEquipmentWindow = function(eqclass) { return updateEquipmentWindow(eqclass); }
function updateEquipmentWindow(eqclass)
{
	if (!isVisible('container-unitlist'))
		return;

	//Don't show AI/others unit lists
	if(map.currentPlayer.side !== game.spotSide)
		return;

	//Remove older entries
	clearTag('unitlist');
	clearTag('eqUnitList');
	clearTag('eqTransportList');
	
	//Toggle equipment class button on/off
	var prevClass = $('eqUserSel').eqclass || unitClass.tank;
	if (typeof UIBuilder.eqClassButtons[prevClass] !== "undefined" && typeof UIBuilder.eqClassButtons[prevClass][0] !== "undefined")
		toggleButton($(UIBuilder.eqClassButtons[prevClass][0]), false);
	if (typeof UIBuilder.eqClassButtons[eqclass] !== "undefined" && typeof UIBuilder.eqClassButtons[eqclass][0] !== "undefined")
		toggleButton($(UIBuilder.eqClassButtons[eqclass][0]), true);
	$('eqUserSel').eqclass = eqclass;
	
	//The current selected coutry in the div
	var c = $('eqSelCountry').country;
	var country = parseInt(countries[c]) + 1; //country id that is saved on unit data starts from 1 

	$('eqSelCountry').style.backgroundPosition = "" + countries[c] * -21 + "px 0px"; //Update flag

	var scenarioYear =  game.scenario.date.getFullYear();
	var unitList = [];
	var eqUnitList = [];
	var forcedScroll;
	var u, ud, userUnitSelected;
	var div;

	var oldDeployMode = uiSettings.deployMode;

	if (map.currentPlayer.hasUndeployedUnits())
	{
		//The units that current player hasn't deployed yet
		userUnitSelected = $('eqUserSel').deployunit;
		unitList = map.currentPlayer.getCoreUnitList();
		uiSettings.deployMode = true;
		$('statusmsg').innerHTML = "Deploy (on map grey hexes) or upgrade your core units"
	}
	else
	{
		//The actual units on the map
		userUnitSelected = $('eqUserSel').userunit;
		unitList = map.getUnits();
		uiSettings.deployMode = false;
		$('statusmsg').innerHTML = "Units currently deployed on map."
		$('eqInfoText').innerHTML = game.scenario.date.getFullYear() + " " + unitClassNames[eqclass]
						+ " upgrades for " + countryNames[country - 1];
	}

	if (oldDeployMode !== uiSettings.deployMode) //Check if we should refresh canvas for new mode
		R.render(); //Full canvas render

	for (var i = 0; i < unitList.length; i++)
	{
		u = unitList[i];

		if (uiSettings.deployMode && u.isDeployed)
			continue;
		if (u.player.id != map.currentPlayer.id)
			continue;

		ud = u.unitData(true);
		div = uiAddUnitBox('unitlist', ud, false);

		//Make a default selection for deployment mode so we don't have to click each time we deploy.
		if (uiSettings.deployMode && (userUnitSelected == -1 || unitList[userUnitSelected].isDeployed))
			$('eqUserSel').deployunit = userUnitSelected = i;


		if (uiSettings.deployMode)
			div.unitid = i;
		else
			div.unitid = u.id;

		div.uniteqid = u.eqid;
		div.eqclass = ud.uclass;
		div.country = u.player.country;

		if (u.isCore && div.unitid != userUnitSelected)
			div.setAttribute("coreUnit", ud.name); //apply the [coreUnit] style when not selected

		if (div.unitid == userUnitSelected)
		{
			//Automatically set transport on transport list if user has not selected a new transport
			if (u.transport !== null && $('eqUserSel').eqtransport == -1)
			{
				//Check if user selected equipment unit for upgrade can be transported
				if ($('eqUserSel').equnit == -1 || GameRules.isTransportable($('eqUserSel').equnit))
					$('eqUserSel').eqtransport = u.transport.eqid;
			}
			div.setAttribute("selectedUnit", ud.name) //apply the .eqUnitBox[selectedUnit] css style to make unit appear selected
			eqclass = ud.uclass; //Force unit class for equipment display

			if (!uiSettings.deployMode) //Not on map
			{
				uiUnitSelect(u);
				uiSetUnitOnViewPort(u); //bring the unit into map view
			}
			//This unit will be the last in div since the div is being built and we can use offsetWidth of the
			//containing div to get offset from the position 0. This value will be used to scroll the div when
			//a unit is selected from the map not from the unit list ui div
			forcedScroll = $('unitlist').offsetWidth - ($('container-unitlist').offsetWidth + div.offsetWidth)/2;
		}

		div.onclick = function()
		{
			c = map.getCountriesBySide(game.spotSide);
			for (i = 0; i < c.length; i++)
				if (c[i] == this.country) break;

			if (uiSettings.deployMode)
			{
				$('eqUserSel').deployunit = this.unitid; //save selected player unit for deployment
				$('eqUserSel').userunit = -1 //clear any remaining selection
			}
			else
			{
				$('eqUserSel').userunit = this.unitid; //save selected player unit
				$('eqUserSel').deployunit = -1; //clear any remaining selection
			}

			$('eqSelCountry').country = i;
			$('eqUserSel').eqtransport = -1; //clear transport selection on new unit selection
			$('eqUserSel').equnit = -1; //clear equipment unit selection on new unit selection
			$('eqUserSel').unitscroll = $('hscroll-unitlist').scrollLeft; //save scroll position so at refresh we autoscroll

			updateUnitInfoWindow(Equipment.equipment[this.uniteqid]); //TODO show real unit stats
			updateEquipmentWindow(this.eqclass);
			$('hscroll-unitlist').scrollLeft = $('eqUserSel').unitscroll; //scroll to the selected unit
		}
	}
	//Force scrolling when units are selected from the map to bring them into unit list view
	$('hscroll-unitlist').scrollLeft = forcedScroll;

	//Don't list units from a class that isn't allowed to be bought
	if (typeof UIBuilder.eqClassButtons[eqclass] === "undefined") return;
	
	//Units in equipment
	var eqUnitSelected = $('eqUserSel').equnit;
	eqUnitList = Equipment.getCountryEquipmentByClass(eqclass, country, "cost", false);

	for (var i = 0; i < eqUnitList.length; i++)
	{
		var u = Equipment.equipment[eqUnitList[i]];

		if (u.yearavailable > scenarioYear || u.yearexpired < scenarioYear)
			continue;

		//Add the unit to the list
		var div = uiAddUnitBox('eqUnitList', u, true);
		div.equnitid = u.id;
		if (u.id == eqUnitSelected)
			div.setAttribute("selectedUnit", ud.name) //apply the .eqUnitBox[selectedUnit] css style to make unit appear selected
		div.onclick = function()
		{
			$('eqUserSel').equnit = this.equnitid; //save the selected unit in the equipment list
			$('eqUserSel').eqtransport = -1; //clear transport selection on new unit selection
			$('eqUserSel').eqscroll  = $('hscroll-eqUnitList').scrollLeft; //save scroll position so at refresh we autoscroll
			updateUnitInfoWindow(Equipment.equipment[this.equnitid]);
			updateEquipmentWindow(eqclass); //To "unselect" previous selected unit
			$('hscroll-eqUnitList').scrollLeft = $('eqUserSel').eqscroll; //scroll to the selected unit
		};

	}
	//Add the transport to the list if unit can be transported
	var eqTransportSelected = $('eqUserSel').eqtransport;
	if (GameRules.isTransportable(eqUnitSelected) || eqTransportSelected > 0)
	{
		eqUnitList = Equipment.getCountryEquipmentByClass(unitClass.groundTransport, country, "cost", false);

		for (var i = 0; i < eqUnitList.length; i++)
		{
			var t = Equipment.equipment[eqUnitList[i]];

			if (t.yearavailable > scenarioYear || t.yearexpired < scenarioYear)
				continue;

			var tdiv = uiAddUnitBox('eqTransportList', t, true);
			tdiv.eqtransportid = t.id;
			if (t.id == eqTransportSelected)
				tdiv.setAttribute("selectedUnit", t.name) //apply the .eqUnitBox[selectedUnit] css style to make unit appear selected
			tdiv.onclick = function()
			{
				//handle deselect of transport
				if ($('eqUserSel').eqtransport == this.eqtransportid)
					$('eqUserSel').eqtransport = -1;
				else
					$('eqUserSel').eqtransport = this.eqtransportid; //save the selected unit in the equipment list
				updateUnitInfoWindow(Equipment.equipment[this.eqtransportid]);
				updateEquipmentWindow(eqclass); //To "unselect" previous selected unit
			};
		}
	}
	updateEquipmentCosts();
}

//Updates the costs of user selected units in equipment window
function updateEquipmentCosts()
{
	var userUnitSelected = $('eqUserSel').userunit; //unit already on map
	var deployUnitSelected = $('eqUserSel').deployunit; //unit no deployed on map
	var eqUnitSelected = $('eqUserSel').equnit;
	var eqTransportSelected = $('eqUserSel').eqtransport;
	var buyCost = 0;
	var upCost = 0;
	var prestige = map.currentPlayer.prestige;
	var unit = null;

	if (deployUnitSelected == -1 || typeof deployUnitSelected === "undefined")
		unit = map.getUnitById(userUnitSelected);
	else
		unit = map.currentPlayer.getCoreUnitList()[deployUnitSelected];

	if (typeof unit !== "undefined" && unit !== null)
		upCost = GameRules.calculateUpgradeCosts(unit, eqUnitSelected, eqTransportSelected);

	if (eqUnitSelected != -1)
		buyCost = GameRules.calculateUnitCosts(eqUnitSelected, eqTransportSelected);

	UIBuilder.showEquipmentCosts(prestige, buyCost, upCost);
}

function updateStatusBarLocation(row, col)
{
	var unit;
	var hex = map.map[row][col];

	if (!hex || typeof hex === "undefined")
		return false;
	var text = "";
	if (hex.road > roadType.none)
		text = "/Road";
	text = terrainNames[hex.terrain] + text + " (" + row + "," + col + ")";

	if (hex.name !== null)
		text = hex.name + " " + text;

	if (hex.terrain == terrainType.Airfield && map.currentPlayer.airTransports > 0)
		text += " Air Transports: " + map.currentPlayer.airTransports;

	if (hex.terrain == terrainType.Port && map.currentPlayer.navalTransports > 0)
		text += " Naval Transports: " + map.currentPlayer.navalTransports;

	if ((unit = hex.getUnit(uiSettings.airMode)) !== null
		&& (hex.isSpotted(map.currentPlayer.side) || unit.tempSpotted 
			|| unit.player.side == map.currentPlayer.side)) 
	{
		text = " Unit: " + unit.unitData(true).name + " " + text; 
	}
	$('locmsg').innerHTML = text;

	return true;
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
		txt.innerHTML += " - " + unitData.cost * CURRENCY_MULTIPLIER + UIBuilder.currencyIcon;
	
	return div;
}

function uiEndTurn()
{
	if (map.currentPlayer.type != playerType.humanLocal)
		return;

	game.endTurn();

	if (game.gameEnded)
	{
		uiMessage("DEFEAT", "<br><br>You didn't capture the objectives in time");
		return;
	}
	countries = map.getCountriesBySide(game.spotSide);
	updateEquipmentWindow(unitClass.tank); //Refresh equipment window for the new player
	updateUnitContextWindow();
	selectStartingUnit();
	uiEndTurnInfo();
}

this.uiEndTurnInfo = function() { return uiEndTurnInfo(); }
function uiEndTurnInfo()
{

	var p = map.currentPlayer;
	var turnsLeft = 0;

	var infoStr = "<br/><br/>There are <b>" + map.sidesVictoryHexes[p.side].length + "</b> objectives left to conquer <br/><br/>";

	if ((turnsLeft = map.victoryTurns[0] - (map.turn - 1)) > 0)
		infoStr += "<b>" + turnsLeft + "</b> turns left for <b>" + outcomeNames["briliant"] + "</b><br/>";

	if ((turnsLeft = map.victoryTurns[1] - (map.turn -1)) > 0)
		infoStr += "<b>" + turnsLeft + "</b>  turns left for <b>" + outcomeNames["victory"] + "</b><br/>";

	if ((turnsLeft = map.victoryTurns[2] - (map.turn -1)) > 0)
		infoStr += "<b>" + turnsLeft + "</b>  turns left for <b>" + outcomeNames["tactical"] + "</b><br/>";

	uiTurnInfo();
	uiMessage(p.getCountryName() + " player on " + map.currentPlayer.getSideName()
			+ " side  Turn " + map.turn + "/" + map.maxTurns, infoStr);

	R.render(); //Full page render when changing player/side
}

function uiTurnInfo()
{
	clearTag($('statusmsg'));
	$('statusmsg').innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "/" + map.maxTurns + " " + map.name;
}

function uiMessage(title, message) { UIBuilder.message(title, message); }

//Centers unit on player screen
this.uiSetUnitOnViewPort = function(unit) { return uiSetUnitOnViewPort(unit); }
function uiSetUnitOnViewPort(unit)
{
	if (!unit) return false;
	return uiSetCellOnViewPort(unit.getPos());
}

//Centers the screen on a map cell
function uiSetCellOnViewPort(cell)
{
	if (!cell || typeof cell === "undefined")
		return false;

	var pos = R.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
	$('game').scrollLeft = pos.x - window.innerWidth/2;
	$('game').scrollTop = pos.y - window.innerHeight/2;
	return true;
}

//Selects the first unit that belongs to the currently playing side
function selectStartingUnit()
{
	if (map.currentPlayer.type != playerType.humanLocal)
		return;
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		if (unitList[i].player.id == map.currentPlayer.id)
		{
			var pos = unitList[i].getPos();
			handleUnitSelect(pos.row, pos.col);
			updateUnitInfoWindow(unitList[i]);
			break;
		}
	}
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

//Returns the biggest range around a unit that should be rendered
function getRenderRange(unit)
{
	if (unit === null) 
		return 0;
	
	var range = GameRules.getUnitMoveRange(unit);
	var r = GameRules.getUnitAttackRange(unit);
	if (r > range) range = r;
	r = unit.unitData().spotrange;
	if (r > range) range = r;
	
	return range;
}

//Shows deployment window if player has undeployed units at new scenario or new turn
function uiShowDeploymentWindow()
{
	if (map.currentPlayer.hasUndeployedUnits())
	{
		makeVisible('container-unitlist');
		toggleButton($('buy'), true);
	}
}

function uiToggleMapZoom()
{
	var zoom = Math.min(window.innerWidth/canvas.width*100, window.innerHeight/canvas.height*100) >> 0;

	if ($('game').style.zoom == "100%" || $('game').style.zoom == '' )
	{
		$('game').style.zoom = zoom + "%";
		$('game').style.width = ((window.innerWidth * 100 / zoom) >> 0) + 100 + "px";
		$('game').style.height = ((window.innerHeight * 100 / zoom) >> 0) + 100 + "px";
		console.log("Zoom :" + zoom + " level:" + zoom/100);

		uiSettings.mapZoom = true;
		uiSettings.zoomLevel = 100/zoom;
	}
	else
	{
		$('game').style.width = window.innerWidth + "px";
		$('game').style.height = window.innerHeight + "px";
		$('game').style.zoom = "100%";
		uiSettings.mapZoom = false;
		uiSettings.zoomLevel = 1;
	}
	toggleButton($('zoom'), uiSettings.mapZoom);
	R.render(); //Full page render
}

} //End of UI class
