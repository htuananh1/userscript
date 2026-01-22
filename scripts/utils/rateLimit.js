import { Config } from "../config.js";

class RateLimitSystem {
    constructor() {
        this.playerRewards = new Map(); // Map<playerId, { startTime: number, count: number }>
    }

    canRewardPlayer(player) {
        if (!player) return true; // If no player associated (e.g. anonymous drop), maybe default to strict or lenient?
                                  // For this requirement, we assume we check against the nearest player.

        const playerId = player.id;
        const now = Date.now();
        const limit = Config.MAX_EMERALDS_PER_MINUTE_PER_PLAYER;
        const windowMs = 60000;

        let data = this.playerRewards.get(playerId);

        if (!data) {
            data = { startTime: now, count: 0 };
            this.playerRewards.set(playerId, data);
        }

        // Check if window expired
        if (now - data.startTime > windowMs) {
            // Reset window
            data.startTime = now;
            data.count = 0;
            this.playerRewards.set(playerId, data); // Update reference if needed (objects are ref, but good practice)
        }

        if (data.count < limit) {
            return true;
        }

        return false;
    }

    recordReward(player) {
        if (!player) return;
        const playerId = player.id;
        let data = this.playerRewards.get(playerId);
        if (data) {
            data.count++;
        }
    }
}

export const RateLimit = new RateLimitSystem();
