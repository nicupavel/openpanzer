/**
 * UIBuilder- Creates UI windows
 *
 * http://www.linuxconsulting.ro
 * http://openpanzer.net
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

var UIBuilder = (function(UIBuilder) { //Module start

//Path to menu image assets
UIBuilder.startMenuImgPath = "resources/ui/dialogs/startmenu/images/";
UIBuilder.menuImgPath = "resources/ui/menu/images/";
UIBuilder.eqImgPath = "resources/ui/dialogs/equipment/images/";

//The prestige "currency" icon
UIBuilder.currencyIcon = "<img src='" + UIBuilder.eqImgPath + "currency.png'/>";

//Build the class selection buttons "unitClass.id from equipment.js": [button name, description, ]
UIBuilder.eqClassButtons =
{
	"9": ['but-aa', 'Air defence'], "4": ['but-at', 'Anti-tank'], "8": ['but-arty', 'Artillery'],
	"1": ['but-inf', 'Infantry'], "3":['but-rcn', 'Recon'], "2": ['but-tank', 'Tank'],
	"10": ['but-af', 'Air Fighter'], "11": ['but-ab', 'Air Bomber']
};

//Unit stats that will be listed on the window format <id>, <title>, <isSortKey>, <sortKeyName>
UIBuilder.unitstats =
[
	["uFlag", "country flag", 0, null],["uCost", "Unit price", 1, "cost"], ["uStr", "Unit strength", 0, null],
	["uFuel", "Unit fuel", 0, "fuel"], ["uAmmo", "Unit Ammo", 1, "ammo"], ["uGunRange", "Firing range", 1, "gunrange"],
	["uMovement", "Movement range", 1, "movpoints"], ["uExp", "Combat Experience", 0, null],
	["uEnt","Entrenchment", 0, null], ["uIni", "Combat initiative", 1, "initiative"],
	["uSpot", "Spotting range", 1, "spotrange"], ["uAHard", "Power vs Hard targets", 1, "hardatk"],
	["uASoft", "Power vs Soft targets", 1, "softatk"], ["uAAir", "Power vs Air targets", 1, "airatk"],
	["uANaval", "Power vs Naval targets", 1, "navalatk"], ["uDHard", "Defence vs ground attacker", 1, "grounddef"],
	["uDAir", "Defence vs air attacker", 1, "airdef"], ["uDClose", "Defence in close combat", 1, "closeddef"],
	["uDRange", "Defence in ranged combat", 1, "rangedefmod"], ["uMoveType", "Movement type", 0, null],
	["uTarget", "Target type", 0, null], ["uTransport", "See unit/transport", 0, null] /*, ["uClass", "Unit class", 0, null]*/
];


//Builds the start menu/options menu
UIBuilder.buildStartMenu = function()
{
	//menu buttons divs with id, title the image filename from resources/ui/startmenu/images
	var menubuttons = [["newcampaign", "New Campaign"], ["newscenario", "New Scenario"], ["settings", "Settings"],
			   ["help", "Help"], ["continuegame", "Continue Game"]];
	//Settings with key in uiSettings and Title
	var settings = [["useRetina", "Use Retina Resolution"], ["use3D", "Use 3D acceleration"], ["markFOW", "Show Fog Of War"],
			["markOwnUnits", "Mark own units on map"], ["markEnemyUnits", "Mark enemy units on map"]];

	var i, b, div, img;

	//Add main buttons
	for (b = 0; b < menubuttons.length; b++)
	{
		div = addTag('smButtons', 'div');
		img = addTag(div, 'img');
		div.id = menubuttons[b][0];
		div.title = menubuttons[b][1];
		div.className = "smMainButton";
		img.src = UIBuilder.startMenuImgPath + div.id + ".png";
		div.onclick = function() { game.ui.startMenuButton(this.id); }
	}
	//Odd number of buttons center last one
	if (menubuttons.length % 2)
		div.className = "smMainButtonCenter"

	$('smLogoText').innerHTML = "version " + VERSION;
	$('smCredits').innerHTML = "Copyright 2012 <a href='http://linuxconsulting.ro/openpanzer'>Nicu Pavel</a>";

	//Add new campaign options (campaign list, description)
	var camSel = addTag('smCampSel', 'select')
	for (i = 0; i < campaignlist.length; i++)
	{
		var camOpt = addTag(camSel, 'option');
		camOpt.value = i;
		camOpt.text = campaignlist[i]['title'];
	}
	camSel.onchange = function()
	{
		var v = this.options[this.selectedIndex].value;
		$('smCampDesc').innerHTML = campaignlist[v].desc;
		$('smCampCountry').innerHTML = "<b>Country</b><br/>" + countryNames[campaignlist[v].flag];
		$('smCampScenarios').innerHTML = "<b>Scenarios</b><br/>" + campaignlist[v].scenarios;
		$('smCampPrestige').innerHTML = "<b>Start prestige</b><br/>" + campaignlist[v].prestige + "&nbsp;" + UIBuilder.currencyIcon;
		
		$('smCamp').selectedCampaign = v; //save index to campaign from campaignlist //TODO move to userSel
	}
	$('smCBackBut').onclick = function()
	{
		makeHidden('smCamp');
		makeVisible('smMain');
	}
	$('smCPlayBut').onclick = function()
	{
		var s = $('smCamp').selectedCampaign;
		if (!s)	return;
		console.log("Starting Campaign %s", s);
		game.newCampaign(s);
		makeHidden('smCamp');
		makeHidden('startmenu');
		toggleButton($('options'), false);
		game.state.saveSettings();
	}

	/* Campaign debug button */
	if (DEBUG_CAMPAIGN)
	{
		$('smCV').onclick = function() { makeHidden('smCamp'); makeHidden('startmenu'); game.continueCampaign("victory"); }
		$('smCVB').onclick = function() { makeHidden('smCamp'); makeHidden('startmenu'); game.continueCampaign("briliant"); }
		$('smCVT').onclick = function() { makeHidden('smCamp'); makeHidden('startmenu'); game.continueCampaign("tactical"); }
		$('smCL').onclick = function() { makeHidden('smCamp'); makeHidden('startmenu'); game.continueCampaign("lose"); }
	}

	//Add new scenario options(scenario list, description, players)
	var scnSel = addTag('smScenSel', 'select');
	for (i = 0; i < scenariolist.length; i++)
	{
		var scnOpt = addTag(scnSel, 'option');
		scnOpt.value = i;
		scnOpt.text = scenariolist[i][1];
	}
	scnSel.onchange = function()
	{
		var v = this.options[this.selectedIndex].value;
		$('smScenDesc').innerHTML = scenariolist[v][2];

		clearTag('smSide0');
		$('smVS').innerHTML = "VS";
		clearTag('smSide1');
		//Clear previous player AI settings
		uiSettings.isAI = [0, 0, 0, 0];

		//Add players for side 0 and 1
		for (var s = 0; s <= 1; s++)
		{
			var data = scenariolist[v][3 + s];
			var sideID = "smSide" + s;
			var sideHeader = addTag(sideID, 'div');
			sideHeader.className = "smSideHeader";
			sideHeader.innerHTML = sideNames[s];
			var sideImg = addTag(sideHeader, 'img');
			sideImg.src = UIBuilder.startMenuImgPath + "side" + s + ".png";

			for (var i = 0; i < data.length; i++)
			{
				var containerDiv = addTag(sideID, 'div');
				containerDiv.className = "smPlayerContainer";
				var flagDiv = addTag(containerDiv, 'div');
				flagDiv.className = "playerCountry";
				flagDiv.style.backgroundPosition = "" + data[i]["country"] * -21 + "px 0px"; //Update flag
				var contentDiv = addTag(containerDiv, 'div');
				contentDiv.className = "playerName";
				//contentDiv.innerHTML = (scenariolist[v][3 + s][i]["id"] + 1) + ". " + countryNames[data[i]["country"]];
				contentDiv.innerHTML = countryNames[data[i]["country"]];
				var smAIBut = addTag(containerDiv, 'img');

				smAIBut.src = UIBuilder.startMenuImgPath + "aicheckbox.png";
				smAIBut.id = "ai" + data[i]["id"];
				smAIBut.playerid = data[i]["id"];
				smAIBut.onclick = function()
				{
					uiSettings.isAI[this.playerid] = !uiSettings.isAI[this.playerid];
					toggleCheckbox(this);
					console.log(uiSettings.isAI);
				}
			}
		}
		$('smScen').selectedScenario = v; //TODO move to userSel
	}
	$('smSBackBut').onclick = function()
	{
		makeHidden('smScen');
		makeVisible('smMain');
	}
	$('smSPlayBut').onclick = function()
	{
		var s = $('smScen').selectedScenario;
		if (!s)	return;
		game.campaign = null; //New scenario delete campaign
		game.newScenario(scenariolist[s][0], scenariolist[s][2]);
		makeHidden('smScen');
		makeHidden('startmenu');
		toggleButton($('options'), false);
		game.state.saveSettings();
	}

	//The settings window
	for (var b = 0; b < settings.length; b++)
	{
		var div = addTag('smSettings', 'div');
		div.id = settings[b][0];
		div.title = settings[b][1];
		div.className = "setting";
		div.innerHTML = settings[b][1];
		var img = addTag(div, 'img');
		img.id = settings[b][0];

		if (uiSettings[settings[b][0]])
			img.src = UIBuilder.startMenuImgPath + "checkbox-checked.png";
		else
			img.src = UIBuilder.startMenuImgPath + "checkbox.png";

		img.onclick = function() { uiSettings[this.id] = !uiSettings[this.id]; toggleCheckbox(this); console.log("Settings " + this.id + " changed to:" + uiSettings[this.id]); }
	}
	$('smSetOkBut').onclick = function()
	{
		makeHidden('smSettings');
		makeVisible('smMain');
		game.state.saveSettings();
	}
}


//Builds the in game right side menu
UIBuilder.buildMainMenu = function()
{
	//menu buttons divs with id the image filename from resources/ui/menu/images
	//format is <id>, <title>, <0/1 if should be placed in slide div or not>
	var menubuttons = [ ["inspectunit","Inspect Unit", 0], ["endturn","End Turn", 0],["mainmenu", "Main  Menu", 0],
		["buy","Upgrade/Buy Units", 1],["hex","Toggle Hex Grid", 1], ["air","Toggle Air Mode On", 1],
		["zoom","Strategic Map", 1], ["options","Options", 1]];

	for (var b = 0; b < menubuttons.length; b++)
	{
		var div;

		if (menubuttons[b][2])	//should be placed on slide div
			div = addTag('slidemenu','div');
		else
			div = insertTag('menu', 'div', 'slidemenu');

		var img = addTag(div, 'img');
		var id = menubuttons[b][0];
		var title = menubuttons[b][1];

		div.id = id;
		div.title = title;
		div.className = "button";
		img.id = id;
		img.src = UIBuilder.menuImgPath + id + ".png";

		div.onclick = function() { game.ui.mainMenuButton(this.id); }
	}

	//Make the status bar clickable and show turn info
	$('statusbar').onclick = function() { game.ui.uiEndTurnInfo(); }
}

UIBuilder.setDefaultUserSelections = function()
{
	//The default selected country in the div
	$('eqSelCountry').country = 0;
	$('eqSelCountry').owner = 0;

	//No user selections by default
	$('eqUserSel').deployunit = -1;
	$('eqUserSel').userunit = -1;
	$('eqUserSel').equnit = -1;
	$('eqUserSel').eqtransport = -1;

	//Sorting options
	$('eqUserSel').sortorder = 0;
	$('eqUserSel').sortproperty = 'cost';
}

UIBuilder.buildEquipmentWindow = function()
{
	UIBuilder.setDefaultUserSelections();

	//Top Sorting buttons
	$('eqSortOrderBut').title = 'Click to change sorting order ascending/descenting';
	$('eqSortOrderBut').onclick = function()
		{
			var order = $('eqUserSel').sortorder || 0;
			order = ~order & 1;
			$('eqUserSel').sortorder = order;
			game.ui.updateEquipmentWindow($('eqUserSel').eqclass);
			toggleButton($('eqSortOrderBut'), order);
		};
	var img =  addTag('eqSortOrderBut', 'img');
	img.id = "sort-order";
	img.src = UIBuilder.eqImgPath + "sort-order.png";

	$('eqSortOptionsBut').title = 'Click to change sort category';
	$('eqSortOptionsBut').onclick = function()
		{
			if (isVisible('eqSortOptions'))
			{
				makeHidden('eqSortOptions');
				makeVisible('eqButtonsContainer');
				toggleButton($('eqSortOptionsBut'), false);
			}
			else
			{
				makeHidden('eqButtonsContainer');
				makeVisible('eqSortOptions');
				toggleButton($('eqSortOptionsBut'), true);
			}
		};
	img =  addTag('eqSortOptionsBut', 'img');
	img.id = "sort-options";
	img.src = UIBuilder.eqImgPath + "sort-options.png";

	//Unit Class buttons
	for (var b in UIBuilder.eqClassButtons)
	{
		var div = addTag('eqSelClass','div');
		var img = addTag(div, 'img');
		var id = UIBuilder.eqClassButtons[b][0];
		div.id = id;
		div.className = "eqSelClassBut";
		div.title = UIBuilder.eqClassButtons[b][1];
		div.eqclass = b;
		img.id = id;
		img.src = UIBuilder.eqImgPath + id + ".png";
		div.onclick = function()
		{
			$('eqUserSel').userunit = -1; //Clear existing unit selections when changing class
			$('eqUserSel').equnit = -1;
			$('eqUserSel').eqtransport = -1;
			game.ui.updateEquipmentWindow(this.eqclass);
		}
	}

	//Bottom buttons
	$('eqSelCountry').title = 'Click to change country';
	$('eqSelCountry').onclick = function() { game.ui.equipmentWindowButtons('changecountry'); };
	$('eqNewBut').title = "Buy unit as a new unit";
	$('eqNewBut').onclick = function() { game.ui.equipmentWindowButtons('buy'); };
	$('eqUpgradeBut').title = "Upgrade selected unit to this unit";
	$('eqUpgradeBut').onclick = function() { game.ui.equipmentWindowButtons('upgrade'); };
	$('eqCloseBut').title = "Close";
	$('eqCloseBut').onclick = function() { makeHidden('equipment'); };
}

//Builds the sorting options on equipment
UIBuilder.buildEquipmentSortOptions = function()
{
	$('eqSortInfo').innerHTML = "Sort equipment by: ";

	for (var s = 0; s < UIBuilder.unitstats.length; s++)
	{
		if (!UIBuilder.unitstats[s][2] || !UIBuilder.unitstats[s][3])
			continue;

		div = addTag('eqSortOptionsContainer','div');
		div.id = UIBuilder.unitstats[s][0];
		div.title = UIBuilder.unitstats[s][1];
		div.className = "uStat";
		div.sortproperty = UIBuilder.unitstats[s][3];
		div.onclick = function()
		{
			$('eqUserSel').sortproperty = this.sortproperty;
			game.ui.updateEquipmentWindow($('eqUserSel').eqclass);
			$('eqSortInfo').innerHTML = "Sorted by: " + this.title;
		};
	}
	$('eqSortCloseBut').title = "Close sorting options";
	$('eqSortCloseBut').onclick = function() { makeHidden('eqSortOptions'); makeVisible('eqButtonsContainer'); };

}

//Builds the unit stats info window
UIBuilder.buildUnitInfoWindow = function()
{
	for (var s = 0; s < UIBuilder.unitstats.length; s++)
	{
		if (UIBuilder.unitstats[s][0] == "uCost") //Don't show cost on info window
			continue;
		var div = addTag('statsRow','div');
		div.id = UIBuilder.unitstats[s][0];
		div.title = UIBuilder.unitstats[s][1];
		div.className = "uStat";
	}
}

UIBuilder.showEquipmentCosts = function(prestige, buyCost, upCost)
{

	if (buyCost > 0 && buyCost <= prestige)
	{
		$('eqNewText').innerHTML = "New unit cost: " + buyCost + UIBuilder.currencyIcon;
		$('eqNewBut').style.display = "inline";
	}
	else
	{
		if (buyCost > prestige)
		{
			var diff = buyCost - prestige;
			$('eqNewText').innerHTML = "<span style='color:#BB7575'>Need " + diff + " more prestige to buy.</span>";
		}
		else
		{
			$('eqNewText').innerHTML = "";
		}
		$('eqNewBut').style.display = "none";
	}

	if (upCost > 0 && upCost <= prestige)
	{
		$('eqUpgradeText').innerHTML = " Upgrade unit cost: " + upCost + UIBuilder.currencyIcon;
		$('eqUpgradeBut').style.display = "inline";
	}
	else
	{
		if (upCost > prestige)
		{
			var diff = upCost - prestige;
			$('eqUpgradeText').innerHTML = "<span style='color:#BB7575'>Need " + diff + " more prestige to upgrade.</span>";
		}
		else
		{
			$('eqUpgradeText').innerHTML = "";
		}
		$('eqUpgradeBut').style.display = "none";
	}

	$('currentPrestige').innerHTML = "Available prestige: " + prestige + UIBuilder.currencyIcon;
}

UIBuilder.showAttackInfo = function(atkunit, defunit)
{
	var ad = atkunit.unitData();
	var dd = defunit.unitData();
	var tmpdiv;

	clearTag($('statusmsg'));
	tmpdiv = addTag($('statusmsg'), 'div');
	tmpdiv.className = "playerCountry";
	tmpdiv.style.marginTop = "0px";
	tmpdiv.style.backgroundPosition = "" + (atkunit.flag - 1) * -21 + "px 0px"; //Update flag

	tmpdiv = addTag($('statusmsg'), 'div');
	tmpdiv.style.cssFloat = "left";
	tmpdiv.innerHTML = "<b>" + ad.name + "</b> " + unitClassNames[ad.uclass] + " attacking &nbsp;";

	tmpdiv = addTag($('statusmsg'), 'div');
	tmpdiv.className = "playerCountry";
	tmpdiv.style.marginTop = "0px";
	tmpdiv.style.backgroundPosition = "" + (defunit.flag - 1) * -21 + "px 0px"; //Update flag

	tmpdiv = addTag($('statusmsg'), 'div');
	tmpdiv.style.cssFloat = "left";
	tmpdiv.innerHTML = "<b>" + dd.name + "</b> " + unitClassNames[dd.uclass];
}


UIBuilder.message = function(title, message)
{
		$('title').innerHTML = title;
		$('message').innerHTML = message;
		makeVisible('ui-message');
		//TODO change to an event
		game.uiMessageClicked = false;
		$('uiokbut').onclick = function() { makeHidden('ui-message'); game.uiMessageClicked = true; }
}

//------------------------ MODULE END ----------------------
return UIBuilder; }(UIBuilder || {})); //Module end giberish

