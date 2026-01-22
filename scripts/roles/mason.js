import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/mason_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:mason";
export const JOB_BLOCK_ID = "minecraft:stonecutter";

export function tick(villager) {

    // Ability: Convert Stone
    if (Utils.checkCooldown(villager, 'convert', Config.MASON.CONVERSION_INTERVAL)) {
         const chest = Utils.findNearestContainer(villager.dimension, villager.location, 5);
         if (chest) {
             const container = chest.getComponent("inventory").container;
             for (let i = 0; i < container.size; i++) {
                 const item = container.getItem(i);
                 if (item && item.typeId === "minecraft:cobblestone") {
                     const count = item.amount;
                     container.setItem(i, new ItemStack("minecraft:stone", count));
                     break; // One stack per tick
                 }
             }
         }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_mason_trades");
}
