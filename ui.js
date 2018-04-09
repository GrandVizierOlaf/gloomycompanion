"use strict";

import {
    drawAllVisibleAbilityCards,
    updateAllPlayerInits,
    incrementRoundCounter,
    endRound
} from './logic.js';

function activateTab(tabs, pages, activetab)
{
    for (let key in tabs)
    {
        tabs[key].className = (key === activetab) ? "" : "inactive";
    }
    for (let key in pages)
    {
        pages[key].className = (key === activetab) ? "tabbody" : "inactive tabbody";
    }
}

function showSettingsPane(pane, cancelarea, show)
{
    pane.className = show ? "pane" : "pane inactive";
    cancelarea.style.display = show ? "initial" : "none";
}

function initUi()
{
    let tabs =
    {
        scenarios:      document.getElementById("scenariotab"),
        decks:          document.getElementById("deckstab"),
        players:        document.getElementById("playerstab")
    };
    let pages =
    {
        scenarios:      document.getElementById("scenariospage"),
        decks:          document.getElementById("deckspage"),
        players:        document.getElementById("playerspage")
    };

    let settingspane =      document.getElementById("settingspane");
    let settingsbtn =       document.getElementById("settingsbtn");
    let newroundbtn =       document.getElementById("newroundbtn");
    let cancelarea =        document.getElementById("cancelarea");

    tabs.scenarios.onclick = function()
    {
        activateTab(tabs, pages, "scenarios");
    };

    tabs.decks.onclick = function()
    {
        activateTab(tabs, pages, "decks");
    };

    tabs.players.onclick = function()
    {
        activateTab(tabs, pages, "players");
    };

    settingsbtn.onclick = function()
    {
        showSettingsPane(settingspane, cancelarea, true);
    };

    newroundbtn.onclick = function()
    {
        drawAllVisibleAbilityCards();
        updateAllPlayerInits();
        incrementRoundCounter();
        
        endRound();
    };

    cancelarea.onclick = function()
    {
        showSettingsPane(settingspane, cancelarea, false);
    };

    activateTab(tabs, pages, "players");
	
}

if(window.attachEvent) {
    window.attachEvent('onload', initUi);
} else {
    if(window.onload) {
        let curronload = window.onload;
        window.onload = function (evt) {
            curronload(evt);
            initUi(evt);
        };
    } else {
        window.onload = initUi;
    }
}