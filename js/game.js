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
	//EventHandler.addEvent("AttackAnimation");
	//EventHandler.addListener("AttackAnimation", testev, this);

	var loader = new MapLoader(this);
	var players = [];

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
	}

	this.loop = setInterval(this.processTurn, 1000);

	this.newScenario = function(scenario)
	{
		this.scenario = scenario;
		this.map = new Map();
		this.state.clear();
		loader.loadMap();
	}

	//TODO replace map function with ui functions for animations
	function processAction(game, action)
	{
		if (!action) return false;
		var p = action.param;
		console.log(action);
		switch(action.type)
		{
			case actionType.move:
			{			
				if (game.ui.uiUnitMove(p[0], p[1].row, p[1].col))
					game.waitUIAnimation = true;
				break;
			}
			case actionType.attack:
			{
				if (game.ui.uiUnitAttack(p[0], p[1], false))
					game.waitUIAnimation = true;
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