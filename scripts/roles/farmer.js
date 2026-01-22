import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/farmer_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:farmer";
export const JOB_BLOCK_ID = "minecraft:composter";

export function tick(villager) {

    // Ability: Harvest and Replant
    if (Utils.checkCooldown(villager, 'harvest', 100)) {
        const block = Utils.findNearestBlock(villager.dimension, villager.location, "minecraft:wheat", Config.FARMER.SEARCH_RADIUS);
        if (block) {
            try {
                // Check growth state (7 is max for wheat)
                const growth = block.permutation.getState("growth");
                if (growth === 7) {
                    // Break and replant
                    // Using command to ensure drops
                    const { x, y, z } = block.location;
                    villager.dimension.runCommandAsync(`setblock ${x} ${y} ${z} air destroy`);
                    // Delay replant slightly or immediate? Immediate is fine for script.
                    villager.dimension.runCommandAsync(`setblock ${x} ${y} ${z} wheat`);
                }
            } catch (e) {}
        }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_farmer_trades");
}
