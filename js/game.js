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
 }
 
 function gameStart()
{
	var rng = Math.round(Math.random() * (scenariolist.length - 1))
	var scenario = "resources/scenarios/xml/" +  scenariolist[rng][0];
	//console.log("Number: " + rng + " Scenario:" + scenario);

	scenario="resources/scenarios/xml/tutorial.xml";
	var ui = new UI(scenario);
	//Bring up the "Main Menu"
	ui.mainMenuButton('options');
}