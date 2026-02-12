import { system, BlockPermutation } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils/common.js";

export const ROLE_ID = "minecraft:farmer";

const CROPS = [
    { block: "minecraft:wheat", product: "minecraft:wheat" },
    { block: "minecraft:carrots", product: "minecraft:carrot" },
    { block: "minecraft:potatoes", product: "minecraft:potato" },
    { block: "minecraft:beetroot", product: "minecraft:beetroot" }
];

export function tick(villager) {
    if (!villager.isValid()) return;

    // Harvest
    if (Utils.checkCooldown(villager, 'harvest', 200)) { // ~10s
        harvestLogic(villager);
    }

    // Deposit
    if (Utils.checkCooldown(villager, 'deposit', 400)) { // ~20s
        depositLogic(villager);
    }
}

function harvestLogic(villager) {
    const dimension = villager.dimension;
    const center = villager.location;
    const radius = Config.FARMER.SEARCH_RADIUS || 8;
    const maxActions = Config.FARMER.MAX_ACTIONS_PER_TICK || 16;
    let actions = 0;

    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            if (actions >= maxActions) return;

            for (let y = -1; y <= 1; y++) {
                if (actions >= maxActions) break;

                const blockLocation = { x: center.x + x, y: center.y + y, z: center.z + z };
                try {
                    const block = dimension.getBlock(blockLocation);
                    if (!block) continue;

                    const cropDef = CROPS.find(c => c.block === block.typeId);
                    if (cropDef) {
                        const growth = block.permutation.getState("growth");
                        // Assuming max growth is 7 for standard crops
                        if (growth >= 7) {
                            // Determine drop amount
                            let amount = 1;
                            if (cropDef.product.includes("carrot") || cropDef.product.includes("potato")) {
                                amount = Math.floor(Math.random() * 3) + 2;
                            }

                            // Try to give item directly to inventory to ensure collection
                            if (Utils.giveItem(villager, cropDef.product, amount)) {
                                // Replant without destroy (no drops on ground)
                                // Optimized: Use setPermutation instead of runCommandAsync for better performance
                                block.setPermutation(BlockPermutation.resolve(cropDef.block));
                                actions++;
                            } else {
                                // Inventory full, stop harvesting
                                return;
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    }
}

function depositLogic(villager) {
    const inventory = villager.getComponent("inventory");
    if (!inventory || !inventory.container) return;

    if (inventory.container.emptySlotsCount === inventory.container.size) return;

    const chest = Utils.findNearestContainer(villager.dimension, villager.location, Config.FARMER.CHEST_SEARCH_RADIUS || 5);
    if (chest) {
        const chestInventory = chest.getComponent("inventory").container;
        if (!chestInventory) return;

        for (let i = 0; i < inventory.container.size; i++) {
            const item = inventory.container.getItem(i);
            if (item && isCrop(item.typeId)) {
                // Try to add to chest
                try {
                    const left = chestInventory.addItem(item);
                    if (!left) {
                        inventory.container.setItem(i, undefined);
                    } else {
                        inventory.container.setItem(i, left);
                    }
                } catch (e) {}
            }
        }
    }
}

function isCrop(id) {
    return id.includes("wheat") || id.includes("seed") || id.includes("carrot") || id.includes("potato") || id.includes("beetroot");
}

export function applyTrades(villager) {
    villager.addTag("villager_overhaul_trades_applied");
}
