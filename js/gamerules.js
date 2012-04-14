/**
 * GameRules - Provides basic rules for HTML5 PG2
 *
 * http://www.linuxconsulting.ro
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

var GameRules = GameRules || {}; //Namespace emulation

//returns a cell list with hexes that a unit @ row,col can move to
GameRules.getMoveRange = function(map, row, col, mrows, mcols)
{
	var allowedCells = [];
	var unit = map[row][col].unit;
	
	if (unit === null || unit.hasMoved) return allowedCells;
	
	var range = unit.unitData.movpoints;
	if (range == 0) range = 1; //TODO temporary for the towed units to move
	//if (range > unit.fuel) range = unit.fuel; //TODO check unit type if needs fuel to move
	
	console.log("move range: " + range);
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
	
	if (unit === null || unit.hasFired || unit.ammo <= 0) return allowedCells; 
	
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
		case unitType.air:
		{
			tav = tUnit.unitData.airatk;
			tdv = tUnit.unitData.airdef;
			break;
		}
		case unitType.soft:
		{
			tav = tUnit.unitData.softatk;
			tdv = tUnit.unitData.grounddef;
			break;
		}
		case unitType.hard:
		{
			tav = tUnit.unitData.hardatk;
			tdv = tUnit.unitData.grounddef;
			break;
		}
	}
	
	switch(tt)
	{
		case unitType.air:
		{
			
			aav = aUnit.unitData.airatk;
			adv = aUnit.unitData.airdef;
			break;
		}
		case unitType.soft:
		{
			aav = aUnit.unitData.softatk;
			adv = aUnit.unitData.grounddef;
			break;
		}
		case unitType.hard:
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
		if (cr.losses < 0) cr.losses = 0;
	}
	
	return cr;
}

//TODO Terrain, Unit type and adjacent units 
GameRules.getResupplyValue = function(unit)
{
	if (!canResupply(unit)) return 0, 0;
	var ammo = unit.unitData.ammo - unit.ammo;
	var fuel = unit.unitData.fuel - unit.fuel;
	if (fuel < 0) fuel = 0; //TODO temp fix for leg/towed movement
	
	console.log(unit.unitData.ammo + " " + unit.ammo + " " + ammo + " " +  fuel);
	return new Supply(ammo, fuel);
}

//TODO Terrain, Unit type and adjacent units 
GameRules.getReinforceValue = function(unit)
{
	if (!canReinforce(unit)) return 0;
	var strength = 10 - unit.strength;
	
	return strength;
}

function canAttack(unit, targetUnit)
{
	if (unit.ammo === 0)
		return false;
	if (targetUnit === null)
		return false;
	if (unit.owner === targetUnit.owner)
		return false;
	if (unit.unitData.airatk == 0 && isAir(targetUnit)) //TODO There is a special bit for this.
		return false;
		
	return true;
}
//Checks if a given unit can move into a hex
//TODO return the cost of moving into a hex depending on terrain
//TODO Air units can move over ground units
function canMoveInto(unit, hex)
{
	if (hex.unit !== null) 	return false;
	
	if (isGround(unit))
	{
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
		if ((hex.terrain != terrainType.Ocean) && (hex.terrain != terrainType.Port))
		{
			return false;
		}
		return true;
	}
	return false;
}

function canResupply(unit)
{
	if (unit.hasMoved)
		return false;
	if (unit.hasFired)
		return false;
	if (unit.hasResupplied)
		return false;
	if (unit.hasReinforced)
		return false;
	if ((unit.fuel == unit.unitData.fuel) &&
		(unit.ammo == unit.unitData.ammo))
		return false;
		
	return true;
}
GameRules.canResupply = function(unit) { return canResupply(unit);}

function canReinforce(unit)
{
	if (unit.hasMoved)
		return false;
	if (unit.hasFired)
		return false;
	if (unit.hasResupplied)
		return false;
	if (unit.hasReinforced)
		return false;
	if (unit.strength >= 10)
		return false;
		
	return true;
}
GameRules.canReinforce = function(unit) { return canReinforce(unit);}

function canMount(unit)
{
	if (isGround(unit) && unit.transport !== -1)
		return true;
		
	return false;
}
GameRules.canMount = function(unit) { return canMount(unit);}

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
	
	if ( range <= 0) return cellList;
	
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
