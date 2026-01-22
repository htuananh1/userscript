import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/fisherman_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:fisherman";
export const JOB_BLOCK_ID = "minecraft:barrel";

export function tick(villager) {

    // Ability: Auto Fish
    if (Utils.checkCooldown(villager, 'fish', Config.FISHERMAN.FISHING_INTERVAL)) {
         const chest = Utils.findNearestContainer(villager.dimension, villager.location, 5);
         if (chest) {
             const container = chest.getComponent("inventory").container;
             try {
                 container.addItem(new ItemStack("minecraft:cod", 1));
             } catch(e) {}
         }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_fisherman_trades");
}
