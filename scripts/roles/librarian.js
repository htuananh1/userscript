import { system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";

export const ROLE_ID = "minecraft:librarian";

export function tick(villager) {
    if (!villager.isValid()) return;

    if (Utils.checkCooldown(villager, 'research_aura', Config.SKILLS.RESEARCH_AURA_COOLDOWN)) {
        applyResearchAura(villager);
    }
}

function applyResearchAura(villager) {
    const r = Config.SKILLS.RESEARCH_AURA_RADIUS || 10;
    const options = {
        location: villager.location,
        maxDistance: r,
        type: "minecraft:villager_v2"
    };

    const targets = villager.dimension.getEntities(options);
    let count = 0;
    for (const target of targets) {
        if (target.id === villager.id) continue;

        try {
            target.addEffect("regeneration", 200, { amplifier: 0, showParticles: true });
            count++;
        } catch (e) {}
    }

    if (count > 0) {
        try {
            villager.dimension.runCommandAsync(`particle minecraft:villager_happy ${villager.location.x} ${villager.location.y + 2} ${villager.location.z}`);
        } catch (e) {}
    }
}

export function applyTrades(villager) {
    villager.addTag("villager_overhaul_trades_applied");
}
