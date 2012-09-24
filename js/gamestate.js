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


