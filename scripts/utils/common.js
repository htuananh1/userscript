import { world, system, ItemStack, EntityInventoryComponent, BlockInventoryComponent } from "@minecraft/server";

export class Utils {
    static getDimension(dimensionId) {
        return world.getDimension(dimensionId);
    }

    static distance(loc1, loc2) {
        return Math.hypot(loc1.x - loc2.x, loc1.y - loc2.y, loc1.z - loc2.z);
    }

    /**
     * Checks if a cooldown has passed for the given entity and key.
     * @param {Entity} entity
     * @param {string} key
     * @param {number} cooldownTicks
     * @returns {boolean} True if action is allowed.
     */
    static checkCooldown(entity, key, cooldownTicks) {
        const lastRun = entity.getDynamicProperty(`cooldown_${key}`);
        const currentTick = system.currentTick;

        if (lastRun === undefined || (currentTick - lastRun) >= cooldownTicks) {
            entity.setDynamicProperty(`cooldown_${key}`, currentTick);
            return true;
        }
        return false;
    }

    static findNearestBlock(dimension, center, blockId, radius) {
        // Limit radius to prevent lag spikes/crashes
        const r = Math.min(Math.floor(radius), 16);

        // Search in shells (approximate) to find nearest first
        // Optimization: checking closest blocks first allows early exit
        // Simple implementation: sort logic is complex, so we stick to a simple loop
        // but verify distance to return truly nearest?
        // Or just spiral. Spiraling is best but verbose.
        // Let's stick to the box loop but strictly limit radius.

        for (let x = -r; x <= r; x++) {
            for (let y = -r; y <= r; y++) {
                for (let z = -r; z <= r; z++) {
                    // Optimization: Skip corners to make it spherical-ish
                    if (x*x + y*y + z*z > r*r) continue;

                    const loc = { x: center.x + x, y: center.y + y, z: center.z + z };
                    try {
                        const block = dimension.getBlock(loc);
                        if (block && block.typeId === blockId) {
                            return block;
                        }
                    } catch (e) {}
                }
            }
        }
        return null;
    }

    static findNearestContainer(dimension, center, radius) {
        const r = Math.min(Math.floor(radius), 16);
        for (let x = -r; x <= r; x++) {
            for (let y = -r; y <= r; y++) {
                for (let z = -r; z <= r; z++) {
                    if (x*x + y*y + z*z > r*r) continue;

                    const loc = { x: center.x + x, y: center.y + y, z: center.z + z };
                    try {
                        const block = dimension.getBlock(loc);
                        if (block && block.getComponent("inventory")) {
                            return block;
                        }
                    } catch (e) {}
                }
            }
        }
        return null;
    }

    static giveItem(entity, itemId, amount = 1) {
        const inventory = entity.getComponent("inventory");
        if (!inventory || !inventory.container) return false;

        const item = new ItemStack(itemId, amount);
        inventory.container.addItem(item);
        return true;
    }

    static removeItem(entity, itemId, amount = 1) {
        const inventory = entity.getComponent("inventory");
        if (!inventory || !inventory.container) return false;

        const container = inventory.container;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item && item.typeId === itemId) {
                if (item.amount >= amount) {
                    if (item.amount === amount) {
                        container.setItem(i, undefined);
                    } else {
                        item.amount -= amount;
                        container.setItem(i, item);
                    }
                    return true;
                } else {
                    amount -= item.amount;
                    container.setItem(i, undefined);
                }
            }
        }
        return amount <= 0;
    }
}
