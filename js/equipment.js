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

var AVAILABLE_MASK 			= 1;      //bit 1
var IGNORE_ENTRENCH_MASK 	= 1 << 2; //bit 3 (skip 2 is unknown)
var BRIDGE_MASK				= 1 << 3; //bit 4
var START_SOFT_ATTACK_MASK	= 1 << 4;
var START_HARD_ATTACK_MASK	= 1 << 5;
var START_AIR_ATTACK_MASK	= 1 << 6;
var NON_PURCHASABLE_MASK	= 1 << 7;
// Second byte
var AI_PURCHASABLE_MASK		= 1 << 8;
var MOUNTAIN_MOVE_MASK		= 1 << 9;
var RECON_MOVE_MASK			= 1 << 10;
var ATTACK_DISEMBARK_MASK	= 1 << 11;
var SUPPORT_FIRE_MASK		= 1 << 12;
var AIR_SUPPLY_MASK			= 1 << 13;
var AIR_TRANSPORTABLE_MASK	= 1 << 14;
var ATTACK_AIR_MASK			= 1 << 15;
// Third byte
var COMBAT_SUPPORT_MASK		= 1 << 16;
var PROTOTYPE_MASK			= 1 << 17;
var PURCHASABLE_MASK		= 1 << 18;
var CARRIER_DEPLOY_MASK		= 1 << 19;
var FLAG_CAPTURE			= 1 << 20;

Equipment.resetEquipment = function()
{
	Equipment.equipment = {};
	Equipment.equipmentIndexes = {};
}

Equipment.addCountryListEquipment = function(countryList)
{
	for (var i = 0; i < countryList.length; i++)
	{
		if (countryList[i] > 0)
			Equipment.addCountryEquipment(countryList[i] - 1); //TODO FIX index. For supporting countries number is correctly saved in scenario
	}
}

Equipment.addCountryEquipment = function(country)
{
	var e = null;
	var c = country + 1; //TODO fix indexes

	if ((e = loadEquipment(c)) == null)
		return false;

	Equipment.equipmentIndexes[c] = e.indexes;
	for (var u in e.units)
	{
		//TODO Without this defined the retained size of each object is much bigger
		//See: https://code.google.com/p/v8/issues/detail?id=2547
		Equipment.equipment[u] = { gunrange:0, icon:0, yearexpired:0, cost:0, initiative:0, spotrange:0,
			hardatk:0, softatk:0, uclass:0, airdef:0, fuel:0, airseaweight:0, rangedefmod:0,
			airatk:0, groundweight:0, movmethod:0, navalatk:0, movpoints:0, grounddef:0, target:0,
			yearavailable:0, name:0, country:0, closedef:0, ammo:0, attr:0 };

		Equipment.equipment[u].__proto__ = null;

		for(var h = 0; h < e.parsehints.length; h++)
			Equipment.equipment[u][e.parsehints[h]] = e.units[u][h];

		//TODO freeze object foreach Object.freeze(Equipment.equipment[u]) to prevent modifications
	}

	delete e.parsehints;
	delete e.indexes;
	delete e.units;
	e = null;

	return true;
}


Equipment.getCountryEquipmentByClass = function(uclass, country, sortkey, reverse)
{
	return getCountryEquipmentByKey("unitclass", uclass,  country, sortkey, reverse);
}

Equipment.getCountryEquipmentByYearRange = function(startYear, endYear, country)
{
	var eqList = [];
	var u, id = 0;

	if (typeof Equipment.equipmentIndexes[country] === "undefined") //TODO send load request ?
	{
		console.log("Can't lookup equipment index for country %d", country);
		return eqList;
	}

	for (id in Equipment.equipment)
	{
		u = Equipment.equipment[id];
		if (u.country == country && u.yearavailable >= startYear && u.yearavailable <= endYear)
		{
			eqList.push(+id); //make it integer
		}
	}

	return eqList;
}

//TODO for the case where a campaign player buys units from a supporting country in a scenario
Equipment.addUnitsToEquipment = function(countryUnitHash)
{

}

Equipment.isBridge = function(eqid)
{
	if (typeof Equipment.equipment[eqid] === "undefined")
		return false;

	if ((Equipment.equipment[eqid]["attr"] & BRIDGE_MASK) != 0)
		return true;

	return false;
}

Equipment.ignoresEntrenchment = function(eqid)
{
	if (typeof Equipment.equipment[eqid] === "undefined")
		return false;

	if ((Equipment.equipment[eqid]["attr"] & IGNORE_ENTRENCH_MASK) != 0)
		return true;

	return false;
}

Equipment.isPurchasable = function(eqid)
{
	if (typeof Equipment.equipment[eqid] === "undefined")
		return false;

	if ((Equipment.equipment[eqid]["attr"] & PURCHASABLE_MASK) != 0)
		return true;

	return false;
}

Equipment.canInitiateAttackOnUnitType = function(eqid, targetType)
{
	if (typeof Equipment.equipment[eqid] === "undefined")
		return false;

	if ((targetType == unitType.soft) && (Equipment.equipment[eqid]["attr"] & START_SOFT_ATTACK_MASK) != 0)
		return false;

	if ((targetType == unitType.hard) && (Equipment.equipment[eqid]["attr"] & START_HARD_ATTACK_MASK) != 0)
		return false;

	if ((targetType == unitType.air) && (Equipment.equipment[eqid]["attr"] & START_AIR_ATTACK_MASK) != 0)
		return false;

	//Return true if can initiate attack or targetType is unitType.sea
	return true;
}


function loadEquipment(country)
{
	var jsonFile = Equipment.filePrefix + country + ".json";
	var req = new XMLHttpRequest();
	req.open("GET", Equipment.equipmentPath + jsonFile, false);
	req.send(null);
	if (req.responseText == null)
		return null;
	console.log("Loading equipment %s", jsonFile);
	return JSON.parse(req.responseText);
}

//Selects equipment by key with value(only unitclass defined atm) and country sorting it by sortkey
function getCountryEquipmentByKey(key, value, country, sortkey, reverse)
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

		return (a - b) * order; //if equal sort by id to have a stable sort
	}
}
//------------------------ MODULE END ----------------------
return Equipment; }(Equipment || {})); //Module end