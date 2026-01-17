import { world } from "@minecraft/server";

export const MESSAGES = {
    PREFIX: "§8[§bClearLag§8]§r ",
    INFO: "§7",
    SUCCESS: "§a",
    WARNING: "§e",
    
    broadcast(message, type = "INFO") {
        const color = this[type] || "§f";
        world.sendMessage(`${this.PREFIX}${color}${message}`);
    }
};
