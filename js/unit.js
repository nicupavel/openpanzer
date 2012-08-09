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
	this.eqid = equipmentID;
	this.ammo = equipment[equipmentID].ammo;
	this.fuel = equipment[equipmentID].fuel;
	this.icon = equipment[equipmentID].icon; //This is only used when building image cache list in map.js
}

//Transport Object Public Methods
Transport.prototype.copy = function(t)
{
	if (t === null) return;
	this.eqid = t.eqid;
	this.ammo = t.ammo;
	this.fuel = t.fuel;
}
Transport.prototype.unitData = function() { return equipment[this.eqid]; }

//Unit Object Constructor
function Unit(equipmentID)
{
	if (typeof equipment[equipmentID] === "undefined") { equipmentID = 1; }
	//Public Properties
	this.id = -1;
	this.eqid = equipmentID;
	this.owner = -1;
	this.hasMoved = false;
	this.hasFired = false;
	this.hasResupplied = false;
	this.isMounted = false;
	this.isSurprised = false; //Unit has been surprised during move
	this.tempSpotted = false;
	this.strength = 10;
	this.facing = 2; //default unit facing
	this.flag = this.owner; //default flag
	this.destroyed = false; //flag to check if a unit is destroyed
	this.player = null;
	this.transport = null; //transport class pointer
	this.moveLeft = equipment[equipmentID].movpoints; //for phased/recon movement
	this.ammo = equipment[equipmentID].ammo; //holds the ammo of the unit but it's getter is getAmmo()
	this.fuel = equipment[equipmentID].fuel; //holds the fuel of the unit but it's getter is getFuel()
	this.hasAnimation = false; //flag if the unit has a move animation
	this.hits = 0; //the number of hits unit received this turn
	this.experience = 0; //combat experience
	this.entrenchment = 0; //level of entrenchment this unit has
	
	//Privileged Methods that access private properties/methods
	this.setHex = function(h) { hex = h; }
	this.getHex = function() { return hex; }
	this.getPos = function() { if (hex !== null) return hex.getPos(); };
	
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

Unit.prototype.unitData = function()
{
	if ((this.isMounted) && (this.transport !== null))
		return equipment[this.transport.eqid]; 
	else
		return equipment[this.eqid]; 
}

Unit.prototype.getMovesLeft = function()
{
	//There is no point saving moveLeft in transport object since they consume all points when moving
	if ((this.isMounted) && (this.transport !== null))
		return equipment[this.transport.eqid].movpoints
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
		fuelUsed = cost - 254;
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
		if (GameRules.unitUsesFuel(this))
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
		
	if (equipment[this.eqid].uclass != equipment[upgradeid].uclass)
		return false;
	
	this.eqid = upgradeid;

	if (transportid > 0 && GameRules.isTransportable(this.eqid))
		this.setTransport(transportid);
	
	this.entrenchment = 0;
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
Unit.prototype.unmount = function() { this.isMounted = false;	}
Unit.prototype.getIcon = function() { var u = this.unitData(); return u.icon; }
Unit.prototype.unitEndTurn = function()
{
	if (!this.hasMoved && this.moveLeft == equipment[this.eqid].movpoints) { this.entrenchment++; }
	this.moveLeft = equipment[this.eqid].movpoints; //reset movement points don't use unitData() since it could be mounted
	this.hasMoved = this.hasFired = this.hasResupplied = false;
	this.isMounted = false;
	this.tempSpotted = false;
	this.hits = 0;
}
