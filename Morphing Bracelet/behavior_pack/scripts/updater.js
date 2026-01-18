import { world, system } from "@minecraft/server";

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    for (let slot = 0; slot < player.getComponent("minecraft:inventory").container.size; slot++) {
      const itemStack = player.getComponent("minecraft:inventory").container.getItem(slot);
      if (itemStack) {
        if (itemStack.getLore()[0] == "Morph Addon") {
          itemStack.setLore(["Morphing Bracelet"]);
          player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
        };
        if (itemStack.typeId == "morph:morphing_bracelet" && itemStack.getLore()[0] && itemStack.getLore()[0].startsWith("§r§7ID:")) {
          itemStack.setDynamicProperty("morphs", world.getDynamicProperty("morphing_bracelet." + itemStack.getLore()[0].slice(8, -2)));
          world.setDynamicProperty("morphing_bracelet." + itemStack.getLore()[0].slice(8, -2), undefined);
          itemStack.setLore(undefined);
          player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
        };
        if (itemStack.typeId == "morph:scroll_of_souls.filled" && itemStack.getDynamicProperty("morph") == undefined) {
          itemStack.setDynamicProperty("morph", itemStack.getLore()[0].slice(4, -2));
          player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
        };
      };
    };
  };
});