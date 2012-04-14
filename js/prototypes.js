/**
 * Prototypes - Generic data structures
 *
 * http://www.linuxconsulting.ro
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

var unitType = { none:-1, soft:0, hard:1, air:2, sea:3 }; 

//Bit masks. Hex with road value 136 means it has a road starting from mid of the hex
//and going NW (128) and one starting from mid of the hex and going SE (8)
var roadType = 
{
	none:0, north:1, northeast: 2, eastunused: 4, southeast:8, 
	south: 16, southwest: 32, westunused: 64, northwest: 128 
};

var terrainType = 
{
	Clear:0, City:1, Airfield:2, Forest:3, Bocage:4, Hill:5, Mountain:6, Sand:7, 
	Swamp:8, Ocean:9, River:10, Fortification:11, Port:12, Stream:13, Escarpment:14,
	impassableRiver:15, Rough:16
};

var terrainNames = 
[
	"Clear", "City", "Airfield", "Forest", "Bocage", "Hill", "Mountain", "Sand",
	"Swamp", "Ocean", "River", "Fortification", "Port", "Stream", "Escarpment",
	"Impassable river", "Rough"
];

var unitData =
{
    "airatk": 0, 
    "airdef": 0, 
    "ammo": 0, 
    "bombercode": 0, 
    "class": 0, 
    "closedef": 0, 
    "cost": 0, 
    "country": 0, 
    "fuel": 0, 
    "grounddef": 0, 
    "gunrange": 0, 
    "hardatk": 0, 
    "icon": "resources/units/images/none.png", 
    "id": -1, 
    "initiative": 0, 
    "movmethod": 0, 
    "movpoints": 0, 
    "name": "unknown", 
    "navalatk": 0, 
    "rangedefmod": 0, 
    "softatk": 0, 
    "spotrange": 0, 
    "target": 0
};

var countryNames = 
[
	"Austria",
	"Belgium",
	"Bulgaria",
	"Czechoslovakia",
	"Denmark",
	"Finland",
	"France",
	"Germany",
	"Greece",
	"USA",
	"Hungary",
	"Turkey",
	"Italy",
	"Netherlands",
	"Norway",
	"Poland",
	"Portugal",
	"Romania",
	"Spain",
	"Russia",
	"Sweden",
	"Switzerland",
	"United Kingdom",
	"Yugoslavia",
	"Nationalist",
	"Republican"
];

var sidesName = 
[
	"Axis",
	"Allies"
];

function mouseInfo(x, y, rclick)
{
	this.x = x;
	this.y = y;
	this.rclick = rclick;
}

function Cell(row, col)
{
	//Where the hex is in the map array
	this.row = row;
	this.col = col;
}

function combatResults()
{
	this.kills = 0;
	this.losses = 0;
	this.atkSuppress = 0;
	this.defSuppress = 0;
	this.atkExpGained = 0;
	this.defExpGained = 0;
}

function currentHexInfo()
{
	this.hex = null;
	this.row = 0;
	this.col = 0;
}

function Supply(a, f)
{
	this.ammo = a;
	this.fuel = f;
}