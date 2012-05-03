/**
 * Map - Provides map, unit and hex data structures
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

//Hex, Player and Map classes
function Player()
{
	this.id = -1;
	this.side = -1;
	this.country = -1;
	this.prestige = 0;
	this.playedTurn = -1;
	
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

function Hex(row, col)
{
	this.unit = null; //pointer to the unit on this hex
	this.terrain = terrainType.Clear;
	this.road = roadType.none;
	this.owner = -1;
	this.flag = -1;
	this.isSupply = false;
	this.isDeployment = false;
	this.victorySide = -1; //hex is a victory point for side [0,1]
	this.name = "";
	
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
	this.getPos = function() { return new Cell(r, c); }
	this.setUnit = function(unit) 
	{ 
		if (this.unit != null) 
			console.log("Overwriting unit"); 
		unit.setHex(this);
		this.unit = unit;
	}
	this.delUnit = function() 
	{
		this.unit.setHex(null); 
		this.unit = null;
	}
	this.log = function() { console.log(this); }
	
	//private
	var r = row;
	var c = col;
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
	this.currentSide = 0; //Which side is playing currently
	
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
				this.map[i][j] = new Hex(i, j);
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
		
		//Sets the player struct
		unit.player = this.getPlayer(unit.owner);
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
		if (hex.victorySide != -1) 
			this.sidesVictoryHexes[hex.victorySide]++; 
		if (hex.unit !== null) 
			this.addUnit(hex.unit);
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
			this.delMoveSel();
			this.delAttackSel();
			this.delCurrentHex();
			var p = this.getPlayers();
			for (var i = 0; i < p.length; i++)
			{	
				if (p[i].side == this.currentSide)
					p[i].playedTurn = this.turn;
			}
			this.currentSide = ~this.currentSide & 1;
			console.log("Side: " + this.currentSide);
			if (this.currentSide == 0)
			{
				this.turn++;
				resetUnits();
			}
	}
	
	//atkunit from srow, scol attacks defunit from drow, dcol
	this.attackUnit = function(atkunit, defunit)
	{
		var a = atkunit.getPos();
		var d = defunit.getPos();
		
		console.log(a.row + "," + a.col + " attacking: " + d.row + "," +d.col);
		atkunit.fire(true);
		defunit.fire(false);
		var cr = GameRules.calculateAttackResults(this.map, atkunit, defunit);
		//TODO do this better
		defunit.hit(cr.kills);
		atkunit.hit(cr.losses);
		
		atkunit.facing = GameRules.getDirection(a.row, a.col, d.row, d.col);
		defunit.facing = GameRules.getDirection(d.row, d.col, a.row, a.col);
		
		if (atkunit.destroyed) 
			this.map[a.row][a.col].delUnit();
			
		if (defunit.destroyed) 
			this.map[d.row][d.col].delUnit();
			
		this.updateUnitList();
		this.delAttackSel();
	}
	
	// moves a unit to a new hex returns side number if the move results in a win 
	// -1 otherwise
	this.moveUnit = function(unit, drow, dcol)
	{
		var s = unit.getPos();
		var srcHex = this.map[s.row][s.col];
		var dstHex = this.map[drow][dcol];
		var player = srcHex.unit.player;
		var side = player.side;
		var win = -1;
		if (dstHex.flag != -1) { dstHex.flag = player.country; }
		
		//Is a victory marked hex ?
		if (dstHex.victorySide != -1)
		{
			var enemyside = this.getPlayer(dstHex.owner).side;
			if (this.updateVictorySides(side, enemyside))
				win = side;
		}
		unit.move(GameRules.distance(s.row, s.col, drow, dcol));
		srcHex.delUnit();
		dstHex.setUnit(unit);
		dstHex.owner = unit.owner;
		unit.facing = GameRules.getDirection(s.row, s.col, drow, dcol);
		this.setAttackRange(drow, dcol) //Put new attack range
		
		return win;
	}
	
	this.resupplyUnit = function(unit)
	{
		var s = GameRules.getResupplyValue(this.map, unit);
		unit.resupply(s.ammo, s.fuel);
		this.delAttackSel();
		this.delMoveSel();
	}
	
	this.reinforceUnit = function(unit)
	{
		var str = GameRules.getReinforceValue(this.map, unit);
		unit.reinforce(str);
		this.delAttackSel();
		this.delMoveSel();
	}
	
	this.mountUnit = function(unit)
	{
		unit.mount();
		map.delCurrentHex();
		map.delMoveSel();
		map.delAttackSel();
		//TODO select new unit for new move range (needs row/col)
	}
	
	this.unmountUnit = function(unit)
	{
		map.delCurrentHex();
		map.delMoveSel();
		map.delAttackSel();
		unit.unmount();
		//TODO select new unit for new move range (needs row/col)
	}
	
	// selects a new unit as the current unit
	this.selectUnit = function(row, col)
	{
		var hex = this.map[row][col];
		
		if (hex.unit === null || hex.unit.player.side != this.currentSide)
			return;

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
				var hex = new Hex(r, c);
				hex.copy(h);
				if (h.unit !== null) 
				{
					u = new Unit(h.unit.id);
					u.copy(h.unit);
					hex.setUnit(u);
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
