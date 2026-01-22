import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/toolsmith_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:toolsmith";
export const JOB_BLOCK_ID = "minecraft:smithing_table";

export function tick(villager) {

    // Ability: Repair Service (Mock)
    if (Utils.checkCooldown(villager, 'repair', 200)) {
        // Look for item entities on ground?
        const items = villager.dimension.getEntities({ type: "minecraft:item", location: villager.location, maxDistance: Config.TOOLSMITH.REPAIR_RADIUS });
        for (const itemEntity of items) {
            const itemStack = itemEntity.getComponent("minecraft:item").itemStack;
            // If damageable and damaged (Checking damage is complex in script without specific component access)
            // Just a placeholder effect
            // itemEntity.dimension.spawnParticle("minecraft:villager_happy", itemEntity.location);
        }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_toolsmith_trades");
}
