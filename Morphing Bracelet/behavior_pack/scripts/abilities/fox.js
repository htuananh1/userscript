import { world, system } from "@minecraft/server";

const duration = {};

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (duration[player.id] == undefined) { duration[player.id] = 0; };
    if (player.getProperty("morph:entity") == 12 && player.isSneaking && player.isOnGround && !player.isInWater) {
      if (duration[player.id] == 40) {
        player.applyKnockback(player.getViewDirection().x, player.getViewDirection().z, 1, 1);
        player.triggerEvent("morph:fox_start_pouncing");
      };
      duration[player.id]++;
    } else { duration[player.id] = 0; };
  };
});