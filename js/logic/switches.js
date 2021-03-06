import {writeToStorage} from "./util.js";
import {getNewPlayerInitiative} from "./players.js";

export function updateDeckSwitchInitiative(deckId, initiative) {
    let listItem = document.getElementById("switch-" + deckId);
    let initDiv = document.getElementById("switch-" + deckId + "-initiative");
    initDiv.innerText = " (" + initiative + ")";
    listItem.classList.remove("switchroundover");
    document.getElementById(deckId).classList.remove("deckroundover");
}

export function updatePlayerSwitchInitiative(player) {
    let newInit;
    let listItem = document.getElementById("switch-" + player.identifier);
    let initiative = document.getElementById("switch-" + player.identifier + "-initiative");
    if (!player.initiative) {
        newInit = "??";
    } else {
        newInit = player.initiative;
        listItem.classList.remove("switchremoved");
        listItem.classList.remove("switchroundover");
    }
    initiative.innerText = " (" + newInit + ")";
}

export function reorderSwitches() {
    let switches = document.getElementById("switcheslist");
    let items = switches.childNodes;

    items = Array.from(items).filter(function (item) {
        return item.nodeType === 1;
    });

    items.sort(function (a, b) {
        let aInit = parseInt(a.textContent.replace(/\D+/g, "")) || 100;
        let bInit = parseInt(b.textContent.replace(/\D+/g, "")) || 100;

        let aIsPlayer = a.classList.contains("player");
        let bIsPlayer = b.classList.contains("player");

        if (aInit === bInit) {
            if (aIsPlayer && !bIsPlayer) {
                return -1;
            } else if (!aIsPlayer && bIsPlayer) {
                return 1;
            } else if (aIsPlayer && bIsPlayer) {
                // TODO: Get second card values
                return 0;
            } else {
                return 0;
            }
        } else if (aInit > bInit) {
            return 1;
        } else if (aInit < bInit) {
            return -1;
        }
    });

    for (let i = 0; i < items.length; ++i) {
        switches.appendChild(items[i]);
    }
}

export function addPlayerToSwitchList(player) {
    // Don't put a new switch if one already exists
    if (document.getElementById("switch-" + player.identifier)) {
        return;
    }

    let switchesList = document.getElementById("switcheslist");
    let listItem = document.createElement("li");
    listItem.className = "switch noselect player";
    switchesList.appendChild(listItem);
    let label = document.createElement("a");
    label.id = "switch-" + player.identifier;
    label.innerText = player.identifier;
    let initiative = document.createElement("span");
    initiative.id = label.id + "-initiative";
    if (player.initiative) {
        initiative.innerText = " (" + player.initiative + ")";
    } else {
        initiative.innerText = " (??)";
    }
    label.appendChild(initiative);
    label.addEventListener("click", function () {
        label.classList.toggle("switchroundover");
    }, false);
    label.addEventListener("dblclick", function () {
        label.classList.remove("switchroundover");
        getNewPlayerInitiative(player);
    }, false);
    listItem.appendChild(label);
    writeToStorage("players", JSON.stringify(window.players));
}

export function removePlayerFromSwitchList(player) {
    let div = document.getElementById("switch-" + player.identifier);

    if (div) {
        let switchesList = document.getElementById("switcheslist");
        switchesList.removeChild(div.parentNode);
    }
}

export function addAllPlayersToSwitchList() {
    let switchesList = document.getElementById("switcheslist");

    // Remove all existing player switches
    switchesList.childNodes.forEach(function (childNode) {
        if (childNode.classList && childNode.classList.contains("player")) {
            switchesList.removeChild(childNode);
        }
    });


    for (let playerName in window.players) {
        if (window.players.hasOwnProperty(playerName)) {
            addPlayerToSwitchList(window.players[playerName]);
        }
    }
}

export function addDeckToSwitchList(deck) {
    // Don't put a new switch if one already exists
    if (document.getElementById("switch-" + deck.deckId)) {
        return;
    }

    let switchesList = document.getElementById("switcheslist");
    let listItem = document.createElement("li");
    listItem.className = "switch noselect";
    switchesList.appendChild(listItem);
    let label = document.createElement("a");
    label.id = "switch-" + deck.deckId;
    label.innerText = deck.getRealName();
    label.title = "Click to show/hide deck";
    let initiative = document.createElement("span");
    initiative.id = label.id + "-initiative";
    if (deck.deckId in window.visibleCards) {
        initiative.innerText = " (" + window.visibleCards[deck.deckId].initiative + ")";
    } else {
        initiative.innerText = " (??)";
    }
    label.appendChild(initiative);
    label.addEventListener("click", function () {
        let d = document.getElementById(this.id.replace("switch-", ""));
        if (d.classList.contains("hiddendeck")) {
            window.visibleAbilityDecks.push(deck);
            listItem.classList.remove("switchremoved");
            d.classList.remove("hiddendeck");
            d.classList.remove("deckroundover");
            label.classList.remove("switchroundover");
        } else {
            if (d.classList.contains("deckroundover")) {
                label.classList.remove("switchroundover");
            } else {
                label.classList.add("switchroundover");
            }
            d.classList.toggle("deckroundover");
        }
    }, false);
    label.addEventListener("dblclick", function () {
        let d = document.getElementById(this.id.replace("switch-", ""));
        if (d.classList.contains("hiddendeck")) {
            window.visibleAbilityDecks.push(deck);
            listItem.classList.remove("switchremoved");
        } else {
            window.visibleAbilityDecks.splice(window.visibleAbilityDecks.indexOf(deck), 1);
            listItem.classList.add("switchremoved");
        }
        d.classList.toggle("hiddendeck");
    }, false);
    listItem.addEventListener("mouseenter", function () {
        let d = document.getElementById(this.firstElementChild.id.replace("switch-", ""));
        d.classList.add("hoveredswitch");
    }, false);
    listItem.addEventListener("mouseleave", function () {
        let d = document.getElementById(this.firstElementChild.id.replace("switch-", ""));
        d.classList.remove("hoveredswitch");
    }, false);
    listItem.appendChild(label);
}

export function removeDeckFromSwitchList(deck) {
    let div = document.getElementById("switch-" + deck.deckId);

    if (div) {
        let switchesList = document.getElementById("switcheslist");
        switchesList.removeChild(div.parentNode);
    }
}