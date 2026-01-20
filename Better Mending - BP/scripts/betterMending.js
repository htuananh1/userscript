import { system, world } from '@minecraft/server';

const REPAIR_PER_XP = 6;
const TICK_INTERVAL = 10;

const lastXpByPlayer = new Map();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const currentXp = player.getTotalXp();
        const lastXp = lastXpByPlayer.get(player.id);

        if (lastXp === undefined) {
            lastXpByPlayer.set(player.id, currentXp);
            continue;
        }

        if (currentXp <= lastXp) {
            lastXpByPlayer.set(player.id, currentXp);
            continue;
        }

        const gainedXp = currentXp - lastXp;
        const xpToSpend = gainedXp;

        if (xpToSpend <= 0) {
            lastXpByPlayer.set(player.id, currentXp);
            continue;
        }

        const equipment = player.getComponent("equippable");
        if (!equipment) {
            lastXpByPlayer.set(player.id, currentXp);
            continue;
        }

        const xpSpent = repairWithXp(equipment, xpToSpend);
        if (xpSpent > 0) {
            const remainingXp = currentXp - xpSpent;
            removeExperience(player, remainingXp);
            lastXpByPlayer.set(player.id, remainingXp);
        } else {
            lastXpByPlayer.set(player.id, currentXp);
        }
    }
}, TICK_INTERVAL);

export function removeExperience(player, amount){
    system.run( () => {
        player.resetLevel()
        player.addExperience(amount)
    })
}

function repairWithXp(equipment, xpAvailable) {
    const slotsToRepair = [
        "Mainhand",
        "Offhand",
        "Head",
        "Chest",
        "Legs",
        "Feet",
    ];

    const itemsToRepair = [];

    for (const slot of slotsToRepair) {
        const item = equipment.getEquipment(slot);
        if (!item) continue;

        const enchantable = item.getComponent("enchantable");
        if (!enchantable || !enchantable.hasEnchantment("mending")) continue;

        const durability = item.getComponent("durability");
        if (!durability || durability.damage <= 0) continue;

        itemsToRepair.push({ item, slot });
    }

    if (itemsToRepair.length === 0) return 0;

    let remainingXp = xpAvailable;
    let totalXpUsed = 0;

    while (remainingXp > 0) {
        let repairedThisRound = false;

        for (const { item, slot } of itemsToRepair) {
            if (remainingXp <= 0) break;
            const durability = item.getComponent("durability");
            if (!durability || durability.damage <= 0) continue;

            const repairAmount = Math.min(durability.damage, REPAIR_PER_XP);
            repairItem(item, equipment, slot, repairAmount);
            remainingXp -= 1;
            totalXpUsed += 1;
            repairedThisRound = true;
        }

        if (!repairedThisRound) break;
    }

    return totalXpUsed;
}

export function repairItem(item, equipment, slot, amount){
    system.run( () => {
        const durability = item.getComponent("durability")
        durability.damage -= amount;
        equipment.setEquipment(slot, item);
    })
}
