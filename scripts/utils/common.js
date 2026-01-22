import { world, system, ItemStack, EntityInventoryComponent, BlockInventoryComponent } from "@minecraft/server";

export class Utils {
    static getDimension(dimensionId) {
        return world.getDimension(dimensionId);
    }

    static distance(loc1, loc2) {
        return Math.sqrt(
            Math.pow(loc1.x - loc2.x, 2) +
            Math.pow(loc1.y - loc2.y, 2) +
            Math.pow(loc1.z - loc2.z, 2)
        );
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
        // Simple cubic search. For optimization, this should be limited.
        const r = Math.floor(radius);
        for (let x = -r; x <= r; x++) {
            for (let y = -r; y <= r; y++) {
                for (let z = -r; z <= r; z++) {
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
        // Search for blocks with inventory component
        const r = Math.floor(radius);
        for (let x = -r; x <= r; x++) {
            for (let y = -r; y <= r; y++) {
                for (let z = -r; z <= r; z++) {
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
        // Logic to remove item
        // This is complex as it requires iterating slots.
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
