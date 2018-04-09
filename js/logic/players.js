import {addPlayerToSwitchList, reorderSwitches} from "./switches.js";
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

export function updatePlayerInit(player) {
    let listItem = document.getElementById("switch-" + player.identifier);
    let initiative = document.getElementById("switch-" + player.identifier + "-initiative");
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
            let modalInput = $("#modalInput");
            modalInput.keypad(
                {
                    keypadOnly: false,
                    showAnim: "",
                    layout: ["123",
                        "456" + $.keypad.CLEAR,
                        "789" + $.keypad.BACK,
                        $.keypad.SPACE + "0"],
                    onClose: function (value, inst) {
                        console.log(value);
                        modalInput.value = value;
                        Modal.close();
                    }
                }
            );
            modalInput.keypad("show");
        },
        content: modalForm.outerHTML,
        closeCallback: function () {
            let newInit = modalInput.value;
            player.initiative = newInit;
            if (!newInit) {
                newInit = "??";
            } else {
                listItem.classList.remove("switchremoved");
                listItem.classList.remove("switchroundover");
            }
            initiative.innerText = " (" + newInit + ")";
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
            waitForModalClose(updatePlayerInit, window.players[playerName]);
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