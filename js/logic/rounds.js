import {reshuffleModifierDeck} from "./decks";
import {getFromStorage, writeToStorage} from "./util";

export function endRound() {
    if (window.modifierDeck && window.modifierDeck.shuffleEndOfRound()) {
        window.modifierDeck.cleanAdvantageDeck();
        reshuffleModifierDeck(window.modifierDeck);
    }
    writeToStorage("modifierDeck", JSON.stringify(window.modifierDeck));
}

export function loadRoundCounter() {
    let roundNum = getFromStorage("roundnumber");
    if (!roundNum) {
        roundNum = 0;
    }
    let counter = document.getElementById("roundcounter");
    counter.innerText = roundNum;
}

export function resetRoundCounter() {
    localStorage.removeItem("roundnumber");
    let counter = document.getElementById("roundcounter");
    counter.innerText = "0";
}

export function incrementRoundCounter() {
    let counter = document.getElementById("roundcounter");
    counter.innerText++;
    writeToStorage("roundnumber", counter.innerText);
}