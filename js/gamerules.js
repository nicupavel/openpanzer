/**
 * GameRules - Provides basic rules for HTML5 PG2
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

//var GameRules = GameRules || {}; //Namespace emulation
var GameRules = (function(GameRules) { //Module start

//returns a cell list with hexes that a unit @ row,col can move to
//Works by computing cost of ajacent hexes by range expanding from 0 to unit movpoints
//cin is the cost of entering the current hex which is equal to  the cost of exiting from 
//the hex with a range smaller by 1 than the current hex
//cout cost of exiting a hex which is cin + terrain movement cost
//each time a hex with cout smaller that adjacent hexes cout the adjacent hexes are updated 
//with the new cost
GameRules.getMoveRange = function(map, unit, rows, cols)
{
	var r = 0;
	var hex = null;
	var allowedCells = [];
		
	if (unit === null || unit.hasMoved) return [];
	
	var p = unit.getPos();
	var ud = unit.unitData();
	var range = GameRules.getUnitMoveRange(unit);
	var movmethod = ud.movmethod;
	var moveCost = movTable[movmethod];
	var side = unit.player.side;
	var enemySide = ~side & 1;
	
	//console.log("move range:" + range);
	var c = getCellsInRange(p.row, p.col, range, rows, cols);
	
	//Don't calculate costs for air units
	if (isAir(unit))
	{
		for (var i = 0; i < c.length; i++)
		{
			hex = map[c[i].row][c[i].col];
			if (hex.isSpotted(side) && !canMoveInto(map, unit, c[i])) //TODO tempSpotted
				continue;
			c[i].canMove = true;
			c[i].cost = 1; //No Terrain cost for air
			allowedCells.push(c[i]);
		}
		return allowedCells;
	}
	
	//Add current unit cell as starting point for cost calculations
	c.push(new extendedCell(p.row, p.col)); 

	while (r <= range)
	{
		for (i = 0; i < c.length; i++)
		{
			if (c[i].range == r)
			{
				//console.log("Checking for Row:"+ c[i].row + " Col:" + c[i].col + " range: " + c[i].range + " at range: " + r);
				for (var j = 0; j < c.length; j++) //Look up adjacent cells for c[i]
				{
					if (c[j].range < r) continue; //Not always true, there might be a path to reach a hex by turning back
					if (isAdjacent(c[i].row, c[i].col, c[j].row, c[j].col))
					{
						hex = map[c[j].row][c[j].col];
						
						if (hex.road > roadType.none) 
							c[j].cost = moveCost[17]; //Road entry in movement table
						else
							c[j].cost = moveCost[hex.terrain];
						
						//enemy unit zone of control ? no ZOC for air units 
						if (hex.isSpotted(side) && hex.isZOC(enemySide) && c[j].cost < 254) //TODO tempSpotted
							c[j].cost = 254; //stop movement
						
						if (c[j].cin == 0) c[j].cin = c[i].cout;
						if (c[j].cout == 0) c[j].cout = c[j].cin + c[j].cost;
						if (c[j].cin > c[i].cout && c[j].cost <= 254) //Is reachable from another path
						{
							c[j].cin = c[i].cout;
							c[j].cout = c[j].cin + c[j].cost;
						}
						//console.log("\t Hex at Row:" + c[j].row + " Col:" + c[j].col + " RANGE:" + c[j].range + " CIN:" + c[j].cin + " COUT:" + c[j].cout + " COST:" + c[j].cost);
						if ((c[j].cout <= range) || ((c[j].cost <= 254) && (c[j].cin <= range))) 
						{
							if (canPassInto(map, unit, c[j])) 
								c[j].canPass = true; //To allow friendly units pass thru this hex
							if (hex.isSpotted(side) && !canMoveInto(map, unit, c[j]))
								continue;	
							c[j].canMove = true; //To allow unit to move in this hex
						}
					}
				}
			}
		}
		r++;
	}

	for (i = 0; i < c.length; i++)
		if (c[i].canPass || c[i].canMove)
			allowedCells.push(c[i]);

	return allowedCells;
}

//Return a unit maximum move range without considering terrain
GameRules.getUnitMoveRange = function(unit)
{
	var range = unit.getMovesLeft();
	var ud = unit.unitData();

	if (GameRules.unitUsesFuel(unit) && (unit.getFuel() < range)) 
		range = unit.getFuel();

	//Towed units with no transport should be able to move at 1 range(looks like forts are towed too)
	if ((ud.movmethod == movMethod.towed) && (unit.transport === null)
		&& (range == 0) && (ud.uclass != unitClass.fortification))
	{
		range = 1;
	}

	return range;
}

//Returns the map cells with units that can be attacked by a unit
GameRules.getUnitAttackCells = function(map, unit, rows, cols)
{
	var allowedCells = [];
	var target = null;

	if (unit === null || unit.hasFired || unit.getAmmo() <= 0) return []; 
	var p = unit.getPos();

	//TODO weather ?
	var side = unit.player.side;
	var range = GameRules.getUnitAttackRange(unit);

	//console.log("attack range: "+ range);
	var cellList = getCellsInRange(p.row, p.col, range, rows, cols);
	
	//can attack the target under/above for airdefense/airplane
	cellList.push(new Cell(p.row, p.col)); 
	
	for (var i = 0; i < cellList.length; i++)
	{
		var cell = cellList[i];
		var hex = map[cell.row][cell.col];

		if ((target = hex.getAttackableUnit(unit, 0)) !== null) //Can attack the ground unit on this hex?
		{
			if (GameRules.isAir(unit) && range <= 1) //Air can only attack non Air unit below
			{
				if (p.row == cell.row && p.col == cell.col)
					allowedCells.push(cell);
			}
			else
			{
				allowedCells.push(cell);
				continue; //don't push same cell twice below
			}
		}

		if ((target = hex.getAttackableUnit(unit, 1)) !== null) //Can attack the air unit on this hex ?
		{
			if (GameRules.isAir(unit)) //Air can attack air units on adjacent hexes
			{
				if (GameRules.isAir(target))
					allowedCells.push(cell);
			}
			else
			{
				allowedCells.push(cell);
			}
		}
	}
	return allowedCells;
}

GameRules.getUnitAttackRange = function(unit)
{
	var range = unit.unitData().gunrange;
	if (range == 0) range = 1;

	return range;
}

//set zone of control on unit adjacent hexes
GameRules.setZOCRange = function(map, unit, on, mrows, mcols)
{
	if (!unit || isAir(unit)) return;
	
	var p = unit.getPos();

	if (!p) return;

	var side = unit.player.side;
	var r, c;
	var adj =  getAdjacent(p.row, p.col);

	for (var i in adj)
	{
		r = adj[i].row;
		c = adj[i].col;
		if (r >= mrows || r < 0) continue;
		if (c >= mcols || c < 0) continue;
		
		//console.log("zoc [" + r + "][" + c +"] set to:" + on + " for side: " + side);
		map[r][c].setZOC(side, on);
	}
}

//Sets spotting range for a unit returns number of new units spotted
GameRules.setSpotRange = function(map, unit, on, mrows, mcols)
{
	if (!unit) return 0;
	
	var p = unit.getPos();

	if (!p) return;

	var side = unit.player.side;
	var range = unit.unitData().spotrange;
	var r, c;
	var newlySpottedUnits = 0;
	var cells = getCellsInRange(p.row, p.col, range, mrows, mcols);
	//Add current unit cell too as spotted
	cells.push(new Cell(p.row, p.col)); 
	
	for (var i in cells)
	{
		r = cells[i].row;
		c = cells[i].col;
		//console.log("spot [" + r + "][" + c +"] set to:" + on + " for side: " + side);
		//Check for a previously hidden unit
		if (on && !map[r][c].isSpotted(side))
		{
			var sUnit = map[r][c].getUnit(false);
			if (sUnit && sUnit.player.side != side)
				newlySpottedUnits++;
		}
		map[r][c].setSpotted(side, on);
	}
	
	return newlySpottedUnits;
}

GameRules.getShortestPath = function(startCell, endCell, cellList)
{
	var pCells = [];
	var visitedCells = []; 
	var shortestPath = [];
	var minDistCell = null;
	var idx = 0;

	//add starting cell
	var psCell = new pathCell(startCell);
	psCell.dist = 0;
	psCell.prev = psCell;
	pCells.push(psCell);

	//add the rest of cells as pathCells into list
	for (var i = 0; i < cellList.length; i++)
	{
		var pc = new pathCell(cellList[i]);
		pc.cost = cellList[i].cost;
		pCells.push(pc);
	}

	//console.log("Looking for endpoint: ["+endCell.row+","+endCell.col+"]");
	while (pCells.length > 0)
	{
		idx = 0;
		minDistCell = pCells[0];
		for (var i = 1; i < pCells.length; i++)
		{
			if (pCells[i].dist != Infinity && pCells[i].dist <= minDistCell.dist)
			{
				//console.log("Found cell with dist: " + pCells[i].dist);
				minDistCell = pCells[i];
				idx = i;
			}
		}
		if (minDistCell.dist == Infinity)
			return []; //No path
			
		//console.log("Node: ["+minDistCell.row+","+minDistCell.col+"] Dist: " + minDistCell.dist);
		for (var i = 0; i < pCells.length; i++)
		{
			if (isAdjacent(minDistCell.row, minDistCell.col, pCells[i].row, pCells[i].col))
			{
				//Add terrain cost to calculations (can use +1 instead for direct but incorect paths)
				if (pCells[i].dist == Infinity || (minDistCell.dist + minDistCell.cost) < pCells[i].dist)
				{
					pCells[i].dist = minDistCell.dist + minDistCell.cost;
					pCells[i].prev = minDistCell;
					//console.log("\tAdjacent cell: [" + pCells[i].row + "," + pCells[i].col + "] Dist:"
					//			+ pCells[i].dist + " Prev: [" + minDistCell.row + "," + minDistCell.col + "]");
				}
			}
		}
		
		if (minDistCell.row == endCell.row && minDistCell.col == endCell.col)
		{
			var t = minDistCell;
			//console.log("Found shortest path from ["+ startCell.row +","+startCell.col+"] to "
			//		+ "["+ t.row +","+t.col+"] Hops:" + t.dist);
			while(true)
			{
				//console.log("["+t.row+","+t.col+"]");
				shortestPath.unshift(t); //add on top
				if ((t.row == startCell.row) && (t.col == startCell.col))
					break;
					
				if (t.prev !== null || typeof t !== "undefined")
					t = t.prev;
				else
					break;
			}	
			return shortestPath;
		}

		//console.log("Removing: ["+minDistCell.row+","+minDistCell.col+"] from list Prev: [" 
		//			+ minDistCell.prev.row + "," + minDistCell.prev.col + "]");
		visitedCells.push(pCells[idx]); //Just to keep reference going //TODO better way
		pCells.splice(idx, 1);
	}
	
	return [];
}

//This function calculates the kill/losses for all units involved in combat
GameRules.calculateCombatResults = function(atkunit, defunit, unitlist, withHiddenUnits)
{
	var supportUnits = [];
	var realLosses = 0;
	var realKills = 0;
	var evalLosses = 0;
	var evalKills = 0;
	var side = atkunit.player.side;
	var cr;
	
	if (!atkunit.isSurprised)
		supportUnits = GameRules.getSupportFireUnits(unitlist, atkunit, defunit);
	
	for (var u in supportUnits)
	{
		var hex = supportUnits[u].getHex();
		cr = GameRules.calculateAttackResults(supportUnits[u], atkunit);
		if (hex.isSpotted(side) || supportUnits[u].tempSpotted)
		{
			evalLosses += cr.kills; //Losses of atkunit are kills of the support fire
			evalKills += cr.losses; //Kills of the atkunit are losses of the support fire
		}
		realLosses += cr.kills;
		realKills += cr.losses;
	}
	
	cr = GameRules.calculateAttackResults(atkunit, defunit);
	
	evalLosses += cr.losses;
	evalKills += cr.kills;
	realLosses += cr.losses;
	realKills += cr.kills;
	
	if (withHiddenUnits)
	{
		cr.losses = realLosses;
		cr.kills = realKills;
	}
	else
	{
		cr.losses = Math.min(evalLosses, atkunit.strength);
		cr.kills = Math.min(evalKills, defunit.strength);
	}
	
	//console.log("Real Kills: " + realKills + " Losses: " + realLosses + " Eval Kills: " + evalKills + " Losses: " + evalLosses);
	return cr;
}

GameRules.calculateAttackResults = function(atkunit, defunit)
{
	var aPos = atkunit.getPos();
	var dPos = defunit.getPos();
	
	var aData = atkunit.unitData();
	var dData = defunit.unitData();
	
	var aType = aData.target;
	var dType = dData.target;
	
	var aHex = atkunit.getHex();
	var dHex = defunit.getHex();
	
	var aExpBars = (atkunit.experience / 100) >> 0;
	var dExpBars = (defunit.experience / 100) >> 0;
	
	var aav = 0; //Attacker attack value
	var adv = 0; //Attacker defense value
	var dav = 0; //Defender attack value
	var ddv = 0; //Defender defense value
	
	var cr = new combatResults();
	var d = GameRules.distance(aPos.row, aPos.col, dPos.row, dPos.col); //distance between units

	var aTerrain = aHex.terrain;
	var dTerrain = dHex.terrain;
	
	if (isAir(atkunit)) aTerrain = terrainType.Clear;
	if (isAir(defunit)) dTerrain = terrainType.Clear;
	
	//Infantry always dismounts when attacked
	if (defunit.isMounted && !defunit.isSurprised && defunit.unitData(true).uclass == unitClass.infantry)
			dData = Equipment.equipment[defunit.eqid];
	
	//Attacking unit type
	switch(aType)
	{
		case unitType.air:
		{
			dav = dData.airatk;
			ddv = dData.airdef;
			break;
		}
		case unitType.soft:
		{
			dav = dData.softatk;
			ddv = dData.grounddef;
			break;
		}
		case unitType.hard:
		{
			dav = dData.hardatk;
			ddv = dData.grounddef;
			break;
		}
	}
	//Defending unit type
	switch(dType)
	{
		case unitType.air:
		{
			aav = aData.airatk;
			adv = aData.airdef;
			break;
		}
		case unitType.soft:
		{
			aav = aData.softatk;
			adv = aData.grounddef;
			break;
		}
		case unitType.hard:
		{
			aav = aData.hardatk;
			adv = aData.grounddef;
			break;
		}
	}
	
	//TODO Close Combat defender use Close Defense except when it's infantry which makes attacker use CD
	//Bigger losses when fighting in cities
	if (isCloseCombatTerrain(dTerrain))
	{
		if (dData.uclass == unitClass.infantry)
		{
			adv = aData.closedef;
		}
		else
		{
			ddv = dData.closedef;
			aav += 4;
		}
		
		if (aData.uclass == unitClass.infantry)
			ddv = dData.closedef;
		else
			dav += 4;
	}
	//TODO Unit types
	if (dData.uclass == unitClass.artillery)
		adv += 3;
		
	//TODO Weather
	
	//TODO Terrain checks
	if (dTerrain == terrainType.City)
		ddv += 4;
	if ((dTerrain == terrainType.River || dTerrain == terrainType.Stream) && dHex.road == roadType.none)
	{	
		ddv -= 4;
		aav += 4;
	}
	if ((aTerrain == terrainType.River || aTerrain == terrainType.Stream) && aHex.road == roadType.none)
	{
		adv -= 4;
		dav += 4;
	}

	//TODO Entrenchment
	adv += atkunit.entrenchment;
	ddv += defunit.entrenchment;
	//Add entrechment twice for infantry in city, forest, mountain if not attacked by infantry/arty/air/naval
	if (dData.uclass == unitClass.infantry && isCloseCombatTerrain(dTerrain))
		if (aData.uclass > unitClass.infantry && aData.uclass < unitClass.groundTransport)
			ddv += defunit.entrenchment;
	
		
	
	//TODO Experience
	aav += aExpBars;
	adv += aExpBars;
	dav += dExpBars;
	ddv += dExpBars;

	//TODO Received attacks this turn
	adv -= atkunit.hits;
	ddv -= defunit.hits;
	
	//TODO Range defense modifier AntiTank doesn't get it
	if (d > 1) 
	{
		adv += aData.rangedefmod;
		ddv += dData.rangedefmod;
	}
	else
	{
		adv += aData.rangedefmod >> 1;
		ddv += dData.rangedefmod >> 1;
	}
	
	//TODO Initiative (evaluate initiative based on class, terrain initiative)
	var initiativeDiff = aData.initiative - dData.initiative;
	if (initiativeDiff >= 0)
	{
		adv += 4;
		aav += Math.min(4, initiativeDiff);
	}
	else
	{
		ddv +=4;
		dav += Math.min(4, -(initiativeDiff));
	}

	if (atkunit.isSurprised)
	{
		adv = 0;
		aav = aav/2;
	}
	//console.log("Attacker attack value:" + aav + " defence value:" + adv);
	//console.log("Defender attack value:" + dav + " defence value:" + ddv);
	//We consider that attacking unit can fire because otherwise won't have targets selected in UI
	//Check if defending unit can fire back
	//Can't fire back when attacked from range except naval units combat
	if (d > 1 && !(isSea(atkunit) && isSea(defunit)))
		cr.defcanfire = false;
	
	if (!canAttack(defunit, atkunit)) 
		cr.defcanfire = false;
	
	cr.kills = getCombatKills(aav, ddv, atkunit, defunit);
	
	if (cr.defcanfire)
			cr.losses = getCombatKills(dav, adv, defunit, atkunit);
	
	//Experience
	var bonusAD = (dav + 6 - adv);
	if (bonusAD < 1) bonusAD = 1;

	var bonusDA = (dav + 6 - adv);
	if (bonusDA < 1) bonusDA = 1;

	cr.atkExpGained = ((bonusAD * (defunit.strength / 10) + bonusDA) * cr.kills) >> 0;
	cr.defExpGained = (2 * cr.losses) >> 0;
	//console.log("Attacker experience gained: " + cr.atkExpGained);
	//console.log("Defender experience gained: " + cr.defExpGained);

	return cr;
}

function getCombatKills(atkval, defval, atkunit, defunit)
{
	var atkclass = atkunit.unitData().uclass;
	var kF = atkval - defval; //Kill fractions

	if (kF > 4) kF = 4 + (2 * kF - 8) / 5; //PG2 formula
	kF += 6;
	
	if (atkclass == unitClass.artillery || atkclass == unitClass.levelBomber || atkclass == unitClass.fortification
		|| (isSea(atkunit) && !isSea(defunit)))
		kF -= 3;
	
	if (kF < 1) kF = 1;
	if (kF > 19) kF = 19;
	
	return Math.round((5 * kF * atkunit.strength + 50)/100);
}

//TODO Terrain, Unit type and adjacent units 
GameRules.getResupplyValue = function(map, unit)
{
	if (!GameRules.canResupply(map, unit)) return [0, 0];
	//get maximum resupply values
	var ammo = unit.unitData().ammo - unit.getAmmo();
	var fuel = unit.unitData().fuel - unit.getFuel();
	
	//Air units get full resupply even if other units are adjacent
	if (isAir(unit))
		return new Supply(ammo, fuel);
	
	var p = unit.getPos();
	var adj = getAdjacent(p.row, p.col);
	var enemy = 0;
	for (var h in adj)
	{
		var r = adj[h].row;
		var c = adj[h].col;
		//Enemy around ? Check only for ground units
		if ((map[r][c].unit != null) && (map[r][c].unit.player.side != unit.player.side))
			enemy++;
	}
	
	if (unit.getHex().terrain != terrainType.City)
	{
		ammo = ammo / 2;
		fuel = fuel / 2;
	}
		
	if (enemy > 0 && enemy <= 2)
	{
		ammo = ammo / 2;
		fuel = fuel / 2;
	}
	
	if (enemy > 2)
	{
		ammo = ammo / 4;
		fuel = fuel / 4;
	}
	
	if (fuel < 0) fuel = 0;
	
	return new Supply((ammo) >> 0, (fuel) >> 0);
}

//TODO Terrain, Unit type and adjacent units 
GameRules.getReinforceValue = function(map, unit)
{
	if (!GameRules.canReinforce(map, unit)) return 0;
	var strength = 10 - unit.strength;
	
	//Air units get full reinforcement even if other units are adjacent
	if (isAir(unit))
		return strength;
	
	var p = unit.getPos();
	var adj = getAdjacent(p.row, p.col);
	var enemy = 0;
	for (var h in adj)
	{
		var r = adj[h].row;
		var c = adj[h].col;
		//Enemy around ? Check only for ground units
		if ((map[r][c].unit !== null) && (map[r][c].unit.player.side != unit.player.side))
			enemy++;
	}
	
	if (unit.getHex().terrain != terrainType.City)
		strength = strength / 2;
		
	if (enemy > 0 && enemy <= 2)
		strength = strength / 2;
	
	if (enemy > 2)
		strength = strength / 4;
	
	
	return (strength) >> 0;
}

//Checks if a unit can attack another unit without considering range
function canAttack(unit, targetUnit)
{
	if (unit === null || unit.destroyed)
		return false;
	
	if (unit.getAmmo() <= 0)
		return false;
	
	if (targetUnit === null || targetUnit.destroyed)
		return false;
	
	if (!GameRules.isEnemy(unit, targetUnit))
		return false;

	if (isAir(targetUnit) && unit.unitData().airatk <= 0 ) //TODO There is a special bit for this in pg2 equipment.
		return false;
		
	return true;
}
GameRules.canAttack = function(unit, targetUnit) { return canAttack(unit, targetUnit); }

//Checks if a given unit can move into a hex
function canMoveInto(map, unit, cell)
{
	var hex = map[cell.row][cell.col];

	if (isGround(unit) || isSea(unit))
	{
		if (hex.unit === null)
			return true;
	}
	if (isAir(unit))
	{
		if (hex.airunit === null)
			return true;
	}
	
	return false;

}

//Checks if a unit can pass thru a hex ocupied by a friendly unit
function canPassInto(map, unit, cell)
{
	var hex = map[cell.row][cell.col];
	
	if (isGround(unit) || isSea(unit))
	{
		if (hex.unit === null) 	return true;
		if (hex.unit.player.side == unit.player.side) 	return true;	
	}
	if (isAir(unit))
	{
		if (hex.airunit === null) return true;
		if (hex.airunit.player.side == unit.player.side) return true;
	}

	return false;
}
GameRules.canPassInto = function(map, unit, cell) { return canPassInto(map, unit, cell); } //TODO remove this wrappers

GameRules.canResupply = function(map, unit)
{
	if (unit.hasMoved)
		return false;
	if (unit.hasFired)
		return false;
	if (unit.hasResupplied)
		return false;
	if ((unit.getFuel() == unit.unitData().fuel) &&
		(unit.getAmmo() == unit.unitData().ammo))
		return false;
	
	if (!isAir(unit))
		return true;
	//Air Unit
	if (isAirfieldAroundUnit(map, unit))
		return true;

	//TODO Other rules ?
	return false;
}

GameRules.canReinforce = function(map, unit)
{
	if (unit.hasMoved)
		return false;
	if (unit.hasFired)
		return false;
	if (unit.hasResupplied)
		return false;
	if (unit.strength >= 10)
		return false;
		
	if (!isAir(unit))
		return true;
	
	//Air Unit
	if (isAirfieldAroundUnit(map, unit))
		return true;

	//TODO Other rules ?
	return false;
}

//Air units and mounted artillery can't capture cities
GameRules.canCapture = function(unit)
{
	var uc = unit.unitData().uclass;

	if (isAir(unit))
		return false;

	if (unit.isMounted && (uc == unitClass.antiTank || uc == unitClass.flak 
		|| uc == unitClass.artillery || uc == unitClass.airDefence))
		return false;

	return true;
}

//Which unit class can gain entrenchments
GameRules.canEntrench = function(unit)
{

	if (unit === null)
		return false;

	var uc = unit.unitData().uclass;

	if (unitEntrenchRate[uc] > 0)
		return true;

	return false;
}

GameRules.isEnemy = function(unit, targetUnit)
{
	if (unit === null || targetUnit === null)
		return false;
	if (unit.player.side != targetUnit.player.side)
		return true;
	
	return false;
}
//Returns a list of units that can fire support when defunit is attacked by atkunit
GameRules.getSupportFireUnits = function(unitList, atkunit, defunit)
{
	
	var pa = atkunit.getPos();
	var pd = defunit.getPos();
	
	//No support fire if attack is from range
	if (GameRules.distance(pa.row, pa.col, pd.row, pd.col) > 1)
		return [];
	
	var supportUnits = [];
	var u = null;

	for (var i in unitList)
	{
		u = unitList[i];
		if (u.player.side != defunit.player.side)
			continue;
		
		if (u.id == defunit.id)
			continue; 
			
		var up = u.getPos();
		var ud = u.unitData();
		var range = ud.gunrange;
		if (range == 0)	range = 1;
		
		if (GameRules.distance(up.row, up.col, pa.row, pa.col) > range)
			continue;
		
		if (!isAir(atkunit)) //Ground attack
		{
			if (ud.uclass == unitClass.artillery && canAttack(u, atkunit)) //TODO special bit for support fire in pg2 equipment
				supportUnits.push(u);
		}
		else //Air Attack
		{
			if ((ud.uclass == unitClass.flak || ud.uclass == unitClass.airDefence ||
			     ud.uclass == unitClass.fighter) && canAttack(u, atkunit))
				supportUnits.push(u);
		}
	}
	
	return supportUnits;
}

function isAirfieldAroundUnit(map, unit)
{
	var p = unit.getPos();
	//Check if hex under unit is airfield (also for small 1 hex airfields)
	if ((map[p.row][p.col].terrain == terrainType.Airfield) 
		&& (map[p.row][p.col].flag == unit.player.country))
		return true;
	
	//If not Check adjacent hexes
	var adj = getAdjacent(p.row, p.col);
	
	for (var h in adj)
	{
		var r = adj[h].row;
		var c = adj[h].col;
		//Air units can resupply if adjacent to an Airfield hex with flag
		if ((map[r][c].terrain == terrainType.Airfield) 
			&& (map[r][c].flag == unit.player.country))
			return true;
	}
	
	return false;
}

//Returns 0 if it's NOT possible, 1 air embark, 2 naval embark
GameRules.getEmbarkType =  function(map, unit)
{
	var pos = unit.getPos();
	var hex = map[pos.row][pos.col];
	var uc = unit.unitData().uclass;

	if (hex.terrain == terrainType.Airfield && unit.player.airTransports > 0)
		if (uc == unitClass.infantry)
			return unitClass.airTransport;

	if (hex.terrain == terrainType.Port && unit.player.navalTransports > 0)
		if (uc < unitClass.fighter && uc != unitClass.fortification)
			return unitClass.navalTransport;

	return unitClass.none;
}

//Returns a list of position for disembark
GameRules.getDisembarkPositions = function(map, unit)
{
	var cellList = [];
	var ud = unit.unitData();

	//Can't disembark after move
	if (!unit.hasMoved && (ud.uclass == unitClass.airTransport || ud.uclass == unitClass.navalTransport))
	{
		var p = unit.getPos();
		var realMovMethod = Equipment.equipment[unit.eqid].movmethod;
		var moveCost = movTable[realMovMethod];
		var adj = getAdjacent(p.row, p.col);

		for (var h in adj)
		{
			var hex = map[adj[h].row][adj[h].col];
			//Only ground units can be transported
			if (hex.unit === null && moveCost[hex.terrain] < 255)
				cellList.push(new Cell(adj[h].row, adj[h].col));
		}
	}

	return cellList;
}

GameRules.canEmbark = function(map, unit)
{
	if (GameRules.getEmbarkType(map, unit) > 0)
		return true;
	return false;
}

GameRules.canDisembark = function(map, unit)
{
	var l = GameRules.getDisembarkPositions(map, unit);
	if (l.length > 0)
		return true;
	return false;
}

GameRules.canMount = function(unit)
{
	if (!unit.hasMoved && isGround(unit) && unit.transport !== null)
		return true;
		
	return false;
}

GameRules.canUnmount = function(unit)
{
	if (!unit.hasMoved && unit.isMounted)
		return true;
		
	return false;
}

GameRules.isTransportable = function(unitID)
{
	if ((unitID < 1) || (typeof unitID === "undefined")) return false;
	
	var ud = Equipment.equipment[unitID];
	var movmethod = ud.movmethod;

	//Fortifications are listed as towed for some reason
	if (ud.uclass == unitClass.fortification)
		return false;
	
	if ((movmethod != movMethod.towed) && (movmethod != movMethod.leg)
		 && (movmethod != movMethod.allTerrainLeg))
		return false; 

	return true;
}

function isAir(unit)
{
	if (unit === null) 
		return false;
		
	var ud = unit.unitData();
	if (ud.movmethod == movMethod.air) 
		return true; 
		
	return false;
}
GameRules.isAir = function(unit) { return isAir(unit); }

function isSea(unit)
{
	if (unit === null)
		return false;
		
	var ud = unit.unitData();
	if((ud.movmethod == movMethod.deepnaval) ||
	   (ud.movmethod == movMethod.naval) || 
	   (ud.movmethod == movMethod.costal))
	{ 
		return true; 
	}
	
	return false;
}

function isGround(unit)
{
	if (unit === null)
		return false;
		
	var ud = unit.unitData();
	if ((ud.movmethod <  movMethod.air) ||
	    (ud.movmethod == movMethod.allTerrainTracked) ||
	    (ud.movmethod == movMethod.amphibious) ||
		(ud.movmethod == movMethod.allTerrainLeg))
	{
		return true;
	}
	return false;
}

function isCloseCombatTerrain(t)
{
	if (t == terrainType.City || t == terrainType.Forest || t == terrainType.Mountain
		|| t == terrainType.Fortification)
		return true;

	return false;
}

GameRules.unitUsesFuel = function(unit)
{
	if (unit.unitData().fuel == 0)
		return false;
		
	var m = unit.unitData().movmethod;
	if ((m == movMethod.leg) || 
		(m == movMethod.towed) ||
		(m == movMethod.allTerrainLeg))
			return false;
	return true;
}

GameRules.calculateUnitCosts = function(unitid, transportid)
{
	var cost = 0;
	
	if (unitid > 0 && typeof unitid !== "undefined")
		cost += Equipment.equipment[unitid].cost * CURRENCY_MULTIPLIER;
	
	if (transportid > 0 && typeof transportid !== "undefined")
		cost += Equipment.equipment[transportid].cost * CURRENCY_MULTIPLIER;

	return cost;
}

GameRules.calculateUpgradeCosts = function(unit, upgradeid, transportid)
{
	if (unit === null)
		return 0;
		
	var ocost = 0;
	var ncost = 0;
	
	//if no upgradeid is given then only the transport is updated
	if (upgradeid > 0 && typeof upgradeid !== "undefined")
		ncost = GameRules.calculateUnitCosts(upgradeid, transportid);
	else
		ncost = GameRules.calculateUnitCosts(unit.eqid, transportid);
		
	if (unit.transport !== null)
		ocost = GameRules.calculateUnitCosts(unit.eqid, unit.transport.eqid);
	else
		ocost = GameRules.calculateUnitCosts(unit.eqid, 0);
 	
 	return ((ncost - ocost) * UPGRADE_PENALTY) >> 0; 
}

//Returns aproximate cardinal directions x row, y col
GameRules.getDirection = function(x1, y1, x2, y2)
{
	if (y1 & 1 && x1 == x2) x1++;
	if (y2 & 1 && x1 == x2) x2++;
	
	var dx = x1 - x2;
	var dy = y1 - y2;
	var delta = 0; //Gets added or substracted from a ordinal direction to get subdivisions
	var r = 1; 
	

	//Aproximate the 8 sub-ordinal directions
	if (dx != 0) 
		 r = Math.abs(dy / dx);
	
	if (r > 3) 
		delta = 1;
	if (r < 0)
		delta = -1;
	//console.log("DX:" + dx + " DY:" + dy + " Ratio:" + r + " Delta:" + delta);
	if (dx > 0)
	{
		if (dy > 0)
			return direction.NW + delta; //+ 1 WNW, -1 NNW
		if (dy < 0)
			return direction.NE + delta;//+1 ENE, -1 NNE
		if (dy == 0)
			return direction.N;
	}
	if (dx < 0)
	{
		if (dy > 0)
			return direction.SW + delta; //+1 WSW, -1 SSW
		if (dy < 0)
			return direction.SE + delta; //+1 ESE, -1 SSE
		if (dy == 0)
			return direction.S;
	}	
	if (dx == 0)
	{
		if (dy >= 0)
			return direction.W;
		if (dy < 0)
			return direction.E;
	}
}

//Returns the distance between 2 hexes x row, y col
GameRules.distance = function(x1, y1, x2, y2)
{
	var d = 0;
	//shift the entire hexgrid coords to be arranged diagonally
	if (y1 % 2)	{ x1 = x1 * 2 + 1;	}
	else { 	x1 = x1 * 2; }
	
	if (y2 % 2) { x2 = x2 * 2 + 1;	}
	else { x2 = x2 * 2; }
	
	var dx = Math.abs(x2-x1);
	var dy = Math.abs(y2-y1);
	
	if (dx > dy) { d = (((dx - dy)/2) + dy) >> 0; }
	else { d = dy } 

	return d;
}

//Checks if 2 coordonates are adjacent x row, y col
function isAdjacent(x1, y1, x2, y2)
{
	if ((x1 - 1 + (y1 % 2) == x2) && (y1 - 1 == y2)) return true;
	if ((x1 + (y1 % 2) == x2) && (y1 - 1 == y2)) return true;
	if ((x1 - 1 == x2) && (y1 == y2)) return true;
	if ((x1 + 1 == x2) && (y1 == y2)) return true;
	if ((x1 - 1 + (y1 % 2) == x2) && (y1 + 1 == y2)) return true;
	if ((x1 + (y1 % 2) == x2) && (y1 + 1 == y2)) return true;
	
	return false;
}
//returns a list of adjacent cells of a row,col 
function getAdjacent(x1, y1)
{
	var cellList=[];
	
	cellList.push(new Cell(x1 - 1 + (y1 % 2), y1 - 1));
	cellList.push(new Cell(1 * x1 + (y1 % 2), y1 - 1));
	cellList.push(new Cell(1 * x1 - 1, y1));
	cellList.push(new Cell(1 * x1 + 1, y1));
	cellList.push(new Cell(1 * x1 - 1 + (y1 % 2), 1 * y1 + 1));
	cellList.push(new Cell(1 * x1 + (y1 % 2), 1 * y1 + 1));
		
	return cellList;
}

//Returns a list of cells that are in a certain range to another cell
function getCellsInRange(row, col, range, mrows, mcols)
{
	var cellList = [];
	var cell = null;
	
	if ( range <= 0) return cellList;
	
	var minRow = row - range;
	var maxRow = row + range;
	//if (minRow < 0) { minRow = 0; }
	//if (maxRow >= mrows) { maxRow = mrows-1; }

	//the column
	for (var i = minRow; i <= maxRow; i++)
	{
		if (i < 0 || i >= mrows || i == row) continue;
		cell = new extendedCell(i, col); 
		cell.range = Math.abs(row - i);
		cellList.push(cell);
		//console.log("Added cell at Row:" + cell.row + " Col:" + cell.col + " Range: " + cell.range);
	}
	//console.log("Finished selecting column");
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
			if (i < 0 || i >= mrows) continue;
			if ((col + colOff) < mcols)
			{
				cell = new extendedCell(i, col + colOff);
				cell.range = GameRules.distance(row, col, i, col + colOff);
				cellList.push(cell);
				//console.log("R added cell at Row:" + cell.row + " Col:" + cell.col + " Range: " + cell.range);
			}
			if ((col - colOff) > 0)
			{ 
				cell = new extendedCell(i, col - colOff);
				cell.range = GameRules.distance(row, col, i, col - colOff);
				cellList.push(cell);
				//console.log("L added cell at Row:" + cell.row + " Col:" + cell.col + " Range: " + cell.range);
			}
		}
	}
	return cellList;
}
//------------------------ MODULE END ----------------------
return GameRules; }(GameRules || {})); //Module end giberish
