/**
 * Style - basic styles support for rendering on canvas
 *
 * http://www.linuxconsulting.ro
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function RenderStyle() 
{
	var pg2hexstyle = 
	{
	"selected":{ //Move selected hexes
		"fillColor": "rgba(128,128,128,0.5)",
		"lineColor": "rgba(128,128,128,0.2)",
		"lineWidth":  1,
		"lineJoin":  "miter",
		},
	"attack":{ //Attack selected hexes
		"fillColor": "rgba(128,128,128,0.5)",
		"lineColor": "rgba(239,0,0,0.8)",
		"lineWidth":  3,
		"lineJoin":  "miter",
		},
	"current": { //Current selected hex
		"fillColor": null ,
		"lineColor": "rgba(240,240,240,0.8)",
		"lineWidth": 3,
		"lineJoin": "round",
		},
	"normal": { //Normal drawing of hex grid
		"fillColor": null,
		"lineColor": "rgba(39,44,47,0.9)",
		"lineWidth": 0.4,
		"lineJoin": "miter",
		},
	"hidden": { //Hidden drawin of hex grid
		"fillColor": null,
		"lineColor": "rgba(128,128,128,0.8)",
		"lineWidth": 0.001,
		"lineJoin": "miter",
		}
	}	

	var theme  = pg2hexstyle;;
	var hexShown = true;
	this.selected = theme.selected;
	this.current = theme.current;
	this.generic = theme.normal;
	this.attack = theme.attack;
	
	this.setTheme = function(theme)
	{
		if (theme === null || typeof(customTheme) === "undefined") { theme = pg2hexstyle; }
		this.selected = theme.selected;
		this.current = theme.current;
		this.generic = theme.normal;
		this.attack = theme.attack;
	}

	this.toggleHexes = function() 
	{ 
		hexShown = !hexShown;
		if (hexShown) { this.generic = theme.normal; }
		else {this.generic = theme.hidden; }
	}
}