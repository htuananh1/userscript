import "abilityIndicator.js";
import "customComponents.js";
import "eventManager.js";
import "foodEaten.js";
import "healthPercentage.js";
import "isSolid.js";
import "itemAbilities.js";
import "mobSounds.js";
import "morphingBracelet.js";
import "onHit.js";
import "updater.js";

import "abilities/creeper.js";
import "abilities/enderman.js";
import "abilities/fox.js";
// import "abilities/bee.js";
import "abilities/frog.js";
import "abilities/shulker.js";
import "abilities/enderDragon.js";
import "abilities/breeze.js";

import { world, system, Container } from "@minecraft/server";

if (!world.getDynamicProperty("initialized")) {
  world.gameRules.showTags = false;
  world.setDynamicProperty("initialized", true);
};

// system.beforeEvents.watchdogTerminate.subscribe(data => { data.cancel = true; });

const holidayCreatorFeatures = system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try { player.triggerEvent("morph:holiday_creator_features"); }
    catch { system.clearRun(holidayCreatorFeatures); };
  };
});

Container.prototype.hasItem = function(identifier) {
  for (let slot = 0; slot < this.size; slot++) {
    const itemStack = this.getItem(slot);
    if (itemStack != undefined && itemStack.typeId == identifier) {
      return true;
    };
  };
  return false;
};

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.getProperty("morph:entity") == -1) { player.triggerEvent("morph:player.raw"); };
    if (player.getProperty("morph:entity") != 0) {
      if (player.nameTag != "") { player.nameTag = ""; };
    } else {
      if (player.nameTag != player.name) { player.nameTag = player.name; };
    };
  };
});

world.afterEvents.playerGameModeChange.subscribe(data => {
  const { player, toGameMode } = data;
  switch (toGameMode) {
    case "adventure":
      player.runCommand("ability @s mayfly false");
      break;
    case "creative":
      player.runCommand("ability @s mayfly true");
      player.getComponent("minecraft:health").resetToDefaultValue();
      break;
    case "spectator":
      player.runCommand("ability @s mayfly true");
      player.triggerEvent("morph:player.raw");
      break;
    case "survival":
      player.runCommand("ability @s mayfly false");
      break;
  };
});