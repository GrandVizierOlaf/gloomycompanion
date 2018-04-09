import {removeEmptyStrings, toggleClass} from "../../util.js";
import {expandString} from "../../macros.js";

export function UICard(frontElement, backElement) {
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

export function createAbilityCardBack(name, level) {
    let card = document.createElement("div");
    card.className = "card ability back down";

    let nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.innerText = name + "-" + level;
    card.appendChild(nameSpan);

    return card;
}

export function createAbilityCardFront(initiative, name, shuffle, lines, attack, move, range, level, health) {
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

export function defineModifierCard(cardDefinition) {
    let cardFront = createModifierCardFront(cardDefinition.image);
    let cardBack = createModifierCardBack();

    let card = {
        ui: new UICard(cardFront, cardBack),
        cardType: cardDefinition.type,
        shuffleNextRound: cardDefinition.shuffle
    };

    return card;
}