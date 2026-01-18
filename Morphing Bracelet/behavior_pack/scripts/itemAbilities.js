import { world, system, ItemStack, ItemLockMode } from "@minecraft/server";

world.afterEvents.dataDrivenEntityTrigger.subscribe(data => {
  const { entity, eventId } = data;

  if (entity.typeId == "minecraft:player") {
    if (eventId == "morph:reset") { removeMobItems(entity); }

    else if (eventId == "morph:skeleton") { addMobItem(entity, "minecraft:bow"); }
    else if (eventId == "morph:enderman") { addMobItem(entity, "morph:teleportation"); }
    else if ([ "morph:zombified_piglin", "morph:baby_zombified_piglin" ].includes(eventId)) { addMobItem(entity, "minecraft:golden_sword"); }
    else if (eventId == "morph:wither_skeleton") { addMobItem(entity, "minecraft:stone_sword"); }
    else if ([ "morph:snow_golem", "morph:sheared_snow_golem" ].includes(eventId)) { addMobItem(entity, "morph:snowball"); }
    else if (eventId == "morph:blaze") { addMobItem(entity, "morph:small_fireball"); }
    else if (eventId == "morph:piglin") { addMobItem(entity, "minecraft:golden_sword"); }
    else if (eventId == "morph:stray") { addMobItem(entity, "minecraft:bow"); }
    else if (eventId == "morph:vindicator") { addMobItem(entity, "minecraft:iron_axe"); }
    else if (eventId == "morph:piglin_brute") { addMobItem(entity, "minecraft:golden_axe"); }
    else if ([ "morph:creamy_llama", "morph:baby_creamy_llama", "morph:white_llama", "morph:baby_white_llama", "morph:brown_llama", "morph:baby_brown_llama", "morph:gray_llama", "morph:baby_gray_llama" ].includes(eventId)) { addMobItem(entity, "morph:llama_spit"); }
    else if (eventId == "morph:wither") { addMobItem(entity, "morph:wither_skull"); addMobItem(entity, "morph:blue_wither_skull"); }
    else if (eventId == "morph:pillager") { addMobItem(entity, "minecraft:crossbow"); }
    else if (eventId == "morph:vex") { addMobItem(entity, "minecraft:iron_sword"); }
    else if (eventId == "morph:ghast") { addMobItem(entity, "morph:fireball"); }
    else if (eventId == "morph:evoker") { addMobItem(entity, "morph:evoker_fangs"); }
    else if ([ "morph:creamy_trader_llama", "morph:baby_creamy_trader_llama", "morph:white_trader_llama", "morph:baby_white_trader_llama", "morph:brown_trader_llama", "morph:baby_brown_trader_llama", "morph:gray_trader_llama", "morph:baby_gray_trader_llama" ].includes(eventId)) { addMobItem(entity, "morph:llama_spit"); }
    else if (eventId == "morph:elder_guardian") { addMobItem(entity, "morph:guardian_curse"); }
    else if (eventId == "morph:warden") { addMobItem(entity, "morph:sonic_boom"); }
    else if (eventId == "morph:ender_dragon") { addMobItem(entity, "morph:dragon_fireball"); }
    else if ([ "morph:bogged", "morph:sheared_bogged" ].includes(eventId)) { addMobItem(entity, "minecraft:bow"); }
    else if (eventId == "morph:breeze") { addMobItem(entity, "morph:wind_charge"); }
    
    else if (eventId == "morph:skeleton_become_stray_event") { addMobItem(entity, "minecraft:bow"); }
    else if (eventId == "morph:pig_become_zombie" && !entity.getComponent('minecraft:is_baby')) { addMobItem(entity, "minecraft:golden_sword"); }
    else if (eventId == "morph:piglin_become_zombie_event" && !entity.getComponent('minecraft:is_baby')) { addMobItem(entity, "minecraft:golden_sword"); }
    else if (eventId == "morph:piglin_brute_become_zombie_event") { addMobItem(entity, "minecraft:golden_axe"); };
  };
});

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    for (let slot = 0; slot < player.getComponent("minecraft:inventory").container.size; slot++) {
      const itemStack = player.getComponent("minecraft:inventory").container.getItem(slot);
      if (itemStack && itemStack.getLore().includes("Morphing Bracelet") && itemStack.hasComponent("minecraft:durability") && itemStack.getComponent("minecraft:durability").damage != 0) {
        itemStack.getComponent("minecraft:durability").damage = 0;
        player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
      };
    };
  };
});

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.getProperty("morph:entity") == 3 || player.getProperty("morph:entity") == 41) {
      player.runCommand('replaceitem entity @s slot.inventory 8 arrow 1 0 {"item_lock":{"mode":"lock_in_slot"},"keep_on_death":{}}');
      system.runTimeout(() => {
        if (player.getProperty("morph:entity") != 3 && player.getProperty("morph:entity") != 41) {
          player.runCommand("replaceitem entity @s slot.inventory 8 air");
        };
      }, 5);
    } else if (player.getProperty("morph:entity") == 25) {
      player.runCommand('replaceitem entity @s slot.inventory 8 arrow 1 19 {"item_lock":{"mode":"lock_in_slot"},"keep_on_death":{}}');
      system.runTimeout(() => {
        if (player.getProperty("morph:entity") != 25) {
          player.runCommand("replaceitem entity @s slot.inventory 8 air");
        };
      }, 5);
    } else if (player.getProperty("morph:entity") == 79) {
      player.runCommand('replaceitem entity @s slot.inventory 8 arrow 1 26 {"item_lock":{"mode":"lock_in_slot"},"keep_on_death":{}}');
      system.runTimeout(() => {
        if (player.getProperty("morph:entity") != 79) {
          player.runCommand("replaceitem entity @s slot.inventory 8 air");
        };
      }, 5);
    };
  };
}, 5);

function addMobItem(entity, item) {
  system.runTimeout(() => {
    const itemStack = new ItemStack(item, 1);
    itemStack.setLore(["Morphing Bracelet"]);
    itemStack.lockMode = ItemLockMode.inventory;
    itemStack.keepOnDeath = true;
    entity.getComponent("minecraft:inventory").container.addItem(itemStack);
  }, 2);
};

function removeMobItems(entity) {
  for (let slot = 0; slot < entity.getComponent("minecraft:inventory").container.size; slot++) {
    const itemStack = entity.getComponent("minecraft:inventory").container.getItem(slot);
    if (itemStack != undefined && itemStack.getLore().includes("Morphing Bracelet")) {
      entity.getComponent("minecraft:inventory").container.setItem(slot, undefined);
    };
  };
};