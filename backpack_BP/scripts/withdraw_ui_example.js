import { ItemStack, world } from "@minecraft/server";
import { uiManager } from "@minecraft/server-ui";

const SCREEN_ID = "backpack:backpack_withdraw_screen";

function formatItemName(typeId) {
  const raw = String(typeId || "").replace("minecraft:", "");
  return raw
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function getDisplayName(typeId) {
  try {
    const sample = new ItemStack(typeId, 1);
    const display = sample.getComponent("minecraft:display_name");
    if (display?.value) return display.value;
  } catch (e) {
    // fallback below
  }
  return formatItemName(typeId);
}

function safeItemId(typeId) {
  try {
    new ItemStack(typeId, 1);
    return typeId;
  } catch (e) {
    return "minecraft:barrier";
  }
}

/**
 * Nhận dữ liệu store (map typeId -> amount) và gộp theo tên hiển thị.
 * Trả về mảng items phù hợp với UI collection: { item_id, item_name, total_amount }.
 */
export function buildWithdrawUiData(store) {
  const grouped = new Map();

  for (const [typeId, amount] of Object.entries(store || {})) {
    const total = Number(amount) || 0;
    if (total <= 0) continue;

    const displayName = getDisplayName(typeId);
    const entry = grouped.get(displayName) || {
      item_id: safeItemId(typeId),
      item_name: displayName,
      total_amount: 0
    };

    entry.total_amount += total;
    grouped.set(displayName, entry);
  }

  return Array.from(grouped.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
}

/**
 * Mở UI rút item bằng Resource Pack UI.
 * Yêu cầu bật Experimental: "UI Manager" + Script API.
 */
export function openWithdrawScreen(player, store) {
  if (!uiManager?.get) {
    player.sendMessage("§cUI Manager không khả dụng. Hãy bật Experimental (UI Manager)." );
    return;
  }

  const ui = uiManager.get(player);
  const items = buildWithdrawUiData(store);

  ui.setData(SCREEN_ID, { items });
  ui.open(SCREEN_ID);
}

// Ví dụ: gõ chat "!rut" để mở UI rút items (demo).
world.beforeEvents.chatSend.subscribe((event) => {
  if (event.message !== "!rut") return;
  event.cancel = true;
  const player = event.sender;

  const store = {
    "minecraft:birch_log": 128,
    "minecraft:stone": 512,
    "minecraft:diamond": 3
  };

  openWithdrawScreen(player, store);
});
