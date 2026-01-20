import { system, world } from '@minecraft/server';

const MAX_XP_PER_ITEM = 8;
const REPAIR_PER_XP = 4;

world.beforeEvents.itemUse.subscribe(eventData => {
    const player = eventData.source;

    const equipment = player.getComponent("equippable");
    if (!equipment) return;

    let remainingXp = player.getTotalXp();
    if (remainingXp <= 0) return;

    const slotsToRepair = [
        "Mainhand",
        "Head",
        "Chest",
        "Legs",
        "Feet",
    ];

    let totalXpUsed = 0;

    for (const slot of slotsToRepair) {
        if (remainingXp <= 0) break;
        const item = equipment.getEquipment(slot);
        if (!item) continue;

        const enchantable = item.getComponent("enchantable");
        if (!enchantable || !enchantable.hasEnchantment("mending")) continue;

        const durability = item.getComponent("durability");
        if (!durability || durability.damage <= 0) continue;

        const maxXpForItem = Math.min(remainingXp, MAX_XP_PER_ITEM);
        const xpNeededForDamage = Math.ceil(durability.damage / REPAIR_PER_XP);
        const xpToUse = Math.min(maxXpForItem, xpNeededForDamage);

        if (xpToUse <= 0) continue;

        const repairAmount = Math.min(durability.damage, xpToUse * REPAIR_PER_XP);
        repairItem(item, equipment, slot, repairAmount);
        remainingXp -= xpToUse;
        totalXpUsed += xpToUse;
    }

    if (totalXpUsed > 0) {
        removeExperience(player, remainingXp);
    }
});

export function removeExperience(player, amount){
    system.run( () => {
        player.resetLevel()
        player.addExperience(amount)
    })
}

export function repairItem(item, equipment, slot, amount){
    system.run( () => {
        const durability = item.getComponent("durability")
        durability.damage -= amount;
        equipment.setEquipment(slot, item);
    })
}
