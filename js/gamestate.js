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

var GameState = GameState || {}; //Namespace emulation

GameState.saveItem = function(key, object)
{
	localStorage.setItem(key, JSON.stringify(object));
}

GameState.restoreItem = function(key)
{
	var object = localStorage.getItem(key);
	return JSON.parse(object);
}

GameState.deleteItem = function(key)
{
	localStorage.removeItem(key);
}

GameState.save = function(map)
{
	GameState.saveItem('openpanzer-map', map);
	GameState.saveItem('openpanzer-players', map.getPlayers());
}

GameState.restore = function()
{
	var map = new Map();
	
	var m = GameState.restoreItem('openpanzer-map');
	var p = GameState.restoreItem('openpanzer-players');
	
	if ((m === null) || (p === null)) 
		return null;
		
	map.copy(m);	
	for (i = 0; i < p.length; i++)
	{
		player = new Player();
		player.copy(p[i]);
		map.addPlayer(player);
	}	
	return map;
}

GameState.clear = function()
{
	GameState.deleteItem('openpanzer-map');
	GameState.deleteItem('openpanzer-players');
}