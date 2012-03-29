//Animation.js animates a series of sprites
//o = {ctx, x, y, width, height, frames, image}
function Animation(o)
{
	var timer;
	var count = 0;
	this.start = function(delay)
	{
		timer = setInterval(animate, 100);
	}
	
	function animate()
	{
		o.ctx.clearRect(o.x, o.y, o.width, o.height);
		if (count >= o.frames) { clearInterval(timer);  }
		o.ctx.drawImage(o.image, o.width * count, 0, o.width, o.height, o.x, o.y, o.width, o.height)
		count++;
	}
}