import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";

export function updateActionBar() {
    if (!CONFIG.DISPLAY.ACTIONBAR_STATS) return;
    const dimension = world.getDimension("overworld");
    const allEntities = dimension.getEntities().length;
    const items = dimension.getEntities({ type: "minecraft:item" }).length;

    for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(`§bThực thể: §f${allEntities} §8| §bVật phẩm: §f${items}`);
    }
}
