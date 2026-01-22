import { world, system, ItemStack } from "@minecraft/server";
import { Config } from "../config.js";
import { ItemFilter } from "../utils/itemFilter.js";
import { RateLimit } from "../utils/rateLimit.js";

export const TraderJunkCollector = {
    /**
     * Main tick function to be called by the system loop
     */
    tick() {
        // Run at the configured interval?
        // If main.js calls this every tick, we need a check.
        // If main.js calls this with runInterval, we assume it's time.
        // But to be safe and independent, let's assume this is called every tick and we manage interval,
        // OR we just assume the caller handles interval.
        // Let's assume the caller uses system.runInterval(..., Config.SCAN_INTERVAL_TICKS).

        // Find all active traders
        const overworld = world.getDimension("overworld");
        // Note: In a real addon, we might want to support nether/end, but wandering traders are usually overworld.
        // We'll search all dimensions or just overworld. Let's start with overworld.

        const traders = overworld.getEntities({
            type: "minecraft:wandering_trader",
            tags: [Config.TRADER_TAG]
        });

        for (const trader of traders) {
            // Check profile
            const profile = trader.getDynamicProperty(Config.TRADER_PROFILE_PROPERTY);
            if (profile !== Config.TRADER_PROFILE_VALUE) continue;

            this.processTrader(trader);
        }
    },

    processTrader(trader) {
        // 1. Check for active players nearby
        const players = trader.dimension.getPlayers({
            location: trader.location,
            maxDistance: Config.ACTIVE_PLAYER_RADIUS,
            closest: 1
        });

        if (players.length === 0) return; // No active player nearby, sleep
        const nearestPlayer = players[0];

        // 2. Scan for items
        const items = trader.dimension.getEntities({
            type: "minecraft:item",
            location: trader.location,
            maxDistance: Config.JUNK_RADIUS
        });

        let processedCount = 0;
        let pointsToAdd = 0;
        let collectedItems = [];

        for (const itemEntity of items) {
            if (processedCount >= Config.MAX_ITEMS_PER_SCAN) break;

            const itemStack = itemEntity.getComponent("minecraft:item").itemStack;

            // Check filters
            if (ItemFilter.isJunk(itemStack.typeId)) {
                // It is junk
                const count = itemStack.amount;
                const valuePerItem = ItemFilter.getItemValue(itemStack.typeId);
                const totalValue = valuePerItem * count;

                pointsToAdd += totalValue;
                processedCount++;

                // Remove the item entity
                // In a robust system, we might want to teleport it to the trader first or play a sound
                try {
                    itemEntity.kill();
                    collectedItems.push(itemStack.typeId);
                } catch (e) {
                    // Item might have despawned or been picked up
                }
            }
        }

        if (pointsToAdd > 0 && Config.ENABLE_EMERALD_REWARD) {
            this.addPoints(trader, pointsToAdd, nearestPlayer);
        }
    },

    addPoints(trader, points, player) {
        let currentPoints = (trader.getDynamicProperty("junk_points") || 0);
        currentPoints += points;

        const pointsPerEmerald = Config.POINTS_PER_EMERALD;

        if (currentPoints >= pointsPerEmerald) {
            const emeralds = Math.floor(currentPoints / pointsPerEmerald);
            const remainder = currentPoints % pointsPerEmerald;

            // Check rate limit
            if (RateLimit.canRewardPlayer(player)) {
                // Give emeralds
                // We limit emeralds per scan to avoid massive dumps?
                // The rate limit checks if we *can* reward.
                // We should probably check "how many" we can give.
                // The rate limit implementation returns boolean.
                // Let's just spawn one by one or batch, but simplified here:

                let emeraldsToSpawn = emeralds;
                // Simple cap per trigger to prevent infinite loops if something is wrong,
                // though rate limit is per minute.

                // Actually, the rate limit is "Max emeralds per minute".
                // We should record each emerald.
                let spawned = 0;
                for (let i = 0; i < emeralds; i++) {
                    if (RateLimit.canRewardPlayer(player)) {
                        trader.dimension.spawnItem(new ItemStack("minecraft:emerald", 1), trader.location);
                        RateLimit.recordReward(player);
                        spawned++;
                    } else {
                        // Hit rate limit
                        break;
                    }
                }

                // If we hit rate limit, do we keep the points?
                // "Nếu ENABLE_EMERALD_REWARD=false, chỉ remove item để dọn rác."
                // "Có chống exploit... Không thưởng quá..."
                // Logic: If we hit limit, we probably shouldn't consume the points for the unspawned emeralds?
                // Or maybe we just burn them?
                // Usually anti-exploit means "stop giving rewards", so burning the points is safer to discourage farming.
                // But let's be nice and keep points? No, that encourages hoarding points.
                // Let's just subtract the points for the emeralds we successfully spawned.

                const usedPoints = spawned * pointsPerEmerald;
                currentPoints = currentPoints - usedPoints; // Keep remainder + points for unspawned emeralds?
                // If we want strict anti-exploit, we might just cap the points or burn them.
                // For now: keep the points. If they have a massive farm, the points will pile up
                // but they only get 8 emeralds/min.

            } else {
                // Rate limited immediately
            }

            // Save updated points (remainder + accumulated high score)
            // Note: Dynamic properties have size limits, but a number is fine.
            // Be careful of overflow if they farm overnight. Max safe integer is 9e15.
            if (currentPoints > 1000000) currentPoints = 1000000; // Cap points to prevent overflow issues logic
        }

        trader.setDynamicProperty("junk_points", currentPoints);
    }
};
