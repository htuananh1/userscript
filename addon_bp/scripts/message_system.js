import { world } from "@minecraft/server";

export const MESSAGES = {
    PREFIX: "§l§6[HỆ THỐNG] ",
    INFO: "§7",
    SUCCESS: "§a",
    WARNING: "§e",
    
    broadcast(message, type = "INFO") {
        const color = this[type] || "§f";
        world.sendMessage(`${this.PREFIX}${color}${message}`);
    }
};
