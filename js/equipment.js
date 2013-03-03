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
		var c = countryList[i] + 1; //TODO fix indexes
		if ((e = loadEquipment(c)) == null)
			return false;

		Equipment.equipmentIndexes[c] = e.indexes;
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

Equipment.getCountryEquipmentByClass = function(uclass, country, sortkey, reverse)
{
	return getCoutryEquipmentByKey("unitclass", uclass,  country, sortkey, reverse);
}

//TODO for the case where a campaign player buys units from a supporting country in a scenario
Equipment.addUnitsToEquipment = function(countryUnitHash)
{

}

function loadEquipment(country)
{
	var jsonFile = Equipment.filePrefix + country + ".json";
	var req = new XMLHttpRequest();
	req.open("GET", Equipment.equipmentPath + jsonFile, false);
	req.send(null);
	console.log("Loading equipment %s", jsonFile);
	if (req.responseText == null)
		return null;
	return JSON.parse(req.responseText);
}

//Selects equipment by key with value(only unitclass defined atm) and country sorting it by sortkey
function getCoutryEquipmentByKey(key, value, country, sortkey, reverse)
{
	var eqList = [];

	if (typeof Equipment.equipmentIndexes[country] === "undefined") //TODO send load request ?
	{
		console.log("Can't lookup equipment index for country %d", country);
		return eqList;
	}

	if (Equipment.equipmentIndexes[country].hasOwnProperty(key))
		eqList = Equipment.equipmentIndexes[country][key][value];



	if (sortkey)
		eqList.sort(keySort(sortkey, reverse));

	return eqList;
}


function keySort(key, reverse)
{
	var order = 1; //ascending
	if (reverse) order = -1; //descending

	return function(a, b) {
		if (Equipment.equipment[a][key] < Equipment.equipment[b][key]) return -1 * order;
		if (Equipment.equipment[a][key] > Equipment.equipment[b][key]) return +1 * order;
		return 0;
	}

}
//------------------------ MODULE END ----------------------
return Equipment; }(Equipment || {})); //Module end