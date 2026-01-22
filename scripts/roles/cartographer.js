import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/cartographer_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:cartographer";
export const JOB_BLOCK_ID = "minecraft:cartography_table";

export function tick(villager) {

    // Ability: Survey POI
    if (Utils.checkCooldown(villager, 'survey', Config.CARTOGRAPHER.SURVEY_INTERVAL)) {
        // Simulate survey by giving a hint to nearby players
        const players = villager.dimension.getPlayers({ location: villager.location, maxDistance: 10 });
        for (const player of players) {
            player.sendMessage("§eCartographer: I have marked a new point of interest on your map (simulated).");
        }
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_cartographer_trades");
}
