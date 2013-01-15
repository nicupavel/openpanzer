/**
 * Campaign - handles campaign related tasks
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function Campaign(campIndex)
{
	var campaignInfo = campaignlist[campIndex];
	
	this.startprestige = campaignInfo.prestige;
	this.name = campaignInfo.title;
	this.country = campaignInfo.flag;
	this.id = campIndex;

	var currentScenario = 0;
	var campaignPath = "resources/campaigns/data/";
	var campaignData = loadCampaign(campaignInfo.file);

	this.setScenarioById = function(scenarioID)
	{
		if (scenarioID < campaignData.length)
			currentScenario = scenarioID;
	}
	
	//Lookup scenario name in the campaignData and set currentScenario
	this.setScenarioByName = function(scenarioName)
	{
		var i;
		var hasPath = scenarioName.lastIndexOf('/');
		//strip path
		if (hasPath > -1)
			scenarioName = scenarioName.substring(hasPath + 1);

		for (i = 0; i < campaignData.length; i++)
		{
			if (campaignData[i].scenario === scenarioName)
			{
				currentScenario = i;
				return true;
			}
		}

		return false;
	}

	this.getCurrentScenario = function()
	{
		return campaignData[currentScenario];
	}

	this.loadNextScenario = function(outcomeType)
	{
		//TODO implement gotoplayed
		var o = getOutcome(outcomeType);
		if (o.goto < campaignData.length) 
		{
			currentScenario = o.goto;
			return campaignData[o.goto];
		}
		else
			return null;
	}
	
	this.getOutcomePrestige = function(outcomeType)
	{
		var o = getOutcome(outcomeType);
		return o.prestige;
	}
	
	this.getOutcomeText = function(outcomeType)
	{
		var o = getOutcome(outcomeType);
		return o.text;
	}
	
	function getOutcome(outcomeType)
	{
		return campaignData[currentScenario].outcome[outcomeType];
	}


	function loadCampaign(jsonFile)
	{
		var req;
		if (jsonFile == null || typeof jsonFile === "undefined")
			return null;

		req = new XMLHttpRequest();
		req.open("GET", campaignPath + jsonFile, false);
		req.send(null);

		if (req.responseText == null)
			return null;

		return JSON.parse(req.responseText);
	}

}