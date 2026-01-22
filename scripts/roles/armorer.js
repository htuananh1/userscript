import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { smithDefenseSkill } from "./smith_skill.js";

export const ROLE_ID = "minecraft:armorer";
export const JOB_BLOCK_ID = "minecraft:blast_furnace";

export function tick(villager) {
    if (!villager.isValid()) return;

    // Existing Ability: Maintain Golem
    if (Utils.checkCooldown(villager, 'heal_golem', Config.ARMORER.REPAIR_COOLDOWN)) {
        try {
            const golems = villager.dimension.getEntities({ type: "minecraft:iron_golem", location: villager.location, maxDistance: Config.ARMORER.GOLEM_SEARCH_RADIUS });
            if (golems.length > 0) {
                 golems[0].addEffect("instant_health", 1, { amplifier: 1 });
            }
        } catch(e) {}
    }

    // New Ability: Defense Craft
    smithDefenseSkill(villager);
}

export function applyTrades(villager) {
    villager.addTag("villager_overhaul_trades_applied");
}
