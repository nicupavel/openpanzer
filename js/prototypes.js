/**
 * Prototypes - Generic data structures
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

var unitType = { none:-1, soft:0, hard:1, air:2, sea:3 };
var carrierType = { none: 0, air: 1, naval: 2 };
var unitTypeNames = ["Soft", "Hard", "Air", "Sea"];

var unitClass = 
{
	none: 0, infantry: 1, tank: 2, recon: 3, antiTank: 4, flak: 5, fortification: 6,
	groundTransport: 7, artillery: 8, airDefence: 9, fighter: 10, tacticalBomber: 11,
	levelBomber: 12, airTransport: 13, submarine: 14, destroyer: 15, battleship: 16,
	carrier: 17, navalTransport: 18, battleCruiser: 19, cruiser: 20, lightCruiser: 21
};

var unitClassNames =
[
	"No Class", "Infantry", "Tank", "Recon", "Anti Tank", "Flak", "Fortification",
	"Ground Transport", "Artillery", "Air Defence", "Fighter Aircraft", "Tactical Bomber",
	"Level Bomber", "Air Transport", "Submarine" , "Destroyer", "Battleship",
	"Aircraft Carrier", "Naval Transport", "Battle Cruiser", "Cruiser", "Light Cruiser"
];

//Power of 2 bit masks. Hex with road value 136 means it has a road starting from mid of the hex
//and going NW (128) and one starting from mid of the hex and going SE (8)
var roadType = 
{
	none:0, north:1, northeast: 2, eastunused: 4, southeast:8, 
	south: 16, southwest: 32, westunused: 64, northwest: 128 
};

//Compass (used for unit facing) counter clockwise
var direction = 
{
	S:0, SSE:1, SE:2, ESE:3, E:4, ENE:5, NE:6, NNE:7, N:8, NNW:9, NW:10, WNW:11,
	W:12, WSW:13, SW:14, SSW:15
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

var groundCondition = { dry:0, frozen: 1, mud: 2 };
var groundConditionNames = [ "Dry", "Frozen", "Mud" ];
var weatherCondition = { fair:0, overcast: 1, rain: 2, snow: 3 };
var weatherConditionNames = ["Fair", "Overcast", "Raining", "Snowing"];

//TODO [0] should be NoCountry
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

var sideNames = 
[
	"Axis",
	"Allies"
];

var movMethod = 
{ 
	tracked: 0, halfTracked: 1, wheeled: 2, leg: 3, towed: 4, air: 5,
	deepnaval: 6, costal: 7, allTerrainTracked: 8, amphibious: 9, naval: 10,
	allTerrainLeg: 11
}

var movMethodNames =
[
	"Tracked", "Half Tracked", "Wheeled", "Leg", "Towed", "Air", "Deep Naval", 
	"Costal", "All Terrain Tracked", "Amphibious", "Naval", "All Terrain Leg"
];

var outcomeNames =
{
	"lose": "Defeat",
	"victory": "Victory",
	"tactical": "Tactical Victory",
	"briliant": "Briliant Victory"
};

//TODO Frozen conditions
//254 Stop move (but select the tile), 255 Don't enter
var movTable = 
[
//Clear, City, Airfield, Forest, Bocage, Hill, Mountain, Sand, Swamp, Ocean, River, Fortification, Port, Stream, Escarpment, impassableRiver, Rough, Roads
[1, 1, 1, 2, 4, 2, 254, 1, 4, 255, 254, 1, 1, 2, 255, 255, 2, 1], //Tracked
[1, 1, 1, 2, 254, 2, 254, 1, 4, 255, 254, 1, 1, 2, 255, 255, 2, 1], //Half Tracked
[2, 1, 1, 4, 254, 3, 254, 3, 254, 255, 254, 2, 1, 4, 255, 255, 4, 1], //Wheeled
[1, 1, 1, 2, 2, 2, 254, 2, 2, 255, 254, 1, 1, 1, 255, 255, 2, 1], //Leg
[1, 1, 1, 1, 1, 1, 254, 1, 255, 255, 254, 1, 1, 254, 255, 255, 1, 1], //Towed
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], //Air
[255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 255, 255, 1, 255, 255, 255, 255, 255], //Deep Naval
[255, 255, 255, 255, 255, 255, 255, 255, 255, 2, 1, 255, 1, 255, 255, 255, 255, 255], //Costal
[1, 1, 1, 2, 3, 3, 254, 2, 254, 255, 254, 1, 1, 1, 255, 255, 3, 1], //All Terrain Tracked
[1, 1, 1, 2, 4, 2, 254, 1, 3, 254, 3, 1, 1, 2, 255, 255, 2, 1], //Amphibious
[255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 255, 255, 1, 255, 255, 255, 255, 255], //Naval
[1, 1, 1, 1, 2, 1, 1, 2, 2, 255, 254, 1, 1, 1, 255, 255, 1, 1], //All Terrain Leg (Mountain)
];

//Lookup table used for rotation of animations for a certain direction
//Our animations are by default facing North table gives the radians for rotate
var directionToRadians = 
[
	Math.PI, //S
	5*Math.PI/6, //SSE
	3*Math.PI/4, //SE
	2*Math.PI/3, //ESE
	Math.PI/2, //E
	Math.PI/3, //ENE
	Math.PI/4, //NE
	Math.PI/6, //NNE
	0, //N
	11*Math.PI/6, //NNW
	7*Math.PI/4, //NW
	5*Math.PI/3, //WNW
	3*Math.PI/2, //W
	4*Math.PI/3, //WSW
	5*Math.PI/4, //SW
	7*Math.PI/6, //SSW
];

var playerType = 
{
	humanLocal: 0,
	humanNetwork: 1,
	aiLocal: 2,
	aiServer: 3,
};

var actionType = 
{
	move: 0,
	attack: 1,
	resupply: 2,
	reinforce: 3,
	upgrade: 4,
	buy: 5,
	deploy: 6,
};

//Define prestige gains on different situations
var prestigeGains = 
{
	flagCapture: 20,
	objectiveCapture: 50,
};

//Holds the settings for the game ui and renderer
var uiSettings = 
{
	airMode:false,		//flag used to select between overlapping ground/air units
	mapZoom:false,		//flag used to draw map in zoomed mode or not
	zoomLevel: 1,		//The mapZoom level
	hexGrid:false,		// flag to notify render if it should draw or not hex grid
	deployMode:false,	//used for unit deployment
	markOwnUnits: false, 	//To visually mark own units on map
	markEnemyUnits: false,	//To visually mark enemy units on map
	markFOW: false, 	//Make Fog Of War visible
	hasTouch: false,	//Set in UI if device has touch
	use3D: false,		//use transform3d/translate3d functions for animations
	useRetina: false,	//don't scale on retina displays devicePixelRatio > 1
	allowZoom: false,	//If user should be able to zoom in/out manually
	isAI: [0, 0, 0, 0],	//which player is played by AI
};
	
function Cell(row, col)
{
	this.row = row;
	this.col = col;
}
//used for movement and attack range cells
function extendedCell(row, col)
{
	Cell.call(this, row, col);
	this.range = 0; //the range that this cell is from a selected cell
	this.cin = 0;   //the cost to enter the cell
	this.cout = 0;  //the cost to exit the cell = cin + cell cost
	this.cost = 0;  //terrain cost
	this.canMove = false; //if the movement is allowed on this cell after cost calculations
	this.canPass = false; //if friendly units can pass thru this cell
}
extendedCell.prototype = new Cell();

//used for shortest path calculations
function pathCell(cell)
{
	Cell.call(this, cell.row, cell.col);
	this.cost = 1;
	this.prev = null;
	this.dist = Infinity;
}
pathCell.prototype = new Cell();

function movementResults()
{
	this.surpriseCell = [];
	this.isVictorySide = -1;
	this.passedCells = [];
}

function combatResults()
{
	this.kills = 0;
	this.losses = 0;
	this.atkSuppress = 0;
	this.defSuppress = 0;
	this.atkExpGained = 0;
	this.defExpGained = 0;
	this.defcanfire = true;
}

function Supply(a, f)
{
	this.ammo = a;
	this.fuel = f;
}

function mouseInfo(x, y, rclick)
{
	this.x = x;
	this.y = y;
	this.rclick = rclick;
}

function screenPos(x, y)
{
	this.x = x;
	this.y = y;
}

var CURRENCY_MULTIPLIER = 12; //PG2 uses this multiplier for unit costs defined in equipment
var UPGRADE_PENALTY = 1.25; //Upgrade costs is multiplied with this value
var DEBUG_CAMPAIGN = false; //If victory choices buttons should be shown for easy campaign progress ALSO uncomment the lines in index.html
var VERSION = "2.4";
