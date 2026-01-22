import { system } from "@minecraft/server";
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
    const cropType = CROPS[Math.floor(Math.random() * CROPS.length)];
    const block = Utils.findNearestBlock(villager.dimension, villager.location, cropType.block, Config.FARMER.SEARCH_RADIUS || 8);

    if (block) {
        try {
            const growth = block.permutation.getState("growth");
            // Assuming max growth is 7 for standard crops
            if (growth >= 7) {
                const { x, y, z } = block.location;
                // Break and replant
                villager.dimension.runCommandAsync(`setblock ${x} ${y} ${z} air destroy`);
                villager.dimension.runCommandAsync(`setblock ${x} ${y} ${z} ${cropType.block}`);
            }
        } catch (e) {}
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
