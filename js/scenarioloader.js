/**
 * ScenarioLoader - Loads XML scenarios as exported from mapconvert.py script
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function ScenarioLoader()
{
	var xmlData = null;
	var map = null;

	this.loadScenario = function(mapObj, scenarioFile)
	{
		var xmlHttp;
		map = mapObj;

		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", scenarioFile, false);
		xmlHttp.send(null);

		if ((xmlData = xmlHttp.responseXML) == null)
			return false;

		if (!parseMapHeader())
			return false;
		
		map.allocMap(); //Must have map header properties set
		loadPlayers();
		loadHexes();
		
		return true;
	}
	
	// Private functions 
	function parseMapHeader()
	{
		var mapHeader = xmlData.getElementsByTagName("map")[0];
		if (mapHeader) 
		{
			var rows = +mapHeader.getAttribute("rows");
			var cols = +mapHeader.getAttribute("cols");
			//console.log("Rows: " + rows + " Cols: " + cols);
			if (rows > 0 && rows < 99 && cols > 0 && cols < 99)
			{
				map.rows = rows;
				map.cols = cols;
				map.file = mapHeader.getAttribute("file");
				map.name = mapHeader.getAttribute("name");
				map.description = mapHeader.getAttribute("description");
				map.terrainImage = mapHeader.getAttribute("image");
				map.victoryTurns = mapHeader.getAttribute("turns").split(", ");
				for (var i = 0; i < map.victoryTurns.length; i++)
					map.victoryTurns[i] = +map.victoryTurns[i] //convert to int
				map.maxTurns = map.victoryTurns[2]; //tactical victory

				return true;
			}
		}
		console.log("Invalid map");
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
				p.id = +playerNodes[i].getAttribute("id");
				p.side = +playerNodes[i].getAttribute("side");
				p.country = +playerNodes[i].getAttribute("country");
				p.airTransports = +playerNodes[i].getAttribute("airtrans");
				p.navalTransports = +playerNodes[i].getAttribute("navaltrans");

				p.supportCountries = playerNodes[i].getAttribute("support").split(", ");
				for (var j = 0; j < p.supportCountries.length; j++)
					p.supportCountries[j] = +p.supportCountries[j]; //convert to int

				p.prestigePerTurn = playerNodes[i].getAttribute("turnprestige").split(", ");
				for (var j = 0; j < p.prestigePerTurn.length; j++)
					p.prestigePerTurn[j] = +p.prestigePerTurn[j]; //convert to int

				//Set start prestige
				p.prestige = p.prestigePerTurn[0];

				map.addPlayer(p);
			}
		}
	}
	
	function loadHexes()
	{
		var hexNodes = xmlData.getElementsByTagName("hex");
		if (hexNodes) 
		{
			var hex = null;
			var u = null;
			var row, col, v;
			for (var i = 0; i < hexNodes.length; i++) 
			{
				row = +hexNodes[i].getAttribute("row");
				col = +hexNodes[i].getAttribute("col");
				hex = map.map[row][col];
				if (!hex || typeof hex === "undefined")
				{
					console.log("Invalid Hex at row:" + row + " col:" + col);
					continue;
				}
				
				if ((v = hexNodes[i].getAttribute("terrain")) !== null)
					hex.terrain = +v;
				if ((v = hexNodes[i].getAttribute("road")) !== null)
					hex.road = +v;
				if ((v = hexNodes[i].getAttribute("name")) !== null)
					hex.name = v;
				if ((v = hexNodes[i].getAttribute("flag")) !== null)
					hex.flag = +v;
				if ((v = hexNodes[i].getAttribute("owner")) !== null)
					hex.owner = +v;
				if ((v = hexNodes[i].getAttribute("victory")) !== null)
					hex.victorySide = +v;
				if ((v = hexNodes[i].getAttribute("deploy")) !== null)
					hex.isDeployment = +v;
				
				for (var j = 0; j < hexNodes[i].childNodes.length; j++)
				{		
					if (hexNodes[i].childNodes[j].nodeName == "unit")
					{
						u = loadUnit(hexNodes[i].childNodes[j]);
						if (u !== null)
							hex.setUnit(u);
					}
				}
				map.setHex(row, col);
			}
		}
	}
	
	function loadUnit(node)
	{
		//create the unit object
		var unitId = node.getAttribute("id");
		var playerId = node.getAttribute("owner");
		var u = null;
		var facing, flag, transport, carrier, experience, entrenchment;
		
		if (unitId >= 0 && playerId >= 0)
		{
			u = new Unit(unitId);
			u.owner = playerId >> 0;
			if ((facing = node.getAttribute("face")) !== null)
				u.facing = +facing;
			if ((flag = node.getAttribute("flag")) !== null)
				u.flag = +flag;
			if ((transport = node.getAttribute("transport")) !== null)
				u.setTransport(+transport);
			if ((carrier = node.getAttribute("carrier")) !== null)
				u.carrier = +carrier;
			if ((experience = node.getAttribute("exp")) !== null)
				u.experience = +experience;
			if ((entrenchment = node.getAttribute("ent")) !== null)
				u.entrenchment = +entrenchment;
			
			return u;
		}
		return null;
	}
}