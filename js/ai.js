/**
 * AI - provides AI for OpenPanzer
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function AI(player, map)
{
	var playerUnits = [];
	var objectivePos = [];
	console.log("Initialised player: " + player.getCountryName() + " as AI player");
	this.run = function()
	{
		console.log("AI for player:" + player.getCountryName() + " running");
		updateObjectives();
		updateUnits();
		performActions();
		console.log("AI for player:" + player.getCountryName() + " finished");
		map.endTurn();
	}
	
	function updateObjectives()
	{
		
	}
	
	function updateUnits()
	{
		var allUnits = map.getUnits();
		for (var i = 0; i < allUnits.length; i++)
		{
			if (allUnits[i].player.id == player.id)
				playerUnits.push(allUnits[i]);
		}
	}
	
	function performActions()
	{
		performResupply();
		performAttack();
		performMove();
	}
	
	function performResupply()
	{
		for (var i = 0; i < playerUnits.length; i++)
		{
			var u = playerUnits[i];
			if (!GameRules.canResupply(map.map, u))
				continue;
			if ((u.ammo == 0 || (GameRules.unitUsesFuel(u) && u.fuel == 0)))
			{
				console.log("Unit: " + u.unitData().name + " performing resupply");
				map.resupplyUnit(u);
			}
		}
	}
	
	function performAttack()
	{
		for (var i = 0; i < playerUnits.length; i++)
		{
			var c = GameRules.getAttackRange(map.map, playerUnits[i], map.rows, map.cols);
			var unitToAttack = null;
			for (var j = 0; j < c.length; j++)
			{
				var maxLosses = playerUnits[i].strength;
				var minKills = 0;
				var hex = map.map[c[j].row][c[j].col];
				var unit = hex.getAttackableUnit(playerUnits[i], false);
				if (!unit) continue;
				//console.log("Unit: " + playerUnits[i].unitData().name + " could attack: " + unit.unitData().name);
				var cr = GameRules.calculateCombatResults(playerUnits[i], unit, map.getUnits(), true);
				
				if (cr.losses < maxLosses && cr.kills > minKills)
				{
					maxLosses = cr.losses;
					minKills = cr.kills;
					unitToAttack = unit;
				}
			}
			
			if (!unitToAttack) continue;
			console.log("Unit: " + playerUnits[i].unitData().name + " attacking: " + unitToAttack.unitData().name);
			if (!unitToAttack.hasFired) map.attackUnit(playerUnits[i], unitToAttack, false);
		}
	}
	
	function performMove()
	{
	
	}
}
