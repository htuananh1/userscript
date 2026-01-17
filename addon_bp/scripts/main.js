import { system, world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { MESSAGES } from "./message_system.js";
import { clearDroppedItems } from "./item_clear.js";
import { limitEntities } from "./entity_limiter.js";
import { updateActionBar } from "./actionbar_display.js";
import "./command_handler.js";

let timer = CONFIG.AUTO_CLEAR.INTERVAL_SECONDS;
let explosionTracker = 0;

// TNT Explosion Control
world.beforeEvents.explosion.subscribe((event) => {
    explosionTracker++;
    if (explosionTracker > CONFIG.LAG_PREVENTION.MAX_TNT_EXPLOSIONS) {
        event.cancel = true;
    }
});

// FIXED: Named Generator function to prevent Native type conversion error
function* explosionReset() {
    while (true) {
        explosionTracker = 0;
        yield;
    }
}
system.runJob(explosionReset());

// Fire Spread Control - Added safety check
world.afterEvents.worldInitialize.subscribe(() => {
    if (CONFIG.LAG_PREVENTION.DISABLE_FIRE_SPREAD) {
        try {
            world.getDimension("overworld").runCommand("gamerule dofiretick false");
        } catch (error) {
            // Silently fail if command cannot be run yet
        }
    }
});

// Main Cleanup Loop
system.runInterval(() => {
    if (!CONFIG.AUTO_CLEAR.ENABLED) return;
    
    timer--;

    if (CONFIG.AUTO_CLEAR.WARNINGS.includes(timer)) {
        MESSAGES.broadcast(`Dọn dẹp vật phẩm sẽ bắt đầu trong ${timer} giây.`, "WARNING");
    }

    if (timer <= 0) {
        try {
            clearDroppedItems();
            if (CONFIG.ENTITY_LIMITER.ENABLED) limitEntities();
        } catch (e) {
            console.warn("ClearLag Loop Error: " + e);
        }
        timer = CONFIG.AUTO_CLEAR.INTERVAL_SECONDS;
    }
}, 20);

// HUD Display Loop
system.runInterval(() => {
    try {
        updateActionBar();
    } catch (e) {}
}, CONFIG.DISPLAY.UPDATE_INTERVAL_TICKS);
