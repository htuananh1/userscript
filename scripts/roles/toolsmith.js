import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { smithDefenseSkill } from "./smith_skill.js";

export const ROLE_ID = "minecraft:toolsmith";
export const JOB_BLOCK_ID = "minecraft:smithing_table";

export function tick(villager) {
    if (!villager.isValid()) return;

    // Ability: Repair Service (Mock)
    if (Utils.checkCooldown(villager, 'repair', 200)) {
        try {
            const items = villager.dimension.getEntities({ type: "minecraft:item", location: villager.location, maxDistance: Config.TOOLSMITH.REPAIR_RADIUS });
            // Placeholder for future logic
        } catch(e) {}
    }

    // New Ability: Defense Craft
    smithDefenseSkill(villager);
}

export function applyTrades(villager) {
    villager.addTag("villager_overhaul_trades_applied");
}
