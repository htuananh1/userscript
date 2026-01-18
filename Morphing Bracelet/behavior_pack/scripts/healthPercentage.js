import { world, system } from "@minecraft/server";

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.getGameMode() != "creative" && (player.getProperty("morph:entity") == 37 || player.getProperty("morph:entity") == 69 || player.getProperty("morph:entity") == 77)) {
      player.onScreenDisplay.setActionBar(` ${((Math.ceil(player.getComponent("minecraft:health").currentValue) / Math.ceil(player.getComponent("minecraft:health").defaultValue)) * 100).toFixed(1)}%`);
    };
  };
});