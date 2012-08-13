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
	
	if (e !== null)
		e.appendChild(t);
		
	return t;
}

//inserta a tag before a child element
function insertTag(parent, tag, child)
{
	var e, c;
	var t = document.createElement(tag);
	
	if (typeof(parent) === 'string') {	e = $(parent); }
	else {e = parent;}
	
	if (typeof(child) === 'string') {	c = $(child); }
	else {c = child;}
	
	
	if (e !== null && c !== null)
		e.insertBefore(t, c);
		
	return t;
}

//remove a DOM tag
function delTag(tag)
{
	if (tag && tag.parentNode)
		tag.parentNode.removeChild(tag);
}

//remove all children of a tag
function clearTag(tag)
{
	var t;
	if (typeof(tag) === 'string') {	t = $(tag); }
	else {t = tag;}
	
	while (t && t.hasChildNodes()) 
    	t.removeChild(t.lastChild);
}
//Taken from http://modernizr.github.com/Modernizr/touch.html
function hasTouch()
{
	return "ontouchstart" in window;
}

function hoverin(e)
{
	if (!e || typeof e === "undefined")
		return;
	
	var path = e.src.substring(0, e.src.lastIndexOf('/') + 1);
	e.src = path + e.id + "-over.png";
}

function hoverout(e)
{
	if (!e || typeof e === "undefined")
		return;
	
	var path = e.src.substring(0, e.src.lastIndexOf('/') + 1);
	e.src = path + e.id + ".png";
}

function toggleButton(e, state)
{
	if (state)
		hoverin(e);
	else
		hoverout(e);
}

function isVisible(tag)
{
	var v = $(tag).style.display;
	
	if (v != "" && v != "none")
		return true;
	
	return false;
}

function bounceText(x, y, text)
{
	var cdiv = addTag('game', 'div');
	var ldiv = addTag(cdiv, 'div');
	cdiv.style.cssText = "position:absolute; top:"+ y + "px; left:" + x + "px";
	//CSS AnimationEvent callback to delete the created parent div
	ldiv.addEventListener("animationend", function() { delTag(this.parentNode); }, false); //mozilla
	ldiv.addEventListener("webkitAnimationEnd", function() { delTag(this.parentNode); }, false); //webkit
	ldiv.className = "textBounce";
	ldiv.innerHTML = text;
}