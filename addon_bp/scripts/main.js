import { world, system } from "@minecraft/server";

// =============================================================================
// CONFIGURATION
// =============================================================================
const LAG_FIX_INTERVAL = 600; // 30 seconds
const AUTO_COLLECT_INTERVAL = 20; // 1 second

// Items to be removed by the lag fix
const JUNK_ITEMS = new Set([
    "minecraft:rotten_flesh",
    "minecraft:bone",
    "minecraft:spider_eye",
    "minecraft:arrow",
    "minecraft:dirt",
    "minecraft:cobblestone",
    "minecraft:stone",
    "minecraft:gravel",
    "minecraft:sand",
    "minecraft:wheat_seeds",
    "minecraft:book",
    "minecraft:writable_book",
    "minecraft:written_book",
    "minecraft:enchanted_book" // Clean dropped books too as per original
]);

// =============================================================================
// LAG FIX: CLEAR DROPPED ITEMS
// =============================================================================
system.runInterval(() => {
    let clearedCount = 0;
    // Dimensions to check
    const dimensions = ["overworld", "nether", "the_end"];

    for (const dimName of dimensions) {
        const dimension = world.getDimension(dimName);
        // Query all item entities
        const entities = dimension.getEntities({ type: "minecraft:item" });

        for (const entity of entities) {
            try {
                const itemComp = entity.getComponent("minecraft:item");
                if (itemComp && itemComp.itemStack) {
                    const typeId = itemComp.itemStack.typeId;

                    if (JUNK_ITEMS.has(typeId)) {
                        entity.remove();
                        clearedCount++;
                    }
                }
            } catch (e) {
                // Entity might have been removed already or invalid
            }
        }
    }

    if (clearedCount > 0) {
        console.warn(`[Addon] Cleaned ${clearedCount} junk items to reduce lag.`);
    }
}, LAG_FIX_INTERVAL);

// =============================================================================
// AUTO-COLLECT DROPPED ITEMS
// =============================================================================
system.runInterval(() => {
    const players = world.getAllPlayers();

    for (const player of players) {
        try {
            const dimension = player.dimension;
            const location = player.location;

            // Search radius 6-8 blocks. We'll use 8.
            const options = {
                type: "minecraft:item",
                location: location,
                maxDistance: 8,
                minDistance: 1.5
            };

            const items = dimension.getEntities(options);

            for (const item of items) {
                try {
                    const itemComp = item.getComponent("minecraft:item");
                    if (itemComp && itemComp.itemStack) {
                        const typeId = itemComp.itemStack.typeId;

                        // Don't auto-collect if it's in the junk list (it will be deleted soon)
                        // OR we can collect it. Let's collect it, user might want it.
                        // But original script excluded books. Let's keep excluding books from auto-collect if intended?
                        // Actually, auto-collecting junk fills inventory.
                        // Let's exclude junk items from auto-collect.
                        if (JUNK_ITEMS.has(typeId)) {
                            continue;
                        }
                    }

                    // Teleport item to player's location
                    item.teleport(location);
                } catch (e) {
                    // Ignore errors
                }
            }
        } catch (e) {
            // Player disconnected
        }
    }
}, AUTO_COLLECT_INTERVAL);
