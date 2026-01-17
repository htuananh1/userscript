import { world, system } from "@minecraft/server";
import { clearDroppedItems } from "./item_clear.js";
import { limitEntities } from "./entity_limiter.js";
import { MESSAGES } from "./message_system.js";

// Safe subscription check
if (world.beforeEvents && world.beforeEvents.chatSend) {
    world.beforeEvents.chatSend.subscribe((event) => {
        const msg = event.message.toLowerCase();
        
        if (msg === "!clearlag" || msg === "/clearlag") {
            event.cancel = true;

            system.run(() => {
                try {
                    clearDroppedItems();
                    limitEntities();
                    MESSAGES.broadcast("Đã thực hiện dọn dẹp thủ công thành công.", "SUCCESS");
                } catch (error) {
                    console.warn("Execution Error: " + error);
                }
            });
        }
    });
} else {
    console.warn("ClearLag: 'beforeEvents.chatSend' is not available. Ensure 'Beta APIs' is enabled in World Settings.");
}
