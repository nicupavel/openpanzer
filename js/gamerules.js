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

var GameRules = GameRules || {}; //Namespace emulation

//returns a cell list with hexes that a unit @ row,col can move to
//Works by computing cost of ajacent hexes by range expanding from 0 to unit movpoints
//cin is the cost of entering the current hex which is equal to  the cost of exiting from 
//the hex with a range smaller by 1 than the current hex
//cout cost of exiting a hex which is cin + terrain movement cost
//each time a hex with cout smaller that adjacent hexes cout the adjacent hexes are updated 
//with the new cost
//TODO stopmov 254, bridges, zone of control
//TODO row,col can be read from unit
GameRules.getMoveRange = function(map, unit, row, col, mrows, mcols)
{
	var r = 0;
	var hex = null;
	var allowedCells = [];
		
	if (unit === null || unit.hasMoved) return [];
	
	var ud = unit.unitData();
	var range = ud.movpoints;
	var movmethod = ud.movmethod;
	var moveCost = movTable[movmethod];
	var enemySide = ~unit.player.side & 1;
	
	if (GameRules.unitUsesFuel(unit) && (unit.getFuel() < range)) 
		range = unit.getFuel();
		
	//Towed units with no transport should be able to move at 1 range(looks like forts are towed too)
	if ((movmethod == movMethod.towed) && (unit.transport === null) 
		&& (range == 0) && (ud.uclass != unitClass.fortification))
	{
		range = 1;	
	}
	
	//console.log("move range:" + range);
	
	var c = getCellsInRange(row, col, range, mrows, mcols);
	
	//Don't calculate costs for air units
	if (isAir(unit))
	{
		for (var i = 0; i < c.length; i++)
		{
			if (canMoveInto(map, unit, c[i]))
			{
				c[i].canMove = true;
				allowedCells.push(c[i]);
			}
		}
		return allowedCells;
	}
	
	//Add current unit cell as starting point for cost calculations
	c.push(new Cell(row, col)); 

	while (r <= range)
	{
		for (i = 0; i < c.length; i++)
		{
			if (c[i].range == r)
			{
				//console.log("Checking for Row:"+ c[i].row + " Col:" + c[i].col + " range: " + c[i].range + " at range: " + r);
				for (j  = 0; j < c.length; j++) //Look up adjacent cells for c[i]
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
						if (hex.isZOC(enemySide))
							c[j].cost = 254; //stop movement
						
						if (c[j].cin == 0) c[j].cin = c[i].cout;
						if (c[j].cout == 0) c[j].cout = c[j].cin + c[j].cost;
						if (c[j].cin > c[i].cout && c[j].cost <= 254) //Is reachable from another path
						{
							c[j].cin = c[i].cout;
							c[j].cout = c[j].cin + c[j].cost;
						}
						//console.log("\t Hex at Row:" + c[j].row + " Col:" + c[j].col + " RANGE:" + c[j].range + " CIN:" + c[j].cin + " COUT:" + c[j].cout + " COST:" + c[j].cost);
						if ((c[j].cout <= range) || ((c[j].cost == 254) && (c[j].cin <= range))) 
						{
							if (canMoveInto(map, unit, c[j])) 
								c[j].canMove = true; //To allow unit to move in this hex
							else
								if (canPassInto(map, unit, c[j])) 
									c[j].canPass = true; //To allow friendly units pass thru this hex
								else
									continue; //Skip don't add the cell as allowed
							
							allowedCells.push(c[j]);
							//console.log("\t\tSelected Hex at Row:" + c[j].row + " Col:" + c[j].col);
						}
					}
				}
			}
		}
		r++;
	}
	
	return allowedCells;
}
//TODO row,col can be read from unit
GameRules.getAttackRange = function(map, unit, row, col, mrows, mcols)
{
	var allowedCells = [];
		
	if (unit === null || unit.hasFired || unit.getAmmo() <= 0) return []; 
	
	//TODO weather ?
	var side = unit.player.side;
	var range = unit.unitData().gunrange;
	if (range == 0)	range = 1;
		
	//console.log("attack range: "+ range);
	var cellList = getCellsInRange(row, col, range, mrows, mcols);
	
	//Air unit can attack the target under it
	if (isAir(unit)) cellList.push(new Cell(row, col)); 
	
	for (var i = 0; i < cellList.length; i++)
	{
		var cell = cellList[i];
		var hex = map[cell.row][cell.col];
		
		if (!hex.isSpotted(side))
			continue;			
		if (canAttack(unit, hex.unit)) //Can attack the ground unit on this hex?
		{
			allowedCells.push(cell);
			continue; //don't push same cell twice below
		}
		
		if (canAttack(unit, hex.airunit)) //Can attack the air unit on this hex ?
			allowedCells.push(cell);

	}
	return allowedCells;
}

//set zone of control on unit adjacent hexes
GameRules.setZOCRange = function(map, unit, on, mrows, mcols)
{
	if (!unit || isAir(unit)) return;
	
	var p = unit.getPos();
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

GameRules.setSpotRange = function(map, unit, on, mrows, mcols)
{
	if (!unit) return;
	
	var p = unit.getPos();
	var side = unit.player.side;
	var range = unit.unitData().spotrange;
	var r, c;
	var cells = getCellsInRange(p.row, p.col, range, mrows, mcols);
	//Add current unit cell too as spotted
	cells.push(new Cell(p.row, p.col)); 
	
	for (var i in cells)
	{
		r = cells[i].row;
		c = cells[i].col;
		//console.log("spot [" + r + "][" + c +"] set to:" + on + " for side: " + side);
		map[r][c].setSpotted(side, on);
	}
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
	for (i = 0; i < cellList.length; i++)
	{
		var pc = new pathCell(cellList[i]);
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
				//+1 is the cost since we don't consider terrain cost here.
				if (pCells[i].dist == Infinity || (minDistCell.dist + 1) < pCells[i].dist)
				{
					pCells[i].dist = minDistCell.dist + 1;
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
		visitedCells.push(pCells[idx]);
		pCells.splice(idx, 1);
	}
	
	return [];
}

GameRules.calculateAttackResults = function(atkunit, defunit)
{
	var a = atkunit.getPos();
	var t = defunit.getPos();
	var aUD = atkunit.unitData();
	var tUD = defunit.unitData();
	var at = aUD.target;
	var tt = tUD.target;
	var aH = atkunit.getHex();
	var tH = defunit.getHex();
	var aTerrain = aH.terrain;
	var tTerrain = tH.terrain;
	var aExpBars = (atkunit.experience / 100) >> 0;
	var tExpBars = (defunit.experience / 100) >> 0;
	var aav = 0;
	var adv = 0;
	var tav = 0;
	var tdv = 0;
	var d = GameRules.distance(a.row, a.col, t.row, t.col); //distance between units
	var cr = new combatResults();
	var closeCombat = isCloseCombatTerrain(tTerrain);
	//Attacking unit type
	switch(at)
	{
		case unitType.air:
		{
			tav = tUD.airatk;
			tdv = tUD.airdef;
			break;
		}
		case unitType.soft:
		{
			tav = tUD.softatk;
			tdv = tUD.grounddef;
			break;
		}
		case unitType.hard:
		{
			tav = tUD.hardatk;
			tdv = tUD.grounddef;
			break;
		}
	}
	//Defending unit type
	switch(tt)
	{
		case unitType.air:
		{
			aav = aUD.airatk;
			adv = aUD.airdef;
			break;
		}
		case unitType.soft:
		{
			aav = aUD.softatk;
			adv = aUD.grounddef;
			break;
		}
		case unitType.hard:
		{
			aav = aUD.hardatk;
			adv = aUD.grounddef;
			break;
		}
	}
	
	//TODO Close Combat defender use close combat except when it's infantry which makes attacker use CD
	if (closeCombat && tUD.uclass == unitClass.infantry)
		adv = aUD.closedef;
	if (closeCombat && aUD.class == unitClass.infantry)
		tdv = tUD.closedef;
	if (closeCombat && tUD.uclass != unitClass.infantry)
	{
		tdv = tUD.closedef;
		aav += 4;
	}

	//TODO Weather
	//TODO Terrain checks
	if (tTerrain == terrainType.City)
		tdv += 4;
	if (tTerrain == terrainType.River && tH.road != roadType.none)
		tdv -= 4;
	if (aTerrain == terrainType.River && aH.road != roadType.none)
		aav -= 4;
	
	//TODO Entrenchment
	//Add 2*entrechment for infantry in city, forest, mountain if not attacked by infantry
	if (tUD.uclass == unitClass.infantry && closeCombat && aUD.uclass != unitClass.infantry)
		tdv += 2 * defunit.entrenchment;
	else
		tdv += 1 * defunit.entrenchment;
		
	//TODO Experience
	aav += aExpBars;
	adv += aExpBars;
	tav += tExpBars;
	tdv += tExpBars;

	//TODO Received attacks this turn
	adv -= atkunit.hits;
	tdv -= defunit.hits;
	
	//TODO Range defense modifier (check if always added)
	if (d > 1) 
	{
		adv += aUD.rangedefmod;
		tdv += tUD.rangedefmod;
	}
	else
	{
		adv += (aUD.rangedefmod / 2) >> 0;
		tdv += (tUD.rangedefmod / 2) >> 0;
	}
	//TODO Initiative
	if (aUD.initialive > tUD.initiative)
		adv += 4;
	
	//console.log("Attacker attack value:" + aav + " defence value:" + adv);
	//console.log("Defender attack value:" + tav + " defence value:" + tdv);
	//We consider that attacking unit can fire because otherwise won't have targets selected in UI
	//Check if defending unit can fire back
	//Can't fire back when attacked from range
	if (d > 1) 
		cr.defcanfire = false;
	if (!canAttack(defunit, atkunit)) 
		cr.defcanfire = false;
	
	cr.kills = Math.round(atkunit.strength * (aav - tdv)/10);
	if (cr.kills <= 0 ) cr.kills = 1;
	if (cr.defcanfire)
	{
		cr.losses = Math.round(defunit.strength * (tav - adv)/10);
		if (cr.losses < 0) cr.losses = 0;
		
	}
	//Experience
	cr.atkExpGained = (((tav + 6 - adv) * defunit.strength / 10 + (tdv + 6 - aav)) * cr.kills) >> 0;
	cr.defExpGained = (2 * cr.losses) >> 0;
	//console.log("Attacked experience gained: " + cr.atkExpGained);
	//console.log("Defender experience gained: " + cr.defExpGained);

	return cr;
}

//TODO Terrain, Unit type and adjacent units 
GameRules.getResupplyValue = function(map, unit)
{
	if (!GameRules.canResupply(map, unit)) return [0, 0]; //TODO redundant check made in UI
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
	if (unit === null)
		return false;
	
	if (unit.getAmmo() <= 0)
		return false;
	
	if (targetUnit === null)
		return false;
	
	if (!GameRules.isEnemy(unit, targetUnit))
		return false;

	if (isAir(targetUnit) && unit.unitData().airatk <= 0 ) //TODO There is a special bit for this.
		return false;
		
	return true;
}
GameRules.canAttack = function(unit, targetUnit) { return canAttack(unit, targetUnit); }

//Checks if a given unit can move into a hex
function canMoveInto(map, unit, cell)
{
	hex = map[cell.row][cell.col];

	if (isGround(unit) || isSea(unit))
	{
		if (hex.unit === null) 	return true;	
	}
	if (isAir(unit))
	{
		if (hex.airunit === null) return true;
	}
	
	return false;

}

//Checks if a unit can pass thru a hex ocupied by a friendly unit
function canPassInto(map, unit, cell)
{
	hex = map[cell.row][cell.col];
	
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

GameRules.canResupply = function(map, unit)
{
	if (unit.hasMoved)
		return false;
	if (unit.hasFired)
		return false;
	if (unit.hasResupplied)
		return false;
	if (unit.hasReinforced)
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
	if (unit.hasReinforced)
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
			if (ud.uclass == unitClass.artillery && canAttack(u, atkunit)) //TODO special bit for support fire
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

function isAir(unit)
{
	if (unit === null) 
		return false;
		
	ud = unit.unitData();
	if (ud.movmethod == movMethod.air) 
		return true; 
		
	return false;
}
GameRules.isAir = function(unit) { return isAir(unit); }

function isSea(unit)
{
	if (unit === null)
		return false;
		
	ud = unit.unitData();
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
		
	ud = unit.unitData();
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
	//TODO check: If fuel is defined as 0 in equipment then it means it doesn't use fuel ??
	if (unit.unitData().fuel == 0)
		return false;
		
	m = unit.unitData().movmethod;
	if ((m == movMethod.leg) || 
		(m == movMethod.towed) ||
		(m == movMethod.allTerrainLeg))
			return false;
	return true;
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
		cell = new Cell(i, col); 
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
				cell = new Cell(i, col + colOff);
				cell.range = GameRules.distance(row, col, i, col + colOff);
				cellList.push(cell);
				//console.log("R added cell at Row:" + cell.row + " Col:" + cell.col + " Range: " + cell.range);
			}
			if ((col - colOff) > 0)
			{ 
				cell = new Cell(i, col - colOff);
				cell.range = GameRules.distance(row, col, i, col - colOff);
				cellList.push(cell);
				//console.log("L added cell at Row:" + cell.row + " Col:" + cell.col + " Range: " + cell.range);
			}
		}
	}
	return cellList;
}

