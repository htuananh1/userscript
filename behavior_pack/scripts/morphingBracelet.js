import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { morphs } from "morphs.js";
import { isShulkerValidLocation } from "abilities/shulker.js";

const currentMorphs = {};

export class MorphingBracelet {
  constructor() {
    this.onUse = this.onUse.bind(this);
    this.onBeforeDurabilityDamage = this.onBeforeDurabilityDamage.bind(this);
  };
  onUse(event) {
    const { itemStack, source } = event;
    if (itemStack.typeId == "morph:morphing_bracelet") {
      const containerSlot = source.getComponent("minecraft:inventory").container.getSlot(source.selectedSlotIndex);
      const data = JSON.parse(itemStack.getDynamicProperty("morphs")).map(id => morphs.find(morph => morph.id == id)).filter(morph => morph != undefined);
      const menu = new ActionFormData().title({ translate: "morph.menu.title" }).body("morph:morph_menu");
      for (const morph of data) {
        menu.button(morph.id, morph.icon ? morph.icon : `textures/icons/morph_menu/${morph.entity.split(":")[1]}/${morph.id.split(":")[1]}`);
      };
      menu.show(source).then(result => {
        if (!result.canceled && data[result.selection].id != source.getMorph().id) {
          if (isShulkerValidLocation(source, data[result.selection].id)) {
            removeMorph(itemStack, data[result.selection].id);
            if (!addMorph(itemStack, source.getMorph().id)) {
              for (let slot = 0; slot < source.getComponent("minecraft:inventory").container.size; slot++) {
                const itemStack = source.getComponent("minecraft:inventory").container.getItem(slot);
                if (addMorph(itemStack, source.getMorph().id)) {
                  source.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
                  break;
                };
              };
            };
            source.addTag("morph:disable_addMorph()");
            source.triggerEvent(data[result.selection].id);
            if (source.getGameMode() == "creative") { containerSlot.setItem(itemStack); }
            else {
              if (itemStack.getComponent("minecraft:durability").maxDurability - 1 > itemStack.getComponent("minecraft:durability").damage) {
                itemStack.getComponent("minecraft:durability").damage = itemStack.getComponent("minecraft:durability").damage + 1;
                containerSlot.setItem(itemStack);
              } else if (itemStack.getComponent("minecraft:durability").maxDurability - 1 <= itemStack.getComponent("minecraft:durability").damage) {
                containerSlot.setItem(undefined);
                source.dimension.playSound("respawn_anchor.deplete", source.location, { volume: 1.0, pitch: (Math.random() * 0.4) + 0.8 });
              };
            };
          } else { source.onScreenDisplay.setActionBar({ rawtext: [{ translate: "morph.shulker.invalid_location" }]}); };
        };
      });
    };
  };
  onBeforeDurabilityDamage(event) {
    event.durabilityDamage = 0;
  };
};

world.afterEvents.entityDie.subscribe(data => {
  const { damageSource, deadEntity } = data;
  if (damageSource.damagingEntity && damageSource.damagingEntity.typeId == "minecraft:player" && damageSource.damagingEntity.getComponent("minecraft:inventory").container.hasItem("morph:morphing_bracelet")) {
    if (!morphs.some(morph => morph.entity == deadEntity.typeId)) {
      if (damageSource.damagingEntity.getDynamicProperty("unavailableMobsCollected") == undefined) {
        damageSource.damagingEntity.setDynamicProperty("unavailableMobsCollected", "[]");
      };
      if (!JSON.parse(damageSource.damagingEntity.getDynamicProperty("unavailableMobsCollected")).includes(deadEntity.typeId)) {
        damageSource.damagingEntity.setDynamicProperty("unavailableMobsCollected", JSON.stringify(JSON.parse(damageSource.damagingEntity.getDynamicProperty("unavailableMobsCollected")).concat(deadEntity.typeId)));
        if (deadEntity.typeId.split(":")[0] == "minecraft") {
          damageSource.damagingEntity.sendMessage({ rawtext: [{ text: "§7" }, { translate: "morph.unavailable.vanilla" }, { text: "§r" }]});
        } else {
          damageSource.damagingEntity.sendMessage({ rawtext: [{ text: "§7" }, { translate: "morph.unavailable.modded" }, { text: "§r" }]});
        };
      };
    } else {
      const morph = morphs[morphs.findIndex(function(i) { return i.entity == deadEntity.typeId && (i.conditions == undefined ? true : eval(i.conditions.replace(new RegExp("\\bthis\\b","g"), "deadEntity")))})].id;
      for (let slot = 0; slot < damageSource.damagingEntity.getComponent("minecraft:inventory").container.size; slot++) {
        const itemStack = damageSource.damagingEntity.getComponent("minecraft:inventory").container.getItem(slot);
        if (addMorph(itemStack, morph)) {
          damageSource.damagingEntity.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
          const direction = { x: damageSource.damagingEntity.location.x - deadEntity.getHeadLocation().x, y: (damageSource.damagingEntity.location.y + 0.5) - deadEntity.getHeadLocation().y, z: damageSource.damagingEntity.location.z - deadEntity.getHeadLocation().z };
          const variables = new MolangVariableMap(); variables.setVector3("variable.direction", direction); variables.setFloat("variable.speed", Math.sqrt(Math.pow(direction.x, 2) + Math.pow(direction.y, 2) + Math.pow(direction.z, 2)) * 2);
          deadEntity.dimension.spawnParticle("morph:soul_orb", deadEntity.getHeadLocation(), variables);
          damageSource.damagingEntity.dimension.playSound("beacon.activate", damageSource.damagingEntity.location);
          break;
        };
      };
    };
  };
});

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    for (let slot = 0; slot < player.getComponent("minecraft:inventory").container.size; slot++) {
      const itemStack = player.getComponent("minecraft:inventory").container.getItem(slot);
      if (itemStack != undefined && itemStack.typeId == "morph:morphing_bracelet" && itemStack.getDynamicProperty("morphs") == undefined) {
        itemStack.setDynamicProperty("morphs", JSON.stringify([ "morph:player" ]));
        player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
      };
    };
    const morph = player.getMorph().id;
    if (currentMorphs[player.id] == undefined) { currentMorphs[player.id] = morph; };
    if (currentMorphs[player.id] != morph) {
      if (player.hasTag("morph:disable_addMorph()")) {
        player.removeTag("morph:disable_addMorph()");
      } else {
        for (let slot = 0; slot < player.getComponent("minecraft:inventory").container.size; slot++) {
          const itemStack = player.getComponent("minecraft:inventory").container.getItem(slot);
          if (addMorph(itemStack, currentMorphs[player.id])) {
            player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
            break;
          };
        };
      };
      currentMorphs[player.id] = morph;
    };
  };
});

function addMorph(itemStack, morph) {
  if (itemStack != undefined && itemStack.typeId == "morph:morphing_bracelet" && morph != "morph:player" && !JSON.parse(itemStack.getDynamicProperty("morphs")).includes(morph)) {
    itemStack.setDynamicProperty("morphs", JSON.stringify(JSON.parse(itemStack.getDynamicProperty("morphs")).concat(morph)));
    return true;
  };
  return false;
};

Player.prototype.getMorph = function() {
  for (const morph of morphs) {
    if (this.getProperty("morph:entity") == morph.type && (morph.conditions == undefined ? true : eval(morph.conditions))) {
      return morph;
    };
  };
};

function removeMorph(itemStack, morph) {
  if (itemStack != undefined && itemStack.typeId == "morph:morphing_bracelet" && morph != "morph:player" && JSON.parse(itemStack.getDynamicProperty("morphs")).includes(morph)) {
    itemStack.setDynamicProperty("morphs", JSON.stringify(JSON.parse(itemStack.getDynamicProperty("morphs")).filter(item => item != morph)));
    return true;
  };
  return false;
};

function getComponentByEntity(entity, components) {
  for (const component of components) {
    if (entity.typeId == component.entity) {
      if (component.component) {
        return entity.getComponent(component.component.split(".")[0]) != undefined ? eval(`entity.getComponent("${component.component.split(".")[0]}")${component.component.slice(component.component.split(".")[0].length)}`) : component.default;
      } else if (component.property) {
        return entity.getProperty(component.property) != undefined ? entity.getProperty(component.property) : component.default;
      };
    };
  };
  return undefined;
};

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const itemStack = player.getComponent("minecraft:inventory").container.getItem(player.selectedSlotIndex);
    if (itemStack != undefined && itemStack.typeId == "morph:morphing_bracelet" && (player.location.y >= player.dimension.heightRange.min && player.location.y <= player.dimension.heightRange.max) && [ "minecraft:soul_sand", "minecraft:soul_soil" ].includes(player.dimension.getBlock({ x: player.location.x, y: player.location.y - 0.01, z: player.location.z }).typeId)) {
      if (itemStack.getComponent("minecraft:durability").damage > 0) {
        const variables = new MolangVariableMap(); variables.setVector3("variable.direction", { x: 0, y: 1, z: 0 });
        player.dimension.spawnParticle("minecraft:soul_particle", { x: Math.floor(player.location.x) + Math.random(), y: player.location.y, z: Math.floor(player.location.z) + Math.random() }, variables);
        player.dimension.playSound("bloom.sculk_catalyst", player.location);
      };
    };
  };
}, 2);

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const itemStack = player.getComponent("minecraft:inventory").container.getItem(player.selectedSlotIndex);
    if (itemStack != undefined && itemStack.typeId == "morph:morphing_bracelet" && (player.location.y >= player.dimension.heightRange.min && player.location.y <= player.dimension.heightRange.max) && [ "minecraft:soul_sand", "minecraft:soul_soil" ].includes(player.dimension.getBlock({ x: player.location.x, y: player.location.y - 0.01, z: player.location.z }).typeId)) {
      if (itemStack.getComponent("minecraft:durability").damage > 0) {
        itemStack.getComponent("minecraft:durability").damage = itemStack.getComponent("minecraft:durability").damage - 1;
        player.getComponent("minecraft:inventory").container.setItem(player.selectedSlotIndex, itemStack);
      };
    };
  };
}, 20);