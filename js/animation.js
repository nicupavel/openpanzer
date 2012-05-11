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


//o = {ctx, x, y, width, height, frames, image}
//Animates a series of frames from image on ctx context at x,y position
function Animation(o)
{
	var timer;
	var count = 0;
	
	this.delay = 100;
	
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
		if (count >= o.frames) { clearInterval(timer);  }
		o.ctx.drawImage(o.image, o.width * count, 0, o.width, o.height, o.x, o.y, o.width, o.height);
		count++;
	}
}

//List of all existing animations
var animationsData = 
{
//AnimationName:new animationSprite(path, totalFrames, frameWidth
"explosion": new animationSprite("resources/animations/explosions.png", 12, 120),
};
//
function animationSprite(path, totalFrames, frameWidth)
{
	this.image = new Image();
	this.image.src = path;
	this.width  = frameWidth;
	this.frames = totalFrames;
}