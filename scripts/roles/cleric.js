import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";

export const ROLE_ID = "minecraft:cleric";

export function tick(villager) {
    if (!villager.isValid()) return;

    // Existing Ability: Buff on Raid/Attack
    if (Utils.checkCooldown(villager, 'buff', Config.CLERIC.BUFF_COOLDOWN)) {
        try {
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
        } catch (e) {}
    }

    // New Ability: Healer
    if (Utils.checkCooldown(villager, 'healer', Config.SKILLS.HEALER_COOLDOWN)) {
        try {
            const injuredVillagers = villager.dimension.getEntities({
                location: villager.location,
                maxDistance: Config.SKILLS.HEALER_RADIUS,
                type: "minecraft:villager_v2"
            });

            let healed = false;
            for (const target of injuredVillagers) {
                if (target.id === villager.id) continue;

                const healthComp = target.getComponent("health");
                if (healthComp && healthComp.currentValue < healthComp.effectiveMax) {
                    target.addEffect("instant_health", 1, { amplifier: 0, showParticles: true });
                    healed = true;
                }
            }

            if (healed) {
                villager.dimension.runCommandAsync(`particle minecraft:heart_particle ${villager.location.x} ${villager.location.y + 2} ${villager.location.z}`);
            }
        } catch (e) {}
    }
}

export function applyTrades(villager) {
    villager.addTag("villager_overhaul_trades_applied");
}
