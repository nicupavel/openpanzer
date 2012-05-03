/**
 * MapLoader - Loads XML scenarios as exported from mapconvert.py script
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function MapLoader()
{
	var map = null;
	var xmlData = null;
	
	this.loadMap = function(xmlFile) 
	{
		var xmlHtttp;
		
		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", xmlFile, false);
		xmlHttp.send();
		xmlData = xmlHttp.responseXML;
		
		if (xmlData == null) 
		{
			console.log("Cannot load map");
			return false;
		}
		return true;
	}
	
	this.buildMap = function()
	{
		map = new Map();
		if (! parseMapHeader())
		{
			console.log("Invalid map");
			return null;
		}
		map.allocMap();
		loadPlayers();
		loadHexes();
		return map;
	}
	
	// Private functions 
	function parseMapHeader()
	{
		var mapHeader = xmlData.getElementsByTagName("map")[0];
		if (mapHeader) 
		{
			var rows = mapHeader.getAttribute("rows");
			var cols = mapHeader.getAttribute("cols");
			console.log("Rows: " + rows + " Cols: " + cols);
			if (rows > 0 && rows < 99 && cols > 0 && cols < 99)
			{
				map.rows = rows;
				map.cols = cols;
				map.name = mapHeader.getAttribute("name");
				map.description = mapHeader.getAttribute("description");
				map.terrainImage = mapHeader.getAttribute("image"); 
				return true;
			}
			return false;
		}
		return false;
	}
	
	function loadPlayers()
	{
		var playerNodes = xmlData.getElementsByTagName("player");
		if (playerNodes)
		{
			for (var i = 0; i < playerNodes.length; i++)
			{
				var p = new Player();
				p.id = playerNodes[i].getAttribute("id");
				p.side = playerNodes[i].getAttribute("side");
				p.country = playerNodes[i].getAttribute("country");
				map.addPlayer(p);
			}
		}
	}
	
	function loadHexes()
	{
		var hexNodes = xmlData.getElementsByTagName("hex");
		if (hexNodes) 
		{
			for (var i = 0; i < hexNodes.length; i++) 
			{
				var row = hexNodes[i].getAttribute("row");
				var col = hexNodes[i].getAttribute("col");
				var tmphex = new Hex(row, col);
				tmphex.terrain = hexNodes[i].getAttribute("terrain");
				if (tmphex.terrain === null) { tmphex.terrain = 0; }
				tmphex.road = hexNodes[i].getAttribute("road");
				if (tmphex.road === null) { tmphex.road = 0; }
				tmphex.name = hexNodes[i].getAttribute("name");
				if (tmphex.name === null) { tmphex.name = ""; }
				tmphex.flag = hexNodes[i].getAttribute("flag");
				if (tmphex.flag === null) { tmphex.flag = -1; }
				tmphex.owner = hexNodes[i].getAttribute("owner");
				if (tmphex.owner === null) { tmphex.owner = -1; }
				tmphex.victorySide = hexNodes[i].getAttribute("victory");
				if (tmphex.victorySide === null) { tmphex.victorySide = -1; }
				//console.log("Hex at row:" + row + " col:" + col);
				for (var j = 0; j < hexNodes[i].childNodes.length; j++)
				{		
					if (hexNodes[i].childNodes[j].nodeName == "unit")
					{
						u = loadUnit(hexNodes[i].childNodes[j]);
						if (u !== null)
							tmphex.setUnit(u);
					}
				}
				map.setHex(row, col, tmphex);
				delete tmphex;
			}
		}
	}
	
	function loadUnit(node, hex)
	{
		//create the unit object
		var unitId = node.getAttribute("id");
		var playerId = node.getAttribute("owner");
		if (unitId >= 0 &&  playerId >= 0)
		{
			var u = new Unit(unitId);
			u.owner = playerId;
			var facing = node.getAttribute("face");
			if (facing !== null) { u.facing = facing; }
			var flag = node.getAttribute("flag");
			if (flag !== null) { u.flag = flag; }
			var transport = node.getAttribute("transport");
			if (transport !== null) {u.setTransport(transport); }
			
			return u;
		}
		
		return null;
	}
	
}