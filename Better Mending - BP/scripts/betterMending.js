import { Player, system, world } from '@minecraft/server';


world.beforeEvents.itemUse.subscribe(eventData => {
    const player = eventData.source;

    if ( !player.isSneaking ) return;
    

    const mainHandSlotIndex = player.selectedSlotIndex;
    const mainHandItem = player.getComponent("minecraft:inventory").container.getItem(mainHandSlotIndex);
    
    if ( !mainHandItem.getComponent("enchantable").hasEnchantment("mending") ) return;

    const itemCurrentDamage = mainHandItem.getComponent("durability").damage

    if ( itemCurrentDamage == 0) return;

    let currentLevelXp = player.getTotalXp()

    if ( currentLevelXp < 12 ) return;

    const equipment = player.getComponent('equippable');

    if ( itemCurrentDamage >= 24 ) {
        currentLevelXp -= 12
        removeExperience(player,currentLevelXp)
        repairItem(mainHandItem,equipment, 24)
    }
    else if ( itemCurrentDamage < 24 ) {
        currentLevelXp -= itemCurrentDamage/2
        removeExperience(player,currentLevelXp)
        repairItem(mainHandItem,equipment, itemCurrentDamage)
    }

    eventData.cancel = true

})

export function removeExperience(player, amount){
    system.run( () => {
        player.resetLevel()
        player.addExperience(amount)
    })
}

export function repairItem(mainHandItem, equipment, amount){
    system.run( () => {
        const durability = mainHandItem.getComponent("durability")
        durability.damage -= amount;
        equipment.setEquipment('Mainhand', mainHandItem);
    })
}
