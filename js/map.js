// Unit, Hex and Map classes
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
	this.strength = 10;
	
	this.setUnitToPlayer = function(playerId) { this.owner = playerId; }
	this.getIcon = function() { var u = this.unitData; return u.icon; }
	this.dumpUnit = function() { console.log(this);	}
	this.resetUnit = function() { this.hasMoved = this.hasFired = this.hasRessuplied = false; }
};

function Hex()
{
	this.unit = null;
	this.terrain = terrainType.Clear;
	this.road = roadType.none;
	this.owner = -1; //TODO this has to be set in maploader
	this.isSupply = false;
	this.isDeployment = false;
	this.isVictory1 = false;
	this.isVictory2 = false;
	this.isSelected = false; //flag for rendering the hex with appropiate color
	this.isCurrent = false;
	this.name = null;
	
	//Copy values
	this.setHex = function(hex) 
	{ 
		this.unit = hex.unit;
		this.terrain = hex.terrain;
		this.isSupply = hex.isSupply;
		this.isDeployment = hex.isDeployment;
		this.isVictory1 = hex.isVictory1;
		this.isVictory2 = hex.isVictory2;
		this.name = hex.name;
	}
	this.setUnit = function(unit) { this.unit = unit; }
	this.delUnit = function() {this.unit = null };
	
};

function Map()
{
	this.rows = 0;
	this.cols = 0;
	this.map = null;
	this.name = null;
	this.description = null; 
	this.terrainImage = null;
	this.currentHex = null;
	this.unitImagesList = [];
	this.selectedHexes = [];
	
	unitList = [];
	
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
		this.map[row][col].setHex(hex);
		if (hex.unit != null) { this.unitImagesList.push(hex.unit.getIcon()); }
	}
	//TODO change to function to getHexesInRange() which should return an array of Cells 
	//and use this array in selecting moving or attacking range for a unit
	this.setHexRange = function(row, col, range)
	{
		console.log("unit range:" + range);
		
		var minRow = row - range;
		var maxRow = row + range;
		if (minRow < 0) { minRow = 0; }
		if (maxRow > this.rows) { maxRow = this.rows; }
				
		//the column
		for (var i = minRow; i < maxRow; i++)
		{
			if ((i != row) && (this.map[i][col].unit === null)
				&& (this.map[i][col].terrain < terrainType.Swamp)) 
			{
				this.setSelected(i, col);
			}
		}
		//the rows around
		for (var colOff = 1; colOff < range; colOff++)
		{
			//rows have a ripple effect
			if ((col + colOff) % 2 == 1) { if (maxRow > 0) { maxRow--; }}
			else { if (minRow < this.rows) { minRow++; }}
			
			for (var i = minRow; i < maxRow; i++)
			{
				//TODO add terrain factor
				if (((col + colOff) < this.cols) && (this.map[i][col + colOff].unit === null)
				    && (this.map[i][col + colOff].terrain < terrainType.Swamp))
				{ 
					this.setSelected(i, col + colOff);
				}
				if (((col - colOff) > 0) && (this.map[i][col - colOff].unit === null)
					&& this.map[i][col - colOff].terrain < terrainType.Swamp) 
				{ 
					this.setSelected(i, col - colOff);
				}
			}
		}
	
	}
	
	this.dumpMap = function()
	{
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
}
