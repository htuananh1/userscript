import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";

export function limitEntities() {
    let totalRemoved = 0;
    const dimension = world.getDimension("overworld");

    for (const [typeId, limit] of Object.entries(CONFIG.ENTITY_LIMITER.LIMITS)) {
        const entities = dimension.getEntities({ type: typeId });
        
        if (entities.length > limit) {
            const toRemove = entities.length - limit;
            let count = 0;
            for (const entity of entities) {
                if (count >= toRemove) break;
                if (!entity.nameTag && !entity.getComponent("minecraft:is_tamed")) {
                    entity.remove();
                    count++;
                    totalRemoved++;
                }
            }
        }
    }
    return totalRemoved;
}
