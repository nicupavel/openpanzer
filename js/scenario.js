/**
 * Scenario - handles scenario related tasks
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2013 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

Scenario.loader = new ScenarioLoader();
Scenario.scenarioPath = "resources/scenarios/data/";

function Scenario(scenFile)
{
	this.description = "";
	this.name = "";
	this.maxTurns = 0;
	this.file = Scenario.scenarioPath + scenFile;
	this.map = new Map();

	if (typeof scenFile !== "undefined")
	{
		if (!Scenario.loader.loadScenario(this.map, this.file))
			console.log("Error cannot load scenario id: %d from %s ", scenIndex, this.file);

		this.maxTurns = this.map.maxTurns;

		//Lookup information about scenario in scenariolist if exists
		for (var i = 0; i < scenariolist.length; i++)
		{
			if (scenariolist[i][0] == scenFile)
			{
				this.name = scenariolist[i][1];
				this.description = scenariolist[i][2];
			}
		}
	}

	//Checks if local human player (not net/ai) has reached the map turn limit
	this.checkDefeat = function(lastSide, localPlayingSide)
	{
		if (this.map.turn >= this.maxTurns && (lastSide == localPlayingSide || localPlayingSide == 2))
		{
			if (hasSidePlayedTurn(this.map.getPlayers(), lastSide, this.maxTurns))
			{
				console.log("Defeat for %s on turn %d !", this.map.currentPlayer.getCountryName(), this.map.turn);
				return true;
			}
		}
		return false;
	}

	//TODO add checkVictory and add brilian/tactical/victory outcomes in scenario information during conversion
	this.checkVictory = function()
	{

	}

	//Private methods
	//Check if all players from a side have played certain turn
	function hasSidePlayedTurn(playerList, side, turn)
	{
		for (var i = 0; i < playerList.length; i++)
		{
			if (playerList[i].side != side)
				continue;
			if (playerList[i].playedTurn < turn)
				return false;
		}
		return true;
	}
}
