import { Config } from "../config.js";
import { Utils } from "../utils/common.js";

export function smithDefenseSkill(villager) {
    if (!Utils.checkCooldown(villager, 'defense_craft', Config.SKILLS.DEFENSE_CRAFT_COOLDOWN)) return;

    // Check for hostiles
    const enemies = villager.dimension.getEntities({
        location: villager.location,
        maxDistance: 16,
        families: ["monster"]
    });

    if (enemies.length === 0) return;

    // Buff Golems
    const golems = villager.dimension.getEntities({
        location: villager.location,
        maxDistance: Config.SKILLS.DEFENSE_CRAFT_RADIUS || 16,
        type: "minecraft:iron_golem"
    });

    let buffed = false;
    for (const golem of golems) {
        try {
            golem.addEffect("strength", 200, { amplifier: 1, showParticles: true });
            golem.addEffect("resistance", 200, { amplifier: 0, showParticles: true });
            buffed = true;
        } catch (e) {}
    }

    if (buffed) {
        try {
            villager.dimension.runCommandAsync(`particle minecraft:totem_particle ${villager.location.x} ${villager.location.y + 1} ${villager.location.z}`);
            villager.dimension.runCommandAsync(`playsound random.anvil_use @a[r=10] ${villager.location.x} ${villager.location.y} ${villager.location.z}`);
        } catch (e) {}
    }
}
