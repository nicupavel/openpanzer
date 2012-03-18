
function RenderStyle() 
{
	var pg2hexstyle = 
	{
	"selected":{
		"fillColor": "rgba(128,128,128,0.5)",
		"lineColor": "rgba(128,128,128,0.2)",
		"lineWidth":  1,
		"lineJoin":  "miter",
		},
	"current": {
		"fillColor": null ,
		"lineColor": "rgba(240,240,240,0.8)",
		"lineWidth": 3,
		"lineJoin": "round",
		},
	"normal": {
		"fillColor": null,
		"lineColor": "rgba(128,128,128,0.5)",
		"lineWidth": 1,
		"lineJoin": "miter",
		},
	"hidden": {
		"fillColor": null,
		"lineColor": "rgba(128,128,128,0.8)",
		"lineWidth": 0.001,
		"lineJoin": "miter",
		}
	}	
	//How to draw selected, current(cursor selected) and generic hexes
	var theme  = pg2hexstyle;;
	var hexShown = true;
	this.selected = theme.selected;
	this.current = theme.current;
	this.generic = theme.normal;
	
	this.setTheme = function(theme)
	{
		if (theme === null || typeof(customTheme) === "undefined") { theme = pg2hexstyle; }
		this.selected = theme.selected;
		this.current = theme.current;
		this.render = theme.normal;
	}

	this.toggleHexes = function() 
	{ 
		hexShown = !hexShown;
		if (hexShown) { this.generic = theme.normal; }
		else {this.generic = theme.hidden; }
	}
}