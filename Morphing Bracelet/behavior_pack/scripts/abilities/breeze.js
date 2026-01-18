import { world, system } from "@minecraft/server";

const duration = {};

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (duration[player.id] == undefined) { duration[player.id] = 0; };
    if (player.getProperty("morph:entity") == 80 && player.isSneaking && player.isOnGround) {
      if (duration[player.id] == 10) {
        player.applyKnockback(player.getViewDirection().x, player.getViewDirection().z, 6, 1);
        player.dimension.playSound("mob.breeze.jump", player.location);
      };
      duration[player.id]++;
    } else { duration[player.id] = 0; };
  };
});