var unitType = { none:-1, soft:0, hard:1, air:2, sea:3 }; 
var terrainType = 
{
	Clear:0,
	City:1,
	Airfield:2,
	Forest:3,
	Bocage:4,
	Hill:5,
	Mountain:6,
	Sand:7,
	Swamp:8,
	Ocean:9,
	River:10,
	Fortification:11,
	Port:12,
	Stream:13,
	Escarpment:14,
	impassableRiver:15,
	Rough:16
};

var unitData =
{
	id: -1,
	type: unitType.none,
	maxAmmo:0,
	maxFuel:0,
	icon:"none.png",
	moveRadius:0,
	attackRadius:0,
	name:"noname",
};

var unitInfo = 
{
	id: -1,
	unitData: null,
	hasMoved: 0,
	hasFired: 0,
	hasRessuplied: 0,
	ammo:0,
	fuel:0,
	strength:0,
};

var hexData = 
{
	unitInfo: null,
	terrain:terrainType.Clear,
	isSupply:0,
	isDeployment:0,
	isVictory1:0,
	isVictory2:0,
	name:"map hex",
};
