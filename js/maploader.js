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
	
	function loadHexes()
	{
		var hexNodes = xmlData.getElementsByTagName("hex");
		if (hexNodes) 
		{
			for (var i = 0; i < hexNodes.length; i++) 
			{
				var tmphex = new Hex();
				var row = hexNodes[i].getAttribute("row");
				var col = hexNodes[i].getAttribute("col");
				tmphex.terrain = hexNodes[i].getAttribute("terrain");
				tmphex.name = hexNodes[i].getAttribute("name");
				//console.log("Hex at row:" + row + " col:" + col);
				for (var j = 0; j < hexNodes[i].childNodes.length; j++)
				{		
					if (hexNodes[i].childNodes[j].nodeName == "unit")
					{
						//create the unit object
						var unitId = hexNodes[i].childNodes[j].getAttribute("id");
						var playerId = hexNodes[i].childNodes[j].getAttribute("player");
						if (unitId >= 0 &&  playerId >= 0)
						{
							var u = new Unit(unitId);
							u.setUnitToPlayer(playerId);
							map.addUnit(u);
							tmphex.setUnit(u); //tmphex.unit.dumpUnit();
							break;
						}
					}
				}
				map.setHex(row, col, tmphex);
				delete tmphex;
			}
		}
	}
	
	function parseUnit()
	{
	
	}
	
}