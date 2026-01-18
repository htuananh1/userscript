import { world, system, ItemStack, EntityDamageCause } from "@minecraft/server";
import { MorphingBracelet } from "morphingBracelet.js";

world.beforeEvents.worldInitialize.subscribe(data => {
  const { itemComponentRegistry } = data;
  itemComponentRegistry.registerCustomComponent("morph:morphing_bracelet", new MorphingBracelet());
  itemComponentRegistry.registerCustomComponent("morph:scroll_of_souls", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:scroll_of_souls") {
        if (source.getProperty("morph:entity") == 0) {
          source.sendMessage({ rawtext: [{ text: "§7" }, { translate: "item.morph:scroll_of_souls.invalid" }, { text: "§r" }]});
        } else {
          const scroll = new ItemStack("morph:scroll_of_souls.filled");
          scroll.setDynamicProperty("morph", source.getMorph().id);
          scroll.setLore([`§r§7${scroll.getDynamicProperty("morph")}§r`]);
          source.getComponent("minecraft:inventory").container.setItem(source.selectedSlotIndex, scroll);
          source.addTag("morph:disable_addMorph()");
          source.triggerEvent("morph:player");
          source.addTag("morph:scroll_of_souls.cooldown");
          system.runTimeout(() => {
            source.removeTag("morph:scroll_of_souls.cooldown");
          }, 20);
        };
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:scroll_of_souls.filled", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:scroll_of_souls.filled" && !source.hasTag("morph:scroll_of_souls.cooldown") && itemStack.getDynamicProperty("morph") != source.getMorph().id) {
        source.triggerEvent(itemStack.getDynamicProperty("morph"));
        source.getComponent("minecraft:inventory").container.setItem(source.selectedSlotIndex, undefined);
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:teleportation", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:teleportation" && source.getBlockFromViewDirection()) {
        const newLocation = { x: source.getBlockFromViewDirection().block.location.x + source.getBlockFromViewDirection().faceLocation.x, y: source.getBlockFromViewDirection().block.location.y + source.getBlockFromViewDirection().faceLocation.y, z: source.getBlockFromViewDirection().block.location.z + source.getBlockFromViewDirection().faceLocation.z };
        if (Math.sqrt(Math.pow(newLocation.x - source.location.x, 2) + Math.pow(newLocation.y - source.location.y, 2) + Math.pow(newLocation.z - source.location.z, 2)) >= 16) {
          source.dimension.playSound("mob.endermen.portal", source.location);
        };
        source.teleport(newLocation);
        system.runTimeout(() => { source.dimension.playSound("mob.endermen.portal", source.location); }, 1);
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:snowball", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:snowball") {
        const projectile = source.dimension.spawnEntity("minecraft:snowball", source.getHeadLocation()).getComponent("minecraft:projectile");
        projectile.owner = source;
        projectile.shoot({ x: source.getViewDirection().x * 1.5, y: source.getViewDirection().y * 1.5, z: source.getViewDirection().z * 1.5 });
        source.dimension.playSound("mob.snowgolem.shoot", source.location, { pitch: (Math.random() * 0.17) + 0.33, volume: 1.0 });
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:small_fireball", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:small_fireball") {
        const projectile = source.dimension.spawnEntity("minecraft:small_fireball", { x: source.getHeadLocation().x, y: source.getHeadLocation().y - 0.5, z: source.getHeadLocation().z }).getComponent("minecraft:projectile");
        projectile.owner = source;
        projectile.shoot({ x: source.getViewDirection().x * 1.3, y: source.getViewDirection().y * 1.3, z: source.getViewDirection().z * 1.3 });
        source.dimension.playSound("mob.blaze.shoot", source.location, { pitch: (Math.random() * 0.4) + 0.8, volume: 1.0 });
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:llama_spit", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:llama_spit") {
        const projectile = source.dimension.spawnEntity("minecraft:llama_spit", source.getHeadLocation()).getComponent("minecraft:projectile");
        projectile.owner = source;
        projectile.shoot({ x: source.getViewDirection().x * 1.5, y: source.getViewDirection().y * 1.5, z: source.getViewDirection().z * 1.5 });
        source.dimension.playSound("mob.llama.spit", source.location, { pitch: (Math.random() * 0.4) + 0.8, volume: 0.8 });
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:wither_skull", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:wither_skull") {
        const projectile = source.dimension.spawnEntity("minecraft:wither_skull", source.getHeadLocation()).getComponent("minecraft:projectile");
        projectile.owner = source;
        projectile.shoot({ x: source.getViewDirection().x * 1.2, y: source.getViewDirection().y * 1.2, z: source.getViewDirection().z * 1.2 });
        source.dimension.playSound("random.bow", source.location, { pitch: (Math.random() * 0.42) + 0.83, volume: 1.0 });
        source.dimension.playSound("mob.wither.shoot", source.location, { pitch: 1.0, volume: 3.0 });
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:blue_wither_skull", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:blue_wither_skull") {
        const projectile = source.dimension.spawnEntity("minecraft:wither_skull_dangerous", source.getHeadLocation()).getComponent("minecraft:projectile");
        projectile.owner = source;
        projectile.shoot({ x: source.getViewDirection().x * 0.6, y: source.getViewDirection().y * 0.6, z: source.getViewDirection().z * 0.6 });
        source.dimension.playSound("random.bow", source.location, { pitch: (Math.random() * 0.42) + 0.83, volume: 1.0 });
        source.dimension.playSound("mob.wither.shoot", source.location, { pitch: 1.0, volume: 3.0 });
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:fireball", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:fireball" && source.getProperty("morph:entity") == 49) {
        source.triggerEvent("morph:ghast_start_shooting");
        source.dimension.playSound("mob.ghast.charge", source.location, { pitch: (Math.random() * 0.4) + 0.8, volume: 5.0 });
        system.runTimeout(() => {
          if (source.getProperty("morph:entity") == 49) {
            source.triggerEvent("morph:ghast_stop_shooting");
            const projectile = source.dimension.spawnEntity("minecraft:fireball", source.getHeadLocation()).getComponent("minecraft:projectile");
            projectile.owner = source;
            projectile.shoot({ x: source.getViewDirection().x * 1.6, y: source.getViewDirection().y * 1.6, z: source.getViewDirection().z * 1.6 });
            source.dimension.playSound("mob.ghast.fireball", source.location, { pitch: (Math.random() * 0.4) + 0.8, volume: 0.7 });
          };
        }, 20);
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:evoker_fangs", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:evoker_fangs") {
        source.triggerEvent("morph:evoker_start_casting");
        source.dimension.playSound("mob.evocation_illager.cast_spell", source.location, { pitch: (Math.random() * 0.4) + 0.8, volume: 1.0 });
        system.runTimeout(() => {
          source.triggerEvent("morph:evoker_stop_casting");
          let y_level = Math.floor(source.location.y);
          for (let i = 0; i < 16; i++) {
            const fangLocation = { x: Math.floor(source.location.x + (i + 1.5) * Math.cos((source.getRotation().y + 90) * (Math.PI / 180))), y: y_level, z: Math.floor(source.location.z + (i + 1.5) * Math.sin((source.getRotation().y + 90) * (Math.PI / 180))) };
            if (source.dimension.getBlock(fangLocation).typeId != "minecraft:air" && source.dimension.getBlock(fangLocation).typeId != "minecraft:water" && source.dimension.getBlock(fangLocation).typeId != "minecraft:lava") {
              if (source.dimension.getBlock(fangLocation).above(1).typeId != "minecraft:air" && source.dimension.getBlock(fangLocation).above(1).typeId != "minecraft:water" && source.dimension.getBlock(fangLocation).above(1).typeId != "minecraft:lava") {
                if (source.dimension.getBlock(fangLocation).above(2).typeId != "minecraft:air" && source.dimension.getBlock(fangLocation).above(2).typeId != "minecraft:water" && source.dimension.getBlock(fangLocation).above(2).typeId != "minecraft:lava") { break; }
                else { y_level = y_level + 2 };
              } else { y_level = y_level + 1 };
            } else if (source.dimension.getBlock(fangLocation).below(1).typeId == "minecraft:air" || source.dimension.getBlock(fangLocation).below(1).typeId == "minecraft:water" || source.dimension.getBlock(fangLocation).below(1).typeId == "minecraft:lava") {
              if (source.dimension.getBlock(fangLocation).below(2).typeId == "minecraft:air" || source.dimension.getBlock(fangLocation).below(2).typeId == "minecraft:water" || source.dimension.getBlock(fangLocation).below(2).typeId == "minecraft:lava") {
                if (source.dimension.getBlock(fangLocation).below(3).typeId == "minecraft:air" || source.dimension.getBlock(fangLocation).below(3).typeId == "minecraft:water" || source.dimension.getBlock(fangLocation).below(3).typeId == "minecraft:lava") {
                  if (source.dimension.getBlock(fangLocation).below(4).typeId == "minecraft:air" || source.dimension.getBlock(fangLocation).below(4).typeId == "minecraft:water" || source.dimension.getBlock(fangLocation).below(4).typeId == "minecraft:lava") {
                    if (source.dimension.getBlock(fangLocation).below(5).typeId == "minecraft:air" || source.dimension.getBlock(fangLocation).below(5).typeId == "minecraft:water" || source.dimension.getBlock(fangLocation).below(5).typeId == "minecraft:lava") { break; }
                    else { y_level = y_level - 4 };
                  } else { y_level = y_level - 3 };
                } else { y_level = y_level - 2 };
              } else { y_level = y_level - 1 };
            };
            fangLocation.y = y_level;
            system.runTimeout(() => {
              source.runCommand(`summon minecraft:evocation_fang ${fangLocation.x} ${fangLocation.y} ${fangLocation.z}`);
            }, i);
          };
        }, 40);
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:guardian_curse", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:guardian_curse") {
        source.dimension.getPlayers({ location: source.location, minDistance: 0.01, maxDistance: 50, excludeGameModes: [ "creative" ] }).forEach(player => {
          player.addEffect("mining_fatigue", 6000, { amplifier: 2 });
          player.playSound("mob.elderguardian.curse");
        });
        source.playSound("mob.elderguardian.curse");
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:sonic_boom", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:sonic_boom" && source.getProperty("morph:entity") == 69) {
        source.playAnimation("animation.warden.sonic_boom", { stopExpression: "query.property('morph:entity') != 69" });
        source.dimension.playSound("mob.warden.sonic_charge", source.location, { volume: 3.0 });
        system.runTimeout(() => {
          if (source.getProperty("morph:entity") == 69) {
            for (const target of source.getEntitiesFromViewDirection({ ignoreBlockCollision: true, maxDistance: 30 })) {
              try {
                target.entity.applyDamage(10, { cause: EntityDamageCause.sonicBoom, damagingEntity: source });
                target.entity.applyKnockback(source.getViewDirection().x, source.getViewDirection().z, 2.5, 0.5);
              } catch {};
            };
            for (let i = 0; i < 30; i++) { source.dimension.spawnParticle("minecraft:sonic_explosion", { x: source.getHeadLocation().x + (source.getViewDirection().x * (i + 1)), y: source.getHeadLocation().y + (source.getViewDirection().y * (i + 1)), z: source.getHeadLocation().z + (source.getViewDirection().z * (i + 1)) }); };
            source.dimension.playSound("mob.warden.sonic_boom", source.location, { volume: 3.0 });
          };
        }, 34);
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:dragon_fireball", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:dragon_fireball") {
        const projectile = source.dimension.spawnEntity("minecraft:dragon_fireball", source.getHeadLocation()).getComponent("minecraft:projectile");
        projectile.owner = source;
        projectile.shoot({ x: source.getViewDirection().x * 1.3, y: source.getViewDirection().y * 1.3, z: source.getViewDirection().z * 1.3 });
      };
    }
  });
  itemComponentRegistry.registerCustomComponent("morph:wind_charge", {
    onUse: event => {
      const { itemStack, source } = event;
      if (itemStack.typeId == "morph:wind_charge" && source.getProperty("morph:entity") == 80) {
        source.playAnimation("animation.breeze.shoot", { stopExpression: "query.property('morph:entity') != 80" });
        source.dimension.playSound("mob.breeze.inhale", source.location);
        system.runTimeout(() => {
          if (source.getProperty("morph:entity") == 80) {
            try {
              const projectile = source.dimension.spawnEntity("minecraft:wind_charge_projectile", source.getHeadLocation()).getComponent("minecraft:projectile");
              projectile.owner = source;
              projectile.shoot({ x: source.getViewDirection().x * 1.0, y: source.getViewDirection().y * 1.0, z: source.getViewDirection().z * 1.0 });
            } catch {
              source.sendMessage({ rawtext: [{ text: "§7" }, { translate: "morph.breeze.wind_charge_unavailable" }, { text: "§r" }]});
            };
            source.dimension.playSound("mob.breeze.shoot", source.location, { pitch: (Math.random() * 0.2) + 1.0, volume: 1.5 });
          };
        }, 15);
      };
    }
  });
});