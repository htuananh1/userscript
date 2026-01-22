import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config, ROLE_IDS } from "../config.js";
import { ICONS } from "./icons.js";

export function showAdminMenu(player) {
    const form = new ActionFormData()
        .title("Villager Overhaul Admin")
        .body("Select a category to configure settings.")
        .button("Global Settings", ICONS.GLOBAL)
        .button("Role Settings", ICONS.ROLES)
        .button("Junk Collector", ICONS.JUNK_FALLBACK); // Use fallback for safety

    form.show(player).then(response => {
        if (response.canceled) return;

        switch (response.selection) {
            case 0:
                showGlobalSettings(player);
                break;
            case 1:
                showRoleSelection(player);
                break;
            case 2:
                showJunkSettings(player);
                break;
        }
    });
}

function showGlobalSettings(player) {
    const form = new ModalFormData()
        .title("Global Settings");

    // Add fields matching Config structure
    form.toggle("Debug Mode", Config.DEBUG);
    form.slider("Tick Interval (Ticks)", 1, 100, 1, Config.TICK_INTERVAL);
    form.slider("Work Radius", 5, 16, 1, Math.min(Config.WORK_RADIUS, 16)); // Clamped to safe limit
    form.slider("Village Radius", 16, 128, 8, Config.VILLAGE_RADIUS);
    form.slider("Interact Radius", 1, 10, 1, Config.INTERACT_RADIUS);

    form.show(player).then(response => {
        if (response.canceled) {
            showAdminMenu(player); // Go back
            return;
        }

        const [debug, tick, work, village, interact] = response.formValues;

        // Apply
        Config.DEBUG = debug;
        Config.TICK_INTERVAL = tick;
        Config.WORK_RADIUS = work;
        Config.VILLAGE_RADIUS = village;
        Config.INTERACT_RADIUS = interact;

        Config.save();
        player.sendMessage("§aGlobal settings updated.");
    });
}

function showRoleSelection(player) {
    const form = new ActionFormData()
        .title("Role Configuration")
        .body("Select a profession to configure.");

    const roles = Object.keys(ROLE_IDS); // e.g., ["FARMER", "LIBRARIAN", ...]

    roles.forEach(role => {
        const icon = ICONS[role] || ICONS.MAIN;
        // Capitalize nicely
        const label = role.charAt(0) + role.slice(1).toLowerCase();
        form.button(label, icon);
    });

    form.show(player).then(response => {
        if (response.canceled) {
            showAdminMenu(player);
            return;
        }

        const selectedRoleKey = roles[response.selection];
        showRoleSettings(player, selectedRoleKey);
    });
}

function showRoleSettings(player, roleKey) {
    const configData = Config[roleKey];
    if (!configData) {
        player.sendMessage("§cNo configuration found for " + roleKey);
        return;
    }

    const form = new ModalFormData()
        .title(`${roleKey} Settings`);

    const keys = Object.keys(configData);

    // Dynamically generate fields based on value type
    keys.forEach(key => {
        const value = configData[key];
        const label = key.replace(/_/g, " ").toLowerCase(); // CLEAN_UP_LABEL

        if (typeof value === 'boolean') {
            form.toggle(label, value);
        } else if (typeof value === 'number') {
            // Heuristic for sliders
            // If value is small (< 100) assume 0-100. If large, assume 0-10000?
            // Or just use text field for generic numbers to be safe.
            // Sliders are nicer but harder to guess range.
            // Let's use TextField for generic numbers to avoid range issues,
            // verifying input is number.
            form.textField(label, value.toString(), value.toString());
        } else {
            form.textField(label, String(value), String(value));
        }
    });

    form.show(player).then(response => {
        if (response.canceled) {
            showRoleSelection(player);
            return;
        }

        let hasError = false;

        response.formValues.forEach((val, index) => {
            const key = keys[index];
            const originalValue = configData[key];

            if (typeof originalValue === 'boolean') {
                configData[key] = val;
            } else if (typeof originalValue === 'number') {
                const parsed = Number(val);
                if (!isNaN(parsed)) {
                    configData[key] = parsed;
                } else {
                    hasError = true;
                }
            } else {
                configData[key] = val;
            }
        });

        if (hasError) {
            player.sendMessage("§cSome numeric values were invalid and ignored.");
        }

        Config.save();
        player.sendMessage(`§a${roleKey} settings updated.`);
    });
}

function showJunkSettings(player) {
    const form = new ModalFormData()
        .title("Junk Collector");

    form.slider("Scan Interval (Ticks)", 20, 200, 10, Config.SCAN_INTERVAL_TICKS);
    form.slider("Junk Radius", 4, 32, 1, Config.JUNK_RADIUS);
    form.toggle("Enable Emerald Reward", Config.ENABLE_EMERALD_REWARD);
    form.slider("Points Per Emerald", 16, 128, 8, Config.POINTS_PER_EMERALD);
    form.slider("Max Emeralds/Min", 1, 64, 1, Config.MAX_EMERALDS_PER_MINUTE_PER_PLAYER);

    form.show(player).then(response => {
        if (response.canceled) {
            showAdminMenu(player);
            return;
        }

        const [interval, radius, reward, points, max] = response.formValues;

        Config.SCAN_INTERVAL_TICKS = interval;
        Config.JUNK_RADIUS = radius;
        Config.ENABLE_EMERALD_REWARD = reward;
        Config.POINTS_PER_EMERALD = points;
        Config.MAX_EMERALDS_PER_MINUTE_PER_PLAYER = max;

        Config.save();
        player.sendMessage("§aJunk Collector settings updated.");
    });
}
