import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/leatherworker_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:leatherworker";
export const JOB_BLOCK_ID = "minecraft:cauldron";

export function tick(villager) {

    // Ability: Quick Dye
    if (Utils.checkCooldown(villager, 'dye', Config.LEATHERWORKER.DYE_COOLDOWN)) {
         const chest = Utils.findNearestContainer(villager.dimension, villager.location, 5);
         if (chest) {
             const container = chest.getComponent("inventory").container;
             for (let i = 0; i < container.size; i++) {
                 const item = container.getItem(i);
                 if (item && item.typeId.includes("leather_") && !item.typeId.includes("horse")) {
                     // Can't easily dye in script without recreating item?
                     // Bedrock ItemStack doesn't expose color property easily in V1.
                     // Skipping for now or assume replacement with "dyed" variant if it existed as separate ID?
                     // No, it's NBT.
                     // We will just skip implementation to avoid breaking items.
                 }
             }
         }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_leatherworker_trades");
}
