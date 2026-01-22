import { world, system, ItemStack } from "@minecraft/server";
import { Config } from "../config.js";

// Spawn Settings
const SPAWN_CHECK_INTERVAL = 1200; // Check every minute
const SPAWN_CHANCE = 0.3; // 30% chance every check if conditions met
const MAX_TRADERS = 1;
const TRADER_LIFETIME = 24000; // 20 minutes (1 minecraft day)
const MIN_SPAWN_DISTANCE = 24;
const MAX_SPAWN_DISTANCE = 48;

export const WanderingTraderController = {
    intervalId: null,

    start() {
        // Run spawn check periodically
        this.intervalId = system.runInterval(() => {
            this.checkSpawn();
            this.checkDespawn();
        }, SPAWN_CHECK_INTERVAL);
    },

    checkSpawn() {
        const overworld = world.getDimension("overworld");

        // Check current count
        const currentTraders = overworld.getEntities({
            type: "minecraft:wandering_trader",
            tags: [Config.TRADER_TAG]
        });

        if (currentTraders.length >= MAX_TRADERS) return;

        // Roll for spawn
        if (Math.random() > SPAWN_CHANCE) return;

        // Find a player to spawn near
        const players = overworld.getPlayers();
        if (players.length === 0) return;

        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const location = this.findSpawnLocation(randomPlayer);

        if (location) {
            this.spawnTrader(overworld, location);
        }
    },

    findSpawnLocation(player) {
        // Simple random position around player
        const r = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
        const theta = Math.random() * 2 * Math.PI;

        const x = player.location.x + r * Math.cos(theta);
        const z = player.location.z + r * Math.sin(theta);

        // Try to find a safe y
        // In a real script, we'd use dimension.getBlockFromRay or similar to find ground.
        // For simplicity, we'll try to spawn at player's Y or use getTopmostBlock if available (expensive).
        // Let's assume flat-ish terrain or use `dimension.getTopmostBlock`?
        // `getTopmostBlock` is robust.

        try {
            const block = player.dimension.getBlock({ x, y: 320, z }); // Start high? No, getTopmostBlock needs x,z.
            // Actually API has dimension.getTopmostBlock(location)
            const topBlock = player.dimension.getTopmostBlock({x, z});
            if (topBlock) {
                return { x, y: topBlock.location.y + 1, z };
            }
        } catch (e) {
            // Fallback to player Y if calculation fails (e.g. unloaded chunks)
            return { x, y: player.location.y, z };
        }
        return null;
    },

    spawnTrader(dimension, location) {
        try {
            const trader = dimension.spawnEntity("minecraft:wandering_trader", location);

            // Apply Tags and Properties
            trader.addTag(Config.TRADER_TAG);
            trader.setDynamicProperty(Config.TRADER_PROFILE_PROPERTY, Config.TRADER_PROFILE_VALUE);

            // Set spawn timestamp for lifetime management
            trader.setDynamicProperty("spawn_time", Date.now());

            // Handle Trades?
            // Note: Scripts cannot easily modify the trade table of a vanilla entity to remove specific items
            // without a behavior pack modifying the entity definition or trade tables.
            // However, we can ensure we don't add any new trades.
            // If the user wants to remove tools/armor, they must modify the behavior pack loot tables/trade tables.

            // Add initial effects if needed (e.g. slow falling to prevent fall damage on spawn)
            // trader.addEffect("slow_falling", 200, { amplifier: 1, showParticles: false });

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

        const now = Date.now();

        for (const trader of traders) {
            const spawnTime = trader.getDynamicProperty("spawn_time");
            if (spawnTime && (now - spawnTime > TRADER_LIFETIME * 50)) { // rough conversion ticks to ms if lifetime is ticks?
                // Wait, TRADER_LIFETIME is 24000 (ticks). Date.now() is ms.
                // 1 tick = 50ms.
                // let's interpret TRADER_LIFETIME as ticks.
                // But spawn_time is Date.now().

                const lifetimeMs = TRADER_LIFETIME * 50;
                if (now - spawnTime > lifetimeMs) {
                    trader.remove();
                }
            }
        }
    }
};
