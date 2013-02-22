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
	var scen = null;

	this.loadScenario = function(scenarioObject)
	{
		var xmlHttp;

		scen = scenarioObject;

		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", Scenario.scenarioPath + scen.file, false);
		xmlHttp.send(null);

		if ((xmlData = xmlHttp.responseXML) == null)
			return false;

		if (!parseMapHeader())
			return false;
		
		scen.map.allocMap(); //Must have map header properties set
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
				scen.map.rows = rows;
				scen.map.cols = cols;
				scen.map.name = mapHeader.getAttribute("name");
				scen.map.terrainImage = mapHeader.getAttribute("image");
				scen.map.victoryTurns = mapHeader.getAttribute("turns").split(", ");

				for (var i = 0; i < scen.map.victoryTurns.length; i++)
					scen.map.victoryTurns[i] = +scen.map.victoryTurns[i] //convert to int

				scen.map.maxTurns = scen.map.victoryTurns[2]; //tactical victory

				//TODO move more generics from map to scenario object
				scen.maxTurns = scen.map.victoryTurns[2]; //tactical victory
				scen.date.setTime(Date.parse(mapHeader.getAttribute("date")));
				scen.atmosferic = +mapHeader.getAttribute("atmosferic");
				scen.latitude = +mapHeader.getAttribute("latitude");
				scen.ground = +mapHeader.getAttribute("ground");

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

				scen.map.addPlayer(p);
			}
		}

		//Build the equipment since we know all player and supporting countries
		var countryList = scen.map.getCountriesBySide(0)
		Equipment.buildEquipment(countryList.concat(scen.map.getCountriesBySide(1)));

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
				hex = scen.map.map[row][col];
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
				scen.map.setHex(row, col);
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