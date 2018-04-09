/* Macros used in card text, alphabetical order */
export const MACROS =
    {"%air%":                                      "<img class='element' src='images/air.svg'>",
     "%any%":                                      "<img class='element' src='images/any_element.svg'>",
     "%aoe-4-with-black%":                         "<img class='aoe h2' src='images/aoe-4-with-black.svg'>",
     "%aoe-circle%":                               "<div class='collapse small'><img class='aoe h3' src='images/aoe-circle.svg'></div>",
     "%aoe-circle-with-middle-black%":             "<div class='collapse small'><img class='aoe h3' src='images/aoe-circle-with-middle-black.svg'></div>",
     "%aoe-circle-with-side-black%":               "<img class='aoe h3' src='images/aoe-circle-with-side-black.svg'>",
     "%aoe-line-3-with-black%":                    "<div class='collapse'><img class='aoe h1 rotated' src='images/aoe-line-3-with-black.svg'></div>",
     "%aoe-line-4-with-black%":                    "<div class='collapse'><img class='aoe h1 rotated' src='images/aoe-line-4-with-black.svg'></div>",
     "%aoe-line-6-with-black%":                    "<img class='aoe h6 right-aligned' src='images/aoe-line-6-with-black.svg'></div>",
     "%aoe-triangle-2-side%":                      "<div class='collapse'><img class='aoe h2' src='images/aoe-triangle-2-side.svg'></div>",
     "%aoe-triangle-2-side-with-black%":           "<div class='collapse'><img class='aoe h2' src='images/aoe-triangle-2-side-with-black.svg'></div>",
     "%aoe-triangle-3-side-with-corner-black%":    "<div class='collapse'><img class='aoe h3' src='images/aoe-triangle-3-side-with-corner-black.svg'></div>",
     "%attack%":                                   "<span class='nobr'>Attack <img class='icon' src='images/attack.svg'></span>",
     "%bless%":                                    "<span class='nobr'>BLESS <img class='icon' src='images/bless.svg'></span>",
     "%boss-aoe-elder-drake-sp1%":                 "<div class='collapse'><img class='aoe h3' src='images/elderDrake.special1Area.svg'></div>",
     "%boss-aoe-inox-bodyguard-sp1%":              "<div class='collapse'><img class='aoe h3' src='images/inoxBodyguard.special1Area.svg'></div>",
     "%boss-aoe-sightless-eye-sp1%":               "<div class='collapse'><img class='aoe h3' src='images/sightlessEye.special1Area.svg'></div>",
     "%boss-aoe-sightless-eye-sp2%":               "<div class='collapse'><img class='aoe h3' src='images/sightlessEye.special2Area.svg'></div>",
     "%curse%":                                    "<span class='nobr'>CURSE <img class='icon' src='images/curse.svg'></span>",
     "%dark%":                                     "<img class='element' src='images/dark.svg'>",
     "%disarm%":                                   "<span class='nobr'>DISARM <img class='icon' src='images/disarm.svg'></span>",
     "%earth%":                                    "<img class='element' src='images/earth.svg'>",
     "%fire%":                                     "<img class='element' src='images/fire.svg'>",
     "%heal%":                                     "<span class='nobr'>Heal <img class='icon' src='images/heal.svg'></span>",
     "%ice%":                                      "<img class='element' src='images/ice.svg'>",
     "%immobilize%":                               "<span class='nobr'>IMMOBILIZE <img class='icon' src='images/immobilize.svg'></span>",
     "%invisible%":                                "<span class='nobr'>INVISIBLE <img class='icon' src='images/invisibility.svg'></span>",
     "%jump%":                                     "<span class='nobr'>Jump <img class='icon' src='images/jump.svg'></span>",
     "%light%":                                    "<img class='element' src='images/light.svg'>",
     "%loot%":                                     "<span class='nobr'>Loot <img class='icon' src='images/loot.svg'></span>",
     "%move%":                                     "<span class='nobr'>Move <img class='icon' src='images/move.svg'></span>",
     "%muddle%":                                   "<span class='nobr'>MUDDLE <img class='icon' src='images/muddle.svg'></span>",
     "%pierce%":                                   "<span class='nobr'>PIERCE <img class='icon' src='images/pierce.svg'></span>",
     "%poison%":                                   "<span class='nobr'>POISON <img class='icon' src='images/poison.svg'></span>",
     "%pull%":                                     "<span class='nobr'>PULL <img class='mirrored icon' src='images/push.svg'></span>",
     "%push%":                                     "<span class='nobr'>PUSH <img class='icon' src='images/push.svg'></span>",
     "%range%":                                    "<span class='nobr'>Range <img class='icon' src='images/range.svg'></span>",
     "%retaliate%":                                "<span class='nobr'>Retaliate <img class='icon' src='images/retaliate.svg'></span>",
     "%shield%":                                   "<span class='nobr'>Shield <img class='icon' src='images/shield.svg'></span>",
     "%flying%":                                   "<span class='nobr'><img class='icon' src='images/fly.svg'></span>",
     "%strengthen%":                               "<span class='nobr'>STRENGTHEN <img class='icon' src='images/strengthen.svg'></span>",
     "%stun%":                                     "<span class='nobr'>STUN <img class='icon' src='images/stun.svg'></span>",
     "%target%":                                   "<span class='nobr'>Target <img class='icon' src='images/target.svg'></span>",
     "%use_element%":                              "<img class='element overlay' src='images/use_element.svg'>",
     "%wound%":                                    "<span class='nobr'>WOUND <img class='icon' src='images/wound.svg'></span>"
    };

export function expandMacro(macro)
{
    let key = macro.toLowerCase();
    if (key in MACROS)
    {
        return MACROS[key];
    }
    else
    {
        return macro;
    }
}

export function expandStat(s, stat, value)
{
    let re = new RegExp("%" + stat + "% (\\+|-)(\\d*)", "g");
    let lineParsed = re.exec(s);
    
    let hasEliteValue = (value.length === 2);
    let normalAttack = value[0];
    //Check in case of bosses with text in the attack (C+1)
    re = new RegExp("(\\d*)(\\+|-)?([a-zA-Z]+)", "i");
    let extraTextForParticularBosses = "";
    let valueParsed = re.exec(String(normalAttack));
    if (valueParsed && valueParsed[3])
    {
        let symbol = (valueParsed[2] === "-") ? "-" : "+";
        extraTextForParticularBosses = valueParsed[3] + symbol;
        normalAttack = (valueParsed[1] !== "") ? parseInt(valueParsed[1]) : 0;
    }

    if (lineParsed) {
        if (lineParsed[1] === "+")
        {
            let valueNormal = normalAttack + parseInt(lineParsed[2]);
            if (hasEliteValue)
            {
                let valueElite = value[1] + parseInt(lineParsed[2]);
                return ("%" + stat + "% " + valueNormal + " / <span class='elite-color'>" + valueElite + "</span>");
            } else
            {
                 return ("%" + stat + "% " + extraTextForParticularBosses + valueNormal);
            }
        } else if (lineParsed[1] === "-")
        {
            let valueNormal = normalAttack - parseInt(lineParsed[2]);
            if (hasEliteValue)
            {
                let valueElite = value[1] - parseInt(lineParsed[2]);
                return ("%" + stat + "% " + valueNormal + " / <span class='elite-color'>" + valueElite + "</span>");
            } else
            {
                 return ("%" + stat + "% " + extraTextForParticularBosses + valueNormal);
            }
        }
    }

    return s;
}

export function attributesToLines(attributes)
{
    if (!attributes || (attributes[0].length === 0 && attributes[1].length === 0))
    {
        return [];
    } else
    {
        // To make it more readable, group 3 elements in the same row abd naje them small
        let attributesLines = ["* Attributes"];

        // Write common attributes in white
        let normalAttributesLines = [];
        let line = 0;
        for (let i=0; i<attributes[0].length; i++)
        {
            normalAttributesLines[line] = normalAttributesLines[line] ? normalAttributesLines[line] + attributes[0][i] + ", " : attributes[0][i] + ", ";
            if ((i+1) % 3 === 0 )
            {
                line++;
            }
        }
        attributesLines = attributesLines.concat(normalAttributesLines.map(function(line) { return line ? "**" + line.replace(/(,\s$)/g, "") : "";}));

        // Write elite attributes in Gold
        let eliteAttributeLines = [];
        // TODO
        // In case we want to show Common and Elite only attributes
        // let elite_attributes = attributes[1].map(export function(elite_attribute){
        //     return ((attributes[0].indexOf(elite_attribute) == -1) ? elite_attribute: "")
        // });
        line = 0;
        for (let i=0; i<attributes[1].length; i++)
        {
            eliteAttributeLines[line] = eliteAttributeLines[line] ? eliteAttributeLines[line] + attributes[1][i] + ", " : attributes[1][i] + ", ";
            if ((i+1) % 3 === 0 )
            {
                line++;
            }
        }
        
        return attributesLines.concat(eliteAttributeLines.map(function(line) { return line ? "** <span class='elite-color'>" + line.replace(/(,\s$)/g, "") + "</span>" : "";}));
    }
}

export function immunitiesToLines(immunities)
{
    if (!immunities)
    {
        return [];
    } else
    {
        // To make it more readable, group 3 elements in the same row abd naje them small
        let immunitiesLines = [];
        let line = 0;
        for (let i=0; i<immunities.length; i++)
        {
            immunitiesLines[line] = immunitiesLines[line] ? immunitiesLines[line] + immunities[i] + ", " : immunities[i] + ", ";
            if ((i+1) % 3 === 0 )
            {
                line++;
            }
        }
        return ["* Immunities"].concat(
            immunitiesLines.map(
                function(line) {
                    return "** <span class='small'>" + line.replace(/(,\s$)/g, "") + "</span>";
                }
            )
        );
    }
}

export function notesToLines(notes)
{
    return ["* <span class='small'> Notes: " + notes + "</span>"];
}

export function expandSpecial(s, specialValue)
{
    return specialValue.map(function(line){
        return ("* " + line);
    });
}

export function specialToLines(s, special1, special2)
{
    if (special1 && s.indexOf("Special 1") !== -1)
    {
        s = expandSpecial(s, special1);
    }
    if (special1 && s.indexOf("Special 2") !== -1)
    {
        s = expandSpecial(s, special2);
    }

    return s;
}

export function expandString(s, attack, move, range)
{
    let re = new RegExp("%(attack|move|range)% (\\+|-)(\\d*)", "g");
    let found = re.exec(s);

    while (found)
    {
        if (found[1] === "attack")
        {
            s = s.replace(found[0], expandStat(found[0], "attack", attack));
        } else if  (found[1] === "move")
        {
            s = s.replace(found[0], expandStat(found[0], "move", move));
        } else if (found[1] === "range")
        {
            s = s.replace(found[0], expandStat(found[0], "range", range));
        }
        found = re.exec(s);
    }

    return s.replace(/%[^%]*%/gi, expandMacro);
}
