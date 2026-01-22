import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/butcher_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:butcher";
export const JOB_BLOCK_ID = "minecraft:smoker";

export function tick(villager) {

    // Ability: Cook Meat
    if (Utils.checkCooldown(villager, 'cook', Config.BUTCHER.COOK_LIMIT_HOURLY)) { // abusing cooldown as rate limiter
         const chest = Utils.findNearestContainer(villager.dimension, villager.location, Config.BUTCHER.SEARCH_RADIUS);
         if (chest) {
             const container = chest.getComponent("inventory").container;
             for (let i = 0; i < container.size; i++) {
                 const item = container.getItem(i);
                 if (item && (item.typeId.includes("beef") || item.typeId.includes("pork") || item.typeId.includes("chicken")) && !item.typeId.includes("cooked")) {
                     const cookedId = "minecraft:cooked_" + item.typeId.replace("minecraft:", "");
                     // Simple mapping attempt, might need specific map
                     const validCooked = cookedId.replace("raw_", ""); // e.g. raw_beef -> cooked_beef? No, beef -> cooked_beef
                     // Actually beef -> cooked_beef, porkchop -> cooked_porkchop.
                     // Let's just do porkchop for safety in this demo
                     if (item.typeId === "minecraft:porkchop") {
                        container.setItem(i, new ItemStack("minecraft:cooked_porkchop", item.amount));
                        break;
                     }
                     if (item.typeId === "minecraft:beef") {
                        container.setItem(i, new ItemStack("minecraft:cooked_beef", item.amount));
                        break;
                     }
                 }
             }
         }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_butcher_trades");
}
