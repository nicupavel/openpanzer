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
	var actionsQueue = [];
	
	console.log("Initialised player: " + player.getCountryName() + " as AI player");
	this.buildActions = function()
	{
		console.log("AI for player:" + player.getCountryName() + " running");
		updateObjectives();
		updateUnits();
		performActions();
		console.log("AI for player:" + player.getCountryName() + " finished");
	}
	
	this.getAction = function()
	{
		if (actionsQueue.length == 0)
			return null;
		var action = actionsQueue[0];
		actionsQueue.splice(0, 1);
		return action;
	}
	
	function addAction(actionType, params)
	{
		actionsQueue.push({ type: actionType, param: params });
	}
	
	function updateObjectives()
	{
		
	}
	
	function updateUnits()
	{
		var allUnits = map.getUnits();
		playerUnits = [];
		for (var i = 0; i < allUnits.length; i++)
		{
			if (allUnits[i].player.id == player.id)
				playerUnits.push(allUnits[i]);
		}
	}
	
	function performActions()
	{
		performReinforce();
		performResupply();
		performAttack();
		performMove();
	}
	
	function performReinforce()
	{
		for (var i = 0; i < playerUnits.length; i++)
		{
			var u = playerUnits[i];
			if (!GameRules.canReinforce(map.map, u)) continue;
			if ((u.strength < 3) && (GameRules.getReinforceValue(map.map, u) > 1))
			{
				console.log("Unit: " + u.unitData().name + " " + u.id +  " performing reinforce");
				addAction(actionType.reinforce, [ u ]);
			}
		}
	}
	
	function performResupply()
	{
		for (var i = 0; i < playerUnits.length; i++)
		{
			var u = playerUnits[i];
			if (!GameRules.canResupply(map.map, u)) continue;
			if ((u.ammo == 0 || (GameRules.unitUsesFuel(u) && u.fuel == 0)))
			{
				console.log("Unit: " + u.unitData().name + " " + u.id +  " performing resupply");
				addAction(actionType.resupply, [ u ]);
			}
		}
	}
	
	function performAttack()
	{
		for (var i = 0; i < playerUnits.length; i++)
		{
			var c = GameRules.getUnitAttackCells(map.map, playerUnits[i], map.rows, map.cols);
			var unitToAttack = null;
			for (var j = 0; j < c.length; j++)
			{
				var maxLosses = playerUnits[i].strength;
				var minKills = 0;
				var hex = map.map[c[j].row][c[j].col];
				var unit = hex.getAttackableUnit(playerUnits[i], false);
				if (!unit) continue;
				if (!GameRules.canAttack(playerUnits[i], unit)) continue;
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
			console.log("Unit: " + playerUnits[i].unitData().name + " " + playerUnits[i].id + " attacking: " + unitToAttack.unitData().name);
			//if (!playerUnits[i].hasFired)
			addAction(actionType.attack, [ playerUnits[i], unitToAttack ]);
		}
	}
	
	function performMove()
	{
	
	}
}
