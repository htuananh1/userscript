import { world, system, ItemStack } from "@minecraft/server";
import { Config } from "../config.js";

// Spawn Settings
// Note: These are defaults, ideally we'd pull from Config if Config supported them.
// But Config.js has SCAN_INTERVAL_TICKS for JunkCollector, not specific logic here.
// We'll keep constants but use system.currentTick.

const SPAWN_CHECK_INTERVAL = 1200; // Check every minute
const SPAWN_CHANCE = 0.3;
const MAX_TRADERS = 1;
const TRADER_LIFETIME = 24000; // 20 minutes in ticks
const MIN_SPAWN_DISTANCE = 24;
const MAX_SPAWN_DISTANCE = 48;

export const WanderingTraderController = {
    intervalId: null,

    start() {
        this.intervalId = system.runInterval(() => {
            this.checkSpawn();
            this.checkDespawn();
        }, SPAWN_CHECK_INTERVAL);
    },

    checkSpawn() {
        const overworld = world.getDimension("overworld");

        const currentTraders = overworld.getEntities({
            type: "minecraft:wandering_trader",
            tags: [Config.TRADER_TAG]
        });

        if (currentTraders.length >= MAX_TRADERS) return;

        if (Math.random() > SPAWN_CHANCE) return;

        const players = overworld.getPlayers();
        if (players.length === 0) return;

        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const location = this.findSpawnLocation(randomPlayer);

        if (location) {
            this.spawnTrader(overworld, location);
        }
    },

    findSpawnLocation(player) {
        const r = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
        const theta = Math.random() * 2 * Math.PI;

        const x = player.location.x + r * Math.cos(theta);
        const z = player.location.z + r * Math.sin(theta);

        try {
            const topBlock = player.dimension.getTopmostBlock({x, z});
            if (topBlock) {
                return { x, y: topBlock.location.y + 1, z };
            }
        } catch (e) {
            return { x, y: player.location.y, z };
        }
        return null;
    },

    spawnTrader(dimension, location) {
        try {
            const trader = dimension.spawnEntity("minecraft:wandering_trader", location);

            trader.addTag(Config.TRADER_TAG);
            trader.setDynamicProperty(Config.TRADER_PROFILE_PROPERTY, Config.TRADER_PROFILE_VALUE);

            // Use currentTick for consistent game-time tracking
            trader.setDynamicProperty("spawn_tick", system.currentTick);

        } catch (e) {
            console.warn("Failed to spawn Junk Collector:", e);
        }
    },

    checkDespawn() {
        const overworld = world.getDimension("overworld");
        const traders = overworld.getEntities({
            type: "minecraft:wandering_trader",
            tags: [Config.TRADER_TAG]
        });

        const currentTick = system.currentTick;

        for (const trader of traders) {
            const spawnTick = trader.getDynamicProperty("spawn_tick");

            // Fallback for traders spawned with old date-based system
            if (!spawnTick) {
                // If it has "spawn_time" (old system), we can't compare easily to ticks.
                // Just let it live or remove it. Let's remove to migrate.
                const oldTime = trader.getDynamicProperty("spawn_time");
                if (oldTime) {
                     trader.remove();
                }
                continue;
            }

            if (currentTick - spawnTick > TRADER_LIFETIME) {
                trader.remove();
            }
        }
    }
};
