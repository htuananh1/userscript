import { world, system } from "@minecraft/server";
import { morphs } from "morphs.js";

const morphEvents = [];
for (const morph of morphs) { morphEvents.push(morph.id); };
morphEvents.push(
  "morph:player.raw",
  "morph:zombie_convert_to_drowned",
  "morph:skeleton_become_stray_event",
  "morph:pig_become_zombie",
  "morph:villager_become_witch",
  "morph:villager_become_zombie",
  "morph:husk_convert_to_zombie",
  "morph:piglin_become_zombie_event",
  "morph:hoglin_become_zombie_event",
  "morph:piglin_brute_become_zombie_event",
  "morph:mooshroom_become_cow",
  "morph:zombie_villager_become_villager"
);

world.afterEvents.dataDrivenEntityTrigger.subscribe(data => {
  const { entity, eventId } = data;
  if (entity.typeId == "minecraft:player" && morphEvents.includes(eventId) && entity.getGameMode() != "creative") {
    const previousHealth = {
      current: entity.getComponent("minecraft:health").currentValue,
      max: entity.getComponent("minecraft:health").defaultValue
    };
    system.runTimeout(() => {
      entity.getComponent("minecraft:health").setCurrentValue(previousHealth.current * (entity.getComponent("minecraft:health").defaultValue / previousHealth.max));
    }, 2);
  };
});