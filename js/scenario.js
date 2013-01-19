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
}
