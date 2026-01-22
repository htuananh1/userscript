import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { trades } from "../trading/librarian_trades.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:librarian";
export const JOB_BLOCK_ID = "minecraft:lectern";

export function tick(villager) {

    // Ability: Reroll Window Monitor
    let firstSeen = villager.getDynamicProperty("first_seen");
    if (firstSeen === undefined) {
        firstSeen = system.currentTick;
        villager.setDynamicProperty("first_seen", firstSeen);
    }

    // Only allow specific logic if within window
    const elapsed = system.currentTick - firstSeen;
    if (elapsed < Config.LIBRARIAN.REROLL_WINDOW_MINUTES * 1200) { // ticks
        // Logic: If player interacts with book, maybe reroll?
        // Passive: Just maintain the 'fresh' tag
        if (!villager.hasTag("can_reroll")) villager.addTag("can_reroll");
    } else {
        if (villager.hasTag("can_reroll")) villager.removeTag("can_reroll");
    }

}

export function applyTrades(villager) {
    // Mark as having trades applied
    villager.addTag("villager_overhaul_trades_applied");

    // Trigger event for BP integration
    // villager.triggerEvent("villager_overhaul:apply_librarian_trades");
}
