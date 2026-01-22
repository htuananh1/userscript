import { world, system } from "@minecraft/server";

export const SmartVillager = {
    /**
     * Main tick logic for smart villagers
     * @param {Entity} villager
     */
    tick(villager) {
        if (!villager.isValid()) return;

        // Spread out checks to save performance?
        // For now, simple checks every tick (or caller handles interval).

        this.handleSafety(villager);
        this.handleHealth(villager);
    },

    handleSafety(villager) {
        try {
            const dimension = villager.dimension;

            // Check for nearby monsters
            // Optimization: Only check occasionally or rely on a "danger" tag?
            // "getEntities" every tick for every villager is expensive.
            // The caller (main.js) runs at TICK_INTERVAL (40 ticks = 2s).
            // So checking every 2 seconds is acceptable.

            const hostiles = dimension.getEntities({
                location: villager.location,
                maxDistance: 12,
                families: ["monster", "zombie", "skeleton", "illager"],
                excludeFamilies: ["player", "villager"]
            });

            if (hostiles.length > 0) {
                // Apply Speed II for 5 seconds (100 ticks)
                villager.addEffect("speed", 100, { amplifier: 1, showParticles: true });
            }
        } catch (e) {
            // Ignore errors (e.g. dimension unloaded)
        }
    },

    handleHealth(villager) {
        try {
            const health = villager.getComponent("minecraft:health");
            if (health && health.currentValue < health.effectiveMax) {
                // Apply Regeneration I for 5 seconds
                villager.addEffect("regeneration", 100, { amplifier: 0, showParticles: false });
            }
        } catch (e) {}
    }
};
