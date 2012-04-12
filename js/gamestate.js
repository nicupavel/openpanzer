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
			map.setHex(r, c, hex);
			if (hex.unit !== null) 
			{
				u = new Unit(hex.unit.id);
				u.setUnit(hex.unit);
				map.addUnit(u);
			}
		}
	}
	
	for (i = 0; i < p.length; i++)
	{
		map.addPlayer(p[i]);
		
	}
	
	return map;
}

GameState.clear = function()
{
	GameState.deleteItem('openpanzer-map');
}