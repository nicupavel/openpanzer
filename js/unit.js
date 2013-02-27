/**
 * Unit - Provides Unit and Transport objects
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

//Transport Object Constructor
function Transport(equipmentID)
{
	if (typeof Equipment.equipment[equipmentID] === "undefined")
	{
		console.log("Undefined transport equipment id %d", equipmentID);
		equipmentID = Object.keys(Equipment.equipment)[0];
	}
	this.eqid = equipmentID;
	this.ammo = Equipment.equipment[equipmentID].ammo;
	this.fuel = Equipment.equipment[equipmentID].fuel;
	this.icon = Equipment.equipment[equipmentID].icon; //This is only used when building image cache list in map.js
}

//Transport Object Public Methods
Transport.prototype.copy = function(t)
{
	if (t === null) return;
	this.eqid = t.eqid;
	this.ammo = t.ammo;
	this.fuel = t.fuel;
}
Transport.prototype.unitData = function() { return Equipment.equipment[this.eqid]; }

//Unit Object Constructor
function Unit(equipmentID)
{
	if (typeof Equipment.equipment[equipmentID] === "undefined")
	{
		console.log("Undefined unit equipment id %d", equipmentID);
		equipmentID = Object.keys(Equipment.equipment)[0];
	}
	//Public Properties
	this.id = -1;
	this.eqid = equipmentID;
	this.owner = -1;
	this.hasMoved = false;
	this.hasFired = false;
	this.hasResupplied = false;
	this.isMounted = false;
	this.isSurprised = false; //Unit has been surprised during move
	this.isDeployed = false; //Unit is deployed on map or it's on equipment window
	this.isCore = false; //Unit is a core unit for the campaign player
	this.tempSpotted = false;
	this.strength = 10;
	this.facing = 2; //default unit facing
	this.flag = this.owner; //default flag
	this.destroyed = false; //flag to check if a unit is destroyed
	this.player = null; //TODO remove use owner ID
	this.transport = null; //transport class pointer
	this.carrier = -1 //air/naval carrier which is not a unit assigned transport
	this.moveLeft = Equipment.equipment[equipmentID].movpoints; //for phased/recon movement
	this.ammo = Equipment.equipment[equipmentID].ammo; //holds the ammo of the unit but it's getter is getAmmo()
	this.fuel = Equipment.equipment[equipmentID].fuel; //holds the fuel of the unit but it's getter is getFuel()
	this.hasAnimation = false; //flag if the unit has a move animation
	this.hits = 0; //the number of hits unit received this turn
	this.experience = 0; //combat experience
	this.entrenchment = 0; //level of entrenchment this unit has
	
	//Privileged Methods that access private properties/methods
	this.getHex = function() { return hex; }
	this.setHex = function(h)
	{
		hex = h;
		if (h !== null) // set unit as deployed (might be called from map.deployUnit)
			this.isDeployed = true;
		//We don't set isDeployed to false here only in setPlayerToHQ() when units are sent to HQ pool
	}

	this.getPos = function()
	{
		if (hex === null)
			return null;
		return hex.getPos();
	};
	
	//Private Methods and Properties
	var hex = null; //The hex that this unit is on
};

//Unit Object Public Methods
Unit.prototype.copy = function(u) 
{
	if (u === null) return;
	this.id = u.id;
	this.eqid = u.eqid;
	this.owner = u.owner;
	this.hasMoved = u.hasMoved;
	this.hasFired = u.hasFired;
	this.hasResupplied = u.hasResupplied;
	this.isMounted = u.isMounted;
	this.isSurprised = u.isSurprised;
	this.isDeployed = u.isDeployed;
	this.isCore = u.isCore;
	this.carrier = u.carrier;
	this.moveLeft = u.moveLeft;
	this.ammo = u.ammo;
	this.fuel = u.fuel;
	this.strength = u.strength;
	this.facing = u.facing;
	this.flag = u.flag;
	this.destroyed = u.destroyed;
	this.hits = u.hits;
	this.experience = u.experience;
	this.entrenchment = u.entrenchment;
	if (u.player !== null)
	{
		this.player = new Player();
		this.player.copy(u.player);
	}
	if (u.transport !== null)
	{
		this.transport = new Transport(u.transport.eqid);
		this.transport.copy(u.transport);
	}
}

Unit.prototype.unitData = function(forceUnit)
{
	if (this.carrier != -1 && !forceUnit) //Unit on carrier
		return Equipment.equipment[this.carrier];

	if ((this.isMounted) && (this.transport !== null) && !forceUnit) //Unit on transport
		return Equipment.equipment[this.transport.eqid];
	else
	{
		if (typeof Equipment.equipment[this.eqid] === "undefined")
			console.log("Undefined EQUIPMENT ID: %d object %o unit id %d unit object %o", this.eqid, Equipment.equipment[this.eqid], this.id, this);
		return Equipment.equipment[this.eqid];  //Real Unit
	}
}

Unit.prototype.getMovesLeft = function()
{
	//On carrier always has movement of the carrier
	if (this.carrier != -1)
		return Equipment.equipment[this.carrier].movpoints;
	
	//There is no point saving moveLeft in transport object since they consume all points when moving
	if ((this.isMounted) && (this.transport !== null))
		return Equipment.equipment[this.transport.eqid].movpoints;
	else
		return this.moveLeft;
}

Unit.prototype.getAmmo = function()
{
	if ((this.isMounted) && (this.transport !== null))
		return this.transport.ammo;
	else
		return this.ammo;
}

Unit.prototype.getFuel = function()
{
	if ((this.isMounted) && (this.transport !== null))
		return this.transport.fuel;
	else
		return this.fuel;
}

Unit.prototype.hit = function(losses) 
{ 
	this.strength -= losses;
	this.hits++;
	if (this.entrenchment > 0) this.entrenchment--;
	if (this.strength <= 0) this.destroyed = true;
}

Unit.prototype.fire = function(isAttacking) 
{
	//Unit is shown on map when fires even if it's on a non spotted hex (support fire)
	this.tempSpotted = true;
	this.ammo--; //TODO some transports can attack ?
	if (isAttacking)
		this.hasFired = true; //Support and Defence fire don't block this unit for attacking
}

Unit.prototype.move = function(cost) 
{
	this.entrenchment = 0;
	var fuelUsed = 0;
	if (cost >= 254) //Remove stopmov or noenter costs
		fuelUsed = (cost / 254 + cost % 254) >> 0; //TODO: fix in GameRules unit shouldn't be allowed to move if cost > 254
	else
		fuelUsed = cost;
	
	if (this.isMounted && (this.transport !== null)) 
	{
		this.hasFired = true; //can't fire after being moved in transport
		if (GameRules.unitUsesFuel(this.transport))
			this.transport.fuel -= fuelUsed;
		this.moveLeft = 0;
	}
	else
	{
		if (GameRules.unitUsesFuel(this) && this.carrier == -1)
			this.fuel -= fuelUsed;
		//Recon units can move multiple times
		if (this.unitData().uclass != unitClass.recon)
			this.moveLeft = 0;
		else
			this.moveLeft -= cost; //TODO check how ZOC is handled on recon units
	}
	if (this.moveLeft <= 0) this.hasMoved = true;
}
Unit.prototype.upgrade = function(upgradeid, transportid)
{

	// 0 or -1 means keep the current unit and upgrade the transport eventually
	if (upgradeid <= 0)
		upgradeid = this.eqid;
		
	if (Equipment.equipment[this.eqid].uclass != Equipment.equipment[upgradeid].uclass)
		return false;
	
	this.eqid = upgradeid;

	if (GameRules.isTransportable(this.eqid))
	{
		//Replace or create a new transport
		if (transportid > 0) this.setTransport(transportid);
	}
	else
	{
		//Remove the tranport if the new unit is no longer transportable
		if (this.transport !== null) this.transport = null;
	}
	
	this.entrenchment = 0;

	if (this.isDeployed) //Allow undeployed units to move/attack after upgrade (HQ upgrade)
		this.hasMoved = this.hasFired = this.hasResupplied = true;
	
	return true;
}
Unit.prototype.resupply = function(ammo, fuel) 
{
	if (this.isMounted)
	{
		this.transport.ammo += ammo;
		this.transport.fuel += fuel;
	} 
	else 
	{
		this.ammo += ammo;
		this.fuel += fuel;
	}
	this.hasMoved = this.hasFired = this.hasResupplied = true;
}

Unit.prototype.reinforce = function(str) 
{ 
	this.strength += str; 
	this.hasMoved = this.hasFired = this.hasRessuplied = true; 
}

Unit.prototype.setTransport = function(id) 
{ 
	if (this.transport === null)
		this.transport = new Transport(id);
	else
		this.transport.eqid = id;
}

Unit.prototype.mount = function() { this.isMounted = true; }
Unit.prototype.unmount = function() { this.isMounted = false; }

Unit.prototype.embark = function(type) 
{ 
	//TODO Get carrier ID for player or unit country from equipment
	if (type == carrierType.air)
		this.carrier = 176;
	else
		this.carrier = 546;
	return true;
}

Unit.prototype.disembark = function() { this.carrier = -1; }
Unit.prototype.getIcon = function() { var u = this.unitData(); return u.icon; }
Unit.prototype.unitEndTurn = function()
{
	if (!this.hasMoved && this.moveLeft == Equipment.equipment[this.eqid].movpoints) { this.entrenchment++; }
	this.moveLeft = Equipment.equipment[this.eqid].movpoints; //reset movement points don't use unitData() since it could be mounted
	this.hasMoved = this.hasFired = this.hasResupplied = false;
	this.isMounted = false;
	this.tempSpotted = false;
	this.hits = 0;
}
//frees memory asociated with this object if possible
Unit.prototype.cleanup = function()
{
	//TODO can't delete units since some of them are linked in coreUnits for campaign players
}