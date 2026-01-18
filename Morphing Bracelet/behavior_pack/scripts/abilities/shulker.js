import { world, system } from "@minecraft/server";

const shulker = [
  "morph:shulker",
  "morph:white_shulker",
  "morph:orange_shulker",
  "morph:magenta_shulker",
  "morph:light_blue_shulker",
  "morph:yellow_shulker",
  "morph:lime_shulker",
  "morph:pink_shulker",
  "morph:gray_shulker",
  "morph:light_gray_shulker",
  "morph:cyan_shulker",
  "morph:purple_shulker",
  "morph:blue_shulker",
  "morph:brown_shulker",
  "morph:green_shulker",
  "morph:red_shulker",
  "morph:black_shulker"
];

world.afterEvents.dataDrivenEntityTrigger.subscribe(data => {
  const { entity, eventId } = data;
  if (entity.typeId == "minecraft:player" && shulker.includes(eventId)) {
    entity.teleport({ x: Math.floor(entity.location.x) + 0.5, y: Math.floor(entity.location.y), z: Math.floor(entity.location.z) + 0.5 });
  };
});

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.getProperty("morph:entity") == 67 && !(player.isOnGround && player.dimension.getBlock(player.location).below().isSolid && !player.dimension.getBlock(player.location).isSolid && Math.abs(player.location.x % 1) == 0.5 && player.location.y % 1 == 0 && Math.abs(player.location.z % 1) == 0.5)) {
      player.triggerEvent("morph:player");
    };
  };
});

export function isShulkerValidLocation(player, morph) {
  if (shulker.includes(morph)) {
    return player.isOnGround && player.dimension.getBlock(player.location).below().isSolid && !player.dimension.getBlock(player.location).isSolid && player.location.y % 1 == 0;
  } else { return true; };
};