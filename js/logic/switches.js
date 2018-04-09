import {writeToStorage} from "./util.js";
import {updatePlayerInit} from "./players.js";

export function updateSwitchInitiative(deckId, initiative) {
    let div = document.getElementById("switch-" + deckId + "-initiative");
    div.innerText = " (" + initiative + ")";
    document.getElementById("switch-" + deckId).classList.remove("switchroundover");
    document.getElementById(deckId).classList.remove("deckroundover");
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

    let switcheslist = document.getElementById("switcheslist");
    let listItem = document.createElement("li");
    listItem.className = "switch noselect player";
    switcheslist.appendChild(listItem);
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
        updatePlayerInit(player);
    }, false);
    listItem.appendChild(label);
    writeToStorage("players", JSON.stringify(window.players));
}

export function addAllPlayersToSwitchList() {
    for (let playerName in window.players) {
        if (window.players.hasOwnProperty(playerName)) {
            addPlayerToSwitchList(window.players[playerName]);
        }
    }
}

export function addDeckToSwitchList(deck) {
    // Don't put a new switch if one already exists
    if (document.getElementById("switch-" + deck.deckid)) {
        return;
    }

    let switchesList = document.getElementById("switcheslist");
    let listItem = document.createElement("li");
    listItem.className = "switch noselect";
    switchesList.appendChild(listItem);
    let label = document.createElement("a");
    label.id = "switch-" + deck.deckid;
    label.innerText = deck.getRealName();
    let initiative = document.createElement("span");
    initiative.id = label.id + "-initiative";
    if (deck.deckid in window.visibleCards) {
        initiative.innerText = " (" + window.visibleCards[deck.deckid].initiative + ")";
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