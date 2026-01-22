import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ItemStack } from "@minecraft/server";

const SHOP_ITEMS = [
    {
        name: "Netherite Ingot",
        id: "minecraft:netherite_ingot",
        amount: 1,
        cost: 64,
        currency: "minecraft:emerald",
        icon: "textures/items/netherite_ingot"
    },
    {
        name: "Netherite Sword",
        id: "minecraft:netherite_sword",
        amount: 1,
        cost: 16,
        currency: "minecraft:emerald_block",
        icon: "textures/items/netherite_sword"
    },
    {
        name: "Netherite Pickaxe",
        id: "minecraft:netherite_pickaxe",
        amount: 1,
        cost: 16,
        currency: "minecraft:emerald_block",
        icon: "textures/items/netherite_pickaxe"
    },
    {
        name: "Netherite Axe",
        id: "minecraft:netherite_axe",
        amount: 1,
        cost: 16,
        currency: "minecraft:emerald_block",
        icon: "textures/items/netherite_axe"
    },
    {
        name: "Netherite Chestplate",
        id: "minecraft:netherite_chestplate",
        amount: 1,
        cost: 24,
        currency: "minecraft:emerald_block",
        icon: "textures/items/netherite_chestplate"
    },
    {
        name: "Totem of Undying",
        id: "minecraft:totem_of_undying",
        amount: 1,
        cost: 32,
        currency: "minecraft:emerald",
        icon: "textures/items/totem"
    },
    {
        name: "Enchanted Golden Apple",
        id: "minecraft:enchanted_golden_apple",
        amount: 1,
        cost: 64,
        currency: "minecraft:emerald",
        icon: "textures/items/apple_golden"
    },
    {
        name: "Experience Bottle (x16)",
        id: "minecraft:experience_bottle",
        amount: 16,
        cost: 12,
        currency: "minecraft:emerald",
        icon: "textures/items/experience_bottle"
    }
];

export function showTraderShop(player, traderEntity) {
    const form = new ActionFormData()
        .title("Wandering Trader Shop")
        .body("Exclusive items for sale!");

    for (const item of SHOP_ITEMS) {
        const costText = `${item.cost} x ${item.currency.replace("minecraft:", "").replace("_", " ")}`;
        form.button(`${item.name}\n§e${costText}`, item.icon);
    }

    form.show(player).then(response => {
        if (response.canceled) return;

        const selectedIndex = response.selection;
        if (selectedIndex >= 0 && selectedIndex < SHOP_ITEMS.length) {
            buyItem(player, SHOP_ITEMS[selectedIndex]);
        }
    });
}

function buyItem(player, itemData) {
    const inventory = player.getComponent("minecraft:inventory").container;

    // Check balance
    let balance = 0;
    for (let i = 0; i < inventory.size; i++) {
        const slotItem = inventory.getItem(i);
        if (slotItem && slotItem.typeId === itemData.currency) {
            balance += slotItem.amount;
        }
    }

    if (balance >= itemData.cost) {
        // Deduct cost
        let remainingCost = itemData.cost;
        for (let i = 0; i < inventory.size; i++) {
            if (remainingCost <= 0) break;

            const slotItem = inventory.getItem(i);
            if (slotItem && slotItem.typeId === itemData.currency) {
                if (slotItem.amount > remainingCost) {
                    slotItem.amount -= remainingCost;
                    inventory.setItem(i, slotItem);
                    remainingCost = 0;
                } else {
                    remainingCost -= slotItem.amount;
                    inventory.setItem(i, undefined); // Remove item
                }
            }
        }

        // Give Item
        const product = new ItemStack(itemData.id, itemData.amount);
        inventory.addItem(product);

        player.sendMessage(`§aPurchased ${itemData.amount}x ${itemData.name}!`);
        player.playSound("random.levelup");
    } else {
        player.sendMessage(`§cNot enough ${itemData.currency.replace("minecraft:", "")}! You need ${itemData.cost}.`);
        player.playSound("note.bass");
    }
}
