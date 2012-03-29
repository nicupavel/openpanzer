//Game rules 
var GameRules = GameRules || {}; //Namespace emulation

//returns a cell list with hexes that a unit @ row,col can move to
GameRules.getMoveRange = function(map, row, col, mrows, mcols)
{
	var allowedCells = [];
	var unit = map[row][col].unit;
	
	if (unit === null || unit.hasMoved) 
	{
		return allowedCells;
	}
	var range = unit.unitData.movpoints;
	console.log("move range: "+ range);
	var cellList = getCellsInRange(row, col, range, mrows, mcols);
	for (var i = 0; i < cellList.length; i++)
	{
		var cell = cellList[i];
		if (canMoveInto(unit, map[cell.row][cell.col]))
		{
			allowedCells.push(cell);
		}
	}
	return allowedCells;
}

GameRules.getAttackRange = function(map, row, col, mrows, mcols)
{
	var allowedCells = [];
	var unit = map[row][col].unit;
	
	if (unit === null || unit.hasFired) 
	{
		return allowedCells;
	}
	//TODO weather ?
	var range = unit.unitData.gunrange;
	
	if (range == 0)	range = 1;
		
	console.log("attack range: "+ range);
	var cellList = getCellsInRange(row, col, range, mrows, mcols);
	for (var i = 0; i < cellList.length; i++)
	{
		var cell = cellList[i];
		if (canAttack(unit, map[cell.row][cell.col].unit))
		{
			allowedCells.push(cell);
		}
	}
	return allowedCells;
}

//aUnit from position aUnitPos attacks tUnit from tUnitPos
//TODO dig the actual formula (how many pages it is ?) 
//prolly depends on: weather, terrain, adjacent units (arty), initiative, fuel, ammo
//experience, ranged defense modified, entrechment, unit strength etc ...
GameRules.calculateAttackResults = function(aUnit, arow, acol, tUnit, trow, tcol)
{
	var cr = new combatResults();

	var d = distance(arow, acol, trow, tcol); //distance between units
	var at = aUnit.unitData.target;
	var tt = tUnit.unitData.target;
	var aav = 0;
	var adv = 0;
	var tav = 0;
	var tdv = 0;
	//Attacking unit type
	switch(at)
	{
		case targetType.air:
		{
			tav = tUnit.unitData.airatk;
			tdv = tUnit.unitData.airdef;
			break;
		}
		case targetType.soft:
		{
			tav = tUnit.unitData.softatk;
			tdv = tUnit.unitData.grounddef;
			break;
		}
		case targetType.hard:
		{
			tav = tUnit.unitData.hardatk;
			tdv = tUnit.unitData.grounddef;
			break;
		}
	}
	
	switch(tt)
	{
		case targetType.air:
		{
			
			aav = aUnit.unitData.airatk;
			adv = aUnit.unitData.airdef;
			break;
		}
		case targetType.soft:
		{
			aav = aUnit.unitData.softatk;
			adv = aUnit.unitData.grounddef;
			break;
		}
		case targetType.hard:
		{
			aav = aUnit.unitData.hardatk;
			adv = aUnit.unitData.grounddef;
			break;
		}
	}
	
	cr.kills = Math.round(aUnit.strength * (aav - tdv)/10);
	if (cr.kills <= 0 ) cr.kills = 1;
	//if distance between units > 1 means that target unit can fight back //TODO check if always true
	if (d <= 1)
	{
		cr.losses = Math.round(tUnit.strength * (tav - adv)/10);
		if (cr.losses <= 0) cr.losses = 1;
	}
	
	return cr;
}

function canAttack(unit, targetUnit)
{
	if (targetUnit === null)
		return false;
	if (unit.owner === targetUnit.owner)
		return false;
	
	return true;
}
//Checks if a given unit can move into a hex
//TODO return the cost of moving into a hex depending on terrain
function canMoveInto(unit, hex)
{
	if (isGround(unit))
	{
		if (hex.unit !== null) 
		{ 
			return false 
		};
		if ((hex.terrain >= terrainType.Mountain) && 
		   (hex.terrain != terrainType.Sand) && 
		   (hex.terrain != terrainType.River) && 
		   (hex.terrain != terrainType.Rough))
		{
			return false;
		}
		//TODO adjacently units zone of control ?
		return true;
	}
	
	if (isAir(unit))
	{
		return true;
	}
	
	if (isSea(unit))
	{
		if (hex.unit !== null) 
		{ 
			return false 
		};
		if ((hex.terrain != terrainType.Ocean) && (hex.terrain != terrainType.Port))
		{
			return false;
		}
		return true;
	}
	
	return false;
}

function isAir(unit)
{
	if (unit.unitData.movmethod === 5) { return true; }
	return false;
}

function isSea(unit)
{
	if((unit.unitData.movmethod === 6) ||
	   (unit.unitData.movmethod === 10))
	{ 
		return true; 
	}
	
	return false;
}

function isGround(unit)
{
	if ((unit.unitData.movmethod < 5) ||
	    (unit.unitData.movmethod === 8) ||
	    (unit.unitData.movmethod === 9))
	{
		return true;
	}
}

//Returns the distance between 2 hexes
//TODO replace with bitops
function distance(x1, y1, x2, y2)
{
	var d = 0;
	//shift the entire hexgrid to be arranged diagonally
	if (y1 % 2)	{ x1 = x1 * 2 + 1;	}
	else { 	x1 = x1 * 2; }
	
	if (y2 % 2) { x2 = x2 * 2 + 1;	}
	else { x2 = x2 * 2; }
	
	var dx = Math.abs(x2-x1);
	var dy = Math.abs(y2-y1);
	
	if (dx > dy) { d = parseInt((dx - dy)/2) + dy; }
	else { d = dy } 

	return d;
}

//Returns a list of cells that are in a certain range to another cell
//TODO Fix this function to work when the cell is near the margins (selection is wrong)
function getCellsInRange(row, col, range, mrows, mcols)
{
	var cellList = [];
	var cell = null;
	var minRow = row - range;
	var maxRow = row + range;
	if (minRow < 0) { minRow = 0; }
	if (maxRow >= mrows) { maxRow = mrows-1; }

	//the column
	for (var i = minRow; i <= maxRow; i++)
	{
		if (i != row) 
		{ 
			cell = new Cell(i, col); 
			cellList.push(cell);
		}
	}
	//the rows around
	for (var colOff = 1; colOff <= range; colOff++)
	{
		//rows have a ripple effect
		if ((col + colOff) % 2 == 1) 
		{ 
			if (maxRow > 0) { maxRow--; }
		}
		else 
		{ 
			if (minRow < mrows) { minRow++; }
		}
		for (var i = minRow; i <= maxRow; i++)
		{
			if ((col + colOff) < mcols) 
			{
				cell = new Cell(i, col + colOff);
				cellList.push(cell);
			}
			
			if ((col - colOff) > 0) 
			{ 
				cell = new Cell(i, col - colOff);
				cellList.push(cell);
			}
		}
	}
	return cellList;
}
