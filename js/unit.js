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
	//This is only used when building image cache list in map.js
	this.icon = equipment[equipmentID].icon;
}

//Transport Object Public Methods
Transport.prototype.copy = function(t)
{
	if (t === null) return;
	this.eqid = t.eqid;
	this.ammo = t.ammo;
	this.fuel = t.fuel;
}

Transport.prototype.resupply = function(ammo, fuel) 
{
	this.ammo += ammo; 
	this.fuel += fuel;  
}

Transport.prototype.unitData = function()
{
	return equipment[this.eqid]; 
}

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
	this.hasReinforced = false;
	this.isMounted = false;
	this.tempSpotted = false;
	this.strength = 10;
	this.facing = 2; //default unit facing
	this.flag = this.owner; //default flag
	this.destroyed = false; //flag to check if a unit is destroyed
	this.player = null;
	this.transport = null; //transport class pointer
	//TODO ugly way because it needs to be saved in GameState
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
	this.hasReinforced = u.hasReinforced;
	this.isMounted = u.isMounted;
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

Unit.prototype.move = function(dist) 
{
	this.hasMoved = true;
	this.entrenchment = 0;
	if (this.isMounted) 
	{
		this.hasFired = true;
		if (GameRules.unitUsesFuel(this.transport))
			this.transport.fuel -= dist;
		return;
	}
	if (GameRules.unitUsesFuel(this))
		this.fuel -= dist; //TODO check if fuel consumption is based on terrain cost or just distance
	//TODO Fatigue for leg units ?
}

Unit.prototype.resupply = function(ammo, fuel) 
{
	if (this.isMounted)
	{
		this.transport.resupply(ammo, fuel);
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
	this.hasMoved = this.hasFired = this.hasReinforced = true; 
}

Unit.prototype.setTransport = function(id) 
{ 
	//Create and set the transport properties to match it's unit
	this.transport = new Transport(id);
}

Unit.prototype.mount = function() { this.isMounted = true; }
Unit.prototype.unmount = function() { this.isMounted = false;	}
Unit.prototype.getIcon = function() { var u = this.unitData(); return u.icon; }
Unit.prototype.unitEndTurn = function()
{
	if (!this.hasMoved) this.entrenchment++;
	this.hasMoved = this.hasFired = this.hasResupplied = this.hasReinforced = false;
	this.isMounted = false;
	this.tempSpotted = false;
	this.hits = 0;
}
Unit.prototype.log = function() { console.log(this); }
