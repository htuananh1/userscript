import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/weaponsmith_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:weaponsmith";
export const JOB_BLOCK_ID = "minecraft:grindstone";

export function tick(villager) {

    // Ability: Disenchant/Clean (Mock)
    // Similar to Toolsmith, we just simulate activity

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_weaponsmith_trades");
}
