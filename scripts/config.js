import { world } from "@minecraft/server";

const DEFAULTS = {
    // Global settings
    TICK_INTERVAL: 40,
    DEBUG: false,

    // Radii
    WORK_RADIUS: 16,
    VILLAGE_RADIUS: 32,
    INTERACT_RADIUS: 5,

    // Roles Configuration
    FARMER: {
        MAX_ACTIONS_PER_TICK: 16,
        SEARCH_RADIUS: 8,
        CHEST_SEARCH_RADIUS: 5
    },
    LIBRARIAN: {
        REROLL_WINDOW_MINUTES: 20,
        RARE_TRADE_LIMIT_DAILY: 3
    },
    CLERIC: {
        BUFF_RADIUS: 10,
        BUFF_DURATION: 100,
        BUFF_COOLDOWN: 600,
        PVP_ENABLED: false
    },
    FLETCHER: {
        AMMO_RESTOCK_COOLDOWN: 1200,
        DEFENSE_RADIUS: 15
    },
    FISHERMAN: {
        FISHING_INTERVAL: 200,
        MAX_FISH_PER_HOUR: 20
    },
    CARTOGRAPHER: {
        SURVEY_INTERVAL: 6000,
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
        VILLAGE_COLOR: 'red'
    },
    ARMORER: {
        REPAIR_COOLDOWN: 1200,
        GOLEM_HEAL_AMOUNT: 10,
        GOLEM_SEARCH_RADIUS: 10
    },
    TOOLSMITH: {
        REPAIR_COST: 1,
        REPAIR_RADIUS: 4
    },
    WEAPONSMITH: {
        DISENCHANT_COST: 1,
        GRINDSTONE_RADIUS: 4
    },

    // Junk Collector Configuration
    SCAN_INTERVAL_TICKS: 60,
    JUNK_RADIUS: 12,
    MAX_ITEMS_PER_SCAN: 40,
    ACTIVE_PLAYER_RADIUS: 32,
    ENABLE_EMERALD_REWARD: true,
    POINTS_PER_EMERALD: 64,
    MAX_EMERALDS_PER_MINUTE_PER_PLAYER: 8,
    TRADER_TAG: "addon:managed_wt",
    TRADER_PROFILE_PROPERTY: "addon:profile",
    TRADER_PROFILE_VALUE: "junk_collector",

    // Wandering Trader Premium Shop
    TRADER_SHOP: {
        CACHE_DURATION_TICKS: 6000, // 5 minutes
        INTERACTION_COOLDOWN: 16, // ~0.8s
        PROBABILITIES: {
            NETHERITE: 0.20,
            ENCHANTED_GOLDEN_APPLE: 0.10,
            GOLDEN_APPLE: 0.35,
            RARE_UTILITY: 0.25,
            EMPTY: 0.10
        }
    },

    // New Role Skills Configuration
    NITWIT: {
        WANDER_RADIUS: 10,
        SHARE_FOOD_RADIUS: 5,
        SHARE_COOLDOWN: 600
    },
    SKILLS: {
        RESEARCH_AURA_RADIUS: 10,
        RESEARCH_AURA_COOLDOWN: 600,
        DEFENSE_CRAFT_RADIUS: 16,
        DEFENSE_CRAFT_COOLDOWN: 600,
        HEALER_RADIUS: 10,
        HEALER_COOLDOWN: 200,
        HEAL_AMOUNT: 4
    }
};

export const Config = {
    ...JSON.parse(JSON.stringify(DEFAULTS)), // Deep copy defaults

    /**
     * Loads configuration from World Dynamic Properties.
     * Should be called on worldInitialize.
     */
    load() {
        try {
            const savedConfig = world.getDynamicProperty("villager_overhaul_config");
            if (savedConfig) {
                const parsed = JSON.parse(savedConfig);
                // Merge saved config with current (defaults)
                this.merge(parsed);
                if (this.DEBUG) console.warn("Villager Overhaul Config Loaded.");
            }
        } catch (e) {
            console.warn("Failed to load config: " + e);
        }
    },

    /**
     * Saves current configuration to World Dynamic Properties.
     */
    save() {
        try {
            // Create a clean object to save (exclude methods)
            const toSave = {};
            for (const key of Object.keys(DEFAULTS)) {
                toSave[key] = this[key];
            }
            world.setDynamicProperty("villager_overhaul_config", JSON.stringify(toSave));
            if (this.DEBUG) console.warn("Villager Overhaul Config Saved.");
        } catch (e) {
            console.warn("Failed to save config: " + e);
            // Note: Dynamic Property limit is around 9KB string length.
            // Our config is small enough.
        }
    },

    /**
     * Resets configuration to defaults.
     */
    reset() {
        this.merge(DEFAULTS);
        this.save();
    },

    /**
     * Helper to merge objects deeply
     */
    merge(source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && !Array.isArray(source[key]) && this[key]) {
                Object.assign(this[key], source[key]);
            } else {
                this[key] = source[key];
            }
        }
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
    WEAPONSMITH: "minecraft:weaponsmith",
    NITWIT: "minecraft:nitwit" // Variant 14 usually, but we define ID here for reference
};
