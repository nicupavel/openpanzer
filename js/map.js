/**
 * Map - Provides map, unit and hex data structures
 *
 * http://www.linuxconsulting.ro
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

// Unit, Hex, Player and Map classes
function Player()
{
	this.id = -1;
	this.side = -1;
	this.country = -1;
	this.prestige = 0;
	this.playedTurn = false;
	
	//Clone object
	this.copy = function(p)
	{
		if (p === null) return;
		this.id = p.id;
		this.side = p.side;
		this.country = p.country;
		this.prestige = p.prestige;
		this.playedTurn = p.playedTurn;
	}
	this.getCountryName = function() { return countryNames[this.country]; }
}

function Transport(unitDataId)
{
	this.id = unitDataId;
	this.ammo = equipment[unitDataId].ammo;
	this.fuel = equipment[unitDataId].fuel;
	//This is only used when building image cache list in map.js
	this.icon = equipment[unitDataId].icon;
	
	this.copy = function(t)
	{
		if (t === null) return;
		this.id = t.id;
		this.ammo = t.ammo;
		this.fuel = t.fuel;
	}
	
	this.resupply = function(ammo, fuel) 
	{
		this.ammo += ammo; 
		this.fuel += fuel;  
	}
}

function Unit(unitDataId)
{
	if (typeof equipment[unitDataId] === 'undefined') { unitDataId = 1; }
	this.id = unitDataId;
	this.owner = -1;
	this.hasMoved = false;
	this.hasFired = false;
	this.hasResupplied = false;
	this.hasReinforced = false;
	this.isMounted = false;
	this.ammo = equipment[unitDataId].ammo;
	this.fuel = equipment[unitDataId].fuel;
	this.strength = 10;
	this.facing = 2; //default unit facing
	this.flag = this.owner; //default flag
	this.destroyed = false; //flag to check if a unit is destroyed
	this.player = null; //TODO player struct pointer
	this.transport = null; //transport class pointer
	
	//Clone object
	this.copy = function(u) 
	{
		if (u === null) return;
		this.id = u.id;
		this.owner = u.owner;
		this.hasMoved = u.hasMoved;
		this.hasFired = u.hasFired;
		this.hasResupplied = u.hasResupplied;
		this.hasReinforced = u.hasReinforced;
		this.isMounted = u.isMounted;
		this.ammo = u.ammo;
		this.fuel = u.fuel;
		this.strength = u.strength;
		this.facing = u.facing;
		this.flag = u.flag;
		this.destroyed = u.destroyed;
		//Shallow copy 
		this.player = u.player;
		if (u.transport !== null)
		{
			this.transport = new Transport(u.transport.id);
			this.transport.copy(u.transport);
		}
	}
	
	this.unitData = function()
	{
		if ((this.isMounted) && (this.transport !== null))
			return equipment[this.transport.id]; 
		else
			return equipment[this.id]; 
	}
	
	this.hit = function(losses) 
	{ 
		this.strength -= losses; 
		if (this.strength <= 0) this.destroyed = true;
	}
	
	this.fire = function(isAttacking) 
	{
		this.ammo--; 
		if (isAttacking)
			this.hasFired = true;
	}
	this.move = function(dist) 
	{
		this.fuel -= dist; this.hasMoved = true;
		if (this.isMounted) this.hasFired = true;
	}
	
	this.resupply = function(ammo, fuel) 
	{
		if (this.isMounted)
		{
			this.transport.resupply(ammo, fuel);
		} 
		else 
		{
			this.ammo += ammo; 
			this.fuel += fuel;  
		}
		this.hasMoved = this.hasFired = this.hasResupplied = true;
	}
	
	this.reinforce = function(str) 
	{ 
		this.strength += str;  
		this.hasMoved = this.hasFired = this.hasReinforced = true; 
	}
	
	this.setTransport = function(id) 
	{ 
		//Create and set the transport properties to match it's unit
		this.transport = new Transport(id);
	}
	
	this.mount = function() { this.isMounted = true; }
	this.unmount = function() {	this.isMounted = false;	}
	this.setUnitToPlayer = function(playerId) { this.owner = playerId; }
	this.getIcon = function() { var u = this.unitData(); return u.icon; }
	this.resetUnit = function() 
	{ 
		this.hasMoved = this.hasFired = this.hasResupplied = this.hasReinforced = false; 
	}
	this.log = function() { console.log(this); }
};

function Hex()
{
	this.unit = null;
	this.terrain = terrainType.Clear;
	this.road = roadType.none;
	this.owner = -1;
	this.flag = -1;
	this.isSupply = false;
	this.isDeployment = false;
	this.victorySide = -1; //victory for which side
	this.name = null;
	
	this.isCurrent = false;
	this.isMoveSel = false; //current unit can move to this hex
	this.isAttackSel = false; //current unit can attack this hex
	
	//Clone object
	this.copy = function(hex) 
	{
		if (hex === null) return;
		this.unit = hex.unit;
		this.terrain = hex.terrain;
		this.road = hex.road;
		this.owner = hex.owner;
		this.flag = hex.flag;
		this.isSupply = hex.isSupply;
		this.isDeployment = hex.isDeployment;
		this.victorySide = hex.victorySide;
		this.name = hex.name;
	}
	
	this.setUnit = function(unit) { this.unit = unit; }
	this.delUnit = function() {this.unit = null };
	this.log = function() { console.log(this); }
};

function Map()
{
	this.rows = 0;
	this.cols = 0;
	this.map = null;
	this.name = null;
	this.description = null; 
	this.terrainImage = null;
	this.turn = 0;
	this.currentHex = new currentHexInfo(); //holds the current mouse selected hex and row, col pos //TODO find a better way
	this.sidesVictoryHexes = [0, 0]; //Victory hexes for each side 
	
	var unitImagesList = {}; //a "hash" of unique unit images used for caching
	var moveSelected = []; //selected hexes for current unit move destinations
	var attackSelected = []; //selected hexes for current unit attack destinations
	var unitList = []; //internal list of units
	var playerList = []; // players list
	
	this.allocMap = function()
	{
		this.map = new Array(this.rows);
		for(var i = 0; i < this.rows; i++)
		{
			this.map[i] = new Array(this.cols);
			for(var j = 0; j < this.cols; j++)
			{
				this.map[i][j] = new Hex();
			}
		}
	}
	
	//Checks for destroyed units and remove them from list
	this.updateUnitList = function()
	{
		for (var i = 0; i < unitList.length; i++)
		{
			if (unitList[i] !== null && unitList[i].destroyed) 
				unitList.splice(i, 1);
		}
	}
	
	this.addUnit = function(unit) 
	{
		unitList.push(unit); 
		unitImagesList[unit.id] = unit.getIcon();
		
		if (unit.transport !== null)
			unitImagesList[unit.transport.id] = unit.transport.icon;
	}
	
	this.getUnits = function() { return unitList; }
	this.getUnitImagesList = function() { return unitImagesList; }
	this.addPlayer = function(player) { playerList.push(player); }
	this.getPlayers = function() { return playerList; }
	this.getPlayer = function(id) 
	{ 
		if (id < playerList.length)
			return playerList[id]; 
		else
			return playerList[0]; //TODO parse supporting countries from the scenario file
	}
	
	
	this.setCurrentHex = function(row, col)
	{
		this.currentHex.hex = this.map[row][col];
		this.currentHex.hex.isCurrent = true;
		this.currentHex.row = row;
		this.currentHex.col = col;
	}
	
	this.delCurrentHex = function()
	{
		if (this.currentHex.hex !== null)
		{
			this.currentHex.hex.isCurrent = false;
			this.currentHex.hex = null;
		}
	}
	
	this.setMoveSel = function(row, col)
	{
		moveSelected.push(new Cell(row, col));
		this.map[row][col].isMoveSel = true; 
	}
	
	this.setAttackSel = function(row, col)
	{
		attackSelected.push(new Cell(row, col));
		this.map[row][col].isAttackSel = true; 
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
		this.map[row][col].copy(hex); //copy values
		//Increment victorySides for each side
		if (hex.victorySide !== -1) { this.sidesVictoryHexes[hex.victorySide]++; }
	}
	
	//Simple increment/decrement
	this.updateVictorySides = function(side, enemySide)
	{
		//A side has ocuppied a victory hex that was marked as victory for it
		this.sidesVictoryHexes[side]--;
		this.sidesVictoryHexes[enemySide]++;
		console.log("Updated side victory hexes Side: " + side + " : " 
					+ this.sidesVictoryHexes[side] + " Side: " + enemySide 
					+ " : " + this.sidesVictoryHexes[enemySide]);
		
		if (this.sidesVictoryHexes[side] <= 0) 
		{ 
			console.log("Side: " + side + " WINS !");
			return true;
		}
		return false;
	}
	
	this.setMoveRange = function(row, col)
	{
		this.delMoveSel();
		var allowedCells = GameRules.getMoveRange(this.map, row, col, this.rows, this.cols);
		
		for (var i = 0; i < allowedCells.length; i++)
		{
			var cell = allowedCells[i];
			this.setMoveSel(cell.row, cell.col);
		}
	}
	
	this.setAttackRange = function(row, col)
	{
		this.delAttackSel();
		var allowedCells = GameRules.getAttackRange(this.map, row, col, this.rows, this.cols);
		for (var i = 0; i < allowedCells.length; i++)
		{
			var cell = allowedCells[i];
			this.setAttackSel(cell.row, cell.col);
		}
	}
	
	this.endTurn = function()
	{
			//TODO create a Game Class
			resetUnits();
			this.delMoveSel();
			this.delAttackSel();
			this.delCurrentHex();
			this.turn++;
	}
	
	//atkunit from srow, scol attacks defunit from drow, dcol
	this.attackUnit = function(atkunit, srow, scol, defunit, drow, dcol)
	{
		console.log("attacking: " + drow + "," +dcol);
		atkunit.fire(true);
		defunit.fire(false);
		var cr = GameRules.calculateAttackResults(atkunit, srow, scol, defunit, drow, dcol);
		//TODO do this better
		defunit.hit(cr.kills)
		atkunit.hit(cr.losses);
		if (atkunit.destroyed) 
			this.map[srow][scol].delUnit();
			
		if (defunit.destroyed) 
			this.map[drow][dcol].delUnit();
			
		this.updateUnitList();
		this.delAttackSel();
	
	}
	
	// moves a unit to a new hex returns side number if the move results in a win 
	// -1 otherwise
	this.moveUnit = function(unit, srow, scol, drow, dcol)
	{
		var srcHex = this.map[srow][scol];
		var dstHex = this.map[drow][dcol];
		var player = this.getPlayer(srcHex.unit.owner)
		var side = player.side;	
		var win = -1;
		if (dstHex.flag !== -1) { dstHex.flag = player.country; }
		
		//Is a victory marked hex ?
		if (dstHex.victorySide !== -1)
		{
			var enemyside = this.getPlayer(dstHex.owner).side;
			if (this.updateVictorySides(side, enemyside))
				win = side;
		}
		unit.move(1); //TODO use GameRules.distance
		dstHex.setUnit(unit);
		dstHex.owner = unit.owner;
		srcHex.delUnit();
		this.setAttackRange(drow, dcol) //Put new attack range
		
		return win;
	}
	
	this.resupplyUnit = function(unit)
	{
		s = GameRules.getResupplyValue(unit);
		unit.resupply(s.ammo, s.fuel);
	}
	
	this.reinforceUnit = function(unit)
	{
		var str = GameRules.getReinforceValue(unit);
		unit.reinforce(str);
	}
	
	this.mountUnit = function(unit)
	{
		if (GameRules.canMount(unit))
			unit.mount();
	}
	this.unmountUnit = function(unit)
	{
		if (unit.isMounted)
			unit.unmount();
	}
	// selects a new unit as the current unit
	this.selectUnit = function(row, col)
	{
		var hex = this.map[row][col];
		
		this.delCurrentHex();
		this.setCurrentHex(row, col);
		this.delMoveSel();
		this.delAttackSel();
		
		if (!hex.unit.hasMoved) 
			this.setMoveRange(row, col); 
		if (!hex.unit.hasFired) 
			this.setAttackRange(row, col); 
	}	
	//Clone object / "copy constructor"
	this.copy = function(m)
	{
		if (m === null) return;
		this.rows = m.rows;
		this.cols = m.cols;
		this.description = m.description;
		this.terrainImage = m.terrainImage;
		this.name = m.name;
		this.turn = m.turn;
	
		this.allocMap();
	
		for (r = 0; r < m.rows; r++)
		{
			for (c = 0; c < m.cols; c++)
			{
				var h = m.map[r][c];
				var hex = new Hex();
				hex.copy(h);
				if (h.unit !== null) 
				{
					u = new Unit(h.unit.id);
					u.copy(h.unit);
					hex.setUnit(u);
					this.addUnit(u);
				}
				this.setHex(r, c, hex);
			}
		}
		//update sideVictoryHexes with in progress values after setHex 
		//calls setup the default map victory hex values
		for (var i = 0; i < m.sidesVictoryHexes.length; i++)
			this.sidesVictoryHexes[i] = m.sidesVictoryHexes[i];
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
						+ " Country: " + playerList[i].getCountryName());
		}
		
		console.log("Victory Hexes for Side 0: " +  this.sidesVictoryHexes[0] 
					+ " Victory Hexes for Side 1: " + this.sidesVictoryHexes[1]);
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
	//Resets hasFired, hasMoved, hasRessuplied 
	function resetUnits()
	{
		for (var i = 0; i < unitList.length; i++)
		{
			if (unitList[i] !== null) 
				unitList[i].resetUnit();
		}
	}
	
} // end Map class
