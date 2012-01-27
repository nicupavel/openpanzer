var unitType = { none:-1, soft:0, hard:1, air:2, sea:3 }; 
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
	unitDataId: -1,
	hasMoved: 0,
	hasFired: 0,
	hasRessuplied: 0,
	ammo:0,
	fuel:0,
	strength:0,
};

var locationInfo = 
{
	x: 0,
	y: 0,
	row: 0,
	col: 0,
	unitInfoId: -1,
};
