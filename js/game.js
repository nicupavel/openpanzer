/**
 * Game - main game object
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */
function testev(param) { console.log(param); }
var game = new Game();
function Game()
{
	this.map = null;
	this.ui = null;
	this.state = null;
	this.scenario = ""; 
	this.turn = 0;
	this.gameStarted = false;
	this.waitUIAnimation = false;
	this.spotSide = -1; //currently visible side on map

	//EventHandler.addEvent("AttackAnimation");
	//EventHandler.addListener("AttackAnimation", testev, this);

	var loader = new MapLoader(this);
	var players = [];
	var localPlayingSide = -1; //Which player side plays locally on this computer

	this.init = function(scenario)
	{
		this.map = new Map();
		this.state = new GameState(this);
		this.scenario = scenario;
		if (!this.state.restore())
			loader.loadMap();
			
		this.ui = new UI(this);
		this.ui.mainMenuButton('options'); 	//Bring up the "Main Menu"
		this.gameStarted = true;

		localPlayingSide = getLocalSide(this.map.getPlayers());
		//TODO: move to startTurn()
		if (localPlayingSide == 2) //Both sides are playing locally in HotSeat mode
			this.spotSide = this.map.currentPlayer.side;
		else
			this.spotSide = localPlayingSide;
	}

	this.processTurn = function() 
	{ 
		if (!game.gameStarted)
			return;
		if (game.map.currentPlayer.type != playerType.aiLocal)
			return;
		console.log("Processing ..."); 
		if (!game.waitUIAnimation) game.processAIActions();
	}

	this.startTurn = function()
	{
		console.log(this.map.currentPlayer);
	}

	this.processAIActions = function()
	{
		var action = this.map.currentPlayer.handler.getAction();
		if (!processAction(this, action))
		{
			this.endTurn();
			this.ui.uiEndTurnInfo();
		}
			
	}

	this.endTurn = function()
	{
		this.waitUIAnimation = false;
		this.turn++;
		this.state.save();
		this.map.endTurn();
		//TODO: move to startTurn()
		if (localPlayingSide == 2) //Both sides are playing locally in HotSeat mode
			this.spotSide = this.map.currentPlayer.side;
		else
			this.spotSide = localPlayingSide;
	}

	this.loop = setInterval(this.processTurn, 1000);

	this.newScenario = function(scenario)
	{
		this.scenario = scenario;
		this.map = new Map();
		this.state.clear();
		loader.loadMap();
		localPlayingSide = getLocalSide(this.map.getPlayers());
	}

	function processAction(game, action)
	{
		if (!action) return false;
		var p = action.param;
		switch(action.type)
		{
			case actionType.move:
			{
				if (game.ui.uiUnitMove(p[0], p[1].row, p[1].col))
				{
					game.ui.uiSetUnitOnViewPort(p[0]);
					game.waitUIAnimation = true;
				}
				break;
			}
			case actionType.attack:
			{
				if (game.ui.uiUnitAttack(p[0], p[1], false))
				{
					game.ui.uiSetUnitOnViewPort(p[0]);
					game.waitUIAnimation = true;
					console.log("Unit: " + p[0].unitData().name + " " + p[0].id + " attacking: " +p[1].unitData().name);
				}
				break;
			}
			case actionType.resupply:
			{
				game.map.resupplyUnit(p[0]);
				break;
			}
			case actionType.reinforce:
			{
				game.map.reinforceUnit(p[0]);
				break;
			}
			case actionType.upgrade:
			{
				break;
			}
			case actionType.buy:
			{
				break;
			}
			case actionType.deploy:
			{
				break;
			}
			default:
			{
				console.log("Unknown action");
				return false;
			}
		}
		return true;
	}

	//Returns which sides are played by players on this computer
	//will return -1 no local sides, 0 side 0, 1 side 1, 2 both sides
	//are playing on local computer (hotseat mode)
	function getLocalSide(playerList)
	{
		var nrSides = 1;
		var localSide = -1;
		for (var i = 0; i < playerList.length; i++)
		{
			if (playerList[i].type == playerType.humanLocal)
			{
				if (localSide != -1 && localSide != playerList[i].side)
					nrSides++; //We already found a local playing side
				localSide = playerList[i].side;
			}
		}

		if (nrSides > 1)
			localSide = 2;

		return localSide;
	}
}

function gameStart()
{
/*
var rng = Math.round(Math.random() * (scenariolist.length - 1))
var scenario = "resources/scenarios/xml/" +  scenariolist[rng][0];
console.log("Number: " + rng + " Scenario:" + scenario);
*/
scenario = "resources/scenarios/xml/tutorial.xml";
game.init(scenario);
}