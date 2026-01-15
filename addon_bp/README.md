# Jules Utility Addon

This is a Minecraft Bedrock Behavior Pack Addon designed for Dedicated Servers.

## Features

1.  **Lag Fix**: Automatically clears dropped book entities every 30 seconds to prevent lag exploits or clutter.
2.  **Auto-Collect**: Teleports dropped items (within 8 blocks) to the nearest player every second. Excludes books.
3.  **Iron Economy**: Replaces all Villager trades to use Iron Ingots (`minecraft:iron_ingot`) as the ONLY currency. Emeralds are removed from trades.

## Installation

1.  **Dedicated Server**:
    - Place the `addon_bp` folder (rename it if you like, e.g., `jules_utility_bp`) into your server's `behavior_packs/` directory.
    - Enable the pack in your `valid_known_packs.json` if required, or adding it to `world_behavior_packs.json` for your specific level.

2.  **Single Player / Local**:
    - Zip the folder and rename extension to `.mcpack`.
    - Double click to import into Minecraft.
    - Enable in World Settings -> Behavior Packs.

## Requirements

-   **Script API**: The server/world must have the Beta APIs or Script API enabled (usually enabled by default in recent versions for non-beta scripts). This addon uses `@minecraft/server` stable version `1.8.0`.

## Notes

-   Villager trades are overridden. If you have other addons modifying villagers, ensure this one is higher in priority or merge conflicts may occur.
-   Auto-collect does not pick up items extremely close to the player (within 1.5 blocks) to prevent jitter.
