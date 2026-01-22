const PROTECTED_EXACT_IDS = [
    "minecraft:diamond",
    "minecraft:emerald",
    "minecraft:netherite_ingot",
    "minecraft:gold_ingot",
    "minecraft:iron_ingot",
    "minecraft:beacon",
    "minecraft:totem_of_undying",
    "minecraft:heart_of_the_sea",
    "minecraft:nether_star",
    "minecraft:dragon_egg",
    "minecraft:sponge",
    "minecraft:budding_amethyst"
];

const PROTECTED_KEYWORDS = [
    "shulker_box",
    "elytra",
    "helmet",
    "chestplate",
    "leggings",
    "boots",
    "sword",
    "pickaxe",
    "axe",
    "shovel",
    "hoe",
    "ore",
    "enchanted_book",
    "horse_armor",
    "trim_template"
];

const JUNK_EXACT_IDS = [
    "minecraft:rotten_flesh",
    "minecraft:bone",
    "minecraft:spider_eye",
    "minecraft:string",
    "minecraft:gunpowder",
    "minecraft:arrow",
    "minecraft:dirt",
    "minecraft:cobblestone",
    "minecraft:gravel",
    "minecraft:netherrack",
    "minecraft:andesite",
    "minecraft:diorite",
    "minecraft:granite",
    "minecraft:sand",
    "minecraft:tuff",
    "minecraft:deepslate",
    "minecraft:basalt",
    "minecraft:blackstone",
    "minecraft:end_stone",
    "minecraft:scaffolding",
    "minecraft:stick",
    "minecraft:bamboo",
    "minecraft:sugar_cane",
    "minecraft:kelp",
    "minecraft:cactus"
];

const JUNK_KEYWORDS = [
    "seed",
    "sapling",
    "leaves",
    "flower",
    "dye",
    "button",
    "pressure_plate"
];

const JUNK_POINTS = {
    "minecraft:rotten_flesh": 2,
    "minecraft:bone": 2,
    "minecraft:spider_eye": 2,
    "minecraft:string": 2,
    "minecraft:gunpowder": 3,
    "minecraft:dirt": 1,
    "minecraft:cobblestone": 1,
    "minecraft:gravel": 1,
    "minecraft:netherrack": 1,
    "minecraft:andesite": 1,
    "minecraft:diorite": 1,
    "minecraft:granite": 1,
    "minecraft:tuff": 1,
    "minecraft:deepslate": 1,
    "minecraft:sand": 1,
    // Default for other junk is 1
};

export const ItemFilter = {
    isProtected(typeId) {
        if (PROTECTED_EXACT_IDS.includes(typeId)) return true;
        for (const keyword of PROTECTED_KEYWORDS) {
            if (typeId.includes(keyword)) return true;
        }
        return false;
    },

    isJunk(typeId) {
        // First check if protected - safety first
        if (this.isProtected(typeId)) return false;

        if (JUNK_EXACT_IDS.includes(typeId)) return true;
        for (const keyword of JUNK_KEYWORDS) {
            if (typeId.includes(keyword)) return true;
        }
        return false;
    },

    getItemValue(typeId) {
        if (!this.isJunk(typeId)) return 0;
        return JUNK_POINTS[typeId] || 1;
    }
};
