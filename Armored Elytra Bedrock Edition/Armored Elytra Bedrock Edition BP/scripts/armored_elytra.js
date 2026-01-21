import { world, system, ItemStack, ItemTypes, EquipmentSlot, EnchantmentTypes } from "@minecraft/server";

// --- Configuration ---
const SWAP_TAG = "elytraSwapCandidate";
const ELYTRA_ACTIVE_TAG = "elytraSwapActive";
const DURABILITY_PROPERTY = "ae_savedDurability";
const CUSTOM_TYPE_PROPERTY = "ae_savedType";
const ENCHANTMENTS_PROPERTY = "ae_savedEnchantments";
const CUSTOM_NAME_PROPERTY = "ae_savedName";
const ELYTRA_DAMAGE_PROPERTY = "ae_elytraDamageStart";

const CUSTOM_CHESTPLATES = [
  "ae:iron_armored_elytra",
  "ae:diamond_armored_elytra_chestplate",
  "ae:gold_armored_elytra_chestplate",
  "ae:netherite_armored_elytra_chestplate",
  "ae:chainmail_armored_elytra_chestplate"
];

// --- Armor Resistance Mapping (Resistance Amplifier: 0 = Level 1, 1 = Level 2) ---
const ARMOR_RESISTANCE_MAP = {
  "ae:iron_armored_elytra": 0,                    // Iron: Resistance I
  "ae:chainmail_armored_elytra_chestplate": 0,    // Chain: Resistance I
  "ae:gold_armored_elytra_chestplate": 0,         // Gold: Resistance I
  "ae:diamond_armored_elytra_chestplate": 1,      // Diamond: Resistance II
  "ae:netherite_armored_elytra_chestplate": 1     // Netherite: Resistance II
};

// --- Durability Conversion Rates ---
const DURABILITY_CONVERSION_RATES = {
  "ae:iron_armored_elytra": 0.15,
  "ae:gold_armored_elytra_chestplate": 0.20,
  "ae:chainmail_armored_elytra_chestplate": 0.12,
  "ae:diamond_armored_elytra_chestplate": 0.08,
  "ae:netherite_armored_elytra_chestplate": 0.05
};

// --- Enchantment Helper Functions ---
function extractEnchantments(itemStack) {
  if (!itemStack) {
    return [];
  }
  const enchantable = itemStack.getComponent("minecraft:enchantable");
  if (!enchantable) {
    return [];
  }
  try {
    const enchantmentList = enchantable.getEnchantments();
    return enchantmentList.map(e => ({
      id: e.type.id,
      level: e.level
    }));
  } catch (err) {
    return [];
  }
}

function applyEnchantments(itemStack, enchantData) {
  if (!itemStack || !enchantData || !Array.isArray(enchantData)) {
    return;
  }
  const enchantable = itemStack.getComponent("minecraft:enchantable");
  if (!enchantable) {
    return;
  }
  for (const enchant of enchantData) {
    try {
      const enchantmentType = EnchantmentTypes.get(enchant.id);
      if (!enchantmentType) continue;
      const enchantmentInstance = {
        type: enchantmentType,
        level: enchant.level
      };
      if (enchantable.canAddEnchantment(enchantmentInstance)) {
        enchantable.addEnchantment(enchantmentInstance);
      }
    } catch (e) {}
  }
}

function clearSavedData(player) {
  player.removeTag(SWAP_TAG);
  player.removeTag(ELYTRA_ACTIVE_TAG);
  player.setDynamicProperty(DURABILITY_PROPERTY, undefined);
  player.setDynamicProperty(CUSTOM_TYPE_PROPERTY, undefined);
  player.setDynamicProperty(ENCHANTMENTS_PROPERTY, undefined);
  player.setDynamicProperty(CUSTOM_NAME_PROPERTY, undefined);
  player.setDynamicProperty(ELYTRA_DAMAGE_PROPERTY, undefined);
}

// --- Main Loop ---
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      const equipment = player.getComponent("minecraft:equippable");
      if (!equipment) continue;

      const chestSlot = equipment.getEquipmentSlot(EquipmentSlot.Chest);
      const currentItem = chestSlot.getItem();

      // Check if we need to apply Armor Resistance (when Elytra is active)
      if (player.hasTag(ELYTRA_ACTIVE_TAG)) {
        const savedType = player.getDynamicProperty(CUSTOM_TYPE_PROPERTY);
        if (savedType && ARMOR_RESISTANCE_MAP[savedType] !== undefined) {
           // Apply Resistance for 5 ticks (0.25s) to ensure coverage between ticks
           // Amplifier 0 = Res I (+20%), Amplifier 1 = Res II (+40%)
           player.addEffect("resistance", 5, { amplifier: ARMOR_RESISTANCE_MAP[savedType], showParticles: false });
        }
      }

      // Tag cleanup if player removed custom armor
      if (player.hasTag(SWAP_TAG)) {
        if (!currentItem || (!CUSTOM_CHESTPLATES.includes(currentItem.typeId) && currentItem.typeId !== "minecraft:elytra")) {
          clearSavedData(player);
          continue;
        }
      } else {
        if (currentItem && CUSTOM_CHESTPLATES.includes(currentItem.typeId)) {
          player.addTag(SWAP_TAG);
        } else continue;
      }

      if (!player.hasTag(SWAP_TAG)) continue;

      const belowLocation = {
        x: Math.floor(player.location.x),
        y: Math.floor(player.location.y) - 1,
        z: Math.floor(player.location.z),
      };
      const blockBelow = player.dimension.getBlock(belowLocation);

      // --- Swap to Elytra ---
      if (CUSTOM_CHESTPLATES.includes(currentItem?.typeId) && blockBelow?.isAir && !player.hasTag(ELYTRA_ACTIVE_TAG)) {

        const durabilityComponent = currentItem.getComponent("minecraft:durability");
        const savedDamage = durabilityComponent ? durabilityComponent.damage : 0;
        player.setDynamicProperty(DURABILITY_PROPERTY, savedDamage);
        player.setDynamicProperty(CUSTOM_TYPE_PROPERTY, currentItem.typeId);
        const enchantments = extractEnchantments(currentItem);
        const enchantJson = JSON.stringify(enchantments);
        player.setDynamicProperty(ENCHANTMENTS_PROPERTY, enchantJson);
        if (currentItem.nameTag) {
          player.setDynamicProperty(CUSTOM_NAME_PROPERTY, currentItem.nameTag);
        }

        const elytraItem = new ItemStack(ItemTypes.get("minecraft:elytra"), 1);
        elytraItem.lockMode = "slot";
        elytraItem.keepOnDeath = true;
        applyEnchantments(elytraItem, enchantments);

        const elytraDurability = elytraItem.getComponent("minecraft:durability");
        if (elytraDurability) {
          elytraDurability.damage = 0;
          player.setDynamicProperty(ELYTRA_DAMAGE_PROPERTY, 0);
        }

        chestSlot.setItem(elytraItem);
        player.addTag(ELYTRA_ACTIVE_TAG);
      }

      // --- Swap back to Custom Chestplate ---
      else if (currentItem?.typeId === "minecraft:elytra" && !blockBelow?.isAir && player.hasTag(ELYTRA_ACTIVE_TAG)) {

        const savedType = player.getDynamicProperty(CUSTOM_TYPE_PROPERTY);
        const savedDamage = player.getDynamicProperty(DURABILITY_PROPERTY);
        const savedEnchantmentsJson = player.getDynamicProperty(ENCHANTMENTS_PROPERTY);
        const savedName = player.getDynamicProperty(CUSTOM_NAME_PROPERTY);
        const elytraStartDamage = player.getDynamicProperty(ELYTRA_DAMAGE_PROPERTY) || 0;

        if (typeof savedType === "string" && CUSTOM_CHESTPLATES.includes(savedType)) {
          const restoredItem = new ItemStack(ItemTypes.get(savedType), 1);
          const elytraDurability = currentItem.getComponent("minecraft:durability");
          const elytraCurrentDamage = elytraDurability ? elytraDurability.damage : 0;
          const elytraDamageTaken = elytraCurrentDamage - elytraStartDamage;
          const conversionRate = DURABILITY_CONVERSION_RATES[savedType] || 0.1;
          const scaledDamage = Math.floor(elytraDamageTaken * conversionRate);

          const durabilityComponent = restoredItem.getComponent("minecraft:durability");
          if (durabilityComponent && typeof savedDamage === "number" && savedDamage >= 0) {
            const newDamage = Math.min(savedDamage + scaledDamage, durabilityComponent.maxDurability);
            durabilityComponent.damage = newDamage;
          }

          if (typeof savedEnchantmentsJson === "string" && savedEnchantmentsJson.length > 0) {
            try {
              const enchantments = JSON.parse(savedEnchantmentsJson);
              applyEnchantments(restoredItem, enchantments);
            } catch (e) {}
          }

          if (typeof savedName === "string") {
            restoredItem.nameTag = savedName;
          }

          restoredItem.lockMode = "none";
          restoredItem.keepOnDeath = false;
          chestSlot.setItem(restoredItem);
        }

        clearSavedData(player);
      }
    } catch (error) {
       // Suppress errors to avoid console spam, or log for debug if strictly needed
    }
  }
}, 1);

// --- Chunk Loader System ---
// Updates a ticking area around the player every 3 seconds to ensure chunks are loaded (3-4 chunk radius)
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      // Use a safe unique name for the ticking area based on player name
      const safeName = "al_" + player.name.replace(/[^a-zA-Z0-9]/g, "");

      // Attempt to remove the old ticking area and add a new one at the current position
      player.runCommandAsync(`tickingarea remove "${safeName}"`)
        .then(() => {
           // Re-add circle with radius 3 chunks
           player.runCommandAsync(`tickingarea add circle ~ ~ ~ 3 "${safeName}"`);
        })
        .catch((e) => {
           // If remove failed (e.g. first run), try to add directly
           player.runCommandAsync(`tickingarea add circle ~ ~ ~ 3 "${safeName}"`).catch(() => {});
        });
    } catch (e) {}
  }
}, 60);

// --- Cleanup Ticking Area on Player Leave ---
world.afterEvents.playerLeave.subscribe((event) => {
  const safeName = "al_" + event.playerName.replace(/[^a-zA-Z0-9]/g, "");
  const dimensions = ["overworld", "nether", "the_end"];
  for (const dimId of dimensions) {
    try {
      const dim = world.getDimension(dimId);
      dim.runCommandAsync(`tickingarea remove "${safeName}"`).catch(() => {});
    } catch (e) {}
  }
});
