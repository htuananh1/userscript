import { world, system, ItemStack, ItemTypes, EquipmentSlot, EnchantmentTypes } from "@minecraft/server";

// --- Configuration ---
const SWAP_TAG = "elytraSwapCandidate";
const ELYTRA_ACTIVE_TAG = "elytraSwapActive";
const DURABILITY_PROPERTY = "ae_savedDurability";
const CUSTOM_TYPE_PROPERTY = "ae_savedType";
const ENCHANTMENTS_PROPERTY = "ae_savedEnchantments";
const CUSTOM_NAME_PROPERTY = "ae_savedName";
const ELYTRA_DAMAGE_PROPERTY = "ae_elytraDamageStart"; // NEW: Track elytra damage at start

const CUSTOM_CHESTPLATES = [
  "ae:iron_armored_elytra",
  "ae:diamond_armored_elytra_chestplate",
  "ae:gold_armored_elytra_chestplate",
  "ae:netherite_armored_elytra_chestplate",
  "ae:chainmail_armored_elytra_chestplate"
];

// --- Durability Conversion Rates ---
// Format: { "item_id": conversionRate }
// conversionRate = how much chestplate damage per 1 elytra damage
// Lower = less punishing (e.g., 0.1 means 10 elytra damage = 1 chestplate damage)
const DURABILITY_CONVERSION_RATES = {
  "ae:iron_armored_elytra": 0.15,                    // Iron: more fragile
  "ae:gold_armored_elytra_chestplate": 0.20,         // Gold: most fragile
  "ae:chainmail_armored_elytra_chestplate": 0.12,    // Chainmail
  "ae:diamond_armored_elytra_chestplate": 0.08,      // Diamond: durable
  "ae:netherite_armored_elytra_chestplate": 0.05     // Netherite: most durable
};

// --- Enchantment Helper Functions ---
function extractEnchantments(itemStack) {
  if (!itemStack) {
    console.warn("[ElytraSwap] extractEnchantments: itemStack is null/undefined");
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
    console.error("[ElytraSwap] Error getting enchantments:", err);
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

      if (!enchantmentType) {
        console.warn(`[ElytraSwap] Unknown enchantment type: ${enchant.id}`);
        continue;
      }

      const enchantmentInstance = {
        type: enchantmentType,
        level: enchant.level
      };

      if (enchantable.canAddEnchantment(enchantmentInstance)) {
        enchantable.addEnchantment(enchantmentInstance);
      }
    } catch (e) {
      console.error(`[ElytraSwap] Error adding enchantment ${enchant.id}:`, e);
    }
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

        // Save durability
        const durabilityComponent = currentItem.getComponent("minecraft:durability");
        const savedDamage = durabilityComponent ? durabilityComponent.damage : 0;
        player.setDynamicProperty(DURABILITY_PROPERTY, savedDamage);

        // Save type
        player.setDynamicProperty(CUSTOM_TYPE_PROPERTY, currentItem.typeId);

        // Save enchantments as JSON string
        const enchantments = extractEnchantments(currentItem);
        const enchantJson = JSON.stringify(enchantments);
        player.setDynamicProperty(ENCHANTMENTS_PROPERTY, enchantJson);

        // Save custom name (if any)
        if (currentItem.nameTag) {
          player.setDynamicProperty(CUSTOM_NAME_PROPERTY, currentItem.nameTag);
        }

        // Create Elytra with compatible enchantments
        const elytraItem = new ItemStack(ItemTypes.get("minecraft:elytra"), 1);
        elytraItem.lockMode = "slot";
        elytraItem.keepOnDeath = true;

        // Apply enchantments that work on elytra
        applyEnchantments(elytraItem, enchantments);

        // Set initial elytra durability to match saved damage (if any previous elytra damage)
        const elytraDurability = elytraItem.getComponent("minecraft:durability");
        if (elytraDurability) {
          elytraDurability.damage = 0; // Start fresh for clean tracking
          // Save starting damage (should be 0)
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

          // Calculate elytra damage taken during flight
          const elytraDurability = currentItem.getComponent("minecraft:durability");
          const elytraCurrentDamage = elytraDurability ? elytraDurability.damage : 0;
          const elytraDamageTaken = elytraCurrentDamage - elytraStartDamage;

          // Get conversion rate for this armor type
          const conversionRate = DURABILITY_CONVERSION_RATES[savedType] || 0.1; // Default 0.1 if not found

          // Calculate scaled damage for chestplate
          const scaledDamage = Math.floor(elytraDamageTaken * conversionRate);

          // Restore durability with added scaled damage
          const durabilityComponent = restoredItem.getComponent("minecraft:durability");
          if (durabilityComponent && typeof savedDamage === "number" && savedDamage >= 0) {
            const newDamage = Math.min(savedDamage + scaledDamage, durabilityComponent.maxDurability);
            durabilityComponent.damage = newDamage;

            // Log durability conversion for debugging
            if (scaledDamage > 0) {
              console.log(`[ElytraSwap] ${player.name}: Elytra took ${elytraDamageTaken} damage, applied ${scaledDamage} to chestplate (rate: ${conversionRate})`);
            }
          }

          // Restore enchantments
          if (typeof savedEnchantmentsJson === "string" && savedEnchantmentsJson.length > 0) {
            try {
              const enchantments = JSON.parse(savedEnchantmentsJson);
              applyEnchantments(restoredItem, enchantments);
            } catch (e) {
              console.error("[ElytraSwap] Failed to parse enchantments:", e);
            }
          }

          // Restore custom name
          if (typeof savedName === "string") {
            restoredItem.nameTag = savedName;
          }

          restoredItem.lockMode = "none";
          restoredItem.keepOnDeath = false;

          chestSlot.setItem(restoredItem);
        } else {
          console.warn(`[ElytraSwap] Could not restore item for ${player.name}, invalid savedType: ${savedType}`);
        }

        // Clear all saved data
        player.setDynamicProperty(CUSTOM_TYPE_PROPERTY, undefined);
        player.setDynamicProperty(DURABILITY_PROPERTY, undefined);
        player.setDynamicProperty(ENCHANTMENTS_PROPERTY, undefined);
        player.setDynamicProperty(CUSTOM_NAME_PROPERTY, undefined);
        player.setDynamicProperty(ELYTRA_DAMAGE_PROPERTY, undefined);
        player.removeTag(ELYTRA_ACTIVE_TAG);
      }
    } catch (error) {
      console.error(`[ElytraSwap] Error with ${player.name}:`, error.stack || error);
    }
  }
}, 1);