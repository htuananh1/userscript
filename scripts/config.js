export const Config = {
    // Global settings
    TICK_INTERVAL: 40, // Run logic every 2 seconds (40 ticks)
    DEBUG: false,

    // Radii for detecting things
    WORK_RADIUS: 16,
    VILLAGE_RADIUS: 32,
    INTERACT_RADIUS: 5,

    // Roles Configuration
    FARMER: {
        MAX_ACTIONS_PER_TICK: 3,
        SEARCH_RADIUS: 10,
        CHEST_SEARCH_RADIUS: 5
    },
    LIBRARIAN: {
        REROLL_WINDOW_MINUTES: 20,
        RARE_TRADE_LIMIT_DAILY: 3
    },
    CLERIC: {
        BUFF_RADIUS: 10,
        BUFF_DURATION: 100, // ticks
        BUFF_COOLDOWN: 600, // 30 seconds
        PVP_ENABLED: false
    },
    FLETCHER: {
        AMMO_RESTOCK_COOLDOWN: 1200, // 60 seconds
        DEFENSE_RADIUS: 15
    },
    FISHERMAN: {
        FISHING_INTERVAL: 200, // ticks
        MAX_FISH_PER_HOUR: 20
    },
    CARTOGRAPHER: {
        SURVEY_INTERVAL: 6000, // 5 minutes
        POI_SEARCH_RADIUS: 100
    },
    SHEPHERD: {
        WOOL_SEARCH_RADIUS: 10,
        SHEARING_COOLDOWN: 1200
    },
    MASON: {
        CONVERSION_LIMIT_DAILY: 64,
        CONVERSION_INTERVAL: 100
    },
    BUTCHER: {
        COOK_LIMIT_HOURLY: 32,
        SEARCH_RADIUS: 8
    },
    LEATHERWORKER: {
        DYE_COOLDOWN: 200,
        VILLAGE_COLOR: 'red' // Default fallback
    },
    ARMORER: {
        REPAIR_COOLDOWN: 1200, // 1 minute
        GOLEM_HEAL_AMOUNT: 10,
        GOLEM_SEARCH_RADIUS: 10
    },
    TOOLSMITH: {
        REPAIR_COST: 1, // Emeralds
        REPAIR_RADIUS: 4
    },
    WEAPONSMITH: {
        DISENCHANT_COST: 1,
        GRINDSTONE_RADIUS: 4
    }
};

export const ROLE_IDS = {
    FARMER: "minecraft:farmer",
    LIBRARIAN: "minecraft:librarian",
    CLERIC: "minecraft:cleric",
    FLETCHER: "minecraft:fletcher",
    FISHERMAN: "minecraft:fisherman",
    CARTOGRAPHER: "minecraft:cartographer",
    SHEPHERD: "minecraft:shepherd",
    MASON: "minecraft:mason",
    BUTCHER: "minecraft:butcher",
    LEATHERWORKER: "minecraft:leatherworker",
    ARMORER: "minecraft:armorer",
    TOOLSMITH: "minecraft:toolsmith",
    WEAPONSMITH: "minecraft:weaponsmith"
};
