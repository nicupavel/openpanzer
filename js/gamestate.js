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
	
	this.save = function()
	{
		saveItem('openpanzer-map-'+VERSION, Game.map);
		saveItem('openpanzer-players-'+VERSION, Game.map.getPlayers());
	}

	this.restore = function()
	{
		var m = restoreItem('openpanzer-map-'+VERSION);
		var p = restoreItem('openpanzer-players-'+VERSION);
		
		if ((m === null) || (p === null)) 
			return false;
		
		//Need to restore the settings since some players might be assigned to AI
		this.restoreSettings();
		
		var map = Game.map;
		
		for (i = 0; i < p.length; i++)
		{
			player = new Player();
			player.copy(p[i]);
			map.addPlayer(player);
		}	
		map.copy(m);	
		
		return true;
	}

	this.clear = function()
	{
		deleteItem('openpanzer-map-'+VERSION);
		deleteItem('openpanzer-players-'+VERSION);
	}

	//Saves only the user settings
	this.saveSettings = function()
	{
		saveItem('openpanzer-settings-'+VERSION, uiSettings);
	}
	
	this.restoreSettings = function()
	{
		var s = restoreItem('openpanzer-settings-'+VERSION);
		
		if (!s) return false;
		//Not all settings need to be restored since some are temp only
		uiSettings.markOwnUnits = s.markOwnUnits;
		uiSettings.use3D = s.use3D;
		uiSettings.useRetina = s.useRetina;
		
		//Restore player AI settings
		for (var i = 0; i < s.isAI.length; i++)
			uiSettings.isAI[i] = s.isAI[i];
	}
	
	//Private functions
	function saveItem(key, object)
	{
		localStorage.setItem(key, JSON.stringify(object));
	}
	
	function restoreItem(key)
	{
		var object = localStorage.getItem(key);
		if (object)	return JSON.parse(object);
		else return null;
	}
	
	function deleteItem(key)
	{
		localStorage.removeItem(key);
	}
}


