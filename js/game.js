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
 function testev(param){ console.log(param);}
 function Game()
 {
 	this.map = null;
	this.ui = null;
	this.state = null;
	this.scenario = ""; 
	this.turn = 0;
	EventHandler.addEvent("AttackAnimation");
	EventHandler.addListener("AttackAnimation", testev, this);

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
	}
	
	this.startTurn = function()
	{
		console.log(this.map.currentPlayer);
	}
	
	this.processAIActions = function()
	{
		if (this.map.currentPlayer.type != playerType.aiLocal)
			return;
		var action = this.map.currentPlayer.handler.getAction();
		if (!processAction(this, action))
			this.endTurn();
	}
	
	this.endTurn = function()
	{
		this.turn++;
		this.state.save();
	}
	
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
		var params = actionType.params;
		switch(action.type)
		{
			case actionType.move:
			{
				game.map.moveUnit(params[0], params[1].row, params[1].col);
				break;
			}
			case actionType.attack:
			{
				game.map.attackUnit(params[0], params[1], false);
				break;
			}
			case actionType.resupply:
			{
				game.map.resupplyUnit(params[0]);
				break;
			}
			case actionType.reinforce:
			{
				game.map.reinforceUnit(params[0]);
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
	var game = new Game();
	game.init(scenario);
}