/**
 * Sound sound interface for OpenPanzer
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */
 /* Looks like PCM Wav is supported on Chrome, Firefox, Safari, Opera */
 
 var soundData = 
 {
	"infmove": new soundSprite("resources/sounds/infmove.wav")
 }
 
 function soundSprite(path)
 {
	var sound;
	try 
	{
		sound = new Audio(path);
		sound.load();
	} catch (e) {
		console.log("No audio() support in this browser");
	}
	this.play = function()	{ if (sound) return sound.play(); }
 }