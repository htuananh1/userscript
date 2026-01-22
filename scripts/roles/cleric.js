import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/cleric_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:cleric";
export const JOB_BLOCK_ID = "minecraft:brewing_stand";

export function tick(villager) {

    // Ability: Buff on Raid/Attack
    if (Utils.checkCooldown(villager, 'buff', Config.CLERIC.BUFF_COOLDOWN)) {
        // Simple check: Is there a raid or nearby hostile mobs?
        // Using getEntities to find monsters
        const monsters = villager.dimension.getEntities({
            location: villager.location,
            maxDistance: Config.CLERIC.BUFF_RADIUS,
            families: ["monster"]
        });

        if (monsters.length > 0) {
            const players = villager.dimension.getPlayers({ location: villager.location, maxDistance: Config.CLERIC.BUFF_RADIUS });
            for (const player of players) {
                 player.addEffect("regeneration", Config.CLERIC.BUFF_DURATION, { amplifier: 0 });
            }
        }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_cleric_trades");
}
