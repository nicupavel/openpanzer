

function UI()
{
	var l = new MapLoader();
	l.loadMap("map0001.xml");
	var map = l.buildMap();
	//map.dumpMap();
	var r = new Render(map);
	r.drawHexes();
	var canvas = r.getHexesCanvas();
	canvas.addEventListener("mousedown", handleMouseClick, false);

function handleMouseClick(e) 
{
	var hex;
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	hex = map.map[row][col];
	
	//Selected hex has a unit ?
	if (hex.unit) 
	{
		map.delCurrentHex();
		map.setCurrentHex(row, col);
		map.delSelected();
		if (!hex.unit.hasMoved) { map.setHexRange(row, col, hex.unit.unitData.moveRadius); }
		else  { if (!hex.unit.hasFired) { map.setHexRange(row, col, hex.unit.unitData.attackRadius); } }
	}	
	else
	{
		//Do we already have a selected unit ?
		if (map.currentHex != null)
		{	
			console.log("A unit is selected");
			//move to an allowed hex
			if (hex.isSelected) 
			{
				//TODO move function in map class
				//value copy 
				hex.unit = map.currentHex.unit;
				map.currentHex.delUnit();
			}
			map.delCurrentHex();
		}
		else
		{
			console.log("No unit selected");
		}
		map.delSelected();
	}
	

	
	//ToDo partial screen updates
	r.drawHexes(); 
}

function getMouseInfo(canvas, e)
{
	var mx, my, rclick;
	if (e.which) rclick = (e.which == 3);
	else if (e.button) rclick = (e.button == 2);
						
	mx = e.clientX - canvas.offsetLeft + document.body.scrollLeft + document.documentElement.scrollLeft;
	my = e.clientY - canvas.offsetTop + document.body.scrollTop + document.documentElement.scrollTop;;	
	
	var minfo =  new mouseInfo(mx, my, rclick);
	return minfo;
}
}
function gameStart()
{
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	ui = new UI();
}