import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/shepherd_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:shepherd";
export const JOB_BLOCK_ID = "minecraft:loom";

export function tick(villager) {

    // Ability: Gather Wool
    if (Utils.checkCooldown(villager, 'shear', Config.SHEPHERD.SHEARING_COOLDOWN)) {
        // Run command to event shear nearby sheep
        const { x, y, z } = villager.location;
        villager.dimension.runCommandAsync(`event entity @e[type=sheep,r=${Config.SHEPHERD.WOOL_SEARCH_RADIUS},x=${x},y=${y},z=${z}] minecraft:on_sheared`);
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_shepherd_trades");
}
