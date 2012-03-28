// Unit, Hex, Player and Map classes
function Player(playerID)
{
	this.id = -1
	this.side = -1;
	this.country = -1;
	this.prestigeGain = 0;
	this.playedTurn = false;
	this.getCountryName = function() { return countryNames[this.country]; }
}

function Unit(unitDataId)
{
	if (typeof equipment[unitDataId] === 'undefined') { unitDataId = 1; }
	this.id = null;
	this.owner = -1;
	this.unitData = equipment[unitDataId];
	this.hasMoved = false;
	this.hasFired = false;
	this.hasRessuplied = false;
	this.ammo = equipment[unitDataId].ammo;
	this.fuel = equipment[unitDataId].fuel;
	this.strength = 10; //TODO read from scenario
	this.player = null; //TODO player struct pointer
	this.facing = 2; //default unit facing
	this.flag = this.owner; //default flag
	this.transport = -1 //equipment id of transport if any
	
	this.setUnitToPlayer = function(playerId) { this.owner = playerId; }
	this.getIcon = function() { var u = this.unitData; return u.icon; }
	this.resetUnit = function() { this.hasMoved = this.hasFired = this.hasRessuplied = false; }
	this.getTransport = function() { if (transport !== -1) { return equipment[transport];} }
	this.log = function() { console.log(this); }
	//TODO unit move, attack to take care of fuel, ammo and other properties
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
	
	this.isSelected = false; //flag for rendering the hex with appropiate color
	this.isCurrent = false;
	this.isMoveSel = false;
	this.isAtackSel = false;
	
	//Copy values
	this.setHex = function(hex) 
	{ 
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
	this.currentHex = null; //holds the current mouse selected hex
	this.unitImagesList = [];
	this.selectedHexes = [];
	
	var moveSelected = []; //selected hexes for current unit move destinations
	var attackSelected = []; //selected hexes for current unit attack destinations
	var unitList = []; //internal list of units
	var playerList = []; // players list
	var sidesVictoryHexes = [0, 0]; //Victory hexes for each side 
	
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
	
	this.resetUnits = function()
	{
		for (var i = 0; i < unitList.length; i++)
		{
			unitList[i].resetUnit();
		}
	}
	
	this.addUnit = function(unit)
	{
		unitList.push(unit);
	}

	this.addPlayer = function(player)
	{
		playerList.push(player);
	}
	
	this.getPlayer = function(id)
	{
		return playerList[id];
	}
	
	this.setCurrentHex = function(row, col)
	{
		this.currentHex = this.map[row][col];
		this.currentHex.isCurrent= true;
	}
	
	this.delCurrentHex = function()
	{
		if (this.currentHex !== null)
		{
			this.currentHex.isCurrent = false;
			this.currentHex = null;
		}
	}
	
	this.setSelected = function(row, col)
	{
		this.selectedHexes.push(new Cell(row, col));
		this.map[row][col].isSelected = true; 
	}
	
	this.delSelected = function()
	{
		for (var i = 0; i < this.selectedHexes.length; i++)
		{
			var c = this.selectedHexes[i];
			this.map[c.row][c.col].isSelected = false;
		}
		this.selectedHexes = [];
	}
	
	this.setHex = function(row, col, hex)
	{
		this.map[row][col].setHex(hex); //copy values
		if (hex.unit != null) { this.unitImagesList.push(hex.unit.getIcon()); }
		//Increment victorySides for each side
		if (hex.victorySide !== -1) { sidesVictoryHexes[hex.victorySide]++; }
	}
	
	//Simple increment/decrement
	this.updateVictorySides = function(side, enemySide)
	{
		//A side has ocuppied a victory hex that was marked as victory for it
		sidesVictoryHexes[side]--;
		sidesVictoryHexes[enemySide]++;
		console.log("Updated side victory hexes Side: " + side + " : " + sidesVictoryHexes[side] + " Side: " + enemySide + " : " + sidesVictoryHexes[enemySide]);
		
		if (sidesVictoryHexes[side] <= 0) 
		{ 
			console.log("Side: " + side + " WINS !");
			return true;
		}
		return false;
	}
	
	this.setMoveRange = function(row, col)
	{
		if (this.map[row][col].unit === null) {	return false; }
		
		var range = this.map[row][col].unit.unitData.movpoints;
		var cellList = GameRules.getCellsInRange(row, col, range, this.rows, this.cols);
		
		for (var i = 0; i < cellList.length; i++)
		{
			var cell = cellList[i];
			this.map[cell.row][cell.col].isMoveSel = true;
		}
		
		return true;
	}
	
	this.setAttackRange = function(row,col)
	{
		if (this.map[row][col].unit === null) {	return false; }
		
		var range = this.map[row][col].unit.unitData.movpoints;
		var cellList = GameRules.getCellsInRange(row, col, range, this.rows, this.cols);
		for (var i = 0; i < cellList.length; i++)
		{
			var cell = cellList[i];
			this.map[cell.row][cell.col].isAttackSel = true;
		}
	
		return true;
	}
	
	//TODO change to function to getHexesInRange() which should return an array of Cells 
	//and use this array in selecting moving or attacking range for a unit
	this.setHexRange = function(row, col, range)
	{
		console.log("unit range:" + range);
		var allowedCells = GameRules.getMoveRange(this.map, row, col, this.rows, this.cols);
		
		for (var i = 0; i < allowedCells.length; i++)
		{
			var cell = allowedCells[i];
			this.setSelected(cell.row, cell.col);
			
		}
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
			console.log("Player: " + playerList[i].id + " Side:" + playerList[i].side + " Country: " + playerList[i].getCountryName());
		}
		
		console.log("Victory Hexes for Side 0: " + sidesVictoryHexes[0] + " Victory Hexes for Side 1: " + sidesVictoryHexes[1]);
		/*
		for (var i = 0; i < this.unitImagesList.length; i++)
		{
			console.log(this.unitImagesList[i]);
		
		}
		for (var i = 0; i < this.unitImagesList.length; i++)
		{
			console.log(unitList[i]);
		
		}
		*/
	}
	
	//Private
	
} // end Map class
