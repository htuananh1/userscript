import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/fletcher_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:fletcher";
export const JOB_BLOCK_ID = "minecraft:fletching_table";

export function tick(villager) {

    // Ability: Restock Arrows
    if (Utils.checkCooldown(villager, 'restock', Config.FLETCHER.AMMO_RESTOCK_COOLDOWN)) {
        const chest = Utils.findNearestContainer(villager.dimension, villager.location, 5);
        if (chest) {
             const container = chest.getComponent("inventory").container;
             // Add arrows if space permits
             try {
                container.addItem(new ItemStack("minecraft:arrow", 16));
             } catch(e) {}
        }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_fletcher_trades");
}
