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
	//move sounds
	"track": new soundSprite("resources/sounds/move/track.wav"),
	"htrack": new soundSprite("resources/sounds/move/htrack.wav"),
	"leg": new soundSprite("resources/sounds/move/leg.wav"),
	"air": new soundSprite("resources/sounds/move/air.wav"),
	"naval": new soundSprite("resources/sounds/move/naval.wav"),
	//"wheel": new soundSprite("resources/sounds/move/wheel.wav"), //Not used
	//attack sounds
	"gun": new soundSprite("resources/sounds/fire/gun.wav"),
	"smallgun": new soundSprite("resources/sounds/fire/smallgun.wav"),
	//explosion sounds
	"explosion": new soundSprite("resources/sounds/fire/explosion.wav"),
	//dummy sound
	"dummy": new soundSprite("")
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
 
 //TODO preloading
 //TODO stop method (pause/currentTime = 0)
 //TODO check error in .currentTime member thrown on some browsers
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
	
	this.play = function()	
	{ 
		if (sound && !uiSettings.muteUnitSounds)
		{	
        		//requires audio to be preloaded
			try { sound.currentTime = 0; } catch(e) {}; //restart if already playing
			return sound.play();
		}
	}
 }
 