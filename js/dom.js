/**
 * DOM generic functions
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

// Get the element with ID id
function $(id)
{
	return document.getElementById(id);
}

//can be called with a id string or a element object directly
//return pointer to the newly created tag
function addTag(parent, tag)
{
	var e;
	var t = document.createElement(tag);
	if (typeof(parent) === 'string') {	e = $(parent); }
	else {e = parent;}
	
	e.appendChild(t);
	return t;
}

function hoverin(e)
{
	var path = e.src.substring(0, e.src.lastIndexOf('/') + 1);
	e.src = path + e.id + "-over.png";
}

function hoverout(e)
{
	var path = e.src.substring(0, e.src.lastIndexOf('/') + 1);
	e.src = path + e.id + ".png";
}