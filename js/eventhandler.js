/**
 * EventHandler global event manager
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

var EventHandler = new function()
{
	this.events = {};
	
	this.addEvent = function(name)
	{
		var ev;
		if (this.events[name])
			console.log("Warning: event already defined");
		
		ev = document.createEvent("Event");
		ev.initEvent(name, true, true);
		this.events[name] = ev;
	}
	
	this.delEvent = function(name)
	{
		delete this.events[name];
	}
	
	this.addListener = function(name, func, params)
	{
		if (!this.events[name])
		{
			console.log("Can't add listener no such event: " + name);
			return;
		}
		document.addEventListener(name, function(){ func(params); }, false);
	}
	
	this.emitEvent = function(name)
	{
		if (!this.events[name])
		{
			console.log("Can't emit event no such event: " + name);
			return;
		}
		document.dispatchEvent(this.events[name]);
	}
}