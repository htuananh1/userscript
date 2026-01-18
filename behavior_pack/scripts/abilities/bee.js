import { world, system } from "@minecraft/server";

const flowers = [
  "minecraft:poppy",
  "minecraft:blue_orchid",
  "minecraft:allium",
  "minecraft:azure_bluet",
  "minecraft:red_tulip",
  "minecraft:orange_tulip",
  "minecraft:white_tulip",
  "minecraft:pink_tulip",
  "minecraft:oxeye_daisy",
  "minecraft:cornflower",
  "minecraft:lily_of_the_valley",
  "minecraft:yellow_flower",
  "minecraft:wither_rose",
  "minecraft:sunflower",
  "minecraft:lilac",
  "minecraft:rose_bush",
  "minecraft:peony",
  "minecraft:flowering_azalea",
  "minecraft:azalea_leaves_flowered",
  "minecraft:mangrove_propagule",
  "minecraft:pitcher_plant",
  "minecraft:torchflower",
  "minecraft:cherry_leaves",
  "minecraft:pink_petals"
];

const duration = {};

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (duration[player.id] == undefined) { duration[player.id] = 0; };
    if (player.getProperty("morph:entity") == 40 && player.location.y >= player.dimension.heightRange.min && player.location.y <= player.dimension.heightRange.max) {
      const block = player.dimension.getBlock(player.location);
      if (!player.getProperty("morph:bee_has_nectar") && player.isSneaking && flowers.includes(block.typeId)) {
        if (duration[player.id] >= 1) {
          player.triggerEvent("morph:bee_has_nectar");
          player.dimension.playSound("block.beehive.drip", player.location);
          player.addEffect("saturation", 1, { amplifier: 1, showParticles: false });
        } else { duration[player.id] += 1/200; };
      } else if (duration[player.id] > 0) { duration[player.id] = 0; };
    } else if (duration[player.id] > 0) { duration[player.id] = 0; };
  };
});

world.afterEvents.playerInteractWithBlock.subscribe(data => {
  const { block, player } = data;
  if (!player.hasTag("morph:bee.stored_nectar") && player.getProperty("morph:entity") == 40 && player.getProperty("morph:bee_has_nectar") && (block.typeId == "minecraft:bee_nest" || block.typeId == "minecraft:beehive")) {
    player.addTag("morph:bee.stored_nectar");
    player.triggerEvent("morph:bee_no_nectar");
    block.setPermutation(block.permutation.withState("honey_level", block.permutation.getState("honey_level") < 5 ? block.permutation.getState("honey_level") + 1 : block.permutation.getState("honey_level") + 0));
    block.dimension.playSound("block.beehive.enter", block.location);
    const removeTag = () => {
      if (player.getProperty("morph:bee_has_nectar")) { system.run(removeTag); }
      else { player.removeTag("morph:bee.stored_nectar"); };
    };
    system.run(removeTag);
  };
});

export function getFlowers() {
  return flowers;
};