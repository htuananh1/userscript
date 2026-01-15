import { world, system } from "@minecraft/server";

// =============================================================================
// LAG FIX: CLEAR DROPPED BOOKS
// Run every 30 seconds (600 ticks)
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
                    if (
                        typeId === "minecraft:book" ||
                        typeId === "minecraft:writable_book" ||
                        typeId === "minecraft:written_book" ||
                        typeId === "minecraft:enchanted_book"
                    ) {
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
        console.warn(`[Addon] Cleaned ${clearedCount} dropped book entities`);
    }
}, 600);

// =============================================================================
// AUTO-COLLECT DROPPED ITEMS
// Run every 1 second (20 ticks)
// =============================================================================
system.runInterval(() => {
    const players = world.getAllPlayers();

    for (const player of players) {
        try {
            const dimension = player.dimension;
            const location = player.location;

            // Search radius 6-8 blocks. We'll use 8.
            // Exclude items very close (1 block) to avoid jitter/noise
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
                        // Exclude books to avoid conflict with cleanup or spam
                        if (
                            typeId === "minecraft:book" ||
                            typeId === "minecraft:writable_book" ||
                            typeId === "minecraft:written_book" ||
                            typeId === "minecraft:enchanted_book"
                        ) {
                            continue;
                        }
                    }

                    // Teleport item to player's location
                    item.teleport(location);
                } catch (e) {
                    // Ignore errors (e.g. item picked up or despawned)
                }
            }
        } catch (e) {
            // Player might have disconnected or dimension invalid
        }
    }
}, 20);
