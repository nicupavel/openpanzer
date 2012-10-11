/**
 * Animation animates a series of sprites
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */
 
//Runs a series of animations in order
function AnimationChain()
{
	var animationTasks = [];
	var chainDelay = 500;
	var i = 0;
	
	this.add = function(o)
	{
		animationTasks.push(new Animation(o));
	}
	
	this.clear = function()
	{
		animationTasks = [];
		i = 0;
	}
	
	this.start = function(animationCBData)
	{	
		var obj = this; //save this pointer as it gets overwritten by window. context

		if (i < animationTasks.length)
		{
			animationTasks[i].start();
			setTimeout(function() { obj.start(animationCBData); }, animationTasks[i].getDuration() + chainDelay);
			i++;
		}
		else
		{

			if (animationCBData !== null && typeof animationCBData !== "undefined")
				animationCBData.cbfunc(animationCBData);
			setTimeout(function() {	obj.clear(); }, 100);
		}
	}	
}


//o = {ctx, x, y, rotate, animationSprite}
//Animates a series of frames from image on ctx context at x,y position
function Animation(o)
{
	var timer;
	var count = 0;
	
	this.delay = 150;
	
	this.start = function()
	{
		o.sprite.sound.play(); //Play the associated sound
		timer = setInterval(animate, this.delay);
	}
	
	this.getDuration = function()
	{
		return this.delay * o.sprite.frames;
	}

	function animate()
	{
		o.ctx.clearRect(o.x, o.y, o.sprite.width, o.sprite.image.height);
		//Do one more loop to clear last frame rendered
		if (count > o.sprite.frames) clearInterval(timer);
		if (count <= o.sprite.frames)
		{
			o.ctx.save();
			o.ctx.translate(o.x + o.sprite.width/2, o.y + o.sprite.image.height/2);
			o.ctx.rotate(o.rotate);
			o.ctx.drawImage(o.sprite.image, o.sprite.width * count, 0, o.sprite.width, 
				o.sprite.image.height, -o.sprite.width/2, -o.sprite.image.height/2, 
				o.sprite.width, o.sprite.image.height);
			o.ctx.restore();
		}
		count++;
	}
}

//List of all existing animations
var animationsData = 
{
	//AnimationName: new animationSprite(path, totalFrames, frameWidth, soundSpriteName)
	"explosion": new animationSprite("resources/animations/explosions.png", 12, 120, "explosion" ),
	"gun": new animationSprite("resources/animations/fire-gun.png", 6, 150, "gun"),
	"smallgun": new animationSprite("resources/animations/fire-smallgun.png", 8, 80, "smallgun"),
};

//Which attack animations belong to each unit class
var attackAnimationByClass = 
[
"none", //None
"smallgun", //infantry
"gun", //tank
"gun", //recon
"gun", //antiTank
"gun", //flak
"smallgun", //fortification
"smallgun", //groundTransport
"gun", //artillery
"gun", //airDefence
"smallgun", //fighter
"smallgun", //tacticalBomber
"smallgun", //levelBomber
"none", //airTransport
"gun", //submarine
"gun", //destroyer
"gun", //battleship
"none", //carrier
"none", //navalTransport
"gun", //battleCruiser
"gun", //cruiser
"gun", //lightCruiser
];

//TODO preloading
function animationSprite(imagePath, totalFrames, frameWidth, soundSpriteName)
{
	this.image = new Image();
	this.image.src = imagePath;
	this.width  = frameWidth;
	this.frames = totalFrames - 1; //index from 0
	if (soundSpriteName && typeof soundSpriteName !== "undefined")
		this.sound = soundData[soundSpriteName];
	else
		this.sound = soundData["dummy"];
}