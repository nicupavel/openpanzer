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
	this.file = campaignInfo.file; //Used as "id" for report score facility
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

	this.getCurrentCampaignFlow = function()
	{
		return this.getCampaignFlow(this.id);
	}

	this.getCampaignFlow = function(campaignIndex)
	{
		var campaignData = loadCampaign(campaignlist[campaignIndex].file);
		var flowText = "";
		var l = "<br/>";
		var t = "&nbsp;&nbsp;&nbsp;&nbsp;"

		for (var i = 0; i < campaignData.length; i++)
		{
			var currentScenName =  Scenario.getScenarioDataByFileName(campaignData[i].scenario)[1];
			var lID = campaignData[i].outcome["lose"].goto;

			var lScenName;

			if (lID == 255)
				lScenName = "Defeat (End Campaign)";
			else
				lScenName = Scenario.getScenarioDataByFileName(campaignData[lID].scenario)[1];

			var tID = campaignData[i].outcome["tactical"].goto;
			var tScenName;

			if (tID == 254)
				tScenName = "Victory (End Campaign)";
			else
				tScenName = Scenario.getScenarioDataByFileName(campaignData[tID].scenario)[1];

			var vID = campaignData[i].outcome["victory"].goto;
			var vScenName;

			if (vID == 254)
				vScenName = "Victory (End Campaign)";
			else
				vScenName = Scenario.getScenarioDataByFileName(campaignData[vID].scenario)[1];

			var bID = campaignData[i].outcome["briliant"].goto;
			var bScenName;

			if (bID == 254)
				bScenName = "Victory (End Campaign)";
			else
				bScenName = Scenario.getScenarioDataByFileName(campaignData[bID].scenario)[1];

			if (tScenName == vScenName && vScenName == bScenName)
			{
				flowText += "- <b>" + currentScenName + "</b>" + l + t + "Lose: " + lScenName + l + t +
					"Victory: " + tScenName + l + l;
			}
			else
			{
				flowText += "- <b>" +  currentScenName +  "</b>" + l + t + "Lose: " + lScenName + l + t +
					"Tactical: " + tScenName + l + t +"Victory: " + vScenName + l + t + "Brilliant: " + bScenName + l + l;
			}
		}
		return flowText;
	}

	//Private methods
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