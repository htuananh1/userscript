import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/armorer_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:armorer";
export const JOB_BLOCK_ID = "minecraft:blast_furnace";

export function tick(villager) {

    // Ability: Maintain Golem
    if (Utils.checkCooldown(villager, 'heal_golem', Config.ARMORER.REPAIR_COOLDOWN)) {
        const golems = villager.dimension.getEntities({ type: "minecraft:iron_golem", location: villager.location, maxDistance: Config.ARMORER.GOLEM_SEARCH_RADIUS });
        if (golems.length > 0) {
             golems[0].addEffect("instant_health", 1, { amplifier: 1 });
        }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_armorer_trades");
}
