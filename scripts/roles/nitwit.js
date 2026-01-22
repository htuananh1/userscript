import { Config } from "../config.js";
import { Utils } from "../utils/common.js";
import { ItemStack } from "@minecraft/server";

export const ROLE_ID = "minecraft:nitwit";

export function tick(villager) {
    if (!villager.isValid()) return;

    if (Utils.checkCooldown(villager, 'nitwit_share', Config.NITWIT.SHARE_COOLDOWN)) {
        shareFood(villager);
    }
}

function shareFood(villager) {
    const inventory = villager.getComponent("inventory");
    if (!inventory || !inventory.container) return;

    // Find nearby villagers
    const neighbors = villager.dimension.getEntities({
        location: villager.location,
        maxDistance: Config.NITWIT.SHARE_FOOD_RADIUS,
        type: "minecraft:villager_v2"
    });

    if (neighbors.length <= 1) return;

    // Pick a random neighbor
    const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    if (neighbor.id === villager.id) return;

    // Check if we have food
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && (item.typeId.includes("bread") || item.typeId.includes("potato") || item.typeId.includes("carrot") || item.typeId.includes("beetroot"))) {
             // Direct transfer
             const neighborInv = neighbor.getComponent("inventory");
             if (neighborInv && neighborInv.container && neighborInv.container.emptySlotsCount > 0) {
                 const typeId = item.typeId;
                 if (item.amount > 1) {
                     item.amount -= 1;
                     container.setItem(i, item);
                 } else {
                     container.setItem(i, undefined);
                 }

                 Utils.giveItem(neighbor, typeId, 1);

                 try {
                     villager.dimension.runCommandAsync(`particle minecraft:villager_happy ${neighbor.location.x} ${neighbor.location.y + 1} ${neighbor.location.z}`);
                 } catch(e){}
                 return;
             }
        }
    }
}

export function applyTrades(villager) {
    // Nitwits don't trade
}
