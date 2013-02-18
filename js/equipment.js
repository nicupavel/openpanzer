/**
 * Equipment - handles unit equipment
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2013 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

Equipment.equipment = {};
Equipment.equipmentIndexes = {};
Equipment.equipmentPath = "resources/equipment/";
Equipment.filePrefix = "equipment-country-";
Equipment.allCountries = [10,11,13,15,16,18,20,23,25,26,4,6,7,8];
Equipment.testCountries = [10, 8];

function Equipment()
{
	this.buildEquipment = function(countryList)
	{
		var e = null;

		Equipment.equipment = {};
		Equipment.equipmentIndexes = {};

		for (var i = 0; i < countryList.length; i++)
		{
			if ((e = loadEquipment(countryList[i])) == null)
				return false;

			Equipment.equipmentIndexes[countryList[i]] = e.indexes;

			for (var u in e.units)
			{
				Equipment.equipment[u] = {};
				for(var h = 0; h < e.parsehints.length; h++)
					Equipment.equipment[u][e.parsehints[h]] = e.units[u][h];

			}
			delete e.parsehints;
			delete e.indexes;
			delete e.units;
			e = null;

		}
		//equipment = Equipment.equipment;
	}

	function loadEquipment(country)
	{
		var req;
		var jsonFile = Equipment.filePrefix + country + ".json";
		if (jsonFile == null || typeof jsonFile === "undefined")
			return null;

		req = new XMLHttpRequest();
		req.open("GET", Equipment.equipmentPath + jsonFile, false);
		req.send(null);

		if (req.responseText == null)
			return null;
		return JSON.parse(req.responseText);
	}

}