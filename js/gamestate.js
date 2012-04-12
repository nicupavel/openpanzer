/**
 * GameState - Provides localStorage state and network state
 *
 * http://www.linuxconsulting.ro
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
	
	if ((m === null) || (p === null)) return null;
	
	map.rows = m.rows;
	map.cols = m.cols;
	map.description = m.description;
	map.terrainImage = m.terrainImage;
	map.name = m.name;
	
	map.allocMap();
	
	for (r = 0; r < m.rows; r++)
	{
		for (c = 0; c < m.cols; c++)
		{
			var hex = m.map[r][c];
			var tmphex = new Hex();
			tmphex.copy(hex);
			if (hex.unit !== null) 
			{
				u = new Unit(hex.unit.id);
				u.copy(hex.unit);
				tmphex.setUnit(u);
				map.addUnit(u);
			}
			map.setHex(r, c, tmphex);
		}
	}
	
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
}