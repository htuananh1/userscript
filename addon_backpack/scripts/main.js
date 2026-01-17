import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

// ===================================
// INFINITE BACKPACK ADDON v2.2.0
// - Gộp item cùng typeId (hiển thị + lưu trữ dạng tổng số lượng)
// - Nhập/Rút bằng nhập số (textField) thay vì slider
// - Hiển thị ngày giờ Việt Nam (UTC+7)
// ===================================

const BACKPACK_ITEM_NAME = "§6§lBackpack";
const BACKPACK_ITEM_LORE = ["§7Click để mở UI backpack", "§8Nhập/Rút với số lượng tùy chọn"];

// New storage key (map: typeId -> amount)
const STORE_KEY = "backpack_store";

// Legacy (v2.1.0) key pattern
const LEGACY_PAGE_KEY = "backpack_page_0";

function broadcast(message) {
  world.sendMessage(message);
}

function isBackpackItem(item) {
  if (!item) return false;
  try {
    return item.nameTag === BACKPACK_ITEM_NAME;
  } catch (e) {
    return false;
  }
}

function createBackpackItem() {
  const item = new ItemStack("minecraft:compass", 1);
  item.nameTag = BACKPACK_ITEM_NAME;
  item.setLore(BACKPACK_ITEM_LORE);
  return item;
}

function hasBackpackItem(player) {
  try {
    const inventory = player.getComponent("minecraft:inventory").container;
    for (let i = 0; i < inventory.size; i++) {
      const item = inventory.getItem(i);
      if (isBackpackItem(item)) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function giveBackpackItem(player) {
  try {
    const inventory = player.getComponent("minecraft:inventory").container;
    const backpackItem = createBackpackItem();

    try {
      inventory.addItem(backpackItem);
      player.sendMessage("§a[BACKPACK] Click Compass để mở!");
    } catch (e) {
      inventory.setItem(8, backpackItem); // hotbar slot 9
      player.sendMessage("§a[BACKPACK] La bàn ở slot 9!");
    }
  } catch (e) {}
}

function getItemIcon(typeId) {
  const icons = {
    diamond: "💎",
    iron: "⚙️",
    gold: "🟡",
    emerald: "💚",
    coal: "⚫",
    wood: "🪵",
    stone: "🪨",
    dirt: "🟫",
    apple: "🍎",
    bread: "🍞",
    sword: "⚔️",
    pickaxe: "⛏️",
    axe: "🪓",
    bow: "🏹",
    arrow: "➡️",
  };
  for (const [key, icon] of Object.entries(icons)) {
    if (typeId.includes(key)) return icon;
  }
  return "📦";
}

/**
 * Get current Vietnam time (UTC+7)
 */
function getVietnamTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);

  const day = String(vnTime.getDate()).padStart(2, "0");
  const month = String(vnTime.getMonth() + 1).padStart(2, "0");
  const year = vnTime.getFullYear();
  const hours = String(vnTime.getHours()).padStart(2, "0");
  const minutes = String(vnTime.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * ----- Storage (Map) -----
 * store format:
 *   { "minecraft:diamond": 1234, "minecraft:emerald": 9, ... }
 */
function loadStore(player) {
  // Prefer new store
  try {
    const raw = player.getDynamicProperty(STORE_KEY);
    if (raw) {
      const obj = JSON.parse(String(raw));
      if (obj && typeof obj === "object") return obj;
    }
  } catch (e) {}

  // Migrate legacy page (v2.1.0)
  const migrated = {};
  try {
    const legacyRaw = player.getDynamicProperty(LEGACY_PAGE_KEY);
    if (legacyRaw) {
      const itemsData = JSON.parse(String(legacyRaw));
      if (Array.isArray(itemsData)) {
        for (const data of itemsData) {
          if (!data || !data.typeId || !data.amount) continue;
          const id = String(data.typeId);
          const amt = Number(data.amount) || 0;
          if (amt <= 0) continue;
          migrated[id] = (migrated[id] || 0) + amt;
        }
      }
      // Save migrated store
      saveStore(player, migrated);

      // Best-effort: clear legacy to avoid double-count
      try {
        player.setDynamicProperty(LEGACY_PAGE_KEY, undefined);
      } catch (e2) {}
    }
  } catch (e) {}

  return migrated;
}

function saveStore(player, store) {
  try {
    // Cleanup invalid / zero
    const cleaned = {};
    for (const [k, v] of Object.entries(store || {})) {
      const amt = Math.floor(Number(v) || 0);
      if (amt > 0) cleaned[String(k)] = amt;
    }
    player.setDynamicProperty(STORE_KEY, JSON.stringify(cleaned));
  } catch (e) {}
}

function getStoreStats(store) {
  let distinct = 0;
  let total = 0;
  for (const v of Object.values(store || {})) {
    const amt = Number(v) || 0;
    if (amt > 0) {
      distinct += 1;
      total += amt;
    }
  }
  return { distinct, total };
}

/**
 * Inventory aggregation by typeId (excluding backpack item).
 * Returns:
 *   {
 *     totals: { typeId: amount },
 *     slotsByType: { typeId: [ {slot, amount, sampleItem} ... ] }
 *   }
 */
function aggregateInventory(player) {
  const inventory = player.getComponent("minecraft:inventory").container;

  const totals = {};
  const slotsByType = {};

  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);
    if (!item || isBackpackItem(item)) continue;

    const id = item.typeId;
    const amt = item.amount;

    totals[id] = (totals[id] || 0) + amt;
    if (!slotsByType[id]) slotsByType[id] = [];
    slotsByType[id].push({ slot: i, amount: amt, sampleItem: item });
  }

  return { totals, slotsByType, inventory };
}

/**
 * Remove amount of a typeId from inventory across multiple slots.
 */
function removeFromInventory(inventory, slots, typeId, amountToRemove) {
  let remaining = amountToRemove;

  for (const entry of slots) {
    if (remaining <= 0) break;

    const current = inventory.getItem(entry.slot);
    if (!current || current.typeId !== typeId) continue;

    const take = Math.min(current.amount, remaining);
    const left = current.amount - take;

    if (left <= 0) {
      inventory.setItem(entry.slot, undefined);
    } else {
      const newStack = new ItemStack(current.typeId, left);
      // Preserve basic meta (nameTag/lore) for the remaining stack
      try {
        if (current.nameTag) newStack.nameTag = current.nameTag;
      } catch (e) {}
      try {
        const lore = current.getLore?.() || [];
        if (Array.isArray(lore) && lore.length > 0) newStack.setLore(lore);
      } catch (e) {}
      inventory.setItem(entry.slot, newStack);
    }

    remaining -= take;
  }

  return amountToRemove - remaining; // removed
}

/**
 * Add amount of typeId to player inventory, respecting stack size.
 * Returns amount actually added.
 */
function addToInventory(inventory, typeId, amount) {
  let remaining = amount;
  let added = 0;

  // Determine max stack size
  let maxStack = 64;
  try {
    maxStack = new ItemStack(typeId, 1).maxAmount || 64;
  } catch (e) {}

  while (remaining > 0) {
    const batch = Math.min(remaining, maxStack);
    const stack = new ItemStack(typeId, batch);

    try {
      inventory.addItem(stack);
      added += batch;
      remaining -= batch;
    } catch (e) {
      break; // inventory full
    }
  }

  return added;
}

function clampInt(n, min, max) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

async function showBackpackUI(player) {
  const store = loadStore(player);
  const stats = getStoreStats(store);

  const form = new ActionFormData();
  const vnTime = getVietnamTime();

  form.title(`§6§lKho Vô Hạn\n§7${vnTime} VN (UTC+7)`);
  form.body(`§7Gộp theo typeId\n§e${stats.distinct} §7loại • §e${stats.total} §7tổng số lượng\n\n§7Chọn hành động:`);

  form.button("§a📥 Nhập Items\n§7Bỏ vào backpack");
  form.button("§e📤 Rút Items\n§7Lấy ra inventory");
  form.button("§b📋 Danh Sách\n§7Xem tất cả");
  form.button("§c✖ Đóng");

  const response = await form.show(player);
  if (response.canceled) return;

  switch (response.selection) {
    case 0:
      await showDepositUI(player);
      break;
    case 1:
      await showWithdrawUI(player);
      break;
    case 2:
      await showViewItemsUI(player);
      break;
  }
}

async function showDepositUI(player) {
  const { totals, slotsByType } = aggregateInventory(player);
  const typeIds = Object.keys(totals).filter((k) => (totals[k] || 0) > 0);

  if (typeIds.length === 0) {
    player.sendMessage("§cKhông có items!");
    return;
  }

  const form = new ActionFormData();
  form.title("§a📥 Nhập Items (gộp theo ID)");
  form.body("§7Chọn typeId để nhập:");

  for (const typeId of typeIds) {
    const icon = getItemIcon(typeId);
    const name = typeId.replace("minecraft:", "");
    form.button(`${icon} ${name}\n§7Tổng: §e${totals[typeId]}`);
  }
  form.button("§c« Back");

  const response = await form.show(player);
  if (response.canceled || response.selection === typeIds.length) {
    await showBackpackUI(player);
    return;
  }

  const selectedTypeId = typeIds[response.selection];
  const max = totals[selectedTypeId];

  // Quantity input (textField) instead of slider
  const qForm = new ModalFormData();
  qForm.title(`§aNhập: ${selectedTypeId.replace("minecraft:", "")}`);
  qForm.textField(`§7Số lượng (1 → ${max})`, "VD: 64", String(max));
  qForm.toggle("§e✓ ALL (Tất cả)", true);

  const qResponse = await qForm.show(player);
  if (qResponse.canceled) {
    await showDepositUI(player);
    return;
  }

  const depositAll = qResponse.formValues[1] === true;
  const rawText = String(qResponse.formValues[0] ?? "");
  const amount = depositAll ? max : clampInt(rawText, 1, max);

  // Apply: remove from inventory + add to store
  const inv = player.getComponent("minecraft:inventory").container;
  const removed = removeFromInventory(inv, slotsByType[selectedTypeId] || [], selectedTypeId, amount);

  if (removed <= 0) {
    player.sendMessage("§cKhông thể nhập item này (có thể đã thay đổi inventory).");
    await showDepositUI(player);
    return;
  }

  const store = loadStore(player);
  store[selectedTypeId] = (store[selectedTypeId] || 0) + removed;
  saveStore(player, store);

  const icon = getItemIcon(selectedTypeId);
  player.sendMessage(`§a✓ ${icon} §e${removed}x §f${selectedTypeId.replace("minecraft:", "")} §7→ Backpack`);
  await showBackpackUI(player);
}

async function showWithdrawUI(player) {
  const store = loadStore(player);

  const entries = Object.entries(store)
    .filter(([, v]) => (Number(v) || 0) > 0)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  if (entries.length === 0) {
    player.sendMessage("§cBackpack trống!");
    await showBackpackUI(player);
    return;
  }

  const form = new ActionFormData();
  form.title("§e📤 Rút Items (gộp theo ID)");
  form.body(`§7Chọn typeId để rút:`);

  for (const [typeId, amt] of entries) {
    const icon = getItemIcon(typeId);
    const name = typeId.replace("minecraft:", "");
    form.button(`${icon} ${name}\n§7Tổng: §e${amt}`);
  }
  form.button("§c« Back");

  const response = await form.show(player);
  if (response.canceled || response.selection === entries.length) {
    await showBackpackUI(player);
    return;
  }

  const [selectedTypeId, selectedTotal] = entries[response.selection];
  const max = Number(selectedTotal) || 0;

  const qForm = new ModalFormData();
  qForm.title(`§eRút: ${selectedTypeId.replace("minecraft:", "")}`);
  qForm.textField(`§7Số lượng (1 → ${max})`, "VD: 64", String(max));
  qForm.toggle("§e✓ ALL (Tất cả)", true);

  const qResponse = await qForm.show(player);
  if (qResponse.canceled) {
    await showWithdrawUI(player);
    return;
  }

  const withdrawAll = qResponse.formValues[1] === true;
  const rawText = String(qResponse.formValues[0] ?? "");
  const amountWanted = withdrawAll ? max : clampInt(rawText, 1, max);

  const inventory = player.getComponent("minecraft:inventory").container;

  const added = addToInventory(inventory, selectedTypeId, amountWanted);
  if (added <= 0) {
    player.sendMessage("§cInventory đầy (không rút được)!");
    await showBackpackUI(player);
    return;
  }

  // Deduct only what was actually added
  store[selectedTypeId] = Math.max(0, (Number(store[selectedTypeId]) || 0) - added);
  if ((Number(store[selectedTypeId]) || 0) <= 0) delete store[selectedTypeId];
  saveStore(player, store);

  const icon = getItemIcon(selectedTypeId);
  if (added < amountWanted) {
    player.sendMessage(`§e⚠ Chỉ rút được §a${icon} §e${added}x §f${selectedTypeId.replace("minecraft:", "")} §7(vì inventory đầy)`);
  } else {
    player.sendMessage(`§a✓ ${icon} §e${added}x §f${selectedTypeId.replace("minecraft:", "")} §7→ Inventory`);
  }

  await showBackpackUI(player);
}

async function showViewItemsUI(player) {
  const store = loadStore(player);

  const entries = Object.entries(store)
    .filter(([, v]) => (Number(v) || 0) > 0)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  let body = `§e=== Tất Cả Items (gộp theo ID) ===\n`;
  if (entries.length === 0) {
    body += "§7(Trống)\n";
  } else {
    const stats = getStoreStats(store);
    body += `§7Loại: §e${stats.distinct} §7• Tổng: §e${stats.total}\n\n`;
    for (const [typeId, amt] of entries) {
      const icon = getItemIcon(typeId);
      body += `${icon} §f${typeId.replace("minecraft:", "")} §7x§e${amt}\n`;
    }
  }

  const form = new ActionFormData();
  form.title("§b📋 Danh Sách");
  form.body(body);
  form.button("§a« Back");

  await form.show(player);
  await showBackpackUI(player);
}

// Give backpack item on spawn
world.afterEvents.playerSpawn.subscribe((event) => {
  system.runTimeout(() => {
    if (!hasBackpackItem(event.player)) giveBackpackItem(event.player);
  }, 40);
});

// Open UI when using compass
world.afterEvents.itemUse.subscribe((event) => {
  if (isBackpackItem(event.itemStack)) {
    showBackpackUI(event.source);
  }
});

// Prevent dropping compass - Auto delete & re-give
world.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;

  if (entity.typeId === "minecraft:item") {
    system.runTimeout(() => {
      try {
        const itemComponent = entity.getComponent("minecraft:item");
        if (itemComponent && itemComponent.itemStack) {
          const item = itemComponent.itemStack;

          if (isBackpackItem(item)) {
            const location = entity.location;
            let nearestPlayer = null;
            let minDistance = 10;

            for (const player of world.getAllPlayers()) {
              const dx = player.location.x - location.x;
              const dy = player.location.y - location.y;
              const dz = player.location.z - location.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

              if (distance < minDistance) {
                minDistance = distance;
                nearestPlayer = player;
              }
            }

            entity.remove();

            if (nearestPlayer) {
              system.runTimeout(() => {
                giveBackpackItem(nearestPlayer);
                nearestPlayer.sendMessage("§c[BACKPACK] Không thể vứt! La bàn về slot 9.");
              }, 5);
            }
          }
        }
      } catch (e) {}
    }, 1);
  }
});

// Safety: ensure players always have the compass
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!hasBackpackItem(player)) giveBackpackItem(player);
  }
}, 100);

broadcast("§a§l[BACKPACK] v2.2.0 - Gộp ID + Nhập số lượng + VN time (UTC+7)");
