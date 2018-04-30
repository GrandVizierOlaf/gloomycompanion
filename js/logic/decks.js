import { DECKS, DECK_DEFINITIONS } from '../definitions/cards.js';
import { CARD_TYPES_MODIFIER, MODIFIER_CARDS, MODIFIER_DECK } from '../definitions/modifiers.js';

import { findInDiscard, getFromStorage, removeChild, shuffleList, writeToStorage } from './util.js';
import { refreshUi } from '../../ui.js';
import {
  addAllPlayersToSwitchList,
  addDeckToSwitchList,
  removeDeckFromSwitchList,
  reorderSwitches,
  updateDeckSwitchInitiative
} from './switches.js';
import {
  defineModifierCard,
  createAbilityCardBack,
  createAbilityCardFront,
  UICard
} from './cards.js';
import { specialToLines } from './macros.js';
import { getBossStats } from './monster_stats.js';
import { attributesToLines, immunitiesToLines, notesToLines } from './macros.js';
import { getMonsterStats } from './monster_stats.js';

export const DECK_TYPES =
  {
    MODIFIER: 'modifier',
    ABILITY: 'ability',
    BOSS: 'boss'
  };

const EVENT_NAMES = {
  MODIFIER_CARD_DRAWN: 'modifierCardDrawn',
  MODIFIER_DECK_SHUFFLE_REQUIRED: 'modifierDeckShuffleRequired'
};

let doShuffles = true;
let allAbilityDecks = [];
let deckDefinitions = loadDefinition(DECK_DEFINITIONS);

function loadDefinition(cardDatabase) {
  let decks = {};
  for (let i = 0; i < cardDatabase.length; i++) {
    let definition = cardDatabase[i];
    decks[definition.class] = definition;
  }

  return decks;
}

export function loadAbilityDeck(deckClass, deckName, level) {
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

    let emptyFront = document.createElement('div');
    emptyFront.className = 'card ability front down';
    let cardFront = emptyFront;
    let cardBack = createAbilityCardBack(deck.name, deck.level);

    let card = {
      id: deck.name + '_' + i,
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
      card.ui.addClass('pull');
      card.ui.flipUp(true);
      card.ui.removeClass('draw');
      card.ui.addClass('discard');
      updateDeckSwitchInitiative(this.deckId, card.initiative);
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
    return this.class === DECKS['Boss'].class;
  };

  deck.setCardPiles = function (drawPile, discardPile) {
    for (let i = 0; i < drawPile.length; i++) {
      this.drawPile[i].shuffleNext = drawPile[i].shuffleNext;
      this.drawPile[i].initiative = drawPile[i].initiative;
      this.drawPile[i].startingLines = drawPile[i].startingLines;
    }
    for (let i = 0; i < discardPile.length; i++) {
      // TODO: Uncaught TypeError: Cannot set property 'shuffleNext' of undefined
      // This happens when two decks are supposed to be synced, but they have different discards
      this.discard[i].shuffleNext = discardPile[i].shuffleNext;
      this.discard[i].initiative = discardPile[i].initiative;
      this.discard[i].startingLines = discardPile[i].startingLines;
    }
  };

  deck.deckId = deck.getRealName().replace(/\s+/g, '');

  writeToStorage(deck.name, JSON.stringify(deck));
  return deck;

}

export function placeDeck(deck, container) {
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

export function forceRepaintDeck(deck) {
  preventPullAnimation(deck);
  let space = deck.deckSpace;
  removeChild(space);
  placeDeck(deck, space);
}

export function shuffleDeck(deck, includeDiscards) {
  if (includeDiscards) {
    deck.drawPile = deck.drawPile.concat(deck.discard);
    deck.discard = [];
  }

  shuffleList(deck.drawPile);

  for (let i = 0; i < deck.drawPile.length; i++) {
    let card = deck.drawPile[i];

    card.ui.removeClass('lift');
    card.ui.removeClass('pull');

    card.ui.flipUp(false);

    card.ui.removeClass('discard');
    card.ui.addClass('draw');

    card.ui.setDepth(-i - 6);
  }
}

export function reshuffleModifierDeck(deck) {
  deck.cleanDiscardPile();
  reshuffle(deck, true);
  let counter = document.getElementById('cardsLeftCounter');
  counter.innerText = deck.drawPile.length.toString();
  document.body.dispatchEvent(new CustomEvent(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, { detail: { shuffle: false } }));
}

export function drawModifierCard(deck) {
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
      document.body.dispatchEvent(new CustomEvent(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, { detail: { shuffle: true } }));
    }
  }
  writeToStorage('modifierDeck', JSON.stringify(deck));
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
  deck.discard[0].ui.addClass('right');
  advantageCard.ui.addClass('left');
  deck.advantageToClean = true;
}

export function loadModifierDeck() {
  let deck =
    {
      name: 'Monster modifier deck',
      type: DECK_TYPES.MODIFIER,
      drawPile: [],
      discard: [],
      advantageToClean: false
    };


  deck.drawTopDiscard = function () {
    if (this.discard.length > 0) {
      let card = this.discard[this.discard.length - 1];
      card.ui.setDepth(-3);
      card.ui.addClass('pull');
      card.ui.flipUp(true);
      card.ui.removeClass('draw');
      card.ui.addClass('discard');
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
    writeToStorage('modifierDeck', JSON.stringify(window.modifierDeck));

    return this.count(cardType);
  }.bind(deck);

  deck.addCard = function (cardType) {
    // Rulebook p. 23: "a maximum of only 10 curse [and 10 bless] cards can be placed into any one deck"
    if (this.count(cardType) < 10) {
      // TODO: Brittle
      deck.drawPile.push(defineModifierCard(MODIFIER_CARDS[cardType.toUpperCase()]));

      forceRepaintDeck(deck);
      reshuffle(deck, false);

      let counter = document.getElementById('cardsLeftCounter');
      counter.innerText = deck.drawPile.length.toString();
    }
    writeToStorage('modifierDeck', JSON.stringify(window.modifierDeck));

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
      deck.discard[0].ui.removeClass('right');
      deck.discard[0].ui.removeClass('left');
      deck.discard[1].ui.removeClass('left');
      deck.discard[1].ui.removeClass('left');
    }
  }.bind(deck);
  let loadedDeck = JSON.parse(getFromStorage('modifierDeck'));

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

export function applyDeckSelection(decks, preserveExistingDeckState) {
  let container = document.getElementById('tableau');

  let decksToRemove = allAbilityDecks.filter(function (abilityDeck) {
    return !preserveExistingDeckState || (decks.filter(function (deck) {
      return ((deck.name === abilityDeck.name) && (deck.level === abilityDeck.level));
    }).length === 0);
  });

  let decksToAdd = decks.filter(function (deck) {
    return !preserveExistingDeckState || (allAbilityDecks.filter(function (abilityDeck) {
      return ((deck.name === abilityDeck.name) && (deck.level === abilityDeck.level));
    }).length === 0);
  });

  if (!window.modifierDeck) {
    initModifierDeck();
    addModifierDeck(container, window.modifierDeck, preserveExistingDeckState);
    if (preserveExistingDeckState) {
      let loadedModifierDeck = JSON.parse(getFromStorage('modifierDeck'));
      let curses = countType('curse', loadedModifierDeck);
      let blessings = countType('bless', loadedModifierDeck);
      for (let i = 0; i < blessings; i++) {
        window.modifierDeck.addCard('bless');
      }
      for (let i = 0; i < curses; i++) {
        window.modifierDeck.addCard('curse');
      }
      window.modifierDeck.drawTopDiscard();

      document.body.dispatchEvent(new CustomEvent(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED,
        { detail: { shuffle: window.modifierDeck.shuffleEndOfRound() } }));
    }
  }
  else if (!preserveExistingDeckState) {
    container.removeChild(document.getElementById('modifier-container'));
    initModifierDeck();
    addModifierDeck(container, window.modifierDeck, preserveExistingDeckState);
  }
  writeToStorage('modifierDeck', JSON.stringify(window.modifierDeck));

  decksToRemove.forEach(function (deck) {
    removeDeckFromSwitchList(deck);
    deck.discardDeck();
  });

  window.visibleAbilityDecks.forEach(function (deck) {
    addDeckToSwitchList(deck);
  });

  decksToAdd.forEach(function (deck) {
    addDeckToSwitchList(deck);
    let deckSpace = document.createElement('div');
    deckSpace.id = deck.deckId;
    deckSpace.className = 'card-container';

    container.appendChild(deckSpace);

    placeDeck(deck, deckSpace);
    reshuffle(deck, !preserveExistingDeckState);

    deckSpace.onclick = drawAbilityCard.bind(null, deck);

    deck.discardDeck = function () {
      let visIndex = window.visibleAbilityDecks.indexOf(this);

      if (visIndex > -1) {
        window.visibleAbilityDecks.splice(visIndex, 1);
      }

      let index = allAbilityDecks.indexOf(this);

      if (index > -1) {
        allAbilityDecks.splice(index, 1);
      }

      container.removeChild(deckSpace);
    };

    if (deck.isBoss()) {
      // We don't want stats if someone selects Boss on the deck tab
      if (deck.getRealName() !== 'Boss') {
        deck.setStatsBoss(getBossStats(deck.getRealName(), deck.level));
      }
    } else {
      deck.setStatsMonster(getMonsterStats(deck.getRealName(), deck.level));

    }
    // TODO: Don't show the top card if one hasn't been flipped before
    // It's close if you check that discard.length > 1, but sometimes some will still flip and this feels hacky
    if (preserveExistingDeckState) {
      deck.drawTopDiscard();
    } else {
      reshuffle(deck);
      forceRepaintDeck(deck);
    }
    allAbilityDecks.push(deck);
    window.visibleAbilityDecks.push(deck);

    addDeckToSwitchList(deck);
  });

  addAllPlayersToSwitchList();

  reorderSwitches();

  // Rescale card text if necessary
  refreshUi();
}

function initModifierDeck() {
  window.modifierDeck = loadModifierDeck();
}

function addModifierDeck(container, deck, preserveDiscards) {
  function createCounter(cardType, incrementFunc, decrementFunc) {
    function createButton(className, text, func, textElement) {
      let button = document.createElement('div');
      button.className = className + ' button';
      button.innerText = text;

      button.onclick = function () {
        textElement.innerText = func(cardType);
      };

      return button;
    }

    let widgetContainer = document.createElement('div');
    widgetContainer.className = 'counter-icon';

    let background = document.createElement('div');
    background.className = 'background ' + cardType;
    widgetContainer.appendChild(background);

    let textElement = document.createElement('div');
    textElement.className = 'icon-text';
    textElement.innerText = '0';

    widgetContainer.appendChild(createButton('decrement', '-', decrementFunc, textElement));
    widgetContainer.appendChild(textElement);
    widgetContainer.appendChild(createButton('increment', '+', incrementFunc, textElement));

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
      }, 100);
    }
    else {
      endRoundDiv.className = "counter-icon shuffle not-required";
    }
  }

  let modifierContainer = document.createElement('div');
  modifierContainer.className = 'card-container';
  modifierContainer.id = 'modifier-container';

  let buttonDiv = document.createElement('div');
  buttonDiv.className = 'modifier-deck-column-1';

  buttonDiv.appendChild(createCounter('bless', deck.addCard, deck.removeCard));
  buttonDiv.appendChild(createCounter('curse', deck.addCard, deck.removeCard));

  let endRoundDiv = document.createElement("div");
  endRoundDiv.className = "counter-icon shuffle not-required";

  document.body.addEventListener(EVENT_NAMES.MODIFIER_DECK_SHUFFLE_REQUIRED, indicateShuffleRequired);

  buttonDiv.appendChild(endRoundDiv);

  let deckColumn = document.createElement('div');
  deckColumn.className = 'modifier-deck-column-2';

  let deckSpace = document.createElement('div');
  deckSpace.className = 'card-container modifier';

  let drawTwoButton = document.createElement('div');
  drawTwoButton.className = 'button draw-two';
  drawTwoButton.onclick = doubleDraw.bind(null, window.modifierDeck);

  let cardsLeftCounter = document.createElement('div');
  cardsLeftCounter.id = "cardsLeftCounter";

  document.body.addEventListener(EVENT_NAMES.MODIFIER_CARD_DRAWN, function (e) {
    cardsLeftCounter.innerText--;
  });

  deckColumn.appendChild(deckSpace);
  deckColumn.appendChild(drawTwoButton);
  deckColumn.appendChild(cardsLeftCounter);

  modifierContainer.appendChild(deckColumn);
  modifierContainer.appendChild(buttonDiv);

  container.appendChild(modifierContainer);

  placeDeck(deck, deckSpace);
  reshuffle(deck, !preserveDiscards);

  cardsLeftCounter.innerText = deck.drawPile.length.toString();

  deckSpace.onclick = drawModifierCard.bind(null, deck);
}

function reshuffle(deck, includeDiscards) {
  shuffleDeck(deck, includeDiscards);

  // This way we keep sync several decks from the same class
  window.visibleAbilityDecks.forEach(function (visibleDeck) {
    if ((visibleDeck !== deck) && (visibleDeck.class === deck.class)) {
      shuffleDeck(visibleDeck, true);
      visibleDeck.setCardPiles(deck.drawPile, deck.discard);
    }
  });
}

function flipUpTopCard(deck) {
  for (let i = 0; i < deck.discard.length; i++) {
    let card = deck.discard[i];
    card.ui.removeClass('lift');
    card.ui.removeClass('pull');
    card.ui.pushDown();
  }

  if (deck.discard.length > 0) {
    deck.discard[0].ui.addClass('lift');
  }

  let card = deck.drawPile.shift();
  sendToDiscard(card, true);
  deck.discard.unshift(card);

  return card;
}

function sendToDiscard(card, pullAnimation) {
  card.ui.setDepth(-3);

  if (pullAnimation) {
    card.ui.addClass('pull');
  }

  card.ui.flipUp(true);

  card.ui.removeClass('draw');
  card.ui.addClass('discard');
}

export function drawAllVisibleAbilityCards() {
  // Limit it to only unique decks
  let decks = window.visibleAbilityDecks.filter((obj, pos, arr) => {
    return arr.map(mapObj => mapObj['class']).indexOf(obj['class']) === pos;
  });

  decks.forEach(function (visibleDeck) {
    drawAbilityCard(visibleDeck);
  });
}

function drawAbilityCard(deck) {

  if (deck.mustReshuffle()) {
    reshuffle(deck, true);
    drawAbilityCard(deck);
  }
  else {
    window.visibleAbilityDecks.forEach(function (visibleDeck) {
      if (visibleDeck.class === deck.class) {
        visibleDeck.drawTopCard();
        let card = flipUpTopCard(visibleDeck);

        window.visibleCards[deck.deckId] = card;

        updateDeckSwitchInitiative(deck.deckId, card.initiative);
      }
    });
  }
  reorderSwitches();
  writeToStorage(deck.name, JSON.stringify(deck));
}

function preventPullAnimation(deck) {
  if (deck.discard.length) {
    if (deck.discard[1]) {
      deck.discard[1].ui.removeClass('lift');
      deck.discard[0].ui.addClass('lift');
    }

    deck.discard[0].ui.removeClass('pull');
  }
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