import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { MESSAGES } from "./message_system.js";

const VANILLA_RARE_ITEMS = [
    "minecraft:diamond",
    "minecraft:netherite_ingot",
    "minecraft:netherite_scrap",
    "minecraft:elytra",
    "minecraft:dragon_egg",
    "minecraft:beacon",
    "minecraft:nether_star"
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

            // Check if item is Vanilla Rare or in Safe Zone
            const isRare = VANILLA_RARE_ITEMS.includes(itemId);
            
            if (isRare || isSafe(item)) continue;

            item.remove();
            removedCount++;
        } catch (e) {
            continue;
        }
    }

    MESSAGES.broadcast(`Cleanup complete. Removed ${removedCount} dropped items.`, "SUCCESS");
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
