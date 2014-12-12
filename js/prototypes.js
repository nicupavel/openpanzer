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

//How fast a unit class entrench
var unitEntrenchRate = [0, 3, 1, 2, 2, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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

//Clear, City, Airfield, Forest, Bocage, Hill, Mountain, Sand, Swamp, Ocean, River, Fortification, Port, Stream, Escarpment, impassableRiver, Rough, Roads
var terrainEntrenchment = [ 0, 3, 0, 2, 2, 1, 2, 0, 0, 0, 0, 4, 1, 0, 0, 0, 2 ];
var terrainInitiative = [ 99, 1, 99, 3, 3, 5, 1, 99,2, 99, 99, 3, 5, 99, 99, 99, 3, 1];

var groundCondition = { dry:0, frozen: 1, mud: 2 };
var groundConditionNames = [ "Dry", "Frozen", "Mud" ];
var groundFontEncoding = ["6", "8", "7"]; //openpanzer icon font mapping
var weatherCondition = { fair:0, overcast: 1, rain: 2, snow: 3 };
var weatherConditionNames = ["Fair", "Overcast", "Raining", "Snowing"];
var weatherFontEncoding = ["4", "5", "1", "2"]; //openpanzer icon font mapping

//TODO [0] should be All Countries
var countryNames = 
[
	//"All Countries",
	"Slovakia",
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
	"Croatia",
	"Russia",
	"Sweden",
	"Allied Yugoslavia",
	"United Kingdom",
	"Yugoslavia",
	"Nationalist Spain",
	"Republican Spain",
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
	"Costal", "All Terrain", "Amphibious", "Naval", "Mountain Leg"
];

var outcomeNames =
{
	"lose": "Defeat",
	"victory": "Victory",
	"tactical": "Tactical Victory",
	"briliant": "Brilliant Victory"
};

//Tables for movement cost for different ground conditions 254 Stop move (but select the tile), 255 Don't enter
var movTableDry =
[
//Clear, City, Airfield, Forest, Bocage, Hill, Mountain, Sand, Swamp, Ocean, River, Fortification, Port, Stream, Escarpment, impassableRiver, Rough, Roads
[1, 1, 1, 2, 4, 2, 254, 1, 4, 255, 254, 1, 1, 2, 255, 255, 2, 1], //Tracked
[1, 1, 1, 2, 254, 2, 254, 1, 4, 255, 254, 1, 1, 2, 255, 255, 2, 1], //Half Tracked
[2, 1, 1, 4, 254, 3, 254, 3, 254, 255, 254, 2, 1, 4, 255, 255, 2, 1], //Wheeled
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

var movTableFrozen =
[
//Clear, City, Airfield, Forest, Bocage, Hill, Mountain, Sand, Swamp, Ocean, River, Fortification, Port, Stream, Escarpment, impassableRiver, Rough, Roads
[1, 1, 1, 2, 4, 2, 254, 1, 2, 255, 2, 1, 1, 2, 255, 255, 2, 1], //Tracked
[1, 1, 1, 2, 254, 3, 254, 1, 2, 255, 2, 1, 1, 2, 255, 255, 3, 1], //Half Tracked
[2, 2, 2, 254, 254, 254, 254, 3, 3, 255, 3, 3, 2, 4, 255, 255, 4, 2], //Wheeled
[1, 1, 1, 2, 2, 2, 254, 2, 1, 255, 2, 1, 1, 1, 255, 255, 2, 1], //Leg
[1, 1, 1, 1, 1, 1, 254, 1, 1, 255, 254, 1, 1, 254, 255, 255, 1, 1], //Towed
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], //Air
[255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 255, 255, 1, 255, 255, 255, 255, 255], //Deep Naval
[255, 255, 255, 255, 255, 255, 255, 255, 255, 2, 255, 255, 1, 255, 255, 255, 255, 255], //Costal
[1, 1, 1, 2, 3, 3, 254, 2, 3, 255, 2, 1, 1, 1, 255, 255, 3, 1], //All Terrain Tracked
[1, 1, 1, 2, 4, 3, 254, 1, 3, 254, 2, 2, 1, 2, 255, 255, 3, 1], //Amphibious
[255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 255, 255, 1, 255, 255, 255, 255, 255], //Naval
[1, 1, 1, 1, 2, 1, 2, 2, 1, 255, 2, 1, 1, 1, 255, 255, 2, 1], //All Terrain Leg (Mountain)
];


var movTableMud =
[
//Clear, City, Airfield, Forest, Bocage, Hill, Mountain, Sand, Swamp, Ocean, River, Fortification, Port, Stream, Escarpment, impassableRiver, Rough, Roads
[2, 1, 1, 2, 4, 3, 254, 1, 254, 255, 254, 2, 1, 2, 255, 255, 3, 2], //Tracked
[3, 1, 1, 2, 254, 3, 254, 1, 254, 255, 254, 2, 1, 2, 255, 255, 3, 2], //Half Tracked
[4, 2, 2, 254, 254, 254, 254, 3, 254, 255, 254, 4, 2, 4, 255, 255, 254, 2], //Wheeled
[2, 1, 1, 2, 2, 2, 254, 2, 1, 255, 254, 2, 1, 1, 255, 255, 3, 1], //Leg
[2, 1, 1, 1, 1, 2, 254, 1, 255, 255, 254, 21, 1, 254, 255, 255, 2, 2], //Towed
[2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], //Air
[255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 255, 255, 1, 255, 255, 255, 255, 255], //Deep Naval
[255, 255, 255, 255, 255, 255, 255, 255, 255, 2, 255, 255, 1, 255, 255, 255, 255, 255], //Costal
[2, 1, 1, 2, 3, 3, 254, 2, 3, 255, 255, 2, 1, 1, 255, 255, 4, 2], //All Terrain Tracked
[1, 1, 1, 2, 4, 3, 254, 1, 3, 254, 3, 2, 1, 2, 255, 255, 3, 1], //Amphibious
[255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 255, 255, 1, 255, 255, 255, 255, 255], //Naval
[2, 1, 1, 1, 3, 1, 3, 2, 1, 255, 254, 2, 1, 1, 255, 255, 3, 1], //All Terrain Leg (Mountain)
];

//The default movement table it will be changed on scenario depending on weather conditions
var movTable = movTableDry;

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
	aiScripted: 4
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
	mount: 7,
	umount: 8,
	select: 9,
	endturn: 10,
	message: 11,
	viewport: 12
};

//Define prestige gains on different situations
var prestigeGains = 
{
	flagCapture: 20,
	objectiveCapture: 50,
};

//Define score gains
var scoreGains =
{
	coreUnit: -15, //initial score calculation number of core units * this score
	normalUnit: -5, //initial score calculation number of non core units * this score
	objectivePerTurn: +1000, //initial score calculation number of objectives to capture * this score / turns
	flagCapture: +50,
	objectiveCapture: +100,
	endTurn: -10,
	damage: +10, //per strength unit
	casualty: -5, //per strength unit
	casualtyCore: -10, //per strength unit
	reinforce: -5, //per strength unit
	resupply: -10, //per action
};

//Holds the settings for the game ui and renderer
var uiSettings = 
{
	airMode:false,			//flag used to select between overlapping ground/air units
    strategicZoom: false,   //flag used to draw map in strategic zoom mode or not
	strategicZoomLevel: 1,	//The strategic map zoom level
	mapZoom:false,			//flag used to draw map in zoomed mode or not
	zoomLevel: 1,			//The mapZoom level
	uiScale: 1.0, 		    //The scale at which is UI elements are zoomed
	uiSize: 840,			//The size of UI windows width
	hexGrid:false,			// flag to notify render if it should draw or not hex grid
	showGridTerrain: false, //if terrain icons should be shown when hex grid in on
	muteUnitSounds: false, 	//if unit combat sound should be muted
	deployMode:false,		//used for unit deployment
	markOwnUnits: false, 	//To visually mark own units on map
	markEnemyUnits: false,	//To visually mark enemy units on map
	markFOW: false, 		//Make Fog Of War visible
	hasTouch: false,		//Set in UI if device has touch
	use3D: false,			//use transform3d/translate3d functions for animations
	useRetina: false,		//don't scale on retina displays devicePixelRatio > 1
	allowZoom: false,		//If user should be able to zoom in/out manually
	isAI: [0, 0, 0, 0],		//which player is played by AI
};

//What triggered end of the campaign/scenario
var endGameType =
{
	moveCapture: "moveCapture",			//Captured all objectives
	noTurnsLeft: "noTurnsLeft",			//No more turns left
};

var endGameLossText =
{
	moveCapture: "Enemy has captured all your objectives !<br>",
	noTurnsLeft: "You don't have any turns left !<br>",
}

var leaderType =
{
	//Class Leaders
	mechanizedVeteran: 		1, 	//Air Defence unit may move and fire in the same turn.
	tankKiller: 			2,	//Anti-Tank unit will not receive a penalty for movement into combat .
	marksman:				3,	//The artillery unit’s attack range is increased by one hex.
	skilledInterceptor:		4,	//Fighter unit can intercept multiple enemy fighters in the defensive phase.
	tenaciousDefense:		5,	//The infantry unit’s ground defense factor is increased by 4.
	eliteReconVeteran:		6,	//Recon unit’s spotting range is increased by two hexes.
	skilledAssault:			7,	//The tactical bomber cannot be surprised ("out of the sun") while moving.
	aggressiveTankManeuver:	8,	//Tank’s movement factor is increased by 1.
	//Random Leaders:
	aggressiveAttack:		9,	//Each of the unit’s attack values is increased by 2.
	aggressiveManeuver:		10,	//The unit’s movement factor is increased by 1.
	allWeatherCombat:		11,	//The air unit is not affected by weather conditions. ''Note: This can only be awarded air units.''
	alpineTraining:			12,	//When moving the unit treats forest and mountain hexes as clear terrain.
	battlefieldIntelligence:13,	//The unit cannot be surprised.
	bridging:				14,	//When moving the unit treats passable river hexes as rough terrain.
	combatSupport:			15,	//The unit provides both Resilience and Skilled Ground Attack abilities to all adjoining units during combat phases. Will aid inflicting losses and save from loses by 2 to 3 points each battle.
	determinedDefense:		16,	//Each of the unit’s defense factors is increased by 2.
	devastatingFire:		17,	//The unit may fire twice in a turn.
	ferociousDefense:		18,	//The unit’s entrenchment cannot be ignored by enemy units.
	fireDiscipline:			19,	//The unit will expend only one-half of an ammunition point each time it attacks.
	firstStrike:			20,	//The unit will fire first against an enemy unit if it wins the initiative in a combat round.
	forestCamouflage:		21,	//If in a forest hex the unit cannot be spotted by enemy units unless they move adjacent to it.
	infiltrationTactics:	22,	//The unit ignores enemy unit entrenchment when calculating combat results.
	influence:				23,	//Allows the unit to upgrade to better equipment at reduced prestige point cost.
	liberator:				24,	//You receive double the normal number of prestige points for all objective and victory hexes captured by the unit.
	overwatch:				25,	//The unit will fire at any enemy unit that moves within its range. The enemy unit is automatically surprised, allowing your unit to fire first and at the enemy’s close assault, rather than its ground defense, factor.
	overwhelmingAttack:		26,	//When attacking the unit will have an indeterminate number of the suppression points it would otherwise inflict converted to kills.
	reconMovement:			27,	//The unit is permitted phased movement, just like reconnaissance units.
	resilience:				28,	//The unit will suffer 1 to 3 fewer step casualties than normal units when attacked.
	shockTactics:			29,	//Any suppression which the unit inflicts on an enemy unit will last the entire player’s turn, not just the specific combat round.
	skilledGroundAttack:	30,	//The unit will inflict 1 to 3 more step casualties than normal units when attacking.
	skilledReconnaissance:	31,	//The unit’s spotting range is increased by one hex.
	streetFighter:			32,	//The unit ignores an enemy unit’s city entrenchment when calculating combat results.
	superiorManeuver:		33,	//The unit may bypass enemy units’ zones of control.
}

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
	this.isVisible = false; //Move is at least partially visible on the player screen
	this.surpriseCell = []; //Where did the surprise contact took place
	this.isVictorySide = -1; //Did it end in a scenario win for a side
	this.passedCells = []; //Which cell it passed so we can draw the animation in render accordingly
	this.isCapture = false; //Did it capture any kind of objective
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
	this.atkLeaderGain = false;
	this.defLeaderGain = false;
	this.isOverrun = false; //Tank overrun
	this.isRugged = false; //Infantry rugged defense
}

function Supply(a, f, ta, tf)
{
	this.ammo = a;
	this.fuel = f;
    this.transportAmmo = ta || 0;
    this.transportFuel = tf || 0;
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

var UNIT_RETREAT_THRESHOLD = 0.6 //Percentage of losses for which a unit starts to retreat
var CURRENCY_MULTIPLIER = 12; //PG2 uses this multiplier for unit costs defined in equipment
var UPGRADE_PENALTY = 1.25; //Upgrade costs is multiplied with this value
var SCENARIO_START_PRESTIGE = 2000; //Start prestige for scenarios played outside of a campaign
var PROTOTYPE_MIN_COST = 200; //Don't give players prototypes that are cheaper than this (with CURRENCY_MULTIPLIER)
var DEBUG_CAMPAIGN = false; //If victory choices buttons should be shown for easy campaign progress ALSO uncomment the lines in index.html
var DEBUG_AI_MOVES = false; //If we should show AI moves (used in game.js)
var VERSION = "2.9.0";
var NATIVE_PLATFORM = "generic";
var DEBUG_CAMPAIGN = true;