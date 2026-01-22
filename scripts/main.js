import { world, system } from "@minecraft/server";
import { Config } from "./config.js";
import { showTraderShop } from "./ui/traderShop.js";
import { SmartVillager } from "./ai/smartVillager.js";
import { Utils } from "./utils/common.js";
import * as Farmer from "./roles/farmer.js";
import * as Fisherman from "./roles/fisherman.js";
import * as Shepherd from "./roles/shepherd.js";
import * as Fletcher from "./roles/fletcher.js";
import * as Librarian from "./roles/librarian.js";
import * as Cartographer from "./roles/cartographer.js";
import * as Cleric from "./roles/cleric.js";
import * as Armorer from "./roles/armorer.js";
import * as Weaponsmith from "./roles/weaponsmith.js";
import * as Toolsmith from "./roles/toolsmith.js";
import * as Butcher from "./roles/butcher.js";
import * as Leatherworker from "./roles/leatherworker.js";
import * as Mason from "./roles/mason.js";
import * as Nitwit from "./roles/nitwit.js";
import { TraderJunkCollector } from "./traders/traderJunkCollector.js";
import { WanderingTraderController } from "./spawn/wanderingTraderController.js";

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
    13: Mason,
    14: Nitwit
};

function getVillagerRole(villager) {
    const variant = villager.getComponent("minecraft:variant");
    if (variant && ROLE_MAP[variant.value]) {
        return ROLE_MAP[variant.value];
    }
    return null;
}

function startLoops() {
    // Single Central Loop
    system.runInterval(() => {
        try {
            // 1. Villager AI
            const overworld = world.getDimension("overworld");
            const villagers = overworld.getEntities({ type: "minecraft:villager_v2" });

            // Limit processing per interval for performance
            // Simple approach: process all, relying on internal cooldowns to reduce load.
            // If massive counts become an issue, a round-robin index would be needed.
            // For 2GB server target, <50 active villagers is standard.

            for (const villager of villagers) {
                if (!villager.isValid()) continue;

                const roleModule = getVillagerRole(villager);
                if (roleModule) {
                    if (!villager.hasTag("overhaul_initialized")) {
                        roleModule.applyTrades(villager);
                        villager.addTag("overhaul_initialized");
                    }

                    // Run Job Skills
                    // Try-catch handled inside specific methods or here?
                    // Better here to isolate failures.
                    try {
                        roleModule.tick(villager);
                    } catch (e) {
                         if (Config.DEBUG) console.warn(`Error in role tick for ${villager.id}: ${e}`);
                    }
                }

                // Apply General Smart AI
                try {
                    SmartVillager.tick(villager);
                } catch (e) {
                    if (Config.DEBUG) console.warn(`Error in SmartVillager tick for ${villager.id}: ${e}`);
                }
            }

            // 2. Trader Junk Collector
            try {
                 TraderJunkCollector.tick();
            } catch (e) {
                if (Config.DEBUG) console.warn("Error in Trader Junk Collector: " + e);
            }

        } catch (e) {
            if (Config.DEBUG) console.warn("Error in Main Loop: " + e);
        }
    }, Config.TICK_INTERVAL);
}

// Initialize
world.afterEvents.worldInitialize.subscribe(() => {
    Config.load();
    if (Config.DEBUG) console.warn("Villager Overhaul Initialized");

    startLoops();
    WanderingTraderController.start();
});

// Wandering Trader Interaction Listener
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    if (event.target.typeId === "minecraft:wandering_trader") {
        const player = event.player;
        const trader = event.target;

        // Anti-abuse / Debounce
        // Using ~800ms (16 ticks) cooldown
        if (!Utils.checkCooldown(player, "trader_interact", Config.TRADER_SHOP.INTERACTION_COOLDOWN)) return;

        // Show custom shop
        // Note: Vanilla trade UI might open simultaneously.
        // We attempt to open ours.
        system.run(() => {
            showTraderShop(player, trader);
        });
    }
});
