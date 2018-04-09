"use strict";

import {
    shuffleList, toggleClass, createButton, concatArrays, createInput, dictValues, findInDiscard, getFromStorage,
    inputValue, isChecked, removeChild, removeEmptyStrings, writeToStorage
} from './util.js';

import {
    attributesToLines, expandString, immunitiesToLines, notesToLines, specialToLines
} from './macros.js';

import {
    DECKS, DECK_DEFINITIONS
} from './cards.js';

import {
    CARD_TYPES_MODIFIER, MODIFIER_CARDS, MODIFIER_DECK
} from './modifiers.js';

import {
    MONSTER_STATS, SPECIAL_VALUES
} from './monster_stats.js';

import {
    SCENARIO_DEFINITIONS, SPECIAL_RULES
} from './scenarios.js';

//TODO Adding an extra Guard deck will reshuffle the first one,
// End of round with multiple Archers, resize text, worth to show common and elite_only attributes?,
// shield and retaliate only when shown (apparently, attributes are active at the beginning of the turn, and active after initiative)
let doShuffles = true;
let allAbilityDecks = [];
let visibleAbilityDecks = [];
let players = {};
let partyLevel = 1;
let visibleCards = {};
let modifierDeck = null;
let deckDefinitions = loadDefinition(DECK_DEFINITIONS);
let modalOpen = false;

const DECK_TYPES =
    {
        MODIFIER: "modifier",
        ABILITY: "ability",
        BOSS: "boss"
    };

const EVENT_NAMES = {
    MODIFIER_CARD_DRAWN: "modifierCardDrawn",
    MODIFIER_DECK_SHUFFLE_REQUIRED: "modifierDeckShuffleRequired"
};

function updateSwitchInitiative(deckId, initiative) {
    let div = document.getElementById("switch-" + deckId + "-initiative");
    div.innerText = " (" + initiative + ")";
    document.getElementById("switch-" + deckId).classList.remove("switchroundover");
    document.getElementById(deckId).classList.remove("deckroundover");
}

function addPlayer(identifier, level, initiative = null) {
    let character = {
        initiative: initiative,
        level: level,
        identifier: identifier
    };

    players[identifier] = character;
    addPlayerToSwitchList(character);
}

function reorderSwitches() {
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

function UICard(frontElement, backElement) {
    let card = {};

    card.back = backElement;
    card.front = frontElement;

    card.flipUp = function (faceup) {
        toggleClass(this.back, "up", !faceup);
        toggleClass(this.back, "down", faceup);

        toggleClass(this.front, "up", faceup);
        toggleClass(this.front, "down", !faceup);
    };

    card.setDepth = function (z) {
        this.back.style.zIndex = z;
        this.front.style.zIndex = z;
    };

    card.pushDown = function () {
        this.back.style.zIndex -= 1;
        this.front.style.zIndex -= 1;
    };

    card.addClass = function (className) {
        this.front.classList.add(className);
        this.back.classList.add(className);
    };

    card.removeClass = function (className) {
        this.front.classList.remove(className);
        this.back.classList.remove(className);
    };

    card.attach = function (parent) {
        parent.appendChild(this.back);
        parent.appendChild(this.front);
    };

    card.flipUp(false);

    return card;
}

function createAbilityCardBack(name, level) {
    let card = document.createElement("div");
    card.className = "card ability back down";

    let nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.innerText = name + "-" + level;
    card.appendChild(nameSpan);

    return card;
}

function createAbilityCardFront(initiative, name, shuffle, lines, attack, move, range, level, health) {
    let card = document.createElement("div");
    card.className = "card ability front down";

    let nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.innerText = name + "-" + level;
    card.appendChild(nameSpan);

    let healthNormalSpan = document.createElement("span");
    healthNormalSpan.className = "healthNormal";
    healthNormalSpan.innerText = "HP " + health[0];
    card.appendChild(healthNormalSpan);

    if (health[1] > 0) {
        let healthEliteSpan = document.createElement("span");
        healthEliteSpan.className = "healthElite";
        healthEliteSpan.innerText = "HP " + health[1];
        card.appendChild(healthEliteSpan);
    }

    let initiativeSpan = document.createElement("span");
    initiativeSpan.className = "initiative";
    initiativeSpan.innerText = initiative;
    card.appendChild(initiativeSpan);

    if (shuffle) {
        let shuffleImg = document.createElement("img");
        shuffleImg.src = "images/shuffle.svg";
        card.appendChild(shuffleImg);
    }

    let currentDepth = 0;
    let currentParent = card;

    lines = removeEmptyStrings(lines);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        let newDepth = 0;
        while (line.indexOf("*") >= 0) {
            newDepth += 1;
            line = line.substr(1);
        }
        let diff = newDepth - currentDepth;

        while (currentDepth !== newDepth) {
            if (diff > 0) {
                // Need one level lower, create <ul>
                let list = document.createElement("ul");
                // Dynamically adapt the size to the line length. I found this the sweet spot to read all the cards
                if (lines.length > 5) {
                    list.style.fontSize = (100 - (lines.length * 2.5)) + "%";
                }
                currentParent.appendChild(list);
                currentParent = list;

                // Create <li>
                let listItem = document.createElement("li");
                currentParent.appendChild(listItem);
                currentParent = listItem;

                currentDepth += 1;
            }
            else {
                // Need to go up in the list, pop <li>
                currentParent = currentParent.parentElement;

                // pop <ul>
                currentParent = currentParent.parentElement;

                currentDepth -= 1;
            }
        }

        if ((currentDepth > 0) && (diff <= 0)) {
            // Same level, pop the previous <li>
            currentParent = currentParent.parentElement;

            // create sibling <li>
            let listItem = document.createElement("li");
            currentParent.appendChild(listItem);
            currentParent = listItem;
        }

        let text = expandString(line.trim(), attack, move, range);
        currentParent.insertAdjacentHTML("beforeend", text);
    }

    return card;
}

function loadAbilityDeck(deckClass, deckName, level) {
    let deckDefinition = deckDefinitions[deckClass];
    deckDefinition.name = deckName;
    deckDefinition.level = level;

    let loadedDeck = JSON.parse(getFromStorage(deckName));

    let deck = {
        class: deckDefinition.class,
        name: deckDefinition.name,
        type: DECK_TYPES.ABILITY,
        drawPile: [],
        discard: [],
        move: [0, 0],
        attack: [0, 0],
        range: [0, 0],
        level: deckDefinition.level,
        health: [0, 0]
    };

    for (let i = 0; i < deckDefinition.cards.length; i++) {
        let definition = deckDefinition.cards[i];
        let shuffle = definition[0];
        let initiative = definition[1];
        let lines = definition.slice(2);

        let emptyFront = document.createElement("div");
        emptyFront.className = "card ability front down";
        let cardFront = emptyFront;
        let cardBack = createAbilityCardBack(deck.name, deck.level);

        let card = {
            id: deck.name + "_" + i,
            ui: new UICard(cardFront, cardBack),
            shuffleNext: shuffle,
            initiative: initiative,
            startingLines: lines,
        };

        card.paintFrontCard = function (name, lines, attack, move, range, level, health) {
            this.ui.front = createAbilityCardFront(this.initiative, name, this.shuffleNext, lines, attack, move,
                range, level, health);
        };

        if (loadedDeck && findInDiscard(loadedDeck.discard, card.id)) {
            deck.discard.push(card);
        } else {
            deck.drawPile.push(card);
        }
    }
    deck.drawTopDiscard = function () {
        if (this.discard.length > 0) {
            let card = this.discard[this.discard.length - 1];
            let cardsLines = card.startingLines;
            let extraLines = [];
            if (this.isBoss()) {
                let newLines = [];
                cardsLines.forEach(function (line) {
                    newLines = newLines.concat(specialToLines(line, deck.special1, deck.special2));
                });
                cardsLines = newLines;
                if (this.immunities) {
                    extraLines = extraLines.concat(immunitiesToLines(this.immunities));
                }
                if (this.notes) {
                    extraLines = extraLines.concat(notesToLines(this.notes));
                }
            }
            else {
                if (this.attributes) {
                    extraLines = extraLines.concat(attributesToLines(this.attributes));
                }

            }

            card.paintFrontCard(this.getRealName(), cardsLines.concat(extraLines), this.attack, this.move, this.range, this.level, this.health);

            card.ui.setDepth(-3);
            card.ui.addClass("pull");
            card.ui.flipUp(true);
            card.ui.removeClass("draw");
            card.ui.addClass("discard");
            updateSwitchInitiative(this.deckid, card.initiative);
        }
        forceRepaintDeck(this);
    };

    deck.drawTopCard = function () {

        let cardsLines = this.drawPile[0].startingLines;
        let extraLines = [];
        if (this.isBoss()) {
            let newLines = [];
            cardsLines.forEach(function (line) {
                newLines = newLines.concat(specialToLines(line, deck.special1, deck.special2));
            });
            cardsLines = newLines;
            if (this.immunities) {
                extraLines = extraLines.concat(immunitiesToLines(this.immunities));
            }
            if (this.notes) {
                extraLines = extraLines.concat(notesToLines(this.notes));
            }
        }
        else {
            if (this.attributes) {
                extraLines = extraLines.concat(attributesToLines(this.attributes));
            }

        }

        this.drawPile[0].paintFrontCard(this.getRealName(), cardsLines.concat(extraLines), this.attack, this.move, this.range, this.level, this.health);
        forceRepaintDeck(this);
    };

    deck.mustReshuffle = function () {
        if (!this.drawPile.length) {
            return true;
        } else {
            if (doShuffles && this.discard.length) {
                return this.discard[0].shuffleNext;
            }
        }
    };

    deck.setStatsMonster = function (stats) {
        this.attack = stats.attack;
        this.move = stats.move;
        this.range = stats.range;
        this.attributes = stats.attributes;
        this.health = stats.health;
    };

    deck.setStatsBoss = function (stats) {
        this.attack = stats.attack;
        this.move = stats.move;
        this.range = stats.range;
        this.special1 = stats.special1;
        this.special2 = stats.special2;
        this.immunities = stats.immunities;
        this.notes = stats.notes;
        this.health = stats.health;
    };

    deck.getRealName = function () {
        return (this.name) ? this.name : this.class;
    };

    deck.isBoss = function () {
        return this.class === DECKS["Boss"].class;
    };

    deck.setCardPiles = function (drawPile, discardPile) {
        for (let i = 0; i < drawPile.length; i++) {
            this.drawPile[i].shuffleNext = drawPile[i].shuffleNext;
            this.drawPile[i].initiative = drawPile[i].initiative;
            this.drawPile[i].startingLines = drawPile[i].startingLines;
        }
        for (let i = 0; i < discardPile.length; i++) {
            // TODO: Uncaught TypeError: Cannot set property 'shuffleNext' of undefined
            this.discard[i].shuffleNext = discardPile[i].shuffleNext;
            this.discard[i].initiative = discardPile[i].initiative;
            this.discard[i].startingLines = discardPile[i].startingLines;
        }
    };

    deck.deckid = deck.getRealName().replace(/\s+/g, "");

    writeToStorage(deck.name, JSON.stringify(deck));
    return deck;

}

function placeDeck(deck, container) {
    for (let i = 0; i < deck.drawPile.length; i++) {
        let card = deck.drawPile[i];
        card.ui.attach(container);
    }
    for (let i = 0; i < deck.discard.length; i++) {
        let card = deck.discard[i];
        card.ui.attach(container);
    }
    deck.deckSpace = container;
}

function forceRepaintDeck(deck) {
    preventPullAnimation(deck);
    let space = deck.deckSpace;
    removeChild(space);
    placeDeck(deck, space);
}

// This should be dynamic dependant on lines per card
function refreshUi() {
    let actualCardHeight = 296;
    let baseFontSize = 26.6;

    let tableau = document.getElementById("tableau");
    let cards = tableau.getElementsByClassName("card");
    for (let i = 1; i < cards.length; i++) {
        if (cards[i].className.indexOf("ability") !== -1) {
            let scale = cards[i].getBoundingClientRect().height / actualCardHeight;
            let scaledFontSize = baseFontSize * scale;

            let fontPixelSize = Math.min(scaledFontSize, baseFontSize);
            tableau.style.fontSize = fontPixelSize + "px";
            break;
        }
    }
}

function reshuffle(deck, includeDiscards) {
    shuffleDeck(deck, includeDiscards);

    // This way we keep sync several decks from the same class
    visibleAbilityDecks.forEach(function (visibleDeck) {
        if ((visibleDeck !== deck) && (visibleDeck.class === deck.class)) {
            shuffleDeck(visibleDeck, includeDiscards);
            visibleDeck.setCardPiles(deck.drawPile, deck.discard);
        }
    });
}

function shuffleDeck(deck, includeDiscards) {
    if (includeDiscards) {
        deck.drawPile = deck.drawPile.concat(deck.discard);
        deck.discard = [];
    }

    shuffleList(deck.drawPile);

    for (let i = 0; i < deck.drawPile.length; i++) {
        let card = deck.drawPile[i];

        card.ui.removeClass("lift");
        card.ui.removeClass("pull");

        card.ui.flipUp(false);

        card.ui.removeClass("discard");
        card.ui.addClass("draw");

        card.ui.setDepth(-i - 6);
    }
}

function flipUpTopCard(deck) {
    for (let i = 0; i < deck.discard.length; i++) {
        let card = deck.discard[i];
        card.ui.removeClass("lift");
        card.ui.removeClass("pull");
        card.ui.pushDown();
    }

    if (deck.discard.length > 0) {
        deck.discard[0].ui.addClass("lift");
    }

    let card = deck.drawPile.shift();
    sendToDiscard(card, true);
    deck.discard.unshift(card);

    updateSwitchInitiative(deck.deckid, card.initiative);
    return card;
}

function sendToDiscard(card, pullAnimation) {
    card.ui.setDepth(-3);

    if (pullAnimation) {
        card.ui.addClass("pull");
    }

    card.ui.flipUp(true);

    card.ui.removeClass("draw");
    card.ui.addClass("discard");
}

export function drawAllVisibleAbilityCards() {
    visibleAbilityDecks.forEach(function (visibleDeck) {
        drawAbilityCard(visibleDeck);
    });
}

function drawAbilityCard(deck) {

    if (deck.mustReshuffle()) {
        reshuffle(deck, true);
        drawAbilityCard(deck);
    }
    else {
        visibleAbilityDecks.forEach(function (visibleDeck) {
            if (visibleDeck.class === deck.class) {
                visibleDeck.drawTopCard();
                let card = flipUpTopCard(visibleDeck);

                visibleCards[deck.deckid] = card;

                updateSwitchInitiative(deck.deckid, card.initiative);
            }
        });
    }
    reorderSwitches();
    writeToStorage(deck.name, JSON.stringify(deck));
}

function preventPullAnimation(deck) {
    if (deck.discard.length) {
        if (deck.discard[1]) {
            deck.discard[1].ui.removeClass("lift");
            deck.discard[0].ui.addClass("lift");
        }

        deck.discard[0].ui.removeClass("pull");
    }
}

function reshuffleModifierDeck(deck) {
    deck.cleanDiscardPile();
    reshuffle(deck, true);
    document.body.dispatchEvent(new CustomEvent(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, {detail: {shuffle: false}}));
}

function drawModifierCard(deck) {
    deck.cleanAdvantageDeck();

    if (deck.mustReshuffle()) {
        reshuffleModifierDeck(deck);
    }
    else {
        flipUpTopCard(deck);

        document.body.dispatchEvent(new CustomEvent(
            EVENT_NAMES.MODIFIER_CARD_DRAWN,
            {
                detail: {
                    cardType: deck.discard[0].cardType,
                    count: deck.count(deck.discard[0].cardType)
                }
            }));

        if (deck.shuffleEndOfRound()) {
            document.body.dispatchEvent(new CustomEvent(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, {detail: {shuffle: true}}));
        }
    }
    writeToStorage("modifierDeck", JSON.stringify(deck));
}

function doubleDraw(deck) {
    let advantageCard;
    // Case there was 1 card in drawPile when we clicked "draw 2".
    //    now we should draw, save that card, reshuffle, and
    //    draw the next
    if (deck.drawPile.length === 1) {
        drawModifierCard(deck);
        reshuffleModifierDeck(deck);
        advantageCard = deck.drawPile.shift();
        sendToDiscard(advantageCard, false);
        deck.discard.unshift(advantageCard);
        drawModifierCard(deck);
    }
    // Case there were 0 cards in drawPile when we clicked "draw 2".
    //    we should reshuffle, draw 1 and send it to advantage_place,
    //    draw the next
    else if (deck.drawPile.length === 0) {
        // This is in case the previous draw was double as well
        deck.cleanAdvantageDeck();
        reshuffleModifierDeck(deck);
        drawModifierCard(deck);
        advantageCard = deck.discard[0];
        drawModifierCard(deck);
    }
    // Every other simple case
    else {
        drawModifierCard(deck);
        advantageCard = deck.discard[0];
        drawModifierCard(deck);
    }
    deck.discard[0].ui.addClass("right");
    advantageCard.ui.addClass("left");
    deck.advantageToClean = true;
}

function loadModifierDeck() {
    let deck =
        {
            name: "Monster modifier deck",
            type: DECK_TYPES.MODIFIER,
            drawPile: [],
            discard: [],
            advantageToClean: false
        };


    deck.drawTopDiscard = function () {
        if (this.discard.length > 0) {
            let card = this.discard[this.discard.length - 1];
            card.ui.setDepth(-3);
            card.ui.addClass("pull");
            card.ui.flipUp(true);
            card.ui.removeClass("draw");
            card.ui.addClass("discard");
        }
        forceRepaintDeck(this);
    };

    deck.count = function (cardType) {
        return (this.drawPile.filter(function (card) {
            return card.cardType === cardType;
        }).length);
    }.bind(deck);

    deck.removeCard = function (cardType) {
        for (let i = 0; i < deck.drawPile.length; i++) {
            if (deck.drawPile[i].cardType === cardType) {
                deck.drawPile.splice(i, 1);
                reshuffle(deck, false);

                forceRepaintDeck(deck);
                break;
            }
        }
        writeToStorage("modifierDeck", JSON.stringify(modifierDeck));

        return this.count(cardType);
    }.bind(deck);

    deck.addCard = function (cardType) {
        // Rulebook p. 23: "a maximum of only 10 curse [and 10 bless] cards can be placed into any one deck"
        if (this.count(cardType) < 10) {
            // TOOD: Brittle
            deck.drawPile.push(defineModifierCard(MODIFIER_CARDS[cardType.toUpperCase()]));

            forceRepaintDeck(deck);
            reshuffle(deck, false);
        }
        writeToStorage("modifierDeck", JSON.stringify(modifierDeck));

        return this.count(cardType);
    }.bind(deck);

    deck.shuffleEndOfRound = function () {
        return this.discard.filter(function (card) {
            return card.shuffleNextRound;
        }).length > 0;
    }.bind(deck);

    deck.mustReshuffle = function () {
        return !this.drawPile.length;
    }.bind(deck);

    deck.cleanDiscardPile = function () {
        for (let i = 0; i < deck.discard.length; i++) {
            if (this.discard[i].cardType === CARD_TYPES_MODIFIER.BLESS ||
                this.discard[i].cardType === CARD_TYPES_MODIFIER.CURSE) {
                //Delete this curse/bless that has been used
                this.discard.splice(i, 1);
                i--;
            }
        }

        // This is needed every time we update
        forceRepaintDeck(this);
    }.bind(deck);

    deck.cleanAdvantageDeck = function () {
        if ((deck.advantageToClean) && deck.discard[1]) {
            deck.advantageToClean = false;
            deck.discard[0].ui.removeClass("right");
            deck.discard[0].ui.removeClass("left");
            deck.discard[1].ui.removeClass("left");
            deck.discard[1].ui.removeClass("left");
        }
    }.bind(deck);
    let loadedDeck = JSON.parse(getFromStorage("modifierDeck"));

    MODIFIER_DECK.forEach(function (cardDefinition) {
        let card = defineModifierCard(cardDefinition);
        if (loadedDeck && findInDiscardAndRemove(loadedDeck.discard, card.cardType)) {
            deck.discard.push(card);
        } else {
            deck.drawPile.push(card);
        }
    });

    return deck;
}

function findInDiscardAndRemove(discard, cardType) {
    for (let i = 0; i < discard.length; i++) {
        if (discard[i].cardType === cardType) {
            return discard.splice(i, 1);
        }
    }
    return null;
}

function createModifierCardBack() {
    let card = document.createElement("div");
    card.className = "card modifier back";

    return card;
}

function createModifierCardFront(cardUrl) {
    let img = document.createElement("img");
    img.className = "cover";
    img.src = cardUrl;

    let card = document.createElement("div");
    card.className = "card modifier front";
    card.appendChild(img);

    return card;
}

function defineModifierCard(cardDefinition) {
    let cardFront = createModifierCardFront(cardDefinition.image);
    let cardBack = createModifierCardBack();

    let card = {
        ui: new UICard(cardFront, cardBack),
        cardType: cardDefinition.type,
        shuffleNextRound: cardDefinition.shuffle
    };

    return card;
}

export function endRound() {
    if (modifierDeck && modifierDeck.shuffleEndOfRound()) {
        modifierDeck.cleanAdvantageDeck();
        reshuffleModifierDeck(modifierDeck);
    }
    writeToStorage("modifierDeck", JSON.stringify(modifierDeck));
}

function loadDefinition(cardDatabase) {
    let decks = {};
    for (let i = 0; i < cardDatabase.length; i++) {
        let definition = cardDatabase[i];
        decks[definition.class] = definition;
    }

    return decks;
}

function getMonsterStats(name, level) {
    let attack = [MONSTER_STATS["monsters"][name]["level"][level]["normal"]["attack"],
        MONSTER_STATS["monsters"][name]["level"][level]["elite"]["attack"]
    ];
    let move = [MONSTER_STATS["monsters"][name]["level"][level]["normal"]["move"],
        MONSTER_STATS["monsters"][name]["level"][level]["elite"]["move"]
    ];
    let range = [MONSTER_STATS["monsters"][name]["level"][level]["normal"]["range"],
        MONSTER_STATS["monsters"][name]["level"][level]["elite"]["range"]
    ];
    let attributes = [MONSTER_STATS["monsters"][name]["level"][level]["normal"]["attributes"],
        MONSTER_STATS["monsters"][name]["level"][level]["elite"]["attributes"]
    ];

    let health = [MONSTER_STATS["monsters"][name]["level"][level]["normal"]["health"],
        MONSTER_STATS["monsters"][name]["level"][level]["elite"]["health"]
    ];

    return {"attack": attack, "move": move, "range": range, "attributes": attributes, "health": health};
}

function getBossStats(name, level) {
    name = name.replace("Boss: ", "");
    let attack = [MONSTER_STATS["bosses"][name]["level"][level]["attack"]];
    let move = [MONSTER_STATS["bosses"][name]["level"][level]["move"]];
    let range = [MONSTER_STATS["bosses"][name]["level"][level]["range"]];
    let special1 = MONSTER_STATS["bosses"][name]["level"][level]["special1"];
    let special2 = MONSTER_STATS["bosses"][name]["level"][level]["special2"];
    let immunities = MONSTER_STATS["bosses"][name]["level"][level]["immunities"];
    let notes = MONSTER_STATS["bosses"][name]["level"][level]["notes"];
    let health = [MONSTER_STATS["bosses"][name]["level"][level]["health"]];

    return {
        "attack": attack,
        "move": move,
        "range": range,
        "special1": special1,
        "special2": special2,
        "immunities": immunities,
        "notes": notes,
        "health": health
    };
}

function applyDeckSelection(decks, preserveExistingDeckState) {
    let container = document.getElementById("tableau");

    let decksToRemove = visibleAbilityDecks.filter(function (visibleDeck) {
        return !preserveExistingDeckState || (decks.filter(function (deck) {
            return ((deck.name === visibleDeck.name) && (deck.level === visibleDeck.level));
        }).length === 0);
    });

    let decksToAdd = decks.filter(function (deck) {
        return !preserveExistingDeckState || (allAbilityDecks.filter(function (abilityDeck) {
            return ((deck.name === abilityDeck.name) && (deck.level === abilityDeck.level));
        }).length === 0);
    });

    if (!modifierDeck) {
        initModifierDeck();
        addModifierDeck(container, modifierDeck, preserveExistingDeckState);
        if (preserveExistingDeckState) {
            let loadedModifierDeck = JSON.parse(getFromStorage("modifierDeck"));
            let curses = countType("curse", loadedModifierDeck);
            let blessings = countType("bless", loadedModifierDeck);
            for (let i = 0; i < blessings; i++) {
                modifierDeck.addCard("bless");
            }
            for (let i = 0; i < curses; i++) {
                modifierDeck.addCard("curse");
            }
            modifierDeck.drawTopDiscard();

            document.body.dispatchEvent(new CustomEvent(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, {detail: {shuffle: modifierDeck.shuffleEndOfRound()}}));
        }
    }
    else if (!preserveExistingDeckState) {
        container.removeChild(document.getElementById("modifier-container"));
        initModifierDeck();
        addModifierDeck(container, modifierDeck, preserveExistingDeckState);
    }
    writeToStorage("modifierDeck", JSON.stringify(modifierDeck));

    decksToRemove.forEach(function (deck) {
        deck.discardDeck();
    });

    visibleAbilityDecks.forEach(function (deck) {
        addDeckToSwitchList(deck);
    });

    decksToAdd.forEach(function (deck) {
        addDeckToSwitchList(deck);
        let deckSpace = document.createElement("div");
        deckSpace.id = deck.deckid;
        deckSpace.className = "card-container";

        container.appendChild(deckSpace);

        placeDeck(deck, deckSpace);
        reshuffle(deck, !preserveExistingDeckState);

        deckSpace.onclick = drawAbilityCard.bind(null, deck);

        deck.discardDeck = function () {
            let index = visibleAbilityDecks.indexOf(this);

            if (index > -1) {
                visibleAbilityDecks.splice(index, 1);
            }

            container.removeChild(deckSpace);
        };

        if (deck.isBoss()) {
            // We don't want stats if someone selects Boss on the deck tab
            if (deck.getRealName() !== "Boss") {
                deck.setStatsBoss(getBossStats(deck.getRealName(), deck.level));
            }
        } else {
            deck.setStatsMonster(getMonsterStats(deck.getRealName(), deck.level));

        }
        reshuffle(deck);
        if (preserveExistingDeckState) {
            deck.drawTopDiscard();
        } else {
            forceRepaintDeck(deck);
        }
        allAbilityDecks.push(deck);
        visibleAbilityDecks.push(deck);

        addDeckToSwitchList(deck);
    });

    addAllPlayersToSwitchList();

    reorderSwitches();

    // Rescale card text if necessary
    refreshUi();
}

function addPlayerToSwitchList(player) {
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
    writeToStorage("players", JSON.stringify(players));
}

function addAllPlayersToSwitchList() {
    for (let playerName in players) {
        if (players.hasOwnProperty(playerName)) {
            addPlayerToSwitchList(players[playerName]);
        }
    }
}

function updatePlayerInit(player) {
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
            writeToStorage("players", JSON.stringify(players));
            modalOpen = false;
        }
    });
    modalForm.addEventListener("submit", function (e) {
        e.preventDefault();
        Modal.close();
    });
    writeToStorage("players", JSON.stringify(players));
}

function waitForModalClose(cb, arg) {
    if (modalOpen) {
        setTimeout(waitForModalClose, 100, cb, arg);
    } else if (cb) {
        cb(arg);
    }
}

export function updateAllPlayerInits() {
    for (let playerName in players) {
        if (players.hasOwnProperty(playerName)) {
            waitForModalClose(updatePlayerInit, players[playerName]);
        }
    }
}

function addDeckToSwitchList(deck) {
    // Don't put a new switch if one already exists
    if (document.getElementById("switch-" + deck.deckid)) {
        return;
    }

    let switcheslist = document.getElementById("switcheslist");
    let listItem = document.createElement("li");
    listItem.className = "switch noselect";
    switcheslist.appendChild(listItem);
    let label = document.createElement("a");
    label.id = "switch-" + deck.deckid;
    label.innerText = deck.getRealName();
    let initiative = document.createElement("span");
    initiative.id = label.id + "-initiative";
    if (deck.deckid in visibleCards) {
        initiative.innerText = " (" + visibleCards[deck.deckid].initiative + ")";
    } else {
        initiative.innerText = " (??)";
    }
    label.appendChild(initiative);
    label.addEventListener("click", function () {
        let d = document.getElementById(this.id.replace("switch-", ""));
        if (d.classList.contains("hiddendeck")) {
            visibleAbilityDecks.push(deck);
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
            visibleAbilityDecks.push(deck);
            listItem.classList.remove("switchremoved");
        } else {
            visibleAbilityDecks.splice(visibleAbilityDecks.indexOf(deck), 1);
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

function initModifierDeck() {
    modifierDeck = loadModifierDeck();
}

function countType(type, deck) {
    let count = 0;
    if (deck) {
        for (let i = 0; i < deck.drawPile.length; i++) {
            if (deck.drawPile[i].cardType === type) {
                count++;
            }
        }
    }
    return count;
}

function addModifierDeck(container, deck, preserveDiscards) {
    function createCounter(cardType, incrementFunc, decrementFunc) {
        function createButton(className, text, func, textElement) {
            let button = document.createElement("div");
            button.className = className + " button";
            button.innerText = text;

            button.onclick = function () {
                textElement.innerText = func(cardType);
            };

            return button;
        }

        let widgetContainer = document.createElement("div");
        widgetContainer.className = "counter-icon";

        let background = document.createElement("div");
        background.className = "background " + cardType;
        widgetContainer.appendChild(background);

        let textElement = document.createElement("div");
        textElement.className = "icon-text";
        textElement.innerText = "0";

        widgetContainer.appendChild(createButton("decrement", "-", decrementFunc, textElement));
        widgetContainer.appendChild(textElement);
        widgetContainer.appendChild(createButton("increment", "+", incrementFunc, textElement));

        document.body.addEventListener(EVENT_NAMES.MODIFIER_CARD_DRAWN, function (e) {
            if (e.detail.cardType === cardType) {
                textElement.innerText = e.detail.count;
            }
        });

        return widgetContainer;
    }

    function indicateShuffleRequired(e) {
        if (e.detail.shuffle) {
            window.setTimeout(function () {
                endRoundDiv.className = "counter-icon shuffle";
            }, 400);
        }
        else {
            endRoundDiv.className = "counter-icon shuffle not-required";
        }
    }

    let modifierContainer = document.createElement("div");
    modifierContainer.className = "card-container";
    modifierContainer.id = "modifier-container";

    let buttonDiv = document.createElement("div");
    buttonDiv.className = "modifier-deck-column-1";

    buttonDiv.appendChild(createCounter("bless", deck.addCard, deck.removeCard));
    buttonDiv.appendChild(createCounter("curse", deck.addCard, deck.removeCard));

    let endRoundDiv = document.createElement("div");
    endRoundDiv.className = "counter-icon shuffle not-required";
    endRoundDiv.onclick = endRound;

    document.body.addEventListener(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, indicateShuffleRequired);

    buttonDiv.appendChild(endRoundDiv);

    let deckColumn = document.createElement("div");
    deckColumn.className = "modifier-deck-column-2";

    let deckSpace = document.createElement("div");
    deckSpace.className = "card-container modifier";

    let drawTwoButton = document.createElement("div");
    drawTwoButton.className = "button draw-two";
    drawTwoButton.onclick = doubleDraw.bind(null, modifierDeck);

    deckColumn.appendChild(deckSpace);
    deckColumn.appendChild(drawTwoButton);

    modifierContainer.appendChild(deckColumn);
    modifierContainer.appendChild(buttonDiv);

    container.appendChild(modifierContainer);

    placeDeck(deck, deckSpace);
    reshuffle(deck, !preserveDiscards);
    deckSpace.onclick = drawModifierCard.bind(null, deck);
}

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
    let scenariolist = {};
    scenariolist.ul = document.createElement("ul");
    scenariolist.ul.className = "selectionlist";
    scenariolist.spinner = null;
    scenariolist.decks = {};
    scenariolist.specialRules = {};
    scenariolist.levelSelector = null;

    scenariolist.levelSelector = new LevelSelector("Select level", false);

    scenariolist.ul.appendChild(scenariolist.levelSelector.html);

    for (let i = 0; i < scenarios.length; i++) {
        let scenario = scenarios[i];
        scenariolist.decks[i] = scenario.decks;
        scenariolist.specialRules[i] = scenario.specialRules ? scenario.specialRules : "";
    }

    let listitem = document.createElement("li");
    listitem.innerText = "Select scenario number";
    scenariolist.ul.appendChild(listitem);

    let scenarioSpinner = createInput("number", "scenario_number", "1", "");
    scenarioSpinner.input.min = 1;
    scenarioSpinner.input.max = scenarios.length;
    scenariolist.ul.appendChild(scenarioSpinner.input);
    scenariolist.spinner = scenarioSpinner.input;

    scenariolist.getSelection = function () {
        // We're using the scenario index that is zero-based, but the scenario list is 1-based
        let currentValue = scenariolist.spinner.value - 1;
        return Math.min(currentValue, scenarios.length + 1);
    };

    scenariolist.getLevel = function (deckName, specialRules) {

        let baseLevel = scenariolist.levelSelector.getSelection();

        if ((specialRules.indexOf(SPECIAL_RULES.livingCorpseTwoLevelsExtra) >= 0) &&
            (deckName === SPECIAL_RULES.livingCorpseTwoLevelsExtra.affectedDeck)) {
            return Math.min(7,
                (parseInt(baseLevel) + parseInt(SPECIAL_RULES.livingCorpseTwoLevelsExtra.extraLevels)));
        } else {
            return baseLevel;
        }
    };

    scenariolist.getScenarioDecks = function () {
        return (this.decks[this.getSelection()].map(function (deck) {
            if (DECKS[deck.name]) {
                deck.class = DECKS[deck.name].class;
            } else if (deck.name.indexOf("Boss") !== -1) {
                deck.class = DECKS["Boss"].class;
            }
            deck.level = scenariolist.getLevel(deck.name, scenariolist.getSpecialRules());
            return deck;
        }));
    };

    scenariolist.getSpecialRules = function () {
        return this.specialRules[this.getSelection()];
    };

    return scenariolist;
}

function PlayerList() {
    let playerlist = [];

    playerlist.getSelection = function () {
        playerlist = [];
        for (let i = 1; i <= 4; i++) {
            let playerIdInput = document.getElementById("player" + i + "idinput");
            let playerLevelInput = document.getElementById("player" + i + "levelinput");
            let player = {};
            player.identifier = playerIdInput.value;
            player.level = playerLevelInput.value;
            playerlist.push(player);
        }
        return playerlist;
    };

    playerlist.setSelection = function (selectedPlayers) {
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
                playerlist.push(player);
                i++;
            }
        }
    };

    playerlist.updateGlobalPlayers = function () {
        players = {};
        for (let i = 0; i < playerlist.length; i++) {
            if (playerlist[i].identifier) {
                addPlayer(playerlist[i].identifier, playerlist[i].level);
            }
        }
    };

    return playerlist;
}

function calculatePartyLevel() {
    let levels = Object.keys(players).map(f => players[f].level);

    let total = 0;
    for (let i = 0; i < levels.length; i++) {
        total += parseInt(levels[i], 10);
    }
    let avg = total / levels.length;

    partyLevel = Math.ceil(avg / 2);

    let levelSelectors = document.getElementsByName("levelSelector");
    for (let selector in levelSelectors) {
        if (levelSelectors.hasOwnProperty(selector)) {
            levelSelectors[selector].value = partyLevel;
        }
    }
}

function loadRoundCounter() {
    let roundNum = getFromStorage("roundnumber");
    if (!roundNum) {
        roundNum = 0;
    }
    let counter = document.getElementById("roundcounter");
    counter.innerText = roundNum;
}

function resetRoundCounter() {
    localStorage.removeItem("roundnumber");
    let counter = document.getElementById("roundcounter");
    counter.innerText = "0";
}

export function incrementRoundCounter() {
    let counter = document.getElementById("roundcounter");
    counter.innerText++;
    writeToStorage("roundnumber", counter.innerText);
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
        let selectedDecks = selectedDeckNames.map(function (deckNames) {
            return loadAbilityDeck(deckNames.class, deckNames.name, deckNames.level);
        });
        applyDeckSelection(selectedDecks, true);
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
        writeToStorage("players", JSON.stringify(players));
        calculatePartyLevel();
    }

    function loadPlayers() {
        players = JSON.parse(getFromStorage("players"));
        playerList.setSelection(players);
        calculatePartyLevel();
    }

    applyPlayersBtn.onclick = applyPlayers;
    playerInputForm.onsubmit = applyPlayers;

    loadPlayersBtn.onclick = loadPlayers;

    window.onresize = refreshUi.bind(null, visibleAbilityDecks);
}

if(window.attachEvent) {
    window.attachEvent('onload', init);
} else {
    if(window.onload) {
        let curronload = window.onload;
        window.onload = function (evt) {
            curronload(evt);
            init(evt);
        };
    } else {
        window.onload = init;
    }
}