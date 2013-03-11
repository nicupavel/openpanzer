/**
 * GameState - Provides localStorage state and network state
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */
function GameState(Game)
{

	var saveName =
	{

		scenario:'openpanzer-scenario-'+VERSION,
		players: 'openpanzer-players-'+VERSION,
		settings:'openpanzer-settings-'+VERSION,
		campaign:'openpanzer-campaign-'+VERSION,
	};

	this.save = function()
	{
		saveItem(saveName.scenario, Game.scenario);
		saveItem(saveName.players, Game.scenario.map.getPlayers());
	}

	this.restore = function()
	{
		var player;
		var s = restoreItem(saveName.scenario);
		var p = restoreItem(saveName.players);
		var c = restoreItem(saveName.campaign);
		
		if ((s === null) || (p === null))
			return false;
		
		//Need to restore the settings since some players might be assigned to AI
		this.restoreSettings();

		Game.scenario = new Scenario(s.file);
		var map = Game.scenario.map;

		for (var i = 0; i < p.length; i++)
		{
			player = new Player();
			player.copy(p[i]);
			map.addPlayer(player);
		}

		//Build the equipment since we know all player and supporting countries
		var countryList = map.getCountriesBySide(0);
		Equipment.buildEquipment(countryList.concat(map.getCountriesBySide(1)));

		Game.scenario.copy(s);

		//Restore campaign state
		if (c !== null)
		{
			Game.campaign = new Campaign(c.id);
			Game.campaign.setScenarioById(c.scenario);
			p = map.getPlayersByCountry(c.country)[0]; //Get first player of a country
			map.restoreCoreUnitList(p, c.coreUnits);

		}

		return true;
	}

	this.clear = function()
	{
		deleteItem(saveName.scenario);
		deleteItem(saveName.players);
		deleteItem(saveName.campaign);
	}

	//Save campaign settings
	this.saveCampaign = function()
	{
		var campaignSave = null;

		if (Game.campaign !== null)
		{
			campaignSave =
			{
				id:Game.campaign.id,
				scenario: Game.campaign.getCurrentScenario().id,
				country: Game.campaign.country,
				coreUnits: Game.getCampaignPlayer().getCoreUnitList(),
			};
		}

		saveItem(saveName.campaign, campaignSave);
	}
	
	//Saves only the user settings
	this.saveSettings = function()
	{
		saveItem(saveName.settings, uiSettings);
	}
	
	this.restoreSettings = function()
	{
		var s = restoreItem(saveName.settings);
		
		if (!s) return false;
		//Not all settings need to be restored since some are temp only
		uiSettings.markOwnUnits = s.markOwnUnits;
		uiSettings.markEnemyUnits = s.markEnemyUnits;
		uiSettings.use3D = s.use3D;
		uiSettings.useRetina = s.useRetina;
		uiSettings.showGridTerrain = s.showGridTerrain;
		uiSettings.muteUnitSounds = s.muteUnitSounds;
		
		//Restore player AI settings
		for (var i = 0; i < s.isAI.length; i++)
			uiSettings.isAI[i] = s.isAI[i];

		return true;
	}
	
	//Private functions
	function saveItem(key, object)
	{
		if (localStorage)
			localStorage.setItem(key, JSON.stringify(object));
	}
	
	function restoreItem(key)
	{
		var object = null;

		if (localStorage)
			object = localStorage.getItem(key);

		if (object)
			return JSON.parse(object);

		return null;
	}
	
	function deleteItem(key)
	{
		if (localStorage)
			localStorage.removeItem(key);
	}
}


