import { world, system } from "@minecraft/server";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CLEANUP_SAPLINGS_DROPS_INTERVAL = 2400; // 2 minutes (120 seconds * 20 ticks)
const CLEANUP_ALL_INTERVAL = 12000; // 10 minutes (600 seconds * 20 ticks)
const AUTO_COLLECT_INTERVAL = 20; // 1 second

// Saplings (Mầm cây)
const SAPLINGS = new Set([
    "minecraft:oak_sapling",
    "minecraft:spruce_sapling",
    "minecraft:birch_sapling",
    "minecraft:jungle_sapling",
    "minecraft:acacia_sapling",
    "minecraft:dark_oak_sapling",
    "minecraft:cherry_sapling",
    "minecraft:mangrove_propagule",
    "minecraft:bamboo" // Often considered similar in farming contexts
]);

// Monster Drops (Đồ rớt từ quái vật) & Common Junk
const MONSTER_DROPS = new Set([
    "minecraft:rotten_flesh",
    "minecraft:bone",
    "minecraft:spider_eye",
    "minecraft:gunpowder",
    "minecraft:string",
    "minecraft:ender_pearl",
    "minecraft:ghast_tear",
    "minecraft:magma_cream",
    "minecraft:blaze_rod",
    "minecraft:slime_ball",
    "minecraft:phantom_membrane",
    "minecraft:arrow",
    "minecraft:glass_bottle", // Witch drops
    "minecraft:stick", // Witch drops
    "minecraft:sugar" // Witch drops
]);

// Valuable Items (Khoáng sản quý)
const VALUABLE_ITEMS = new Set([
    // Iron
    "minecraft:iron_ingot", "minecraft:raw_iron", "minecraft:iron_block", "minecraft:iron_nugget",
    // Gold
    "minecraft:gold_ingot", "minecraft:raw_gold", "minecraft:gold_block", "minecraft:gold_nugget",
    // Diamond
    "minecraft:diamond", "minecraft:diamond_block",
    // Netherite
    "minecraft:netherite_ingot", "minecraft:netherite_block", "minecraft:netherite_scrap",
    // Emerald
    "minecraft:emerald", "minecraft:emerald_block",
    // Coal
    "minecraft:coal", "minecraft:coal_block",
    // Redstone
    "minecraft:redstone", "minecraft:redstone_block",
    // Lapis
    "minecraft:lapis_lazuli", "minecraft:lapis_block",
    // Copper
    "minecraft:copper_ingot", "minecraft:raw_copper", "minecraft:copper_block",
    // Quartz
    "minecraft:quartz",
    // Others
    "minecraft:glowstone_dust",
    "minecraft:amethyst_shard"
]);

// Combine sets for auto-collect exclusion
const TRASH_ITEMS = new Set([...SAPLINGS, ...MONSTER_DROPS]);

// =============================================================================
// CLEANUP: SAPLINGS AND MONSTER DROPS (2 MINUTES)
// =============================================================================
system.runInterval(() => {
    world.sendMessage("§l§6[HỆ THỐNG] §r§eĐang dọn dẹp rác và vật phẩm quái vật...");

    let clearedCount = 0;
    const dimensions = ["overworld", "nether", "the_end"];

    for (const dimName of dimensions) {
        const dimension = world.getDimension(dimName);
        const entities = dimension.getEntities({ type: "minecraft:item" });

        for (const entity of entities) {
            try {
                const itemComp = entity.getComponent("minecraft:item");
                if (itemComp && itemComp.itemStack) {
                    const typeId = itemComp.itemStack.typeId;

                    if (TRASH_ITEMS.has(typeId)) {
                        entity.remove();
                        clearedCount++;
                    }
                }
            } catch (e) {
                // Entity might have been removed already
            }
        }
    }

    if (clearedCount > 0) {
        // Optional: Send detailed log to console, but chat message is already sent above.
        // console.warn(`[Addon] Removed ${clearedCount} saplings/drops.`);
    }
}, CLEANUP_SAPLINGS_DROPS_INTERVAL);

// =============================================================================
// CLEANUP: REMAINING ITEMS (10 MINUTES)
// =============================================================================
system.runInterval(() => {
    world.sendMessage("§l§6[HỆ THỐNG] §r§cĐang quét dọn vật phẩm rơi rớt (Giữ lại khoáng sản quý)...");

    let clearedCount = 0;
    const dimensions = ["overworld", "nether", "the_end"];

    for (const dimName of dimensions) {
        const dimension = world.getDimension(dimName);
        const entities = dimension.getEntities({ type: "minecraft:item" });

        for (const entity of entities) {
            try {
                const itemComp = entity.getComponent("minecraft:item");
                if (itemComp && itemComp.itemStack) {
                    const typeId = itemComp.itemStack.typeId;

                    // Skip if valuable
                    if (VALUABLE_ITEMS.has(typeId)) {
                        continue;
                    }

                    // Remove everything else
                    entity.remove();
                    clearedCount++;
                }
            } catch (e) {
                // Entity might have been removed already
            }
        }
    }
}, CLEANUP_ALL_INTERVAL);

// =============================================================================
// AUTO-COLLECT DROPPED ITEMS
// =============================================================================
system.runInterval(() => {
    const players = world.getAllPlayers();

    for (const player of players) {
        try {
            const dimension = player.dimension;
            const location = player.location;

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

                        // Don't auto-collect if it's trash (it will be deleted by the 2 min timer)
                        if (TRASH_ITEMS.has(typeId)) {
                            continue;
                        }
                    }

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
