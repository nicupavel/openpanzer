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
	"track": new soundSprite("resources/sounds/track.wav"),
	"htrack": new soundSprite("resources/sounds/htrack.wav"),
	"leg": new soundSprite("resources/sounds/leg.wav"),
	"air": new soundSprite("resources/sounds/air.wav"),
	"naval": new soundSprite("resources/sounds/naval.wav"),
	//"wheel": new soundSprite("resources/sounds/wheel.wav"), //Not used
 }
 
 var moveSoundByMoveMethod = 
 [
 	"track",	//tracked 0
	"htrack",	//halfTracked
    "htrack",	//wheeled
	"leg", 		//leg
	"leg",		//towed
	"air",		//air
	"naval",	//deepnaval
	"naval",	//costal
	"track",	//allTerrainTracked
	"track",	//amphibious
	"naval",	//naval
	"leg"		//allTerrainLeg
 ];
 
 //TODO needs to be in sync with animationChain
 var attackSoundByClass = [];
 var destroyedSoundByClass = [];
 
 function soundSprite(path)
 {
	var sound;
	try 
	{
		sound = new Audio(path);
		sound.load();
	} catch (e) {
		console.log("No Audio() support in this browser");
	}
	this.play = function()	{ if (sound) return sound.play(); }
 }