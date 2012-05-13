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
	
	this.start = function()
	{	
		var obj = this; //save this pointer as it gets overwritten by window. context

		if (i < animationTasks.length)
		{
			animationTasks[i].start();
			setTimeout(function() { obj.start(); }, animationTasks[i].getDuration() + 100);
			i++;
		}
		else
		{
			setTimeout(function() {	obj.clear(); }, 100);
		}
	}	
}


//o = {ctx, x, y, width, height, frames, image, rotate}
//Animates a series of frames from image on ctx context at x,y position
function Animation(o)
{
	var timer;
	var count = 0;
	
	this.delay = 150;
	
	this.start = function()
	{
		timer = setInterval(animate, this.delay);
	}
	
	this.getDuration = function()
	{
		return this.delay * o.frames;
	}
	
	function animate()
	{
		o.ctx.clearRect(o.x, o.y, o.width, o.height);
		
		o.ctx.save();
		o.ctx.translate(o.x + o.width/2, o.y + o.height/2);
		o.ctx.rotate(o.rotate);
		if (count >= o.frames) { clearInterval(timer);  }
		o.ctx.drawImage(o.image, o.width * count, 0, o.width, o.height, -o.width/2, -o.height/2, o.width, o.height);
		o.ctx.restore();
		count++;
	}
}

//List of all existing animations
var animationsData = 
{
//AnimationName:new animationSprite(path, totalFrames, frameWidth
"explosion": new animationSprite("resources/animations/explosions.png", 12, 120),
"gun": new animationSprite("resources/animations/fire-gun.png", 6, 150),
"smallgun": new animationSprite("resources/animations/fire-smallgun.png", 8, 80),
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

function animationSprite(path, totalFrames, frameWidth)
{
	this.image = new Image();
	this.image.src = path;
	this.width  = frameWidth;
	this.frames = totalFrames;
}