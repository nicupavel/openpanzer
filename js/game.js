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

/*function testev(param) { console.log(param); }*/

var game = new Game();

function Game()
{
	this.ui = null;
	this.state = null;
	this.campaign = null;
	this.scenario = null;

	this.gameStarted = false; //Game not yet fully initialised
	this.gameEnded = false; //Game ended in victory or defeat
	this.waitUIAnimation = false; //Wait for animation to finish before processing next AI action
	this.spotSide = -1; //currently visible side on map
	this.uiMessageClicked = false; //set to true when user clicks ok on uiMessage window //TODO change to event

	//EventHandler.addEvent("AttackAnimation");
	//EventHandler.addListener("AttackAnimation", testev, this);

	var localPlayingSide = -1; //Which player side plays locally on this computer
	var campaignPlayer = null; //Player that plays campaign locally
	var savedPlayer = null; //Saved copy of the campaign player used between campaign scenarios
	var needScenarioLoad = false; //If a new scenario should be loaded during campaign progress
	var scenData = null; //campaign scenario data passed for delayed load during campaign progress
	var shouldRemoveNonCampaignUnits = false; //If we should remove scenario only units from campaign scenarios

	this.init = function()
	{
		this.state = new GameState(this);
		this.scenario = new Scenario();

		if (!this.state.restore())
			this.scenario = new Scenario(Game.defaultScenario);

		setupPlayers(this);

		localPlayingSide = getLocalSide(this.scenario.map.getPlayers());
		this.setCurrentSide();
		
		this.ui = new UI(this);
		this.ui.mainMenuButton('options'); 	//Bring up the "Main Menu"
		
		this.gameStarted = true;
		this.gameEnded = false;
	}

	this.processTurn = function()
	{ 
		if (!game.gameStarted || game.gameEnded)
			return;
		if (scenData !== null && needScenarioLoad && game.uiMessageClicked) //Load next scenario in campaign chain
			game.newScenario(scenData.scenario, scenData.intro);
		if (game.scenario.map.currentPlayer.type != playerType.aiLocal)
			return;
		console.log("Processing ..."); 
		if (!game.waitUIAnimation) game.processAIActions();
	}

	this.startTurn = function()
	{
		console.log(this.scenario.map.currentPlayer);
	}

	this.processAIActions = function()
	{
		var action = this.scenario.map.currentPlayer.handler.getAction();
		
		if (!processAction(this, action))
		{
			this.endTurn();
			if (!this.gameEnded) this.ui.uiEndTurnInfo();
		}
			
	}

	this.endTurn = function()
	{
		var lastSide = this.scenario.map.currentPlayer.side;

		this.waitUIAnimation = false;
		this.scenario.map.endTurn();

		//Check if game ended in defeat only for human players
		if (this.scenario.checkDefeat(lastSide, localPlayingSide))
		{
			//If in a compaign set the campaign outcome to lost and get next available scenario
			if (this.campaign !== null)
			{
				this.continueCampaign("lose");
			}
			else //If single scenario game has ended
			{
				this.gameEnded = true;
			}
			return;
		}

		this.state.save();
		if (this.campaign !== null) //Save campaign to remove deployed units from saved list
			game.state.saveCampaign();


		//Set the new visible side on map
		this.setCurrentSide();
	}

	this.loop = setInterval(this.processTurn, 1000);

	//TODO: move to .init
	this.newScenario = function(scenFile, scenIntro)
	{
		this.state.clear();
		this.scenario = new Scenario(scenFile);
		if (typeof scenIntro !== "undefined") this.scenario.description = scenIntro;
		setupPlayers(this);
		localPlayingSide = getLocalSide(this.scenario.map.getPlayers());
		this.setCurrentSide();

		this.gameStarted = true;
		this.gameEnded = false;

		needScenarioLoad = false;

		if (this.campaign !== null)
		{
			this.state.saveCampaign(); //Save progression between scenario loading delays in campaign
			if (shouldRemoveNonCampaignUnits)
				this.scenario.map.removeNonCampaignUnits(campaignPlayer);
		}

		this.state.save();
		this.ui.setNewScenario();
	}

	this.newCampaign = function(campIndex)
	{
		this.campaign = new Campaign(campIndex);
		savedPlayer = null;
		shouldRemoveNonCampaignUnits = false; //For first scenario is not needed
		//Start the first scenario
		var scenData = this.campaign.getCurrentScenario();
		console.log("Starting campaign %s with scenario %s", this.campaign.name, scenData.scenario);
		this.newScenario(scenData.scenario, scenData.intro);
		campaignPlayer.prestige = this.campaign.startprestige;
		this.scenario.map.buildCoreUnitList(campaignPlayer); //Only for first scenario
		this.state.saveCampaign(); //save updated core unit list
	}
	
	this.continueCampaign = function(outcomeType)
	{
		//Add prestige for finishing scenario
		campaignPlayer.prestige += this.campaign.getOutcomePrestige(outcomeType);
		campaignPlayer.setPlayerToHQ(); //reset player and it's core units
		//Save campaign player
		savedPlayer.copy(campaignPlayer);
		console.log(savedPlayer);
		shouldRemoveNonCampaignUnits = true;

		var outcomeText = this.campaign.getOutcomeText(outcomeType);
		scenData = this.campaign.loadNextScenario(outcomeType);
		if (scenData == null)
		{
			UIBuilder.message("Campaign Finished", outcomeText);
			this.gameEnded = true;
		}
		else
		{
			UIBuilder.message(outcomeNames[outcomeType], outcomeText);
			needScenarioLoad = true; //Wait for user to click to continue to next scenario
		}
	}
	//TODO move to Campaign object
	this.getCampaignPlayer = function()
	{
		if (this.campaign !== null)
			return campaignPlayer;

		return null;
	}

	this.setCurrentSide = function()
	{
		if (localPlayingSide == 2) //Both sides are playing locally in HotSeat mode
			this.spotSide = this.scenario.map.currentPlayer.side;
		else
			this.spotSide = localPlayingSide;
	}

	//Set AI, Network or campaign for players. Local player is the default value
	function setupPlayers(game)
	{
		var i;
		var players = game.scenario.map.getPlayers();

		if (players === null)
			return false;
		for (i = 0; i < players.length; i++)
		{
			if (game.campaign !== null) //Campaign mode
			{
				//Assign AI players if not campaign playing country
				if (players[i].country != game.campaign.country)
				{
					players[i].type = playerType.aiLocal;
					players[i].handler = new AI(players[i], game.scenario.map);
				}
				else //Copy or load the local player for campaign progress (should be only 1 or hell breaks lose see copy)
				{
					campaignPlayer = players[i]; //save a reference
					console.log("Setting campaignPlayer to %o", campaignPlayer);

					if (savedPlayer === null) //Campaign just started save player from scenario settings
					{
						savedPlayer = new Player();
						savedPlayer.copy(players[i]);
					}
					else //Campaign in progress restore saved instance
					{
						players[i].copy(savedPlayer);
					}
				}
			}
			else //Scenarion mode
			{
				if (uiSettings.isAI[players[i].id])
				{
					players[i].type = playerType.aiLocal;
					players[i].handler = new AI(players[i], game.scenario.map);
				}
			}
		}
		return true;
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
				if (game.ui.uiUnitAttack(p[0], p[1]))
				{
					game.ui.uiSetUnitOnViewPort(p[0]);
					game.waitUIAnimation = true;
					console.log("Unit: " + p[0].unitData().name + " " + p[0].id + " attacking: " +p[1].unitData().name);
				}
				break;
			}
			case actionType.resupply:
			{
				game.scenario.map.resupplyUnit(p[0]);
				break;
			}
			case actionType.reinforce:
			{
				game.scenario.map.reinforceUnit(p[0]);
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

Game.defaultScenario = "tutorial.xml";

function gameStart()
{
/*
var rng = Math.round(Math.random() * (scenariolist.length - 1))
var scenario = "resources/scenarios/xml/" +  scenariolist[rng][0];
*/
game.init();
}