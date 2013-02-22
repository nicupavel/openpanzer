/**
 * Map - Provides map, player and hex objects
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

//Hex, Player and Map classes
//Player Object Constructor
function Player()
{
	this.id = -1;
	this.side = -1;
	this.country = -1;
	this.prestige = 0;
	this.playedTurn = -1;
	this.type = playerType.humanLocal;
	this.handler = null;

	//One time use transports available for this players
	this.airTransports = 0;
	this.navalTransports = 0;

	this.supportCountries = [];
	this.prestigePerTurn = [];

	//Privileged Methods that access private properties/methods
	this.getCoreUnitList = function() { return coreUnitList; }
	this.addCoreUnit = function(unit)
	{
		unit.isCore = true;
		coreUnitList.push(unit);
		console.log("Unit %s %o added as core unit for player %d",
			unit.unitData().name, unit, this.id);
	}
	this.setCoreUnitList = function(list)
	{
		var i;
		coreUnitList = [];
		for (i = 0; i < list.length; i++)
			coreUnitList.push(list[i]);
	}

	//Private property
	var coreUnitList = []; //Core units obtained during campaign or bought by player
}
//Player Object Public Methods
Player.prototype.copy = function(p)
{
	var i;

	if (p === null) return;
	this.id = p.id;
	this.side = p.side;
	this.country = p.country;
	this.prestige = p.prestige;
	this.playedTurn = p.playedTurn;
	this.type = p.type;

	this.airTransports = p.airTransports;
	this.navalTransports = p.navalTransports;

	if (p.supportCountries)
		for (var i = 0; i < p.supportCountries.length; i++)
			this.supportCountries.push(p.supportCountries[i]);

	if (p.prestigePerTurn)
		for (var i = 0; i < p.prestigePerTurn.length; i++)
			this.prestigePerTurn.push(p.prestigePerTurn[i]);

	if (p.getCoreUnitList) { this.setCoreUnitList(p.getCoreUnitList()); }
}

Player.prototype.getCountryName = function() { return countryNames[this.country]; }
Player.prototype.getSideName = function() { return sideNames[this.side]; }

//Get the undeployed units from core unit list
Player.prototype.hasUndeployedUnits = function()
{
	var i;
	var cList = this.getCoreUnitList();
	for (i = 0; i < cList.length; i++)
		if (!cList[i].isDeployed)
			return true;

	return false;
}

Player.prototype.buyUnit = function(unitid, transportid)
{
	var cost = GameRules.calculateUnitCosts(unitid, transportid);
		
	if (cost > this.prestige) return false;

	var u = new Unit(unitid);

	if (transportid > 0 && typeof transportid !== "undefined")
		u.setTransport(transportid);

	u.owner = this.id;
	u.flag = this.country * 1 + 1 ; //TODO fix this
	u.player = this;

	this.addCoreUnit(u);

	this.prestige -= cost;

	return true;
}

Player.prototype.upgradeUnit = function(unit, upgradeid, transportid)
{
	var cost = GameRules.calculateUpgradeCosts(unit, upgradeid, transportid);

	if (cost > this.prestige)
		return false;	
	if (!unit.upgrade(upgradeid, transportid))
		return false;
		
	this.prestige -= cost;
		
	return true;
}

Player.prototype.reinforceUnit = function(unit, strength)
{
	var costPerStrength = ((unit.unitData().cost * CURRENCY_MULTIPLIER) / 10) >> 0;
	var maxStrength = (this.prestige / costPerStrength) >> 0;
	
	if (maxStrength < 1)
		return false;
	if (maxStrength >= strength)
		maxStrength = strength;
	this.prestige -= maxStrength * costPerStrength;
	unit.reinforce(maxStrength);
	
	return true;
}

Player.prototype.endTurn = function(turn)
{
	this.playedTurn = turn;

	//turn starts from 1, array index from 0. turn 1 or 0 array index will be applied when scen is loaded/game
	//is started, turn 2 prestige will get added at the end of turn 1
	if (turn < this.prestigePerTurn.length)
		this.prestige += this.prestigePerTurn[turn];
}

//Reset player properties from previous scenario and resets/reinforce/resupply it's core unit status
Player.prototype.setPlayerToHQ = function()
{
	var i, u;

	this.supportCountries = [];
	this.prestigePerTurn = [];
	this.airTransports = 0;
	this.navalTransports = 0;

	var cList = this.getCoreUnitList();
	for (i = 0; i < cList.length; i++)
	{
		u = cList[i];
		if (u.destroyed) //remove if destroyed
		{
			cList[i] = null;
			cList.splice(i, 1);
			i--;
			continue;
		}

		//TODO move this in Unit object in a setDefaults
		u.unmount();
		u.hasMoved = u.hasFired = u.hasResupplied = false;
		u.isDeployed = false; //Send unit to HQ, undeploy from map
		u.strength = 10;
		u.ammo = u.unitData().ammo;
		u.fuel = u.unitData().fuel;
		if (u.transport !== null) //resupply transport too
		{
			u.transport.fuel = u.transport.unitData().fuel;
			u.transport.ammo = u.transport.unitData().ammo;
		}
		u.moveLeft = u.unitData().movpoints;
		u.entrenchment = 0;
		u.hits = 0;
		u.setHex(null); //also does isDeployed = false
	}
}

//Hex Object Constructor
function Hex(row, col)
{
	//Public Properties
	this.unit = null; //pointer to the ground unit on this hex
	this.airunit = null; //pointer to the air unit on this hex
	this.terrain = terrainType.Clear;
	this.road = roadType.none;
	this.owner = -1;
	this.flag = -1;
	this.isDeployment = -1; //deployment hex for played id
	this.victorySide = -1; //hex is a victory point for side [0,1]
	this.name = "";	
	this.isMoveSel = false; //current unit can move to this hex
	this.isAttackSel = false; //current unit can attack this hex

	//TODO ZOC need to keep a list of units to be able to check if a unit that has that
	//ZOC is spotted. This will allow movement on ZOC generated by units that aren't yet spotted.
	//Privileged Methods that access private properties/methods
	this.isZOC = function(side) { return isHexPropSet(zocList, side); }
	this.isSpotted = function(side) { return isHexPropSet(spotList, side); }
	this.setZOC = function(side, on) { return setHexPropList(zocList, side, on); }
	this.setSpotted = function(side, on) {	return setHexPropList(spotList, side, on); }
	this.getPos = function() { return new Cell(1 * row, 1 * col); }
	
	//Private Methods and Properties
	var zocList = [0, 0]; //Hex is in a unit zone of control from side 0 or 1
	var spotList = [0, 0]; //Hex is spoted by a unit from side 0 or 1
	
	//sets one of the properties list for side on/off 
	function setHexPropList(propList, side, on)
	{
		if (side < propList.length)
			if (on)
				propList[side]++;
			else
				propList[side]--;
	}
	//checks if a property is true or false
	function isHexPropSet(propList, side)
	{
		if (side < propList.length)
			if (propList[side] > 0)
				return true;
		return false;
	}
};

//Hex Object Public Methods
//Clone Hex object
Hex.prototype.copy = function(hex) 
{
	if (hex === null) return;
	
	this.terrain = hex.terrain;
	this.road = hex.road;
	this.owner = hex.owner;
	this.flag = hex.flag;
	this.isSupply = hex.isSupply;
	this.isDeployment = hex.isDeployment;
	this.victorySide = hex.victorySide;
	this.name = hex.name;	
	//Set units and their correct links to the new object
	this.setUnit(hex.unit);
	this.setUnit(hex.airunit);
}

//Returns air or ground unit on a hex depending on UI airMode 
Hex.prototype.getUnit = function(airMode)
{
	if (this.unit !== null && this.airunit !== null)
	{
		if (airMode)
			return this.airunit;
		else
			return this.unit;
	}
	if (this.unit !== null)
		return this.unit;
	
	if (this.airunit !== null)
		return this.airunit;

	return null;
}

Hex.prototype.setUnit = function(unit) 
{ 
	//Will return if unit object is just a copy.
	if (unit === null || typeof unit.setHex === "undefined")
		return;
	unit.setHex(this); //back linking
	if (GameRules.isAir(unit))
		this.airunit = unit;
	else
		this.unit = unit;
}

Hex.prototype.delUnit = function(unit) 
{
	if (unit === null || typeof unit.setHex === "undefined")
		return;

	unit.setHex(null);
	//Need to remove by id instead of isAir(unit) since in case of carriers with paratroopers 
	//unit type is changing from air to ground.
	if (this.unit !== null && this.unit.id == unit.id)
		this.unit = null;

	if (this.airunit !== null && this.airunit.id == unit.id)
		this.airunit = null;
}

//Returns the unit from this hex that can be attacked by atkunit
Hex.prototype.getAttackableUnit = function(atkunit, airMode)
{
	var s = atkunit.player.side;
	var u = this.getUnit(airMode);

	if (u && (this.isSpotted(s) || u.tempSpotted) && GameRules.canAttack(atkunit, u))
		return u;

	u = this.getUnit(!airMode);

	if (u && (this.isSpotted(s) || u.tempSpotted) && GameRules.canAttack(atkunit, u))
		return u;

	return null;
}

//Map Object Constructor
function Map()
{
	this.rows = 0;
	this.cols = 0;
	this.map = null;
	this.name = "";
	this.terrainImage = null;
	this.victoryTurns = []; //Turns limit for briliant, victory and tactical victory
	this.maxTurns = 1;
	this.turn = 1;
	this.currentUnit = null;
	this.sidesVictoryHexes = [[], []]; //Victory hexes for each side 
	this.currentPlayer = null; //Which player is currently playing
	
	var unitImagesList = {}; //a "hash" of unique unit images used for caching
	var moveSelected = []; //selected hexes for current unit move destinations
	var attackSelected = []; //selected hexes for current unit attack destinations
	var unitList = []; //internal list of units
	var playerList = []; //players list
	var uniqueID = 0; //gets assigned as unique unit ID and incremented after each unit is added
	
	this.allocMap = function()
	{
		this.map = new Array(this.rows);
		for(var i = 0; i < this.rows; i++)
		{
			this.map[i] = new Array(this.cols);
			for(var j = 0; j < this.cols; j++)
			{
				this.map[i][j] = new Hex(i, j);
			}
		}
	}
	
	this.addUnit = function(unit) 
	{
		//Assign an unique id to the unit
		unit.id = uniqueID;
		uniqueID++;

		unitList.push(unit);
		unitImagesList[unit.eqid] = Equipment.equipment[unit.eqid].icon; //unit.getIcon(); //TODO rewrite this
		
		if (unit.transport !== null)
			unitImagesList[unit.transport.eqid] = unit.transport.icon;
		
		if (unit.carrier != -1)
			unitImagesList[unit.carrier] = Equipment.equipment[unit.carrier].icon;

		//Sets the player struct
		unit.player = this.getPlayer(unit.owner);
		GameRules.setZOCRange(this.map, unit, true, this.rows, this.cols);
		GameRules.setSpotRange(this.map, unit, true, this.rows, this.cols);
	}
	
	this.getUnits = function() { return unitList; }
	this.getUnitById = function(id)
	{
		if (id < 0 || typeof id === "undefined")
			return null;

		for (var i = 0; i < unitList.length; i++)
		{
			if (unitList[i] !== null && unitList[i].id == id)
				return unitList[i];
		}
		return null;
	}
	this.getUnitImagesList = function() { return unitImagesList; }
	this.getPlayers = function() { return playerList; }
	
	this.addPlayer = function(player) 
	{ 
		playerList.push(player);
		if  (this.currentPlayer === null) this.currentPlayer = playerList[0];
	}
	
	this.getPlayer = function(id) //TODO/FIX: returns player @ index instead of checking the ID
	{ 
		if (id < playerList.length)
			return playerList[id]; 
		else
			return playerList[0];
	}

	this.getPlayersByCountry = function(country)
	{
		var c = [];
		var p = this.getPlayers();
		for (var i = 0; i < p.length; i++)
			if (p[i].country == country)
				c.push(p[i]);
		return c;
	}

	//returns and array of countries playing on a side including supporting countries for the side players
	this.getCountriesBySide = function(side)
	{
		var c = [];
		var p = this.getPlayers();
		for (var i = 0; i < p.length; i++)
		{
			if (p[i].side == side)
			{
				c.push(p[i].country); //add player country
				for (var j = 0; j < p[i].supportCountries.length; j++)
				{
					if (p[i].supportCountries[j] > 0)
						c.push(p[i].supportCountries[j] - 1) //add supporting country //TODO -1 fix indexes
				}
			}
		}
		return c;
	}
	
	this.setCurrentUnit = function(unit) { this.currentUnit = unit; }
	
	this.delCurrentUnit = function()
	{
		this.currentUnit = null;
		this.delMoveSel();
		this.delAttackSel();
	}
	
	this.delMoveSel = function()
	{
		for (var i = 0; i < moveSelected.length; i++)
		{
			var c = moveSelected[i];
			this.map[c.row][c.col].isMoveSel = false;
		}
		moveSelected = [];
	}
	
	this.delAttackSel = function()
	{
		for (var i = 0; i < attackSelected.length; i++)
		{
			var c = attackSelected[i];
			this.map[c.row][c.col].isAttackSel = false;
		}
		attackSelected = [];
	}
	
	this.setHex = function(row, col, hex)
	{
		if (!hex || typeof hex === "undefined")
			hex = this.map[row][col]; //in-place
		else
			this.map[row][col].copy(hex); //copy values from the hex argument

		//Add coords for each victory hex into list
		var victorySide = hex.victorySide;

		if ( victorySide != -1)
		{
			//Check ownership. Some victory hexes for other side might be already captured (see salerno map)
			if (hex.owner != -1 && (victorySide == this.getPlayer(hex.owner).side))
			{
				console.log("Victory hex for side %d already captured by player %d !", victorySide, hex.owner);
				victorySide = ~ victorySide & 1; //Change to enemy side
			}
			this.sidesVictoryHexes[victorySide].push(hex.getPos());
		}

		if (hex.unit !== null) 
			this.addUnit(hex.unit);
		if (hex.airunit !== null)
			this.addUnit(hex.airunit);
	}

	//Add remove victory hexes from the lists
	this.updateVictorySides = function(side, cell)
	{
		var enemySide = ~side & 1;
		var eV = this.sidesVictoryHexes[enemySide];
		var sV = this.sidesVictoryHexes[side];
		//Side has ocuppied a victory hex that was marked as victory for it
		for (var i = 0; i < sV.length; i++)
		{
			if (sV[i].row == cell.row && sV[i].col == cell.col)
			{
				eV.push(cell);
				sV.splice(i, 1);
				break;
			}
		}

		console.log("Updated side victory hexes Side: " + sideNames[side] + " : " 
					+ this.sidesVictoryHexes[side].length + " Side: " + sideNames[enemySide]
					+ " : " + this.sidesVictoryHexes[enemySide].length);
		
		if (this.sidesVictoryHexes[side].length == 0) 
		{ 
			console.log("Side: " + side + " WINS !");
			return true;
		}
		return false;
	}
	
	this.setMoveRange = function(unit)
	{
		this.delMoveSel();
		var c = GameRules.getMoveRange(this.map, unit, this.rows, this.cols);

		for (var i = 0; i < c.length; i++)
		{
			moveSelected.push(c[i]); //Push both canPass and canMove for the shortestPath function
			if (c[i].canMove) this.map[c[i].row][c[i].col].isMoveSel = true; //Only allow canMove destination hexes on map
		}
	}

	this.getCurrentMoveRange = function() {	return moveSelected; }
	
	this.setAttackRange = function(unit)
	{
		this.delAttackSel();
		var c = GameRules.getUnitAttackCells(this.map, unit, this.rows, this.cols);
		
		for (var i = 0; i < c.length; i++)
		{
			attackSelected.push(c[i]);
			this.map[c[i].row][c[i].col].isAttackSel = true; 
		}
	}
	
	this.endTurn = function()
	{
			//TODO move to Game object where applicable
			this.delMoveSel();
			this.delAttackSel();
			this.delCurrentUnit();
			this.currentPlayer.endTurn(this.turn);
			var p = this.getPlayers();
			for (var i = 0; i < p.length; i++)
			{	
				if (p[i].id == this.currentPlayer.id)
				{
					if ((i + 1) < p.length)
						this.currentPlayer = p[i + 1];
					else
						this.currentPlayer = p[0];
					break;
				}
			}
			if (this.currentPlayer.id == 0)
			{
				this.turn++;
				unitsEndTurn();
			}
			if (this.currentPlayer.type == playerType.aiLocal)
				this.currentPlayer.handler.buildActions();
	}
	
	//atkunit from srow, scol attacks defunit from drow, dcol
	this.attackUnit = function(atkunit, defunit, supportFire)
	{
		if (atkunit === null || defunit === null)
			return null;
		
		lastMove.unit = null; //Reset last move undo save
		var a = atkunit.getPos();
		var d = defunit.getPos();
		var cr = GameRules.calculateAttackResults(atkunit, defunit);
		
		//console.log(a.row + "," + a.col + " attacking: " + d.row + "," +d.col);
		
		atkunit.facing = GameRules.getDirection(a.row, a.col, d.row, d.col);
		defunit.facing = GameRules.getDirection(d.row, d.col, a.row, a.col);

		//Dismount infantry when attacked
		if (defunit.isMounted && !defunit.isSurprised && defunit.unitData(true).uclass == unitClass.infantry)
			defunit.unmount();
			
		atkunit.experience += cr.atkExpGained;
		defunit.experience += cr.defExpGained;

		if (!supportFire) atkunit.fire(true);
		else atkunit.fire(false);
		
		defunit.hit(cr.kills);
		
		if (cr.defcanfire && !supportFire) 
		{
			defunit.fire(false);
			atkunit.hit(cr.losses);
		}

		if (!supportFire)
			this.delAttackSel(); //delete attack selected hexes since unit has fired

		return cr;
	}

	this.updateUnitList = function()
	{
		//console.time("UpdateUnitList");
		for (var i = 0; i < unitList.length; i++)
		{
			if (unitList[i].destroyed)
			{
				var pos = unitList[i].getPos();
				if (pos)
				{
					GameRules.setZOCRange(this.map, unitList[i], false, this.rows, this.cols); //remove old ZOC
					GameRules.setSpotRange(this.map, unitList[i], false, this.rows, this.cols); //remove old spotting range
					this.map[pos.row][pos.col].delUnit(unitList[i]);

				}
				unitList.splice(i, 1);
				i--;
			}
			if (unitList[i] === null)
			{
				console.log("NULL UNIT at index %d", i);
				unitList.splice(i, 1);
				i--;
			}
		}
		//console.timeEnd("UpdateUnitList");
	}

	// moves a unit to a new hex returns a movementResults object
	this.moveUnit = function(unit, drow, dcol)
	{
		var s = unit.getPos();
		var srcHex = this.map[s.row][s.col];
		var player = unit.player;
		var side = player.side;
		var mr = new movementResults();
		var canCapture = GameRules.canCapture(unit);
		var c = GameRules.getShortestPath(s, new Cell(drow, dcol), moveSelected);
		var moveCost = c[0].cost;

		//Save unit properties for undoing move
		lastMove.clear();
		lastMove.savedUnit = new Unit(unit.eqid);
		lastMove.savedUnit.copy(unit);
		lastMove.savedUnit.setHex(unit.getHex());
		
		mr.passedCells.push(c[0]);
		for (var i = 1; i < c.length; i++)
		{
			if (!GameRules.canPassInto(this.map, unit, c[i]))
			{
				unit.isSurprised = true;
				mr.surpriseCell = c[i];
				break;
			}
			mr.passedCells.push(c[i]);
			moveCost += c[i].cost;
		}
		
		var lastCell = mr.passedCells[mr.passedCells.length - 1];
		var dstHex = this.map[lastCell.row][lastCell.col];

		//Only certain units ending on their destination can capture objectives
		if (lastCell.row == drow && lastCell.col == dcol)
		{
			if (canCapture && this.captureHex(dstHex, player))
				mr.isVictorySide = side;
		}

		if (!moveCost || moveCost < 0) //NaN from disembark that doesn't do cell costs
			moveCost = 0;

		unit.move(moveCost);
		GameRules.setZOCRange(this.map, unit, false, this.rows, this.cols); //remove old ZOC
		GameRules.setSpotRange(this.map, unit, false, this.rows, this.cols); //remove old spotting range
		srcHex.delUnit(unit);
		dstHex.setUnit(unit);
		unit.facing = GameRules.getDirection(s.row, s.col, lastCell.row, lastCell.col);
		GameRules.setZOCRange(this.map, unit, true, this.rows, this.cols); //set new ZOC
		var newSpotted = GameRules.setSpotRange(this.map, unit, true, this.rows, this.cols); //set new spotting range
		
		this.setMoveRange(unit); //if unit can still move put new range
		this.setAttackRange(unit) //Put new attack range
		
		//If the unit hasn't spotted new units or wasn't surprised allow undo
		if (newSpotted == 0 && !unit.isSurprised)
			lastMove.unit = unit;
		else
			lastMove.clear();

		return mr;
	}
	
	this.resupplyUnit = function(unit)
	{
		lastMove.unit = null; //Reset last move undo save
		var s = GameRules.getResupplyValue(this.map, unit);
		unit.resupply(s.ammo, s.fuel); //Supply doesn't cost prestige
		this.delAttackSel();
		this.delMoveSel();
	}
	
	this.reinforceUnit = function(unit)
	{
		lastMove.unit = null; //Reset last move undo save
		var str = GameRules.getReinforceValue(this.map, unit);
		var p = unit.player;
		if (!p.reinforceUnit(unit, str))
			return false;
			
		this.delAttackSel();
		this.delMoveSel();
		return true;
	}
	
	this.mountUnit = function(unit)
	{
		unit.mount();
		this.delMoveSel();
		this.delAttackSel();
		this.selectUnit(unit); //Select the unit again to have the move range adjusted
	}
	
	this.unmountUnit = function(unit)
	{
		this.delMoveSel();
		this.delAttackSel();
		unit.unmount();
		this.selectUnit(unit); //Select the unit again to have the move range adjusted
	}
	
	this.embarkUnit = function(unit)
	{
		var et = 0;
		if ((et = GameRules.getEmbarkType(this.map, unit)) > 0)
		{
			unit.player.airTransports--;
			unit.embark(et);
			return true;
		}
		return false;
	}

	this.disembarkUnit = function(unit)
	{
		var c = GameRules.getDisembarkPositions(this.map, unit);
		if (c.length <= 0)
			return false;

		this.delMoveSel();
		this.delAttackSel();
		for (var i = 0; i < c.length; i++)
		{
			moveSelected.push(c[i]);
			this.map[c[i].row][c[i].col].isMoveSel = true;
		}

		unit.disembark();

		return true;
	}

	this.upgradeUnit = function(id, upgradeid, transportid)
	{
		var unit = null;
		if ((unit = this.getUnitById(id)) == null)
			return false;
		var p = unit.player;
		if (!p.upgradeUnit(unit, upgradeid, transportid))
			return false;
		lastMove.unit = null; //Reset last move undo save
		unitImagesList[unit.eqid] = unit.getIcon();
		
		if (unit.transport !== null) //TODO change this.addUnit to handle upgrading
			unitImagesList[unit.transport.eqid] = unit.transport.icon;
		
		return true;
	}
	
	this.deployPlayerUnit = function(player, deployid, row, col)
	{
		if (!player) 
			return false;

		var cList = player.getCoreUnitList();

		if (deployid < 0 || deployid >= cList.length)
			return false;

		var u = cList[deployid];

		if (u === null || u.isDeployed)
			return false;

		var hex = this.map[row][col];
		
		if (GameRules.isAir(u) && hex.airunit !== null)
			return false;
		if (!GameRules.isAir(u) && hex.unit !== null)
			return false;

		hex.setUnit(u);
		this.addUnit(u);

		return true;
	}
	
	// selects a new unit as the current unit
	this.selectUnit = function(unit)
	{
		if (unit === null)
			return false;

		//Can't select units from other players
		if (unit.player.id != this.currentPlayer.id)
			return false;
			
		this.delCurrentUnit();
		this.delMoveSel();
		this.delAttackSel();
		this.setCurrentUnit(unit);
				
		if (!unit.hasMoved) 
			this.setMoveRange(unit); 
		if (!unit.hasFired) 
			this.setAttackRange(unit); 
		
		return true;
	}	

	//Builds a list of core units for a player. Only in campaign mode and only for the first scenario
	//if the units are standing on a deployment hex.
	this.buildCoreUnitList = function(player)
	{
		var i;
		for (i = 0; i < unitList.length; i++)
		{
			if (unitList[i].player.id == player.id)
			{
				if (unitList[i].getHex().isDeployment == player.id)
					player.addCoreUnit(unitList[i]);
			}
		}
	}

	//Restore a core unit list from a localStorage load, coreUnits has unit properties but no methods
	this.restoreCoreUnitList = function(player, coreUnits)
	{
		var i, u;
		//First look for units already deployed on map hexes and link them to core units if they are core
		for (i = 0; i < unitList.length; i++)
		{
			if (unitList[i].isCore && unitList[i].isDeployed)
				player.addCoreUnit(unitList[i]);
		}

		for (i = 0; i < coreUnits.length; i++)
		{
			if (!coreUnits[i].isDeployed) //Undeployed units must be recreated
			{
				u = new Unit(coreUnits[i].eqid);
				u.copy(coreUnits[i]); //Copy properties
				player.addCoreUnit(u);
				//Units will be added to the map with this.deployPlayerUnit()
			}
		}
	}

	//Remove units standing on deployment hexes in campaign mode for scenarios loaded after first scenario
	this.removeNonCampaignUnits = function(player)
	{
		var i, h, update = false;
		for (i = 0; i < unitList.length; i++)
		{
			if (unitList[i].player.id == player.id && !unitList[i].isCore) //Guard agains calls with deployed core units
			{
				h = unitList[i].getHex();
				if (h && h.isDeployment == player.id)
				{
					h.delUnit(unitList[i]);
					unitList[i].destroyed = true;
					update = true;
				}
			}
		}
		if (update)
			this.updateUnitList();
	}

	//Returns true if last movement of a unit can be undoed
	this.canUndoMove = function(unit)
	{
		if (lastMove.unit !== null && lastMove.unit.id == unit.id)
			return true;
		return false;
	}
	
	this.undoLastMove = function()
	{
		if (lastMove.unit == null)
			return;
		var unit = lastMove.unit;
		var sUnit = lastMove.savedUnit;
		var sCell = unit.getPos();
		var dCell = sUnit.getPos();
		var srcHex = this.map[sCell.row][sCell.col];
		var dstHex = this.map[dCell.row][dCell.col];
		
		unit.copy(sUnit); //restore unit properties to previous state
		GameRules.setZOCRange(this.map, unit, false, this.rows, this.cols); //remove old ZOC
		GameRules.setSpotRange(this.map, unit, false, this.rows, this.cols); //remove old spotting range
		srcHex.delUnit(unit);
		dstHex.setUnit(unit);
		GameRules.setZOCRange(this.map, unit, true, this.rows, this.cols); //set new ZOC
		GameRules.setSpotRange(this.map, unit, true, this.rows, this.cols); //set new spotting range
		this.selectUnit(unit);

		var currentPlayer = this.getPlayer(unit.player.id);

		//Restore srcHex properties
		srcHex.owner = lastMove.oldOwner;
		if (lastMove.oldFlag != -1)
		{
			srcHex.flag = lastMove.oldFlag;
		}

		if (lastMove.oldVictorySide != -1)
		{
			//remove from taken objectives
			var enemySide = ~currentPlayer.side & 1;
			this.updateVictorySides(enemySide, srcHex.getPos());
			srcHex.victorySide = lastMove.oldVictorySide;
		}


		currentPlayer.prestige -= lastMove.prestigeGain; //Remove any prestige gains
		lastMove.clear(); //Reset last move undo save
	}

	//Captures a hex objective returns true is capture results in a win for the player
	this.captureHex = function(hex, player)
	{
		var isWin = false;
		var prestigeGain = 0;
		if (hex.owner == -1) //Hex not owned by any player
			return false;

		var hexSide = this.getPlayer(hex.owner).side;
		if (hexSide == player.side)
			return false;

		lastMove.oldOwner = hex.owner;
		hex.owner = player.id;

		if (hex.flag != -1) //Secondary Objective
		{
			lastMove.oldFlag = hex.flag;
			hex.flag = player.country;

			if (hex.victorySide == -1) //Only if not a bigger objective
				prestigeGain += prestigeGains["flagCapture"];
		}

		if (hex.victorySide != -1) //Primary Objective
		{
			lastMove.oldVictorySide = hex.victorySide;
			hex.victorySide = ~player.side & 1; //set it as a victory objective for enemy side
			if (this.updateVictorySides(player.side, hex.getPos()))
				isWin = true;
			prestigeGain += prestigeGains["objectiveCapture"];

		}

		lastMove.prestigeGain = prestigeGain; //Save how much it earned
		player.prestige += prestigeGain;

		return isWin;
	}
	
	//Clone object / "copy constructor"
	this.copy = function(m)
	{
		if (m === null) return;
		this.rows = m.rows;
		this.cols = m.cols;
		this.terrainImage = m.terrainImage;
		this.name = m.name;
		this.turn = m.turn;
		this.maxTurns = m.maxTurns;
	
		this.allocMap();
	
		for (var r = 0; r < m.rows; r++)
		{
			for (var c = 0; c < m.cols; c++)
			{
				var h = m.map[r][c];
				var hex = this.map[r][c];
				hex.copy(h);
				
				if (h.unit !== null) 
				{
					var u = new Unit(h.unit.eqid);
					u.copy(h.unit);		
					hex.setUnit(u);
				}
				if (h.airunit !== null) 
				{
					var u = new Unit(h.airunit.eqid);
					u.copy(h.airunit);		
					hex.setUnit(u);
				}
				this.setHex(r, c);
			}
		}
		//Update sideVictoryHexes with values from the in-progress game not
		//the default ones set by setHex()
		this.sidesVictoryHexes = [[],[]];
		for (var i = 0; i < m.sidesVictoryHexes[0].length; i++)
			this.sidesVictoryHexes[0].push(m.sidesVictoryHexes[0][i]);
		for (var i = 0; i < m.sidesVictoryHexes[1].length; i++)
			this.sidesVictoryHexes[1].push(m.sidesVictoryHexes[1][i]);

		//Copy victoryTurns
		for (var i = 0; i < m.victoryTurns.length; i++)
			this.victoryTurns.push(m.victoryTurns[i]);
	}

	this.dumpMap = function()
	{
		/*
		var line = "\t ";
		var n = 0
		for(var h = 0; h < this.cols; h++)
		{
			if (h % 10 == 0) { n = 0; }
			
			line = line + " " + n + " ";
			n++;
		}
		console.log(line);
		for(var i = 0; i < this.rows; i++)
		{
			
			line = i + ":\t";
			for(var j = 0; j < this.cols; j++)
			{
				if (this.map[i][j] != null)
				{
					if (this.map[i][j].unit != null) { line += "  1"; } 
					else { line +="  0"; }	
				}
			}
			console.log(line);
		}
		*/
		for (var i = 0; i < playerList.length; i++)
		{
			console.log("Player: " + playerList[i].id + " Side:" + playerList[i].side 
						+ " Country: " + playerList[i].getCountryName()
						+ " Type: " + playerList[i].type);
		}
		
		console.log("Victory Hexes for " + sideNames[0] + " side: " + this.sidesVictoryHexes[0].length);
		console.log("Victory Hexes for " + sideNames[1] + " side:" + this.sidesVictoryHexes[1].length);
		console.log(this.sidesVictoryHexes[0]);
		console.log(this.sidesVictoryHexes[1]);
		/*
		for (var i = 0; i < unitImagesList.length; i++)
		{
			console.log(unitImagesList[i]);
		
		}
		for (var i = 0; i < unitList.length; i++)
		{
			console.log(unitList[i]);
		
		}
		*/
	}
	
	//Private

	//For saving changes made by last move of a unit
	var lastMove = 
	{
		unit: null, 		//Current unit properties
		savedUnit: null, 	//Old state unit properties (fuel, movesleft)
		oldOwner: -1,		//If changed owner of the hex
		oldFlag: -1,		//If changed a flag
		oldVictorySide: -1, 	//If an objective was captured
		prestigeGain: 0,	//If player got any prestige
		clear: function()
			{
				this.unit = this.savedUnit = null;
				this.oldVictorySide = this.oldOwner = this.oldFlag = -1;
				this.prestigeGains = 0;
			}
	};

	//Resets unit properties for a new turn
	function unitsEndTurn()
	{
		for (var i = 0; i < unitList.length; i++)
		{
			if (unitList[i] !== null) 
				unitList[i].unitEndTurn();
		}
	}
	
} // end Map class
