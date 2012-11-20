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

function UI(game)
{
	//Build the class selection buttons "unitClass.id from equipment.js": [button name, description, ]
	var eqClassButtons = 
	{
	"9": ['but-aa', 'Air defence'], "4": ['but-at', 'Anti-tank'], "8": ['but-arty', 'Artillery'],
	"1": ['but-inf', 'Infantry'], "3":['but-rcn', 'Recon'], "2": ['but-tank', 'Tank'],
	"10": ['but-af', 'Air Fighter'], "11": ['but-ab', 'Air Bomber']
	};

	var currencyIcon = "<img src='resources/ui/dialogs/equipment/images/currency.png'/>";
	var map = game.map;
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
	
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	
	canvas.addEventListener("mousedown", handleMouseClick, false);
	if (!uiSettings.hasTouch) canvas.addEventListener("mousemove", handleMouseMove, false);
	
	if (uiSettings.hasTouch && hasBrokenScroll())
	{
		touchScroll("game");
		touchScroll("hscroll-unitlist");
		touchScroll("hscroll-eqUnitList");
		touchScroll("hscroll-eqTransportList");
	}
	
	buildStartMenu();
	buildMainMenu();
	buildEquipmentWindow();
	
	this.mainMenuButton = function(id) { mainMenuButton(id); } //Bring up the mainmenu
	
function handleMouseClick(e) 
{
	if (!game.gameStarted || game.gameEnded)
		return;
	
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
				handleUnitDeselect();
	}

	//Set the airMode depending on current unit automatically
	uiSettings.airMode = GameRules.isAir(map.currentUnit);
	toggleButton($('air'), uiSettings.airMode);
	updateUnitContextWindow(map.currentUnit);
	//TODO make unitList equipment window show strength/movement/attack status and update it on all actions	
	//TODO partial screen updates (can update only attack or move selected hexes)
}

function handleMouseMove(e) 
{
	var unit, text, hex;
	var minfo = getMouseInfo(canvas, e);
	var c = R.screenToCell(minfo.x, minfo.y);

	if (map.currentUnit != null) { R.drawCursor(c); }
	updateStatusBarLocation(c.row, c.col);
}

//handle unit deployment
function handleUnitDeployment(row, col)
{
	var deployUnit = $('eqUserSel').deployunit; //TODO make this into a UI member
	var ret = map.deployPlayerUnit(map.currentPlayer, deployUnit, row, col);
	if (ret)
		R.cacheImages(function() { R.render(); updateEquipmentWindow(map.currentUnit.unitData(true).uclass); });
	else 
		console.log("Can't deploy unit in that location");
	
}

//Deselects a previously selected unit. Can have row,col as params since user can click or rightclick
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
		return;
	
	handleUnitDeselect(); //Deselect previously selected unit
	
	var hex = map.map[row][col];
	
	if (!map.selectUnit(hex.getUnit(uiSettings.airMode))) //can fail if clickedUnit is on enemy side
		map.selectUnit(hex.getUnit(!uiSettings.airMode)); //try the other unit on hex

	if (map.currentUnit === null) 
		return;
		
	//Update unit contextual window
	updateUnitContextWindow(map.currentUnit);
	//Select unit on equipment window
	$('eqUserSel').userunit = map.currentUnit.id; //save selected player unit
	updateEquipmentWindow(map.currentUnit.unitData(true).uclass);
	//Display selected unit on status bar
	updateStatusBarLocation(row, col);
	
	var r = getRenderRange(map.currentUnit);
	R.render(row, col, r);
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
	var cell = mr.surpriseCell;
	var r = getRenderRange(unit);
	var p = unit.getPos();
	
	R.render(p.row, p.col, r);
	
	if (mr.isSurprised)
	{
		var pos = R.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, "Surprised !");
		moveAnimationCBData.unit.isSurprised = true;
		handleUnitAttack(moveAnimationCBData.unit, cell.row, cell.col); //TODO select which unit has surprised (air / ground)
	}
	if (mr.isVictorySide >= 0)
	{
		uiMessage("Victory","Side " + sideNames[mr.isVictorySide] + " wins by capturing all victory hexes");
		game.gameEnded = true;
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
		units: [attackingUnit, enemyUnit],
		oldstr: [attackingUnit.strength, enemyUnit.strength],
		cbfunc: uiAttackAnimationFinished,
	}
	uiAttackInfo(attackingUnit, enemyUnit); //Show info on status bar
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
	if (attackingUnit.destroyed) //TODO Do this better
	{
		map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
		R.drawCursor(cpos, uiSettings.airMode); //refresh cursor or it gets stuck in attack cursor
		R.addAnimation(cpos.row, cpos.col, "explosion");
	}
	else //Can we still attack ?
	{
		var cr = map.attackUnit(attackingUnit, enemyUnit, false); //Only attack an enemy unit on that hex
		R.addAnimation(cpos.row, cpos.col, attackAnimationByClass[cclass], attackingUnit.facing);
		if (enemyUnit.destroyed)
			R.addAnimation(row, col, "explosion");
		else
			if (cr.defcanfire)
				R.addAnimation(row, col, attackAnimationByClass[eclass], enemyUnit.facing); //Hits to the unit being attacked
		
		if (attackingUnit.destroyed) //TODO Do this better
		{
			map.delCurrentUnit(); //remove current selection if unit was destroyed in attack
			R.drawCursor(cpos, uiSettings.airMode); //refresh cursor or it gets stuck in attack cursor
			R.addAnimation(cpos.row, cpos.col, "explosion");
		}
		else
		{
			if (enemyUnit.destroyed && !attackingUnit.hasMoved)
				map.setMoveRange(attackingUnit); //refresh move range if unit has destroyed another unit
		}
	}
	//Render so new unit facings are shown correctly 7 is the biggest attack range including support fire
	R.render(cpos.row, cpos.col, 7); 
	R.runAnimation(animationCBData);
	attackingUnit.isSurprised = false; //When combat ends unit is no longer surprised
	return true;
}

//Called when attack animation finishes 
function uiAttackAnimationFinished(animationCBData)
{
	//EventHandler.emitEvent("AttackAnimation");
	for (var i = 0; i < animationCBData.units.length; i++)
	{
		if (animationCBData.units[i].destroyed)	continue;
		var loss = animationCBData.units[i].strength - animationCBData.oldstr[i];
		if (loss == 0) continue;
		var cell = animationCBData.units[i].getPos();
		var pos = R.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
		bounceText(pos.x, pos.y, loss);
	}
	
	//TODO should check surviving unit getRenderRange since 
	//it might have not moved and needs a bigger render range
	R.render(cell.row, cell.col, 7);
	game.waitUIAnimation = false;
	uiTurnInfo();
}

function uiAttackInfo(atkunit, defunit)
{
	var ad = atkunit.unitData();
	var dd = defunit.unitData();
		
	$('statusmsg').innerHTML = countryNames[atkunit.flag - 1] + " <b>" + ad.name + "</b> " + unitClassNames[ad.uclass] 
				+ " attacking "
				+ countryNames[defunit.flag - 1]+ " <b>"+ dd.name + "</b> " + unitClassNames[dd.uclass];
}

//Builds the start menu/options menu
function buildStartMenu()
{
	//menu buttons divs with id, title the image filename from resources/ui/startmenu/images
	var menubuttons = [["newscenario", "New Scenario"], ["continuegame", "Continue Game"], ["settings", "Settings"], ["help", "Help"]];
	//Settings with key in uiSettings and Title
	var settings = [["useRetina", "Use Retina Resolution"], ["use3D", "Use 3D acceleration"], ["markFOW", "Show Fog Of War"],
			["markOwnUnits", "Mark own units on map"], ["markEnemyUnits", "Mark enemy units on map"]];
	var imgres = "resources/ui/dialogs/startmenu/images/";
	
	//Add main buttons
	for (var b = 0; b < menubuttons.length; b++) 
	{
		var div = addTag('smButtons', 'div');
		var img = addTag(div, 'img');
		div.id = menubuttons[b][0];
		div.title = menubuttons[b][1];
		div.className = "smMainButton";
		img.src = "resources/ui/dialogs/startmenu/images/" + div.id + ".png";
		div.onclick = function() { startMenuButton(this.id); }
	}
	
	$('smLogoText').innerHTML = "version " + VERSION;
	$('smCredits').innerHTML = "Copyright 2012 <a href='http://linuxconsulting.ro/openpanzer'>Nicu Pavel</a>";	
	
	//Add new scenario options(scenario list, description, players)
	var scnSel = addTag('smScenSel', 'select');
	for (var i = 0; i < scenariolist.length; i++)
	{
		var scnOpt = addTag(scnSel, 'option');
		scnOpt.value = i;
		scnOpt.text = scenariolist[i][1];
	}
	scnSel.onchange = function()
		{
			var v = this.options[this.selectedIndex].value;
			$('smScenDesc').innerHTML = scenariolist[v][2];
			
			clearTag('smSide0');
			$('smVS').innerHTML = "VS";
			clearTag('smSide1');
			//Clear previous player AI settings
			uiSettings.isAI = [0, 0, 0, 0];
			
			//Add players for side 0 and 1
			for (var s = 0; s <= 1; s++)
			{
				var data = scenariolist[v][3 + s];
				var sideID = "smSide" + s;
				var sideHeader = addTag(sideID, 'div');
				sideHeader.className = "smSideHeader";
				sideHeader.innerHTML = sideNames[s];
				var sideImg = addTag(sideHeader, 'img');
				sideImg.src = imgres + "side" + s + ".png";
				
				for (var i = 0; i < data.length; i++)
				{
					var containerDiv = addTag(sideID, 'div');
					containerDiv.className = "smPlayerContainer";
					var flagDiv = addTag(containerDiv, 'div');
					flagDiv.className = "playerCountry";
					flagDiv.style.backgroundPosition = "" + data[i]["country"] * -21 + "px 0px"; //Update flag
					var contentDiv = addTag(containerDiv, 'div');
					contentDiv.className = "playerName";
					contentDiv.innerHTML = (scenariolist[v][3 + s][i]["id"] + 1) + ". " + countryNames[data[i]["country"]];
					var smAIBut = addTag(containerDiv, 'img');
					
					smAIBut.src = "resources/ui/dialogs/startmenu/images/aicheckbox.png";
					smAIBut.id = "ai" + data[i]["id"];
					smAIBut.playerid = data[i]["id"];
					smAIBut.onclick = function() 
						{ 
							uiSettings.isAI[this.playerid] = !uiSettings.isAI[this.playerid];
							toggleCheckbox(this); 
							console.log(uiSettings.isAI);
						}
				}
			}
			$('smScen').selectedScenario = "resources/scenarios/xml/" + scenariolist[v][0];
		}
	$('smBackBut').onclick = function() 
		{ 
			makeHidden('smScen');
			makeVisible('smMain');
		}
	$('smPlayBut').onclick = function() 
		{ 
			var s = $('smScen').selectedScenario;
			if (!s)	return;
			newScenario(s);
			makeHidden('smScen');
			makeHidden('startmenu');
			toggleButton($('options'), false);
			game.state.saveSettings();
		}
	
	//The settings window
	for (var b = 0; b < settings.length; b++) 
	{
		var div = addTag('smSettings', 'div');
		div.id = settings[b][0];
		div.title = settings[b][1];
		div.className = "setting";
		div.innerHTML = settings[b][1];
		var img = addTag(div, 'img');
		img.id = settings[b][0];
		img.src = "resources/ui/dialogs/startmenu/images/checkbox.png";
		img.onclick = function() { uiSettings[this.id] = !uiSettings[this.id]; toggleCheckbox(this); console.log("Settings " + this.id + " changed to:" + uiSettings[this.id]); }
	}
	$('smSetOkBut').onclick = function() 
		{
			makeHidden('smSettings');
			makeVisible('smMain');
			game.state.saveSettings();
		}
}

function startMenuButton(id)
{
	switch(id) 
	{
		case 'newscenario':
		{
			makeHidden('smMain');
			makeVisible('smScen');
			//Make the current scenarion selected
			var s = $('smScenSel').firstChild;
			var o = s.options;
			for (var i = 0; i < o.length; i++)
			{
				o[i].selected = false;
				if (o[i].text === map.name)
				{
					o[i].selected = true;
					s.onchange();
				}
			}
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

//Builds the in game right side menu
function buildMainMenu()
{
	//menu buttons divs with id the image filename from resources/ui/menu/images
	//format is <id>, <title>, <0/1 if should be placed in slide div or not>
	var menubuttons = [ ["inspectunit","Inspect Unit", 0], ["endturn","End Turn", 0],["mainmenu", "Main  Menu", 0],
			   ["buy","Upgrade/Buy Units", 1],["hex","Toggle Hex Grid", 1], ["air","Toggle Air Mode On", 1],
			   ["zoom","Strategic Map", 1], ["options","Options", 1]];
					   
	var sd = addTag('statusbar','div');
	sd.id = "statusmsg";
	sd.className = "message";
	uiTurnInfo();
	
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
	if (map.currentPlayer.type == playerType.aiLocal)
		return;
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
			toggleButton($('zoom'), uiSettings.mapZoom);
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
			if (isVisible('equipment'))
			{
				makeHidden('equipment'); 
				makeHidden('container-unitlist');
				uiSettings.deployMode = false;
				toggleButton($('buy'), false);
			}
			else 
			{
				makeVisible('unit-info');
				makeVisible('container-unitlist');
				makeVisible('equipment'); 
				updateEquipmentWindow(unitClass.tank);
				toggleButton($('buy'), true);
			}
			R.render(); //TODO: full page render is needed only when showing/hiding deployment hexes
			break;
		}
		case 'endturn':
		{
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
		makeVisible('unit-context');
	else
		makeHidden('unit-context');
}

function updateUnitInfoWindow(u)
{
	var isEqUnit = false;
	var uinfo, ammo, fuel, exp, ent;

	if (!isVisible('unit-info')) return;

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
	R.render(); //TODO partial rendering
}

function buildEquipmentWindow()
{
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
		div.eqclass = b; //Hack to get parameter passed
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

				var ret = map.currentPlayer.buyUnit(eqUnit, eqTransport);
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
				R.cacheImages(function() { R.render(); }); //Need to cache new image
				if (eqUnit > 0 ) updateEquipmentWindow(equipment[eqUnit].uclass);
			}
		}
	
	$('eqCloseBut').title = "Close";
	$('eqCloseBut').onclick = function() { makeHidden('equipment'); }
}

//TODO function too large break it
//TODO index equipment array
//TODO/REVIEW clear onclick functions when using clearTag
function updateEquipmentWindow(eqclass)
{
	if (!isVisible('container-unitlist')) 
		return;
		
	//Remove older entries
	clearTag('unitlist');
	clearTag('eqUnitList');
	clearTag('eqTransportList');
	
	//Toggle equipment class button on/off
	var prevClass = $('eqUserSel').eqclass || unitClass.tank;
	if (typeof eqClassButtons[prevClass] !== "undefined" && typeof eqClassButtons[prevClass][0] !== "undefined")
		toggleButton($(eqClassButtons[prevClass][0]), false);
	if (typeof eqClassButtons[eqclass] !== "undefined" && typeof eqClassButtons[eqclass][0] !== "undefined")
		toggleButton($(eqClassButtons[eqclass][0]), true);
	$('eqUserSel').eqclass = eqclass;
	
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
				R.render(); //make the deployment mode appear
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
			var ud = u.unitData(true);
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
					R.render(); //refresh so the new selection appear
					uiSetUnitOnViewPort(u); //bring the unit into map view
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
	
	//Don't list units from a class that isn't allowed to be bought
	if (typeof eqClassButtons[eqclass] === "undefined") return;
	
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
		$('eqNewBut').style.display = "inline";
	}
	else
	{
		if (buyCost > prestige)
		{
			var diff = buyCost - prestige;
			$('eqNewText').innerHTML = "<span style='color:#FF6347'>Need " + diff + " more prestige to buy.</span>";
		}
		else
		{
			$('eqNewText').innerHTML = "";
		}
		$('eqNewBut').style.display = "none";
	}
	
	if (upCost > 0 && upCost <= prestige)
	{
		$('eqUpgradeText').innerHTML = " Upgrade unit cost: " + upCost + currencyIcon;
		$('eqUpgradeBut').style.display = "inline";
	}
	else
	{
		if (upCost > prestige)
		{
			var diff = upCost - prestige;
			$('eqUpgradeText').innerHTML = "<span style='color:#FF6347'>Need " + diff + " more prestige to upgrade.</span>";
		}
		else
		{
			$('eqUpgradeText').innerHTML = "";
		}	
		$('eqUpgradeBut').style.display = "none";
	}
	
	$('currentPrestige').innerHTML = "Available prestige: " + prestige + currencyIcon;
}

function updateStatusBarLocation(row, col)
{
	var hex = map.map[row][col];
	if (!hex || typeof hex === "undefined")
		return false;
	var text = "";
	if (hex.road > roadType.none)
		text = "/Road";
	text = terrainNames[hex.terrain] + text + " (" + row + "," + col + ")";
	if (hex.name !== null)
		text = hex.name + " " + text;
	if ((unit = hex.getUnit(uiSettings.airMode)) !== null 
		&& (hex.isSpotted(map.currentPlayer.side) || unit.tempSpotted 
			|| unit.player.side == map.currentPlayer.side)) 
	{
		text = " Unit: " + unit.unitData(true).name + " " + text; 
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
	makeVisible('ui-message');
	$('uiokbut').onclick = function() { makeHidden('ui-message'); }
}

this.uiEndTurnInfo = function() { return uiEndTurnInfo(); }
function uiEndTurnInfo()
{
	var playerList = map.getPlayers();
	var infoStr = "";
	for (var i = 0; i < playerList.length; i++)
		infoStr +=  playerList[i].getCountryName() + " player on " +  playerList[i].getSideName()
			+ " side has " + map.sidesVictoryHexes[playerList[i].side].length + " victory points to conquer <br/>";
			
	uiTurnInfo();
	uiMessage(map.currentPlayer.getCountryName() + " player on " + map.currentPlayer.getSideName() 
				+ " side  Turn " + map.turn, infoStr);
	R.render();			
}

function uiTurnInfo()
{
	$('statusmsg').innerHTML = map.currentPlayer.getCountryName() + " Turn: " + map.turn + "/" + map.maxTurns + " " + map.name;
}

this.uiSetUnitOnViewPort = function(unit) { return uiSetUnitOnViewPort(unit); }
function uiSetUnitOnViewPort(unit)
{
	if (!unit) return;
	var cell = unit.getPos();
	if (!cell || typeof cell === "undefined") return;
	var pos = R.cellToScreen(cell.row, cell.col, true); //return absolute(window) values
	$('game').scrollLeft = pos.x - window.innerWidth/2;
	$('game').scrollTop = pos.y - window.innerHeight/2;
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
			pos = unitList[i].getPos();
			handleUnitSelect(pos.row, pos.col);
			updateUnitInfoWindow(unitList[i]);
			break;
		}
	}
}

function newScenario(scenario)
{
	game.newScenario(scenario);
	map = game.map;
	R.setNewMap(map);
	R.cacheImages(function() 
	{ 
		selectStartingUnit(); 
		uiSetUnitOnViewPort(map.currentUnit);
		R.render(); 
	});
	countries = map.getCountriesBySide(game.spotSide);
	updateEquipmentWindow(unitClass.tank); //Refresh equipment window	
	uiTurnInfo();
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

} //End of UI class
