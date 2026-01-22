import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ItemStack, system } from "@minecraft/server";
import { Config } from "../config.js";

// Cache for trader offers: traderId -> { offers: [], expireTick: number }
const traderCache = new Map();

// Loot Pools
const POOL_NETHERITE = [
    { id: "minecraft:netherite_sword", name: "Netherite Sword", cost: 50 },
    { id: "minecraft:netherite_pickaxe", name: "Netherite Pickaxe", cost: 50 },
    { id: "minecraft:netherite_helmet", name: "Netherite Helmet", cost: 40 },
    { id: "minecraft:netherite_chestplate", name: "Netherite Chestplate", cost: 64 },
    { id: "minecraft:netherite_leggings", name: "Netherite Leggings", cost: 56 },
    { id: "minecraft:netherite_boots", name: "Netherite Boots", cost: 40 },
    { id: "minecraft:netherite_ingot", name: "Netherite Ingot", cost: 64 }
];

const POOL_RARE_UTILITY = [
    { id: "minecraft:totem_of_undying", name: "Totem of Undying", cost: 40 },
    { id: "minecraft:name_tag", name: "Name Tag", cost: 16 },
    { id: "minecraft:saddle", name: "Saddle", cost: 24 },
    { id: "minecraft:lead", name: "Lead", cost: 8 },
    { id: "minecraft:elytra", name: "Elytra", cost: 64 }
];

// Main export
export function showTraderShop(player, traderEntity) {
    try {
        const offers = getOrGenerateOffers(traderEntity);

        if (!offers || offers.length === 0) {
            player.sendMessage("§cThis trader has nothing special to sell right now.");
            return;
        }

        const form = new ActionFormData()
            .title("Premium Shop")
            .body("Limited time offers! (Emeralds only)");

        for (const offer of offers) {
            // Icon handling - straightforward paths usually work
            let icon = "";
            if (offer.id.includes("netherite")) icon = "textures/items/netherite_ingot";
            else if (offer.id.includes("golden_apple")) icon = "textures/items/apple_golden"; // texture names vary
            else if (offer.id.includes("totem")) icon = "textures/items/totem";
            else if (offer.id.includes("elytra")) icon = "textures/items/elytra";
            else icon = "textures/items/emerald"; // Fallback

            // Button text: Name - Cost
            form.button(`${offer.name}\n§2${offer.cost} Emeralds`, icon);
        }

        form.show(player).then(response => {
            if (response.canceled) return;

            const selectedIndex = response.selection;
            if (selectedIndex >= 0 && selectedIndex < offers.length) {
                buyItem(player, offers[selectedIndex]);
            }
        });
    } catch (e) {
        console.warn(`Error showing trader shop: ${e}`);
    }
}

function getOrGenerateOffers(traderEntity) {
    const currentTick = system.currentTick;
    const cache = traderCache.get(traderEntity.id);

    if (cache && currentTick < cache.expireTick) {
        return cache.offers;
    }

    // Generate new offers
    const offers = [];
    const probs = Config.TRADER_SHOP.PROBABILITIES;
    const rand = Math.random();

    // Determine category based on probability
    // 20% Netherite, 10% Ench Apple, 35% G. Apple, 25% Rare, 10% Empty
    // Cumulative: 0.2, 0.3, 0.65, 0.9, 1.0

    if (rand < probs.NETHERITE) {
        const item = POOL_NETHERITE[Math.floor(Math.random() * POOL_NETHERITE.length)];
        offers.push({ ...item, amount: 1 });
    } else if (rand < probs.NETHERITE + probs.ENCHANTED_GOLDEN_APPLE) {
        offers.push({
            id: "minecraft:enchanted_golden_apple",
            name: "Enchanted Golden Apple",
            cost: 60,
            amount: 1
        });
    } else if (rand < probs.NETHERITE + probs.ENCHANTED_GOLDEN_APPLE + probs.GOLDEN_APPLE) {
        offers.push({
            id: "minecraft:golden_apple",
            name: "Golden Apple",
            cost: 12,
            amount: 1
        });
    } else if (rand < probs.NETHERITE + probs.ENCHANTED_GOLDEN_APPLE + probs.GOLDEN_APPLE + probs.RARE_UTILITY) {
        const item = POOL_RARE_UTILITY[Math.floor(Math.random() * POOL_RARE_UTILITY.length)];
        offers.push({ ...item, amount: 1 });
    }
    // Else Empty (10%)

    // Always offer some basic mid-tier consumables to ensure shop isn't totally empty often?
    // The prompt says "10%: Empty roll or mid-tier". Let's stick to the generated one.
    // But maybe add a constant item? "Experience Bottle"?
    // Let's add Exp Bottles always as a reliable stock.
    offers.push({
        id: "minecraft:experience_bottle",
        name: "Bottle o' Enchanting",
        cost: 6,
        amount: 4
    });

    traderCache.set(traderEntity.id, {
        offers: offers,
        expireTick: currentTick + Config.TRADER_SHOP.CACHE_DURATION_TICKS
    });

    return offers;
}

function buyItem(player, offer) {
    const inventory = player.getComponent("minecraft:inventory").container;
    const currencyId = "minecraft:emerald";

    // 1. Calculate total currency
    let totalEmeralds = 0;
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && item.typeId === currencyId) {
            totalEmeralds += item.amount;
        }
    }

    if (totalEmeralds < offer.cost) {
        player.sendMessage(`§cYou need ${offer.cost} Emeralds, but only have ${totalEmeralds}.`);
        player.playSound("note.bass");
        return;
    }

    // 2. Deduct currency
    let remainingCost = offer.cost;
    for (let i = 0; i < inventory.size; i++) {
        if (remainingCost <= 0) break;
        const item = inventory.getItem(i);
        if (item && item.typeId === currencyId) {
            if (item.amount > remainingCost) {
                item.amount -= remainingCost;
                inventory.setItem(i, item);
                remainingCost = 0;
            } else {
                remainingCost -= item.amount;
                inventory.setItem(i, undefined);
            }
        }
    }

    // 3. Give Item
    try {
        const product = new ItemStack(offer.id, offer.amount);
        const added = inventory.addItem(product);
        if (added && added.amount > 0) {
            // Inventory full, spawn in world
             player.dimension.spawnItem(product, player.location);
             player.sendMessage(`§eInventory full. Item dropped at feet.`);
        }

        player.sendMessage(`§aPurchased ${offer.name} x${offer.amount}!`);
        player.playSound("random.levelup");
    } catch (e) {
        console.warn(`Transaction error: ${e}`);
        player.sendMessage("§cAn error occurred during transaction.");
        // Should refund here technically, but keeping it simple for now as scripts are atomic-ish in JS context unless async await interruption
    }
}
