import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { MESSAGES } from "./message_system.js";

const PROTECTED_ITEMS = [
    "minecraft:diamond",
    "minecraft:emerald",
    "minecraft:gold_ingot",
    "minecraft:iron_ingot",
    "minecraft:coal",
    "minecraft:lapis_lazuli",
    "minecraft:redstone",
    "minecraft:quartz",
    "minecraft:copper_ingot",
    "minecraft:netherite_ingot",
    "minecraft:netherite_scrap",
    "minecraft:amethyst_shard",
    "minecraft:raw_iron",
    "minecraft:raw_gold",
    "minecraft:raw_copper",
    "minecraft:elytra",
    "minecraft:totem_of_undying",
    "minecraft:nether_star",
    "minecraft:beacon",
    "minecraft:conduit",
    "minecraft:dragon_egg",
    "minecraft:enchanted_golden_apple",
    "minecraft:golden_apple"
];

const PROTECTED_FAMILIES = [
    "shulker_box",
    "trident",
    "bow",
    "apple",
    "book"
];

export function clearDroppedItems() {
    const overworld = world.getDimension("overworld");
    const items = overworld.getEntities({ type: "minecraft:item" });
    const xpOrbs = overworld.getEntities({ type: "minecraft:xp_orb" });
    
    let removedCount = 0;

    // 1. XP Orb Optimization (Update v1.1.0)
    const xpLimit = CONFIG.ENTITY_LIMITER.LIMITS["minecraft:xp_orb"] || 40;
    if (xpOrbs.length > xpLimit) {
        const toRemoveXP = xpOrbs.length - xpLimit;
        for (let i = 0; i < toRemoveXP; i++) {
            xpOrbs[i].remove();
        }
    }

    // 2. Smart Item Clear
    for (const item of items) {
        try {
            const itemStack = item.getComponent("minecraft:item").itemStack;
            const itemId = itemStack.typeId;

            // Check if item is Protected or in Safe Zone
            const isProtectedItem = PROTECTED_ITEMS.includes(itemId);
            const isProtectedFamily = PROTECTED_FAMILIES.some(family => itemId.includes(family));
            
            if (isProtectedItem || isProtectedFamily || isSafe(item)) continue;

            item.remove();
            removedCount++;
        } catch (e) {
            continue;
        }
    }

    MESSAGES.broadcast(`Đã dọn dẹp xong. Xóa ${removedCount} vật phẩm rơi.`, "SUCCESS");
    return removedCount;
}

function isSafe(entity) {
    const pos = entity.location;
    for (const player of world.getAllPlayers()) {
        const d = player.location;
        const dist = Math.sqrt(Math.pow(pos.x - d.x, 2) + Math.pow(pos.z - d.z, 2));
        if (dist < CONFIG.AUTO_CLEAR.PLAYER_SAFE_RADIUS) return true;
    }
    if (Math.abs(pos.x) < CONFIG.AUTO_CLEAR.SPAWN_SAFE_RADIUS && 
        Math.abs(pos.z) < CONFIG.AUTO_CLEAR.SPAWN_SAFE_RADIUS) return true;
    return false;
}
