import { world, system } from "@minecraft/server";
import { Config } from "./config.js";
import * as Farmer from "./roles/farmer.js";
import * as Librarian from "./roles/librarian.js";
import * as Cleric from "./roles/cleric.js";
import * as Fletcher from "./roles/fletcher.js";
import * as Fisherman from "./roles/fisherman.js";
import * as Cartographer from "./roles/cartographer.js";
import * as Shepherd from "./roles/shepherd.js";
import * as Mason from "./roles/mason.js";
import * as Butcher from "./roles/butcher.js";
import * as Leatherworker from "./roles/leatherworker.js";
import * as Armorer from "./roles/armorer.js";
import * as Toolsmith from "./roles/toolsmith.js";
import * as Weaponsmith from "./roles/weaponsmith.js";
import { TraderJunkCollector } from "./traders/traderJunkCollector.js";
import { WanderingTraderController } from "./spawn/wanderingTraderController.js";

// Mapping Variant ID to Role Module
// Based on standard Bedrock Villager Variant IDs
const ROLE_MAP = {
    1: Farmer,
    2: Fisherman,
    3: Shepherd,
    4: Fletcher,
    5: Librarian,
    6: Cartographer,
    7: Cleric,
    8: Armorer,
    9: Weaponsmith,
    10: Toolsmith,
    11: Butcher,
    12: Leatherworker,
    13: Mason
    // 0: Unskilled, 14: Nitwit - Ignored
};

function getVillagerRole(villager) {
    const variant = villager.getComponent("minecraft:variant");
    if (variant && ROLE_MAP[variant.value]) {
        return ROLE_MAP[variant.value];
    }
    return null;
}

system.runInterval(() => {
    try {
        const overworld = world.getDimension("overworld");
        // Get all villagers. Note: optimizing this by using tags or areas is better for large worlds.
        const villagers = overworld.getEntities({ type: "minecraft:villager_v2" });

        for (const villager of villagers) {
            if (!villager.isValid()) continue;

            const roleModule = getVillagerRole(villager);
            if (roleModule) {
                // Initialize if needed
                if (!villager.hasTag("overhaul_initialized")) {
                    roleModule.applyTrades(villager);
                    villager.addTag("overhaul_initialized");
                }

                // Run Tick Logic
                roleModule.tick(villager);
            }
        }
    } catch (e) {
        if (Config.DEBUG) console.warn("Error in Villager Loop: " + e);
    }
}, Config.TICK_INTERVAL);

// Trader Junk Collector Loop
system.runInterval(() => {
    try {
        TraderJunkCollector.tick();
    } catch (e) {
        if (Config.DEBUG) console.warn("Error in Trader Loop: " + e);
    }
}, Config.SCAN_INTERVAL_TICKS);

world.afterEvents.worldInitialize.subscribe(() => {
    if (Config.DEBUG) console.warn("Villager Overhaul Initialized");
    WanderingTraderController.start();
});
