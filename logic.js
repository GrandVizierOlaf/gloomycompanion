"use strict";

import {DECKS} from './js/definitions/cards.js';
import {SCENARIO_DEFINITIONS, SPECIAL_RULES} from './js/definitions/scenarios.js';

import {
    concatArrays,
    createInput,
    dictValues,
    getFromStorage,
    inputValue,
    isChecked,
    writeToStorage
} from './js/logic/util.js';
import {addPlayer} from "./js/logic/players.js";
import {applyDeckSelection, loadAbilityDeck} from "./js/logic/decks.js";
import {loadRoundCounter, resetRoundCounter} from "./js/logic/rounds.js";
import {refreshUi} from "./ui.js";
import {calculatePartyLevel} from "./js/logic/players.js";
import {addAllPlayersToSwitchList} from "./js/logic/switches.js";

//TODO Adding an extra Guard deck will reshuffle the first one,
// End of round with multiple Archers, resize text, worth to show common and elite_only attributes?,
// shield and retaliate only when shown (apparently, attributes are active at the beginning of the turn, and active after initiative)

window.visibleAbilityDecks = [];
window.players = {};
window.partyLevel = 1;
window.visibleCards = {};
window.modifierDeck = null;

function LevelSelector(text, inline) {
    let maxLevel = 7;
    let level = {};
    level.html = inline ? document.createElement("span") : document.createElement("ul");
    level.html.className = "selectionlist";

    let listItem = inline ? document.createElement("label") : document.createElement("li");
    listItem.innerText = text;
    level.html.appendChild(listItem);

    let levelSpinner = createInput("number", "levelSelector", "1", "");
    levelSpinner.input.min = 0;
    levelSpinner.input.max = maxLevel;
    level.html.appendChild(levelSpinner.input);
    level.spinner = levelSpinner.input;

    level.getSelection = function () {
        return (this.spinner.value > maxLevel) ? maxLevel : this.spinner.value;
    };

    level.setValue = function (value) {
        this.spinner.value = (value > maxLevel) ? maxLevel : value;
    };

    return level;
}

function DeckList() {
    let deckList = {};
    deckList.ul = document.createElement("ul");
    deckList.ul.className = "selectionlist";
    deckList.checkboxes = {};
    deckList.levelSelectors = {};
    deckList.globalLevelSelector = null;


    let listItem = document.createElement("li");
    let globalLevelIndicator = new LevelSelector("Select global level ", true);
    listItem.appendChild(globalLevelIndicator.html);
    deckList.globalLevelSelector = globalLevelIndicator;

    let domDict = createInput("button", "applylevel", "Apply to All", "");
    domDict.input.onclick = function () {
        for (let key in deckList.levelSelectors) {
            deckList.levelSelectors[key].setValue(deckList.globalLevelSelector.getSelection());
        }
    };
    listItem.appendChild(domDict.root);

    deckList.ul.appendChild(listItem);

    for (let key in DECKS) {
        let realName = DECKS[key].name;
        let listItem = document.createElement("li");
        let domDict = createInput("checkbox", "deck", realName, realName);
        listItem.appendChild(domDict.root);

        let levelSelector = new LevelSelector(" with level ", true);
        listItem.appendChild(levelSelector.html);

        deckList.ul.appendChild(listItem);
        deckList.checkboxes[realName] = domDict.input;
        deckList.levelSelectors[realName] = levelSelector;

    }

    deckList.getSelection = function () {
        return dictValues(this.checkboxes).filter(isChecked).map(inputValue);
    };

    deckList.getSelectedDecks = function () {
        let selectedCheckbox = this.getSelection();
        let selectedDecks = concatArrays(selectedCheckbox.map(function (name) {
            let deck = ((name in DECKS) ? DECKS[name] : []);
            deck.level = deckList.levelSelectors[name].getSelection();
            return deck;
        }.bind(this)));
        return selectedDecks;
    };

    deckList.setSelection = function (selectedDeckNames) {
        dictValues(this.checkboxes).forEach(function (checkbox) {
            checkbox.checked = false;
        });

        selectedDeckNames.forEach(function (deckNames) {
            let checkbox = this.checkboxes[deckNames.name];
            if (checkbox) {
                checkbox.checked = true;
                deckList.levelSelectors[deckNames.name].setValue(deckNames.level);
            }
        }.bind(this));
    };

    return deckList;
}

function ScenarioList(scenarios) {
    let scenarioList = {};
    scenarioList.ul = document.createElement("ul");
    scenarioList.ul.className = "selectionlist";
    scenarioList.spinner = null;
    scenarioList.decks = {};
    scenarioList.specialRules = {};
    scenarioList.levelSelector = null;

    scenarioList.levelSelector = new LevelSelector("Select level", false);

    scenarioList.ul.appendChild(scenarioList.levelSelector.html);

    for (let i = 0; i < scenarios.length; i++) {
        let scenario = scenarios[i];
        scenarioList.decks[i] = scenario.decks;
        scenarioList.specialRules[i] = scenario.specialRules ? scenario.specialRules : "";
    }

    let listItem = document.createElement("li");
    listItem.innerText = "Select scenario number";
    scenarioList.ul.appendChild(listItem);

    let scenarioSpinner = createInput("number", "scenario_number", "1", "");
    scenarioSpinner.input.min = 1;
    scenarioSpinner.input.max = scenarios.length;
    scenarioList.ul.appendChild(scenarioSpinner.input);
    scenarioList.spinner = scenarioSpinner.input;

    scenarioList.getSelection = function () {
        // We're using the scenario index that is zero-based, but the scenario list is 1-based
        let currentValue = scenarioList.spinner.value - 1;
        return Math.min(currentValue, scenarios.length + 1);
    };

    scenarioList.getLevel = function (deckName, specialRules) {

        let baseLevel = scenarioList.levelSelector.getSelection();

        if ((specialRules.indexOf(SPECIAL_RULES.livingCorpseTwoLevelsExtra) >= 0) &&
            (deckName === SPECIAL_RULES.livingCorpseTwoLevelsExtra.affectedDeck)) {
            return Math.min(7,
                (parseInt(baseLevel) + parseInt(SPECIAL_RULES.livingCorpseTwoLevelsExtra.extraLevels)));
        } else {
            return baseLevel;
        }
    };

    scenarioList.getScenarioDecks = function () {
        return (this.decks[this.getSelection()].map(function (deck) {
            if (DECKS[deck.name]) {
                deck.class = DECKS[deck.name].class;
            } else if (deck.name.indexOf("Boss") !== -1) {
                deck.class = DECKS["Boss"].class;
            }
            deck.level = scenarioList.getLevel(deck.name, scenarioList.getSpecialRules());
            return deck;
        }));
    };

    scenarioList.getSpecialRules = function () {
        return this.specialRules[this.getSelection()];
    };

    return scenarioList;
}

function PlayerList() {
    let playerList = [];

    playerList.getSelection = function () {
        playerList = [];
        for (let i = 1; i <= 4; i++) {
            let playerIdInput = document.getElementById("player" + i + "idinput");
            let playerLevelInput = document.getElementById("player" + i + "levelinput");
            let player = {};
            player.identifier = playerIdInput.value;
            player.level = playerLevelInput.value;
            playerList.push(player);
        }
        return playerList;
    };

    playerList.setSelection = function (selectedPlayers) {
        // Default out the inputs
        for (let i = 1; i <= 4; i++) {
            let playerIdInput = document.getElementById("player" + i + "idinput");
            let playerLevelInput = document.getElementById("player" + i + "levelinput");
            playerIdInput.value = null;
            playerLevelInput.value = 1;
        }

        let i = 1;
        for (let playerName in selectedPlayers) {
            if (selectedPlayers.hasOwnProperty(playerName)) {
                let playerIdInput = document.getElementById("player" + i + "idinput");
                let playerLevelInput = document.getElementById("player" + i + "levelinput");

                let player = selectedPlayers[playerName];
                playerIdInput.value = player.identifier;
                playerLevelInput.value = player.level;
                playerList.push(player);
                i++;
            }
        }
    };

    playerList.updateGlobalPlayers = function () {
        window.players = {};
        for (let i = 0; i < playerList.length; i++) {
            if (playerList[i].identifier) {
                addPlayer(playerList[i].identifier, playerList[i].level);
            }
        }
    };

    return playerList;
}

function init() {
    let decksPage = document.getElementById("deckspage");
    let scenariosPage = document.getElementById("scenariospage");
    let applyDeckBtn = document.getElementById("applydecks");
    let applyScenarioBtn = document.getElementById("applyscenario");
    let applyLoadBtn = document.getElementById("applyload");
    let applyPlayersBtn = document.getElementById("applyplayers");
    let loadPlayersBtn = document.getElementById("loadplayers");
    let playerInputForm = document.getElementById("playerinputform");
    let showModifierCode = document.getElementById("showmodifierdeck");

    let deckList = new DeckList();
    let scenarioList = new ScenarioList(SCENARIO_DEFINITIONS);
    let playerList = new PlayerList();

    decksPage.insertAdjacentElement("afterbegin", deckList.ul);
    scenariosPage.insertAdjacentElement("afterbegin", scenarioList.ul);

    applyDeckBtn.onclick = function () {
        localStorage.removeItem("selectedDeckNames");
        let selectedDeckNames = deckList.getSelectedDecks();
        writeToStorage("selectedDeckNames", JSON.stringify(selectedDeckNames));
        let selectedDecks = selectedDeckNames.map(function (deckNames) {
            return loadAbilityDeck(deckNames.class, deckNames.name, deckNames.level);
        });
        applyDeckSelection(selectedDecks, true);
        let showModifierDecksPage = document.getElementById("showmodifierdeck-deckspage");
        let modifierDeckSection = document.getElementById("modifier-container");
        if (!showModifierDecksPage.checked) {
            modifierDeckSection.style.display = "none";
        }
        else {
            modifierDeckSection.style.display = "block";
        }
        resetRoundCounter();
    };

    applyScenarioBtn.onclick = function () {
        localStorage.removeItem("selectedDeckNames");
        let selectedDeckNames = scenarioList.getScenarioDecks();
        writeToStorage("selectedDeckNames", JSON.stringify(selectedDeckNames));
        deckList.setSelection(selectedDeckNames);
        let selectedDecks = selectedDeckNames.map(function (deckNames) {
            return loadAbilityDeck(deckNames.class, deckNames.name, deckNames.level);
        });
        applyDeckSelection(selectedDecks, false);
        let modifierDeckSection = document.getElementById("modifier-container");
        if (!showModifierCode.checked) {
            modifierDeckSection.style.display = "none";
        }
        else {
            modifierDeckSection.style.display = "block";
        }
        resetRoundCounter();
    };

    applyLoadBtn.onclick = function () {
        loadPlayers();
        loadRoundCounter();
        let selectedDeckNames = JSON.parse(getFromStorage("selectedDeckNames"));
        if (selectedDeckNames) {
            let selectedDecks = selectedDeckNames.map(function (deckNames) {
                return loadAbilityDeck(deckNames.class, deckNames.name, deckNames.level);
            });
            applyDeckSelection(selectedDecks, true);
        }
        let modifierDeckSection = document.getElementById("modifier-container");
        if (!showModifierCode.checked) {
            modifierDeckSection.style.display = "none";
        }
        else {
            modifierDeckSection.style.display = "block";
        }
    };

    function applyPlayers(e) {
        e.preventDefault();
        playerList.getSelection();
        playerList.updateGlobalPlayers();
        writeToStorage("players", JSON.stringify(window.players));
        addAllPlayersToSwitchList();
        calculatePartyLevel();
    }

    function loadPlayers() {
        window.players = JSON.parse(getFromStorage("players"));
        playerList.setSelection(window.players);
        calculatePartyLevel();
    }

    applyPlayersBtn.onclick = applyPlayers;
    playerInputForm.onsubmit = applyPlayers;

    loadPlayersBtn.onclick = loadPlayers;

    window.onresize = refreshUi.bind(null, window.visibleAbilityDecks);
}

if (window.attachEvent) {
    window.attachEvent('onload', init);
} else {
    if (window.onload) {
        let curronload = window.onload;
        window.onload = function (evt) {
            curronload(evt);
            init(evt);
        };
    } else {
        window.onload = init;
    }
}