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

GameState.save = function(object)
{
	localStorage.setItem('openpanzer', JSON.stringify(object));
}

GameState.restore = function()
{
	var object = localStorage.getItem('openpanzer');
	return JSON.parse(object);
}

GameState.clear = function()
{
	localStorage.removeItem('openpanzer');
}
