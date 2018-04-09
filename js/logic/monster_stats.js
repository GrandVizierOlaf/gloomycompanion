import {MONSTER_STATS} from "../definitions/monster_stats";

export function getMonsterStats(name, level) {
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

export function getBossStats(name, level) {
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