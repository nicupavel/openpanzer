var terrainType = 
{
	Clear:0,
	City:1,
	Airfield:2,
	Forest:3,
	Bocage:4,
	Hill:5,
	Mountain:6,
	Sand:7,
	Swamp:8,
	Ocean:9,
	River:10,
	Fortification:11,
	Port:12,
	Stream:13,
	Escarpment:14,
	impassableRiver:15,
	Rough:16
};

var unitData =
{
	id: -1,
	type: unitType.none,
	maxAmmo:0,
	maxFuel:0,
	icon:"none.png",
	moveRadius:0,
	attackRadius:0,
	name:"noname",
};

function Unit(unitDataId)
{
	this.id = null;
	this.belongsTo = -1;
	this.unitData = equipment[unitDataId];
	this.hasMoved = false;
	this.hasFired = false;
	this.hasRessuplied = false;
	this.ammo = equipment[unitDataId].maxAmmo;
	this.fuel = equipment[unitDataId].maxFuel;
	this.strength = 10;
	
	this.setUnitToPlayer = function(playerId) { this.belongsTo = playerId; }
	this.getIcon = function() { var u = this.unitData; return u.icon; } //Why doesn't return this.unitData.icon work ?
	this.dumpUnit = function() { console.log(this);	}
};

function Hex()
{
	this.unit = null;
	this.terrain = terrainType.Clear;
	this.isSupply = false;
	this.isDeployment = false;
	this.isVictory1 = false;
	this.isVictory2 = false;
	this.isSelected = false; //flag for rendering the hex with appropiate color
	this.isCurrent = false;
	this.name = "map hex";
	
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
	
	this.newUnit = function(unitDataId) { this.unit = new Unit(unitDataId); }
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
	this.unitImagesList = [];
	this.currentHex = null;
	
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
	
	
	this.setHex = function(row, col, hex)
	{
		this.map[row][col].setHex(hex);
		if (hex.unit != null) { this.unitImagesList.push(hex.unit.getIcon()); }
	}
	
	this.setHexRange = function(row, col, range)
	{
		console.log("unit range:" + range);
		
		var minRow = row - range;
		var maxRow = row + range;
		if (minRow < 0) { minRow = 0; }
		if (maxRow > this.rows) { maxRow = this.rows; }
		
		//the column
		for (var i = minRow; i <= maxRow; i++)
		{
			if (i != row && (this.map[i][col].unit === null)) 
			{ 
				this.map[i][col].isSelected = true; 
			}
		}
		//the rows around
		for (var colOff = 1; colOff <= range; colOff++)
		{
			//rows have a ripple effect
			if ((col + colOff) % 2 == 1) { if (maxRow > 0) { maxRow--; }}
			else { if (minRow < this.rows) { minRow++; }}
			
			for (var i = minRow; i <= maxRow; i++)
			{
				//TODO add terrain factor
				if (((col + colOff) <= this.cols) && (this.map[i][col + colOff].unit === null))
				{ 
					this.map[i][col + colOff].isSelected = true; 
				}
				if (((col - colOff) >= 0) && (this.map[i][col - colOff].unit === null)) 
				{ 
					this.map[i][col - colOff].isSelected = true; 
				}
			}
		}
	
	}
	
	this.dumpMap = function()
	{
		for(var i = 0; i < this.rows; i++)
		{
			var line = i + ":\t";
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
		for (var i = 0; i < this.unitImagesList.length; i++)
		{
			console.log(this.unitImagesList[i]);
		
		}
	}
}

function mouseInfo(x, y, rclick)
{
	this.x = x;
	this.y = y;
	this.rclick = rclick;
}

function Cell(row, col)
{
	//Where the hex is in the map array
	this.row = row;
	this.col = col;
}
