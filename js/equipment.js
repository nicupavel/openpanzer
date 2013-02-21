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

var Equipment = (function(Equipment) { //Module start

Equipment.equipment = {};
Equipment.equipmentIndexes = {};
Equipment.equipmentPath = "resources/equipment/";
Equipment.filePrefix = "equipment-country-";

Equipment.buildEquipment = function(countryList)
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
			//TODO Without this defined the retained size of each object is much bigger
			Equipment.equipment[u] = { gunrange:0, icon:0, yearexpired:0, cost:0, initiative:0, spotrange :0,
				hardatk :0, id :0, softatk:0, uclass:0, airdef:0, fuel:0, rangedefmod:0,airatk :0, movmethod :0,
				navalatk :0, movpoints :0, grounddef :0, target:0, yearavailable :0, name :0, country :0,
				closedef :0, ammo :0 };

			Equipment.equipment[u].__proto__ = null;

			for(var h = 0; h < e.parsehints.length; h++)
				Equipment.equipment[u][e.parsehints[h]] = e.units[u][h];

			//TODO freeze object foreach Object.freeze(Equipment.equipment[u])
		}

		delete e.parsehints;
		delete e.indexes;
		delete e.units;
		e = null;
	}
}

function loadEquipment(country)
{
	country = country + 1; //TODO fix indexes

	var jsonFile = Equipment.filePrefix + country + ".json";
	var req = new XMLHttpRequest();
	req.open("GET", Equipment.equipmentPath + jsonFile, false);
	req.send(null);
	console.log("Loading equipment %s", jsonFile);
	if (req.responseText == null)
		return null;
	return JSON.parse(req.responseText);
}

//------------------------ MODULE END ----------------------
return Equipment; }(Equipment || {})); //Module end