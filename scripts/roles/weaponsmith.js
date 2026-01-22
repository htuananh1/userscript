import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { smithDefenseSkill } from "./smith_skill.js";

export const ROLE_ID = "minecraft:weaponsmith";
export const JOB_BLOCK_ID = "minecraft:grindstone";

export function tick(villager) {
    if (!villager.isValid()) return;

    // New Ability: Defense Craft
    smithDefenseSkill(villager);
}

export function applyTrades(villager) {
    villager.addTag("villager_overhaul_trades_applied");
}
