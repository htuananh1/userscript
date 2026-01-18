import { world, EntityDamageCause } from "@minecraft/server";

world.afterEvents.entityHurt.subscribe(data => {
  const { damageSource, hurtEntity } = data;
  if (damageSource.damagingEntity && damageSource.damagingEntity.typeId == "minecraft:player" && damageSource.cause == EntityDamageCause.entityAttack) {
    if (damageSource.damagingEntity.getProperty("morph:entity") == 15) { hurtEntity.addEffect("wither", 10 * 20); };
    if (damageSource.damagingEntity.getProperty("morph:entity") == 19) { hurtEntity.addEffect("hunger", 30 * 20); };
    if (damageSource.damagingEntity.getProperty("morph:entity") == 23) { hurtEntity.applyImpulse({ x: 0, y: hurtEntity.getVelocity().y, z: 0 }); };
    if (damageSource.damagingEntity.getProperty("morph:entity") == 33) { hurtEntity.addEffect("poison", 7 * 20); };
    if (damageSource.damagingEntity.getProperty("morph:entity") == 40 && damageSource.damagingEntity.getComponent("minecraft:mark_variant").value != 1) {
      hurtEntity.addEffect("poison", 10 * 20);
      if (damageSource.damagingEntity.getGameMode() != "creative") {
        damageSource.damagingEntity.triggerEvent("morph:bee_countdown_to_perish");
        damageSource.damagingEntity.dimension.playSound("mob.bee.sting", damageSource.damagingEntity.location);
      };
    };
  };
});