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

//inserta a tag before a child element if child is null is placed at the end of node list
function insertTag(parent, tag, child)
{
	var e, c;
	var t = document.createElement(tag);
	
	if (typeof(parent) === 'string') {	e = $(parent); }
	else {e = parent;}
	
	if (typeof(child) === 'string') {	c = $(child); }
	else {c = child;}
	
	
	if (e !== null)
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

//set current option of a select element by matching string
function setSelectOption(e, str)
{
	var o = e.options;
	for (var i = 0; i < o.length; i++)
	{
		o[i].selected = false; //deselect option
		if (o[i].text === str)
		{
			o[i].selected = true;
			e.onchange(); //Call the onchange() function
			return true;
		}
	}
	return false;
}

//Taken from http://modernizr.github.com/Modernizr/touch.html
function hasTouch()
{
	return "ontouchstart" in window;
}

//Function to disable/enable right click
function toggleRightClick( status )
{
	window.oncontextmenu = function() { return status; }
}

function hasBrokenScroll()
{
	var ua = navigator.userAgent;
	//Stock android browser on froyo/gingerbread suffers from div overflow scroll issue
	if (ua.match(/android 2/i) && ua.match(/applewebkit/i))
		return true;
	//Chrome mobile on jelly bean has issue bubbling up the evens to the game div and doesn't scroll
	if (ua.match(/android 4/i) &&  ua.match(/chrome/i) && ua.match(/applewebkit/i))
		return true;
	return false;
}

//Android 4.x stock browser has issues clearing the canvas. Canvas retain a random drawing state from the first
//writes that come in a certain time after the canvas was created
function hasBrokenClearRect()
{
	var ua = navigator.userAgent;
	//Stock android browser on froyo/gingerbread suffers from div overflow scroll issue
	if (ua.match(/android 4/i) && !ua.match(/chrome/i))
		return true;
	return false;
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

function toggleButton(p, state)
{
	var e;
	//Change the image from the button which *usually* is the firstChild
	if (p && typeof p.firstChild !== "undefined")
		e = p.firstChild;
	else
		e = p;
		
	if (state)
		hoverin(e);
	else
		hoverout(e);
}

//Toggles a checkbox image(<name>-checked.png must exist)
function toggleCheckbox(e)
{
	if (! e || !e.src) return;

	var path = e.src.substring(0, e.src.lastIndexOf('/') + 1);
	var hasChecked = e.src.lastIndexOf('-checked');
	var name;
	
	if (hasChecked > -1)
		name = e.src.substring(e.src.lastIndexOf('/') + 1, hasChecked);
	else
		name = e.src.substring(e.src.lastIndexOf('/') + 1, e.src.lastIndexOf('.')) + "-checked";

	e.src = path + name + ".png";
}

function isVisible(tag)
{
	var v = $(tag).style.display;
	
	if (v != "" && v != "none")
		return true;
	
	return false;
}

function makeVisible(tag)
{
	$(tag).style.display = "inline";
	$(tag).focus();
}

function makeHidden(tag)
{
	$(tag).style.display = "none";
	$('game').focus() //focus back the game canvas
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

//Taken from seabreezecomputers.com/tips/scroll-div.htm
function touchScroll(id)
{
	var scrollStartPosY = 0;
	var scrollStartPosX = 0;
	
	$(id).addEventListener("touchstart", function(event) 
		{
			scrollStartPosY = this.scrollTop + event.touches[0].pageY;
			scrollStartPosX = this.scrollLeft + event.touches[0].pageX;
			//event.preventDefault(); // Keep this remarked so you can click on buttons and links in the div
		}, false);
	
	$(id).addEventListener("touchmove", function(event) 
		{
			// These if statements allow the full page to scroll (not just the div) if they are
			// at the top of the div scroll or the bottom of the div scroll
			// The -5 and +5 below are in case they are trying to scroll the page sideways
			// but their finger moves a few pixels down or up.  The event.preventDefault() function
			// will not be called in that case so that the whole page can scroll.
			if ((this.scrollTop < (this.scrollHeight - this.offsetHeight) &&
				(this.scrollTop + event.touches[0].pageY) < scrollStartPosY - 5) ||
				(this.scrollTop != 0 && (this.scrollTop + event.touches[0].pageY) > (scrollStartPosY + 5)))
					event.preventDefault();
		
			if ((this.scrollLeft < (this.scrollWidth-this.offsetWidth) &&
				(this.scrollLeft + event.touches[0].pageX) < scrollStartPosX-5) ||
				(this.scrollLeft != 0 && (this.scrollLeft + event.touches[0].pageX) > (scrollStartPosX + 5)))
					event.preventDefault();	
		
			this.scrollTop = scrollStartPosY-event.touches[0].pageY;
			this.scrollLeft = scrollStartPosX-event.touches[0].pageX;
		}, false);
}

function changeViewPort()
{
        var i, meta = null;
        var scale = 1.0;
        var ratio = window.devicePixelRatio || 1;
        var metaTags = document.getElementsByTagName("meta");

        for (i = 0; i < metaTags.length; i++)
                if (metaTags[i].name == "viewport")
                    meta = metaTags[i];

        if (meta === null)
        {
            meta = addTag(document.getElementsByTagName('head')[0], "meta");
            meta.id = "viewport";
            meta.name = "viewport";
        }

	//var ua = navigator.userAgent;
        //if (ua.match(/(iPad|iPhone|iPod)/i)) //Only for iOS devices
        if (uiSettings.useRetina)
                scale = 1.0 / ratio;

        meta.content = "width=device-width, initial-scale=" + scale +", maximum-scale=" + scale + ", user-scalable=0";
}
changeViewPort(); //Set default viewport settings