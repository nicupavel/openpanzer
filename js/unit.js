
function Transport(equipmentID)
{
	this.eqid = equipmentID; 
	this.ammo = equipment[equipmentID].ammo;
	this.fuel = equipment[equipmentID].fuel;
	//This is only used when building image cache list in map.js
	this.icon = equipment[equipmentID].icon;
	
	this.copy = function(t)
	{
		if (t === null) return;
		this.eqid = t.eqid;
		this.ammo = t.ammo;
		this.fuel = t.fuel;
	}
	
	this.resupply = function(ammo, fuel) 
	{
		this.ammo += ammo; 
		this.fuel += fuel;  
	}
	
	this.unitData = function()
	{
		return equipment[this.eqid]; 
	}
}

function Unit(equipmentID)
{
	if (typeof equipment[equipmentID] === 'undefined') { equipmentID = 1; }
	this.id = -1;
	this.eqid = equipmentID;
	this.owner = -1;
	this.hasMoved = false;
	this.hasFired = false;
	this.hasResupplied = false;
	this.hasReinforced = false;
	this.isMounted = false;
	this.strength = 10;
	this.facing = 2; //default unit facing
	this.flag = this.owner; //default flag
	this.destroyed = false; //flag to check if a unit is destroyed
	this.player = null;
	this.transport = null; //transport class pointer
	//TODO ugly way because it needs to be saved in GameState
	this.ammo = equipment[equipmentID].ammo; //holds the ammo of the unit but it's getter is getAmmo()
	this.fuel = equipment[equipmentID].fuel; //holds the fuel of the unit but it's getter is getFuel()
	
	//Clone object
	this.copy = function(u) 
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
	
	this.unitData = function()
	{
		if ((this.isMounted) && (this.transport !== null))
			return equipment[this.transport.eqid]; 
		else
			return equipment[this.eqid]; 
	}
	
	this.getAmmo = function()
	{
		if ((this.isMounted) && (this.transport !== null))
			return this.transport.ammo;
		else
			return this.ammo;
	}
	
	this.getFuel = function()
	{
		if ((this.isMounted) && (this.transport !== null))
			return this.transport.fuel;
		else
			return this.fuel;
	}
	
	this.hit = function(losses) 
	{ 
		this.strength -= losses; 
		if (this.strength <= 0) this.destroyed = true;
	}
	
	this.fire = function(isAttacking) 
	{
		this.ammo--; //TODO some transports can attack ?
		if (isAttacking)
			this.hasFired = true;
	}
	this.move = function(dist) 
	{
		this.hasMoved = true;
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
	
	this.resupply = function(ammo, fuel) 
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
	
	this.reinforce = function(str) 
	{ 
		this.strength += str;  
		this.hasMoved = this.hasFired = this.hasReinforced = true; 
	}
	
	this.setTransport = function(id) 
	{ 
		//Create and set the transport properties to match it's unit
		this.transport = new Transport(id);
	}
	
	this.mount = function() { this.isMounted = true; }
	this.unmount = function() {	this.isMounted = false;	}
	this.getIcon = function() { var u = this.unitData(); return u.icon; }
	this.resetUnit = function() 
	{ 
		this.hasMoved = this.hasFired = this.hasResupplied = this.hasReinforced = false;
		this.isMounted = false;
	}
	this.log = function() { console.log(this); }
	this.setHex = function(h) { hex = h; }
	this.getHex = function() { return hex; }
	this.getPos = function() { return hex.getPos(); };
	
	//private 
	var hex = null; //The hex that this unit is on
};
