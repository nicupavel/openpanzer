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
 
 function Game()
 {
 	this.map = null;
	this.ui = null;
	this.state = null;
	this.scenario = ""; 
	this.turn = 0;
	this.events = new EventHandler();
	this.events.addEvent("AttackAnimation");
	this.events.addListener("AttackAnimation", function(){ console.log("executed");});
	this.events.emitEvent("AttackAnimation");

	var loader = new MapLoader(this);
	
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
	
	this.endTurn = function()
	{
		this.state.save();
	}
	
	this.newScenario = function(scenario)
	{
		this.scenario = scenario;
		this.map = new Map();
		this.state.clear();
		loader.loadMap();
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