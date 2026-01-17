export const CONFIG = {
    AUTO_CLEAR: {
        ENABLED: true,
        INTERVAL_SECONDS: 300, // 5 Minutes
        WARNINGS: [30, 10],    // Warnings at these seconds
        SPAWN_SAFE_RADIUS: 32,
        PLAYER_SAFE_RADIUS: 4
    },
    ENTITY_LIMITER: {
        ENABLED: true,
        LIMITS: {
            "minecraft:cow": 20,
            "minecraft:zombie": 15,
            "minecraft:chicken": 20,
            "minecraft:villager": 50,
            "minecraft:xp_orb": 40 // Added: Limits XP orbs to reduce FPS lag
        }
    },
    LAG_PREVENTION: {
        MAX_TNT_EXPLOSIONS: 15,     // Added: Max TNTs allowed to explode in the same tick
        DISABLE_FIRE_SPREAD: true,  // Added: Stops fire from burning down the world
        CANCEL_EXPLOSION_DROPS: false // Optional: If true, explosions won't drop blocks as items
    },
    DISPLAY: {
        ACTIONBAR_STATS: true,
        UPDATE_INTERVAL_TICKS: 40 // Every 2 seconds
    }
};
