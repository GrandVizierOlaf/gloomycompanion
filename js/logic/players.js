import {addPlayerToSwitchList, updatePlayerSwitchInitiative, reorderSwitches} from "./switches.js";
import {writeToStorage} from "./util.js";

let modalOpen = false;

export function addPlayer(identifier, level, initiative = null) {
    let character = {
        initiative: initiative,
        level: level,
        identifier: identifier
    };

    window.players[identifier] = character;
    addPlayerToSwitchList(character);
}

export function getNewPlayerInitiative(player) {
    let modalForm = document.createElement("form");
    modalForm.id = "modalForm";
    modalForm.innerText = "Enter initiative for " + player.identifier + ": ";
    let modalInput = document.createElement("input");
    modalInput.id = "modalInput";
    modalInput.pattern = "\\d{0,2}";
    modalForm.appendChild(modalInput);
    let modalSubmit = document.createElement("input");
    modalSubmit.type = "submit";
    modalForm.appendChild(modalSubmit);
    Modal.open({
        openCallback: function () {
            modalOpen = true;
            // TODO: Don't show keypad on mobile devices
            let modalInputSel = $("#modalInput");
            modalInputSel.keypad(
                {
                    keypadOnly: false,
                    showAnim: "",
                    layout: ["123",
                        "456" + $.keypad.CLEAR,
                        "789" + $.keypad.BACK,
                        $.keypad.SPACE + "0"],
                    onClose: function (value, inst) {
                        modalInput.value = value;
                        Modal.close();
                    }
                }
            );
            modalInputSel.keypad("show");
        },
        content: modalForm.outerHTML,
        closeCallback: function () {
            player.initiative = modalInput.value;
            updatePlayerSwitchInitiative(player);
            reorderSwitches();
            writeToStorage("players", JSON.stringify(window.players));
            modalOpen = false;
        }
    });
    modalForm.addEventListener("submit", function (e) {
        e.preventDefault();
        Modal.close();
    });
    writeToStorage("players", JSON.stringify(window.players));
}

export function updateAllPlayerInits() {
    for (let playerName in window.players) {
        if (window.players.hasOwnProperty(playerName)) {
            waitForModalClose(getNewPlayerInitiative, window.players[playerName]);
        }
    }
}

function waitForModalClose(cb, arg) {
    if (modalOpen) {
        setTimeout(waitForModalClose, 100, cb, arg);
    } else if (cb) {
        cb(arg);
    }
}

export function calculatePartyLevel() {
    if (!window.players || (Object.keys(window.players).length === 0 && window.players.constructor === Object)) {
        return;
    }
    let levels = Object.keys(window.players).map(f => window.players[f].level);

    let total = 0;
    for (let i = 0; i < levels.length; i++) {
        total += parseInt(levels[i], 10);
    }
    let avg = total / levels.length;

    window.partyLevel = Math.ceil(avg / 2);

    let levelSelectors = document.getElementsByName("levelSelector");
    for (let selector in levelSelectors) {
        if (levelSelectors.hasOwnProperty(selector)) {
            levelSelectors[selector].value = window.partyLevel;
        }
    }
}