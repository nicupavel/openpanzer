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
	this.name = "";
	this.maxTurns = 0;
	this.date = new Date();
	this.atmosferic = 0;
	this.latitude = 0;
	this.ground = 0;
	this.turnsPerDay = 0;  //how many turns to increase day
	this.dayTurn = 0;      //the turn in current day
	this.map = new Map();
	this.file = scenFile;

	var description = "";

	if (typeof scenFile !== "undefined")
	{
		//Lookup information about scenario in scenariolist if exists
		for (var i = 0; i < scenariolist.length; i++)
		{
			if (scenariolist[i][0] == scenFile)
			{
				this.name = scenariolist[i][1];
				description = scenariolist[i][2];
			}
		}
	}

	//Loads scenario data files
	this.load = function()
	{
		return Scenario.loader.loadScenario(this);
		//this.maxTurns = this.map.maxTurns;
	}

	//Checks if local human player (not net/ai) has reached the map turn limit
	this.checkDefeat = function(lastSide, localPlayingSide)
	{
		if (this.map.turn >= this.map.maxTurns && (lastSide == localPlayingSide || localPlayingSide == 2))
		{
			if (hasSidePlayedTurn(this.map.getPlayers(), lastSide, this.map.maxTurns))
			{
				console.log("Defeat for %s on turn %d !", this.map.currentPlayer.getCountryName(), this.map.turn);
				return true;
			}
		}
		return false;
	}

	this.checkVictory = function()
	{
		if (this.map.turn <= this.map.victoryTurns[0])
			return "briliant";
		if (this.map.turn <= this.map.victoryTurns[1])
			return "victory";
		if (this.map.turn <= this.map.victoryTurns[2])
			return "tactical";

		return "lose"; //shouldn't happen as checkDefeat checks each turn
	}

	this.getDescription = function() { return description; }
	this.setDescription = function(str) { description = str; }

	this.endTurn = function()
	{
		//increase the scenario date
		this.dayTurn ++;
		if (this.dayTurn >= this.turnsPerDay)
		{
			this.dayTurn = 0;
			this.date.setDate(this.date.getDate() + 1); //increase 1 day
		}

		//handle weather and ground changes

		//end map turn
		this.map.endTurn();
	}

	//Copy constructor
	this.copy = function(s)
	{
		//name already set in constructor
		this.maxTurns = s.maxTurns;
		this.date = new Date(s.date);
		this.atmosferic = s.atmosferic;
		this.latitude = s.latitude;
		this.ground = s.ground;
		this.turnsPerDay = s.turnsPerDay;
		this.map.copy(s.map);
		this.file = s.file;
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
