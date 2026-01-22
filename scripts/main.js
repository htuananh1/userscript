import { world, system } from "@minecraft/server";
import { Config } from "./config.js";
import { showTraderShop } from "./ui/traderShop.js";
import { SmartVillager } from "./ai/smartVillager.js";
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
    13: Mason
};

function getVillagerRole(villager) {
    const variant = villager.getComponent("minecraft:variant");
    if (variant && ROLE_MAP[variant.value]) {
        return ROLE_MAP[variant.value];
    }
    return null;
}

function startLoops() {
    // Main Villager Loop
    system.runInterval(() => {
        try {
            const overworld = world.getDimension("overworld");
            // Get all villagers - Optimized by filtering type
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

                // Apply General Smart AI
                SmartVillager.tick(villager);
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
}

// Initialize
world.afterEvents.worldInitialize.subscribe(() => {
    Config.load(); // Load saved config first
    if (Config.DEBUG) console.warn("Villager Overhaul Initialized");

    startLoops(); // Start loops with loaded config
    WanderingTraderController.start();
});

// Wandering Trader Interaction Listener
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (event.target.typeId === "minecraft:wandering_trader") {
        const player = event.player;
        const trader = event.target;

        // Cancel vanilla trade GUI
        event.cancel = true;

        // Show custom shop
        system.run(() => {
            showTraderShop(player, trader);
        });
    }
});

