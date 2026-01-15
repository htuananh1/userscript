import { world, system } from "@minecraft/server";

// --- Configuration ---
// Run every 600 ticks (30 seconds)
const CLEAR_INTERVAL_TICKS = 600;

function cleanBooks() {
    let count = 0;
    // Dimensions to check
    const dimensions = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

    for (const dimName of dimensions) {
        const dimension = world.getDimension(dimName);
        // Get all item entities
        const items = dimension.getEntities({ type: "minecraft:item" });

        for (const entity of items) {
            try {
                if (!entity.isValid()) continue;

                const itemComp = entity.getComponent("minecraft:item");
                if (itemComp && itemComp.itemStack) {
                    const typeId = itemComp.itemStack.typeId;
                    // Check for book types (book, writable_book, written_book, enchanted_book)
                    if (typeId.includes("book")) {
                         entity.remove();
                         count++;
                    }
                }
            } catch (e) {
                // Ignore errors for invalid entities
            }
        }
    }

    if (count > 0) {
        world.sendMessage(`§e[System] Đã dọn ${count} sách rơi để giảm lag.`);
    }
}

// Schedule the cleaning
system.runInterval(cleanBooks, CLEAR_INTERVAL_TICKS);

// --- Auto Collect ---
// "Cho vật phẩm đào hay chặt gọn vào" -> Teleport drops to player
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    if (entity.typeId === "minecraft:item") {
        // Run on next tick to ensure we can teleport it safely
        system.run(() => {
             try {
                 if (!entity.isValid()) return;

                 const dimension = entity.dimension;
                 // Find nearest player within 15 blocks
                 const players = dimension.getPlayers({
                     location: entity.location,
                     maxDistance: 15,
                     closest: 1
                 });

                 if (players.length > 0) {
                     const player = players[0];
                     // Teleport item to player location
                     entity.teleport(player.location);
                 }
             } catch (e) {
                 // Ignore errors
             }
        });
    }
});

system.run(() => {
    world.sendMessage("§a[Addon] Đã kích hoạt: Dọn sách & Tự động thu thập vật phẩm.");
});
