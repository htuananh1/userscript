import { world, system, ItemStack } from "@minecraft/server";

// Feature 1: Creeper Anti-Grief
// Prevents Creeper explosions from destroying blocks while still allowing damage to entities.
world.beforeEvents.explosion.subscribe((event) => {
    // Check if the explosion source is a Creeper
    if (event.source && event.source.typeId === "minecraft:creeper") {
        // Clear the list of blocks impacted by the explosion
        // This effectively "restores" the area instantly by preventing damage
        event.impactedBlocks = [];
    }
});

// Feature 2: Lag Fix & Item Cleaner
// Automatically cleans dropped items to reduce lag, with specific focus on junk blocks.

const CLEAN_INTERVAL = 6000; // Ticks (5 minutes)
const WARNING_OFFSET = 200; // Ticks (10 seconds before clear)

// List of valuable items to ignore during cleanup (unless aggressive mode is needed, but preventing player rage is usually good)
const VALUABLE_ITEMS = [
    "minecraft:diamond",
    "minecraft:emerald",
    "minecraft:gold_ingot",
    "minecraft:iron_ingot",
    "minecraft:netherite_ingot",
    "minecraft:diamond_sword",
    "minecraft:diamond_pickaxe",
    "minecraft:diamond_axe",
    "minecraft:diamond_shovel",
    "minecraft:diamond_hoe",
    "minecraft:diamond_helmet",
    "minecraft:diamond_chestplate",
    "minecraft:diamond_leggings",
    "minecraft:diamond_boots",
    "minecraft:netherite_sword",
    "minecraft:netherite_pickaxe",
    "minecraft:netherite_axe",
    "minecraft:netherite_shovel",
    "minecraft:netherite_hoe",
    "minecraft:netherite_helmet",
    "minecraft:netherite_chestplate",
    "minecraft:netherite_leggings",
    "minecraft:netherite_boots",
    "minecraft:shulker_box",
    "minecraft:elytra",
    "minecraft:beacon",
    "minecraft:totem_of_undying"
];

// List of "junk" items to aggressively target (though general logic targets all non-valuables)
// This list is implicitly handled by "not in VALUABLE_ITEMS", but explicitly mentioning dirt for clarity in logic
const JUNK_ITEMS = [
    "minecraft:dirt",
    "minecraft:cobblestone",
    "minecraft:stone",
    "minecraft:gravel",
    "minecraft:sand",
    "minecraft:netherrack",
    "minecraft:rotten_flesh",
    "minecraft:bone",
    "minecraft:arrow",
    "minecraft:spider_eye"
];

function broadcast(message) {
    world.sendMessage(message);
}

function runItemCleaner() {
    let count = 0;
    const dimensions = ["overworld", "nether", "the_end"];

    for (const dimName of dimensions) {
        const dimension = world.getDimension(dimName);
        // Get all item entities
        const entities = dimension.getEntities({ type: "minecraft:item" });

        for (const entity of entities) {
            try {
                const itemStack = entity.getComponent("minecraft:item").itemStack;
                const typeId = itemStack.typeId;

                // Check if item is valuable
                // Use strict inclusion or partial matching for families of items (like shulker boxes)
                const isValuable = VALUABLE_ITEMS.includes(typeId) ||
                                   typeId.includes("shulker_box") ||
                                   typeId.includes("trident") ||
                                   typeId.includes("bow") ||
                                   typeId.includes("apple") || // Golden apples, etc.
                                   typeId.includes("book");    // Enchanted books

                if (isValuable) {
                    continue; // Skip valuable items
                }

                // If it's junk or just a random item not in valuable list, remove it
                // Logic: Remove EVERYTHING except valuables. This matches "Dọn rác và fix lag" (Clean trash and fix lag)
                // Using "junk items" list isn't strictly necessary if we clear everything else, but good for context.

                entity.remove();
                count++;
            } catch (e) {
                // Entity might have been removed already or invalid
            }
        }
    }

    if (count > 0) {
        broadcast(`§e[HỆ THỐNG] Đã dọn dẹp ${count} vật phẩm rác.`);
    }
}

// Main Interval Loop
let ticks = 0;

system.runInterval(() => {
    ticks++;

    // Warning Message (10 seconds before clear)
    if (ticks % CLEAN_INTERVAL === (CLEAN_INTERVAL - WARNING_OFFSET)) {
        broadcast("§c[HỆ THỐNG] Dọn rác sau 10 giây!");
    }

    // Execute Cleaner
    if (ticks % CLEAN_INTERVAL === 0) {
        runItemCleaner();
        ticks = 0; // Reset to avoid overflow eventually (though huge number)
    }
}, 1);
