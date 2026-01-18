import { system, world, ItemStack,DimensionTypes  } from "@minecraft/server";
import { ActionFormData, MessageFormData } from '@minecraft/server-ui';
import { QIDB } from './QIDB.js';


const chestDB = new QIDB("infiniteChest", 256, 1);

function migrateOldStorageToQIDB(player){
	try {
		const migratedKey = "infiniteChest:migrated";
		if (player.getDynamicPropertyIds().includes(migratedKey)) return;
		const manager = world.structureManager;
		const dims = DimensionTypes.getAll().map(d=>world.getDimension(d.typeId));
		const ids = player.getDynamicPropertyIds();
		const groupIndices = new Set();
		ids.forEach((id)=>{
			if (id.startsWith("entityid:page")){
				try {
					const m = id.match(/^entityid:page(\d+),/);
					if (m) groupIndices.add(parseInt(m[1]));
				}catch{}
			}
		});
		// Also probe first few groups just in case
		for (let i=0;i<8;i++) groupIndices.add(i);
		for (const gi of groupIndices){
			const key = `${player.id.replace(/[^A-Za-z0-9_]/g, "_")}_${gi}`;
			let data = new Array(63*4).fill(undefined);
			let filled = false;
			// Try from live chest entity id property
			let chestEntityIdProp = ids.find(id=>id.startsWith(`entityid:page${gi},`));
			if (chestEntityIdProp){
				try {
					const entId = chestEntityIdProp.split(",")[1];
					const ent = world.getEntity(entId);
					if (ent && ent.isValid && ent.typeId === "chest:chest"){
						const inv = ent.getComponent("minecraft:inventory").container;
						for (let i=0;i<data.length;i++){
							try { data[i] = inv.getItem(i); } catch { data[i] = undefined; }
						}
						filled = true;
					}
				}catch{}
			}
			// Try structures with both naming schemes
			if (!filled){
				const names = [
					`chest:chest${JSON.stringify(gi)}${player.id}`,
					`chest:chest${gi}${player.id}`,
					`chest:chest0${player.id}`
				];
				for (const name of names){
					try {
						if (!manager.get(name)) continue;
						// Place near player at y=125 then read
						const loc = { x: player.location.x, y: 125, z: player.location.z };
						manager.place(name, player.dimension, loc, { includeEntities: true });
						const placed = player.dimension.getEntitiesAtBlockLocation(loc) || [];
						for (const e of placed){
							if (e.typeId === "chest:chest"){
								const inv = e.getComponent("minecraft:inventory").container;
								for (let i=0;i<data.length;i++){
									try { data[i] = inv.getItem(i); } catch { data[i] = undefined; }
								}
								filled = true;
								e.remove();
							}
						}
						manager.delete(name);
						if (filled) break;
					}catch{}
				}
			}
			// If any content found, persist to QIDB
			if (filled){
				// Trim trailing undefined to keep fixed 252 slots but ok as undefineds
				chestDB.set(key, data);
			}
		}
		// Cleanup: remove old dynamic properties and entities
		ids.forEach((id)=>{ if (id.startsWith("entityid:page")) player.setDynamicProperty(id, undefined); });
		for (const dim of dims){
			try {
				const chestEntities = dim.getEntities({ type: "chest:chest", tags: [player.id] });
				for (const e of chestEntities) e.remove();
			}catch{}
		}
		player.setDynamicProperty(migratedKey, true);
	} catch {}
}

// Tracks how many pages the player has visited
const PAGE_COUNT_PROP = "infiniteChest:pages";

// Updates the stored page count if the visited page index is higher
function updateVisitedPageCount(player, visitedPageIndex){
	try {
		let cur = player.getDynamicProperty(PAGE_COUNT_PROP);
		if (typeof cur !== "number" || !isFinite(cur) || cur < 1) cur = 1;
		const next = Math.max(cur, visitedPageIndex + 1);
		if (next !== cur) player.setDynamicProperty(PAGE_COUNT_PROP, next);
	} catch {}
}

// Estimates pages from existing saved groups and legacy ids
function estimatePagesFromExisting(player){
	let maxGroup = -1;
	try {
		const pid = player.id.replace(/[^A-Za-z0-9_]/g, "_");
		const prefix = pid + "_";
		const keys = chestDB.keys();
		for (const k of keys){
			if (!k.startsWith(prefix)) continue;
			const gi = parseInt(k.slice(prefix.length));
			if (!isNaN(gi)) maxGroup = Math.max(maxGroup, gi);
		}
	} catch {}
	return (maxGroup >= 0) ? ((maxGroup + 1) * 4) : 1;
}

// Initializes the page count if it is missing
function initPageCountIfMissing(player){
	try {
		let cur = player.getDynamicProperty(PAGE_COUNT_PROP);
		if (typeof cur === "number" && isFinite(cur) && cur >= 1) return;
		const estimate = estimatePagesFromExisting(player);
		player.setDynamicProperty(PAGE_COUNT_PROP, estimate);
	} catch {}
}

// Filter slot index and helper to give items back to player
const FILTER_SLOT = 75;
function giveItemToPlayerOrDrop(player, item){
	try {
		const inv = player.getComponent("minecraft:inventory").container;
		const rem = inv.addItem(item);
		if (rem) player.dimension.spawnItem(rem, player.location);
	} catch {
		try { player.dimension.spawnItem(item, player.location); } catch {}
	}
}

class InfiniteChest {
	constructor(player, db){
		this.player = player;
		this.db = db;
		this.tempEntity = undefined;
		this.page = 0;
		this.filterTypeId = undefined;
		this.filterItems = [];
		this.filterPage = 0;
		this.filterItem = undefined;
		this.preFilterPage = undefined;
		this.openedFromItem = false;
	}
	static groupIndex(page){ return Math.floor(page/4); }
	static keyForGroup(playerId, groupIndex){ return `${playerId.replace(/[^A-Za-z0-9_]/g, "_")}_${groupIndex}`; }
	get tempInv(){ return this.tempEntity?.getComponent("minecraft:inventory")?.container; }
	ensureTempEntity(blockLookedAt, faceLocation){
		const targetLocation = {
			x: blockLookedAt.location.x + faceLocation.x,
			y: blockLookedAt.location.y + faceLocation.y,
			z: blockLookedAt.location.z + faceLocation.z
		};
		this.ensureTempEntityAt(targetLocation, false);
	}
	ensureTempEntityAt(targetLocation, openedFromItem){
		// if locked, do nothing
		let locked = false;
		if (this.tempEntity) {
			try { locked = this.tempEntity.getTags().some(t=>t.startsWith("locked")); } catch {}
		}
		if (locked) return;
		// Proactively sweep any orphaned temp chests for this player, keeping current one if present
		try { chestManager.sweepPlayerTempChests(this.player, this.tempEntity?.id); } catch {}
		let exist = false; let entityId;
		this.player.getDynamicPropertyIds().forEach((element) => {
			if (element.startsWith("temp_chest:")) { exist = true; entityId = element.replace("temp_chest:", ""); }
		});
		if (!exist) {
			let entity = this.player.dimension.spawnEntity("chest:temp_chest", targetLocation);
			entity.addTag("player:" + this.player.id);
			const tameable = entity.getComponent("minecraft:tameable");
			tameable.tame(this.player);
			let key = "temp_chest:" + entity.id;
			this.player.setDynamicProperty(key, key);
			entity.addTag("page:0");
			entity.nameTag = "§c§h§e§s§t§l§cRương Vô Hạn";
			this.tempEntity = entity;
			this.page = 0;
			this.openedFromItem = openedFromItem;
			this.preparePage(0);
		} else {
			try {
				let entity = world.getEntity(entityId);
				this.tempEntity = entity;
				let z= targetLocation.z;
				let y= targetLocation.y;
				let x= targetLocation.x;
				if (entity.location.x != Math.floor(x) && entity.location.y != Math.floor(y) && entity.location.z != Math.floor(z)) {
					entity.teleport({x: x,y: y,z: z});
				}
				this.openedFromItem = openedFromItem;
			} catch {
				this.cleanup(true);
			}
		}
	}
	preparePage(page){
		if (!this.tempEntity?.isValid) return;
		const inv = this.tempInv;
		const groupIndex = InfiniteChest.groupIndex(page);
		const key = InfiniteChest.keyForGroup(this.player.id, groupIndex);
		let data = [];
		try {
			const val = this.db.get(key);
			data = Array.isArray(val) ? val : (val ? [val] : []);
		} catch { data = []; }
		
		// Validate and clean the data to prevent invalid types
		if (Array.isArray(data)) {
			data = data.map(item => {
				try {
					// Only keep valid items, filter out any corrupted data
					if (item && typeof item === 'object' && item.typeId && typeof item.typeId === 'string') {
						return item;
					}
					return undefined;
				} catch {
					return undefined;
				}
			});
		} else {
			data = [];
		}
		
		// If filtering, render from cached filterItems instead of raw page data
		if (this.filterTypeId) {
			this.renderFiltered(page);
			return;
		}
		
		const totalSlots = 63 * 4; if (data.length < totalSlots) data.length = totalSlots;
		for (let i = 0 + 63 * (page % 4); i < 63 * ((page % 4) + 1); i++) {
			try { 
				if (data[i] && data[i].typeId) {
					inv.setItem(i - 63 * (page % 4), data[i]); 
				} else {
					inv.setItem(i - 63 * (page % 4), undefined); 
				}
			} catch { inv.setItem(i - 63 * (page % 4), undefined); }
		}
		let item = new ItemStack("chest:next_page", 1); item.nameTag = "§l§3Trang §a" + JSON.stringify(page + 2); item.setLore(["§r§7Sang trang tiếp theo"]); inv.setItem(64, item);
		
		// Show lock item when unlocked, unlock item when locked
		if (this.tempEntity.hasTag("locked")) {
			item = new ItemStack("chest:unlock", 1); 
			item.nameTag = "§l§3Mở khóa rương"; 
			item.setLore(["§r§7Bấm để mở khóa rương"]);
		} else {
			item = new ItemStack("chest:lock", 1); 
			item.nameTag = "§l§3Khóa rương"; 
			item.setLore(["§r§7Bấm để khóa rương", "§r§7Cho phép rương hoạt động với phễu"]);
		}
		inv.setItem(65, item);
		
		item = new ItemStack("chest:arrow", 5); item.nameTag = "§aLấy 5 vật phẩm"; inv.setItem(66, item);
		item = new ItemStack("chest:arrow", 18); item.nameTag = "§aLấy 18 vật phẩm"; inv.setItem(67, item);
		item = new ItemStack("chest:arrow", 36); item.nameTag = "§aLấy 36 vật phẩm"; inv.setItem(68, item);
		item = new ItemStack("chest:up", 9); item.nameTag = "§aChuyển hàng này"; inv.setItem(69, item); inv.setItem(70, item); inv.setItem(71, item); inv.setItem(72, item);
		
		// Add triple page navigation buttons
		item = new ItemStack("chest:triple_left", 1); 
		item.nameTag = "§l§3Trang §a" + JSON.stringify(Math.max(0, page - 9)); 
		item.setLore(["§r§7Lùi 10 trang"]); 
		inv.setItem(73, item);
		
		item = new ItemStack("chest:triple_right", 1); 
		item.nameTag = "§l§3Trang §a" + JSON.stringify(page + 11); 
		item.setLore(["§r§7Tiến 10 trang"]); 
		inv.setItem(74, item);
		
		if (page > 0) { let pitem = new ItemStack("chest:previous_page", 1); pitem.nameTag = "§l§3Trang §a" + JSON.stringify(page); pitem.setLore(["§r§7Quay lại trang trước"]); inv.setItem(63, pitem); } else { inv.setItem(63, undefined); }
		let entitytags = this.tempEntity.getTags();
		entitytags.forEach((element) => { if (element.startsWith("page:")) this.tempEntity.removeTag(element); });
		if (!this.tempEntity.hasTag("prepared")) this.tempEntity.addTag("prepared");
		this.tempEntity.addTag("page:" + JSON.stringify(page));
		this.page = page;
		updateVisitedPageCount(this.player, page);
		// put back filter item if filtering
		if (this.filterItem) {
			try { inv.setItem(FILTER_SLOT, this.filterItem); } catch {}
		} else {
			// ensure the filter slot stays untouched; if empty, leave empty
			try { const f = inv.getItem(FILTER_SLOT); if (!f) {} } catch {}
		}
	}

	// Builds cached filtered items list
	buildFilterItems(){
		this.filterItems = [];
		if (!this.filterTypeId) return;
		try {
			const pid = this.player.id.replace(/[^A-Za-z0-9_]/g, "_");
			const prefix = pid + "_";
			const keys = this.db.keys().filter(k=>k.startsWith(prefix));
			keys.sort((a,b)=>{
				const ai = parseInt(a.slice(prefix.length));
				const bi = parseInt(b.slice(prefix.length));
				return ai - bi;
			});
			for (const k of keys){
				let val = [];
				try { const v = this.db.get(k); val = Array.isArray(v) ? v : (v ? [v] : []); } catch { val = []; }
				for (let i=0;i<val.length;i++){
					const it = val[i];
					if (!it || typeof it !== 'object' || typeof it.typeId !== 'string') continue;
					if (it.typeId !== this.filterTypeId) continue;
					try { this.filterItems.push({ item: it, key: k, index: i }); } catch {}
				}
			}
		} catch {}
	}

	// Renders the filtered list on the given page
	renderFiltered(page){
		const inv = this.tempInv; if (!inv) return;
		if (!this.filterItems || !Array.isArray(this.filterItems)) this.filterItems = [];
		const perPage = 63;
		const total = this.filterItems.length;
		const maxPageIndex = Math.max(0, Math.ceil(total / perPage) - 1);
		this.filterPage = Math.min(Math.max(0, page), maxPageIndex);
		const start = this.filterPage * perPage;
		this.filterDisplayStart = start;
		// clear display slots
		for (let i=0;i<63;i++){
			try { inv.setItem(i, undefined); } catch {}
		}
		// fill items for current filter page
		const end = Math.min(start + perPage, total);
		for (let i=start;i<end;i++){
			try { inv.setItem(i - start, this.filterItems[i].item); } catch {}
		}
		// navigation conditionally
		if (this.filterPage > 0) {
			let p = new ItemStack("chest:previous_page", 1); p.nameTag = "§l§3Trang §a" + JSON.stringify(this.filterPage); p.setLore(["§r§7Trang lọc trước"]); inv.setItem(63, p);
		} else { inv.setItem(63, undefined); }
		if (this.filterPage < maxPageIndex) {
			let n = new ItemStack("chest:next_page", 1); n.nameTag = "§l§3Trang §a" + JSON.stringify(this.filterPage + 2); n.setLore(["§r§7Trang lọc tiếp theo"]); inv.setItem(64, n);
		} else { inv.setItem(64, undefined); }
		// lock/unlock and take buttons in filter mode
		let item;
		if (this.tempEntity.hasTag("locked")) {
			item = new ItemStack("chest:unlock", 1); 
			item.nameTag = "§l§3Mở khóa rương"; 
			item.setLore(["§r§7Bấm để mở khóa rương"]);
		} else {
			item = new ItemStack("chest:lock", 1); 
			item.nameTag = "§l§3Khóa rương"; 
			item.setLore(["§r§7Bấm để khóa rương", "§r§7Cho phép rương hoạt động với phễu"]);
		}
		inv.setItem(65, item);
		item = new ItemStack("chest:arrow", 5); item.nameTag = "§aLấy 5 vật phẩm"; inv.setItem(66, item);
		item = new ItemStack("chest:arrow", 18); item.nameTag = "§aLấy 18 vật phẩm"; inv.setItem(67, item);
		item = new ItemStack("chest:arrow", 36); item.nameTag = "§aLấy 36 vật phẩm"; inv.setItem(68, item);
		for (let i=69;i<=74;i++){
			try { inv.setItem(i, undefined); } catch {}
		}
		// keep filter item visible
		if (this.filterItem) {
			try { inv.setItem(FILTER_SLOT, this.filterItem); } catch {}
		}
		// tags and page index
		let entitytags = this.tempEntity.getTags();
		entitytags.forEach((element) => { if (element.startsWith("page:")) this.tempEntity.removeTag(element); });
		if (!this.tempEntity.hasTag("prepared")) this.tempEntity.addTag("prepared");
		this.tempEntity.addTag("page:" + JSON.stringify(this.filterPage));
		this.page = this.filterPage;
		updateVisitedPageCount(this.player, this.page);
	}

	// Syncs filtered UI changes back to the original storage
	syncFilteredChanges(){
		if (!this.filterTypeId) return false;
		const inv = this.tempInv; if (!inv) return false;
		let changed = false;
		const perPage = 63;
		const start = this.filterDisplayStart || (this.filterPage * perPage) || 0;
		for (let ui = 0; ui < 63; ui++){
			const modelIndex = start + ui;
			let actual;
			try { actual = inv.getItem(ui); } catch { actual = undefined; }
			// If this UI slot is beyond filtered list, return any item
			if (!this.filterItems || modelIndex >= this.filterItems.length){
				if (actual) { giveItemToPlayerOrDrop(this.player, actual); try { inv.setItem(ui, undefined); } catch {} }
				continue;
			}
			const entry = this.filterItems[modelIndex];
			const expected = entry.item;
			// If expected is empty here, any item in UI is wrong location
			if (!expected){
				if (actual) { giveItemToPlayerOrDrop(this.player, actual); try { inv.setItem(ui, undefined); } catch {} }
				continue;
			}
			const expectedTid = expected?.typeId;
			const expectedAmt = expected?.amount || 0;
			const actualTid = actual?.typeId;
			const actualAmt = actual ? (actual.amount || 0) : 0;
			// Wrong type in filtered slot: give back and restore expected
			if (actual && actualTid !== this.filterTypeId){
				giveItemToPlayerOrDrop(this.player, actual);
				try { inv.setItem(ui, expected); } catch {}
				continue;
			}
			// No item: full removal
			if (!actual){
				// Persist removal
				let arr = [];
				try { const v = this.db.get(entry.key); arr = Array.isArray(v) ? v.slice() : (v ? [v] : []); } catch { arr = []; }
				const totalSlots = 63 * 4; if (arr.length < totalSlots) arr.length = totalSlots; if (arr.length > totalSlots) arr.length = totalSlots;
				arr[entry.index] = undefined;
				try { this.db.set(entry.key, arr); } catch {}
				entry.item = undefined;
				changed = true;
				continue;
			}
			// Same filtered type
			if (actualTid === this.filterTypeId){
				// Clamp increases: return overflow
				if (actualAmt > expectedAmt){
					const overflow = actualAmt - expectedAmt;
					try {
						const give = new ItemStack(this.filterTypeId, overflow);
						giveItemToPlayerOrDrop(this.player, give);
						// restore expected amount in UI
						inv.setItem(ui, expected);
					} catch {}
					continue;
				}
				// Persist decreased amount
				if (actualAmt !== expectedAmt){
					let arr = [];
					try { const v = this.db.get(entry.key); arr = Array.isArray(v) ? v.slice() : (v ? [v] : []); } catch { arr = []; }
					const totalSlots = 63 * 4; if (arr.length < totalSlots) arr.length = totalSlots; if (arr.length > totalSlots) arr.length = totalSlots;
					arr[entry.index] = actualAmt > 0 ? actual : undefined;
					try { this.db.set(entry.key, arr); } catch {}
					entry.item = actualAmt > 0 ? actual : undefined;
					changed = true;
				}
			}
		}
		return changed;
	}
	// Persists only decreases for matching filtered items (no UI changes, no give/drop)
	syncFilteredDeltas(){
		if (!this.filterTypeId) return false;
		const inv = this.tempInv; if (!inv) return false;
		let changed = false;
		const perPage = 63;
		const start = this.filterDisplayStart || (this.filterPage * perPage) || 0;
		for (let ui = 0; ui < 63; ui++){
			const modelIndex = start + ui;
			if (!this.filterItems || modelIndex >= this.filterItems.length) continue;
			const entry = this.filterItems[modelIndex];
			const expected = entry.item;
			if (!expected) continue;
			let actual;
			try { actual = inv.getItem(ui); } catch { actual = undefined; }
			const expectedTid = expected?.typeId;
			const expectedAmt = expected?.amount || 0;
			const actualTid = actual?.typeId;
			const actualAmt = (actual && actualTid === this.filterTypeId) ? (actual.amount || 0) : 0;
			// Only persist decreases or removals of the same filtered type
			if (actualTid !== this.filterTypeId) continue;
			if (actualAmt === expectedAmt) continue;
			if (actualAmt > expectedAmt) continue; // increases handled later on navigation/exit
			let arr = [];
			try { const v = this.db.get(entry.key); arr = Array.isArray(v) ? v.slice() : (v ? [v] : []); } catch { arr = []; }
			const totalSlots = 63 * 4; if (arr.length < totalSlots) arr.length = totalSlots; if (arr.length > totalSlots) arr.length = totalSlots;
			arr[entry.index] = actualAmt > 0 ? actual : undefined;
			try { this.db.set(entry.key, arr); } catch {}
			entry.item = actualAmt > 0 ? actual : undefined;
			changed = true;
		}
		return changed;
	}
	savePage(){
		if (!this.tempEntity?.isValid) return;
		// Do not save when filtering, just keep UI
		if (this.filterTypeId) return;
		const inv = this.tempInv;
		const page = this.page;
		const groupIndex = InfiniteChest.groupIndex(page);
		const key = InfiniteChest.keyForGroup(this.player.id, groupIndex);
		let data = [];
		try {
			const existing = this.db.get(key);
			data = Array.isArray(existing) ? existing.slice() : (existing ? [existing] : []);
		} catch {}
		const totalSlots = 63 * 4; if (data.length < totalSlots) data.length = totalSlots; if (data.length > totalSlots) data.length = totalSlots;
		const start = 0 + 63 * (page % 4);
		const end = 63 * ((page % 4) + 1);
		for (let i = start; i < end; i++) {
			try {
				let item = inv.getItem(i - start);
				if (!item) { data[i] = undefined; continue; }
				const tid = item.typeId;
				if (tid.includes("chest:next_page") || tid.includes("chest:previous_page") || tid.includes("chest:lock") || tid.includes("chest:unlock") || tid.includes("chest:triple_right") || tid.includes("chest:triple_left") || tid.includes("chest:arrow") || tid.includes("chest:up")) data[i] = undefined; else data[i] = item;
			} catch { data[i] = undefined; }
		}
		this.db.set(key, data);
	}
	nextPage(){ this.savePage(); this.preparePage(this.page + 1); }
	prevPage(){ if (this.page === 0) return; this.savePage(); this.preparePage(this.page - 1); }
	nextPage10(){ this.savePage(); this.preparePage(this.page + 10); }
	prevPage10(){ 
		if (this.page < 10) {
			this.savePage(); 
			this.preparePage(0); 
		} else {
			this.savePage(); 
			this.preparePage(this.page - 10); 
		}
	}
	toggleLock(){
		const inv = this.tempInv; if (!inv) return;
		let locked = false; this.tempEntity.getTags().forEach(t=>{ if (t.startsWith("locked")) locked = true; });
		if (!locked) { 
			this.player.sendMessage("Đã khóa rương"); 
			clearItems(this.player); 
			this.tempEntity.addTag("locked"); 
			// Manually change to unlock item
			let item = new ItemStack("chest:unlock", 1); 
			item.nameTag = "§l§3Mở khóa rương"; 
			item.setLore(["§r§7Bấm để mở khóa rương"]);
			inv.setItem(65, item);
		}
		else { 
			this.player.sendMessage("Đã mở khóa rương"); 
			clearItems(this.player); 
			this.tempEntity.removeTag("locked"); 
			// Manually change to lock item
			let item = new ItemStack("chest:lock", 1); 
			item.nameTag = "§l§3Khóa rương"; 
			item.setLore(["§r§7Bấm để khóa rương", "§r§7Cho phép rương hoạt động với phễu"]);
			inv.setItem(65, item);
		}
	}
	handleEntityRaycast(tempEntity){
		if (!this.tempEntity || !tempEntity || !this.tempEntity.id.startsWith(tempEntity.id)) return;
		let prepared = this.tempEntity.getTags().some(t=>t.startsWith("prepared"));
		if (!prepared) { this.preparePage(0); return; }
		const inv = this.tempInv; if (!inv) return;
		
		// detect filter slot item
		try {
			const fItem = inv.getItem(FILTER_SLOT);
			const fTid = fItem?.typeId;
			const prevTid = this.filterTypeId;
			if (fTid && (!prevTid || prevTid !== fTid)){
				// Save any pending changes from normal mode before entering filter mode
				this.savePage();
				this.filterTypeId = fTid;
				this.filterItem = fItem;
				this.preFilterPage = this.page; // Store the current page before entering filter mode
				this.buildFilterItems();
				this.filterPage = 0;
				this.renderFiltered(this.filterPage);
				return;
			}
			if (!fTid && this.filterTypeId){
				// exiting filter mode
				this.syncFilteredChanges();
				const backPage = (typeof this.preFilterPage === "number") ? this.preFilterPage : this.page;
				this.filterTypeId = undefined;
				this.filterItems = [];
				this.filterItem = undefined;
				this.preparePage(backPage);
				this.preFilterPage = undefined;
				return;
			}
			// do not force reinsert here; only restore during prepare/render
		} catch {}
		
		// filter-mode navigation
		if (this.filterTypeId){
			const total = (this.filterItems && Array.isArray(this.filterItems)) ? this.filterItems.length : 0;
			const perPage = 63;
			const maxPageIndex = Math.max(0, Math.ceil(total / perPage) - 1);
			// next filtered page (slot 64)
			if (this.filterPage < maxPageIndex) {
				try { const item = inv.getItem(64); if (!item?.typeId?.startsWith("chest:next_page")) { clearItems(this.player); this.syncFilteredDeltas(); this.syncFilteredChanges(); this.filterPage = this.filterPage + 1; this.renderFiltered(this.filterPage); } } catch { clearItems(this.player); this.syncFilteredDeltas(); this.syncFilteredChanges(); this.filterPage = this.filterPage + 1; this.renderFiltered(this.filterPage); }
			}
			// prev filtered page (slot 63)
			if (this.filterPage > 0) {
				try { const item = inv.getItem(63); if (!item?.typeId?.startsWith("chest:previous_page")) { clearItems(this.player); this.syncFilteredDeltas(); this.syncFilteredChanges(); this.filterPage = Math.max(0, this.filterPage - 1); this.renderFiltered(this.filterPage); } } catch { clearItems(this.player); this.syncFilteredDeltas(); this.syncFilteredChanges(); this.filterPage = Math.max(0, this.filterPage - 1); this.renderFiltered(this.filterPage); }
			}
			// take items 66..68 in filtered mode
			const playerInv = this.player.getComponent("minecraft:inventory").container;
			for (let i = 66; i < 69; i++) {
				try { const item = inv.getItem(i); if (!item.typeId.startsWith("chest:arrow")) { clearItems(this.player); takeItems(i-66, inv, playerInv, this.player); /* persist decreases only */ this.syncFilteredDeltas(); } } catch { clearItems(this.player); takeItems(i-66, inv, playerInv, this.player); this.syncFilteredDeltas(); }
			}
			// lock/unlock button (65) in filtered mode
			try { 
				const item = inv.getItem(65); 
				if (!item.typeId.startsWith("chest:lock") && !item.typeId.startsWith("chest:unlock")) { 
					clearItems(this.player); 
					this.toggleLock(); 
				}
			} catch { 
				clearItems(this.player); 
				this.toggleLock(); 
			}
			return;
		}
		
		// normal-mode buttons
		// next page button
		try { const item = inv.getItem(64); if (!item.typeId.startsWith("chest:next_page")) { clearItems(this.player); this.savePage(); this.nextPage(); } } catch { clearItems(this.player); this.savePage(); this.nextPage(); }
		// prev page button
		if (this.page > 0) {
			try { const item = inv.getItem(63); if (!item.typeId.startsWith("chest:previous_page")) { clearItems(this.player); this.savePage(); this.prevPage(); } } catch { clearItems(this.player); this.savePage(); this.prevPage(); }
		}
		// take items 66..68
		const playerInv = this.player.getComponent("minecraft:inventory").container;
		for (let i = 66; i < 69; i++) {
			try { const item = inv.getItem(i); if (!item.typeId.startsWith("chest:arrow")) { clearItems(this.player); takeItems(i-66, inv, playerInv, this.player); clearContainer(inv, this.player); } } catch { clearItems(this.player); takeItems(i-66, inv, playerInv, this.player); clearContainer(inv, this.player); }
		}
		// move items 69..72
		for (let i = 69; i < 73; i++) {
			try { const item = inv.getItem(i); if (!item.typeId.startsWith("chest:up")) { clearItems(this.player); moveItems(i-69, inv, playerInv, this.player); clearContainer(inv, this.player); } } catch { clearItems(this.player); moveItems(i-69, inv, playerInv, this.player); clearContainer(inv, this.player); }
		}
		// triple page navigation buttons (73, 74)
		try { 
			const item = inv.getItem(73); 
			if (!item.typeId.startsWith("chest:triple_left")) { 
				clearItems(this.player); 
				this.prevPage10(); 
				clearContainer(inv, this.player); 
			} 
		} catch { 
			clearItems(this.player); 
			this.prevPage10(); 
			clearContainer(inv, this.player); 
		}
		
		try { 
			const item = inv.getItem(74); 
			if (!item.typeId.startsWith("chest:triple_right")) { 
				clearItems(this.player); 
				this.nextPage10(); 
				clearContainer(inv, this.player); 
			} 
		} catch { 
			clearItems(this.player); 
			this.nextPage10(); 
			clearContainer(inv, this.player); 
		}
		
		// lock/unlock button (65)
		try { 
			const item = inv.getItem(65); 
			if (!item.typeId.startsWith("chest:lock") && !item.typeId.startsWith("chest:unlock")) { 
				clearItems(this.player); 
				this.toggleLock(); 
				clearContainer(inv, this.player);
			} 
		} catch { 
			clearItems(this.player); 
			this.toggleLock(); 
			clearContainer(inv, this.player);
		}
	}
	cleanup(force){
		let raycastHit = this.player.getBlockFromViewDirection();
		if (force || (raycastHit?.block?.isValid && (raycastHit.block.typeId != "chest:infinite_chest" || (this.player.isSneaking && !!this.tempEntity)))) {
			// Skip locked chests unless forced (guard invalid entity)
			let isLocked = false;
			try { if (this.tempEntity?.isValid) isLocked = this.tempEntity.hasTag("locked"); } catch {}
			if (!force && isLocked) { return; }
			
			let tags = this.player.getDynamicPropertyIds();
			let entity;
			tags.forEach((element)=>{ if (element.startsWith("temp_chest:")) { let entityId = element.replace("temp_chest:", ""); this.player.setDynamicProperty(element, undefined); entity = world.getEntity(entityId); } });
			try {
				let prepared = false;
				try { if (entity?.isValid) prepared = entity.hasTag("prepared"); } catch {}
				let page = this.page;
				if (prepared && this.tempEntity?.isValid) { const inv = this.tempInv; clearItems(this.player); if (this.filterTypeId) { this.syncFilteredChanges(); } else { this.savePage(); } }
				// Return filter item, if present
				try { const f = entity?.getComponent("minecraft:inventory")?.container?.getItem(FILTER_SLOT); if (f) giveItemToPlayerOrDrop(this.player, f); } catch {}
			} catch {}
			try { entity?.remove(); } catch {}
			this.tempEntity = undefined;
			// reset filter state
			this.filterTypeId = undefined;
			this.filterItems = [];
			this.filterItem = undefined;
			this.preFilterPage = undefined; // Clear the preFilterPage
			this.filterPage = 0;
			this.filterDisplayStart = 0;
			this.openedFromItem = false;
			// As a safety net, sweep any leftover orphaned entities when forced
			if (force) { try { chestManager.sweepPlayerTempChests(this.player); } catch {} }
		}
	}
	static updateAdjacentLockBlocks(){
		let dimensions = DimensionTypes.getAll();
		for (let dimension of dimensions) {
			let dimen = world.getDimension(dimension.typeId);
			let entities = dimen.getEntities({type : "chest:temp_chest"});
			for (const entity of entities) {
				let inventory = entity.getComponent("minecraft:inventory").container;
				let shouldlock = true;
				for (let i=0;i<63;i++) {
					try { inventory.getItem(i).typeId; shouldlock = false; }catch {}
				}
				let target = entity.location;
				for (let dx = -1; dx <= 1; dx++) {
					for (let dy = -1; dy <= 1; dy++) {
						for (let dz = -1; dz <= 1; dz++) {
							let x = target.x + dx;
							let y = target.y + dy;
							let z = target.z + dz;
							const block = dimen.getBlock({x:x, y:y, z:z});
							try { block.setPermutation ( block.permutation.withState ( "toggle_bit", shouldlock )); } catch {}
						}
					}
				}
			}
		}
	}
}

class InfiniteChestManager {
	constructor(db){ this.db = db; this.instances = new Map(); this.playerTickDelays = new Map(); }
	get(player){ if (!this.instances.has(player.id)) this.instances.set(player.id, new InfiniteChest(player, this.db)); return this.instances.get(player.id); }
	
	// Add function to save and delete temp entity data
	saveAndDeleteTempEntity(player) {
		try {
			const propIds = player.getDynamicPropertyIds();
			for (const id of propIds) {
				if (!id.startsWith("temp_chest:")) continue;
				const entityId = id.replace("temp_chest:", "");
				try {
					const entity = world.getEntity(entityId);
					if (entity && entity.isValid && entity.typeId === "chest:temp_chest") {
						// Save the data before deleting
						const inv = entity.getComponent("minecraft:inventory")?.container;
						if (inv) {
							const tags = entity.getTags();
							const pageTag = tags.find(t => t.startsWith("page:"));
							if (pageTag) {
								const page = parseInt(pageTag.replace("page:", ""));
								if (!isNaN(page)) {
									const groupIndex = InfiniteChest.groupIndex(page);
									const key = InfiniteChest.keyForGroup(player.id, groupIndex);
									let data = [];
									try {
										const existing = this.db.get(key);
										data = Array.isArray(existing) ? existing.slice() : (existing ? [existing] : []);
									} catch {}
									const totalSlots = 63 * 4; 
									if (data.length < totalSlots) data.length = totalSlots; 
									if (data.length > totalSlots) data.length = totalSlots;
									
									const start = 0 + 63 * (page % 4);
									const end = 63 * ((page % 4) + 1);
									for (let i = start; i < end; i++) {
										try {
											let item = inv.getItem(i - start);
											if (!item) { data[i] = undefined; continue; }
											
											// Enhanced validation to prevent corrupted data
											try {
												const tid = item.typeId;
												if (!tid || typeof tid !== 'string') {
													data[i] = undefined;
													continue;
												}
												
												if (tid.includes("chest:next_page") || tid.includes("chest:previous_page") || 
													tid.includes("chest:lock") || tid.includes("chest:unlock") || 
													tid.includes("chest:triple_right") || tid.includes("chest:triple_left") || 
													tid.includes("chest:arrow") || tid.includes("chest:up")) {
													data[i] = undefined;
												} else {
													// Additional validation to ensure item is properly structured
													if (item && typeof item === 'object' && item.typeId && typeof item.typeId === 'string') {
														data[i] = item;
													} else {
														data[i] = undefined;
													}
												}
											} catch {
											data[i] = undefined;
											}
										} catch { data[i] = undefined; }
									}
									
									// Clean the data array before saving to remove any undefined entries
									data = data.map(item => {
										try {
											if (item && typeof item === 'object' && item.typeId && typeof item.typeId === 'string') {
												return item;
											}
											return undefined;
										} catch {
											return undefined;
										}
									});
									
									this.db.set(key, data);
								}
							}
							// Return filter item, if present
							try { const f = inv.getItem(FILTER_SLOT); if (f) giveItemToPlayerOrDrop(player, f); } catch {}
						}
						// Remove the entity
						entity.remove();
					}
				} catch {}
				// Clear the dynamic property
				player.setDynamicProperty(id, undefined);
			}
		} catch {}
	}
	
	sweepPlayerTempChests(player, keepEntityId){
		try {
			// Clear dynamic properties for old temp chests, except the one we want to keep
			const propIds = player.getDynamicPropertyIds();
			for (const id of propIds){
				if (!id.startsWith("temp_chest:")) continue;
				if (keepEntityId && id === ("temp_chest:" + keepEntityId)) continue;
				player.setDynamicProperty(id, undefined);
			}
			// Remove any orphaned or owned temp chest entities across all dimensions
			const dims = DimensionTypes.getAll().map(d=>world.getDimension(d.typeId));
			for (const dim of dims){
				let entities = [];
				try { entities = dim.getEntities({ type: "chest:temp_chest" }) || []; } catch {}
				for (const e of entities){
					try {
						const tags = e.getTags();
						const hasOwnerTag = tags?.some(t => t.startsWith("player:"));
						const isOwnedByPlayer = tags?.some(t => t === ("player:" + player.id) || t.includes(player.id));
						// Remove if unowned OR owned by this player (unless keeping this specific id)
						if (!hasOwnerTag || (isOwnedByPlayer && !(keepEntityId && e.id === keepEntityId))){
							try { e.remove(); } catch {}
							try { player.setDynamicProperty("temp_chest:" + e.id, undefined); } catch {}
						}
					} catch {}
				}
			}
		} catch {}
	}

	forceCleanTempChests(){
		try {
			// Get all currently alive players
			const alivePlayers = world.getAllPlayers();
			const referencedIds = new Set();
			// Build set of temp chest ids referenced by alive players
			for (const p of alivePlayers){
				try {
					const propIds = p.getDynamicPropertyIds();
					for (const id of propIds){
						if (!id.startsWith("temp_chest:")) continue;
						referencedIds.add(id.replace("temp_chest:", ""));
					}
				} catch {}
			}
			// Remove any unreferenced temp chest entities across all dimensions
			const dims = DimensionTypes.getAll().map(d=>world.getDimension(d.typeId));
			for (const dim of dims){
				let entities = [];
				try { entities = dim.getEntities({ type: "chest:temp_chest" }) || []; } catch {}
				for (const e of entities){
					try {
						if (!e?.isValid) continue;
						const keep = referencedIds.has(e.id);
						if (keep) continue;
						// Remove unreferenced entity
						try { e.remove(); } catch {}
						// Clear any lingering dynamic properties pointing to this entity
						for (const p of alivePlayers){
							try {
								const propIds = p.getDynamicPropertyIds();
								for (const id of propIds){
									if (id === ("temp_chest:" + e.id)) { p.setDynamicProperty(id, undefined); break; }
								}
							} catch {}
						}
					} catch {}
				}
			}
		} catch {}
	}

	tick(){
		// Only process players who have passed their tick delay

		const currentTick = system.currentTick;
		for (const player of world.getAllPlayers()){
			const playerDelay = this.playerTickDelays.get(player.id);
			if (playerDelay && currentTick < playerDelay) continue;
			// Add safety check to ensure QIDB is ready
			try {
				// Test if the database is ready by checking if we can access it
				if (!this.db || typeof this.db.get !== 'function') {
					continue; // Skip this tick if database isn't ready
				}
			} catch {
				continue; // Skip this tick if there's any database error
			}
			
			const blockRay = player.getBlockFromViewDirection();
			const inst = this.get(player);
			
			// Improved raycast calculation
			const headLocation = player.getHeadLocation();
			const viewDirection = player.getViewDirection();
			// Use a more reliable raycast origin point
			const raycastOrigin = {
				x: headLocation.x + viewDirection.x * 0.5,
				y: headLocation.y + viewDirection.y * 0.5,
				z: headLocation.z + viewDirection.z * 0.5
			};
			
			const entityRaycast = player.dimension.getEntitiesFromRay(
				raycastOrigin, 
				viewDirection, 
				{type: "chest:temp_chest", maxDistance: 10}
			);
			
			if (blockRay?.block?.isValid) {
				if (blockRay.block.typeId === "chest:infinite_chest") {
					if (!player.isSneaking) {
						inst.ensureTempEntity(blockRay.block, blockRay.faceLocation);
					} else {
						// If sneaking while looking at the chest and a temp entity exists, cleanup
						if (inst.tempEntity) inst.cleanup(false);
					}
				} else {
					if (!inst.openedFromItem) {
						inst.cleanup(false);
					} else if (!isHoldingInfiniteChestItem(player)) {
						inst.cleanup(false);
					}
				}
			} else {
				if (!inst.openedFromItem) {
					inst.cleanup(false);
				} else if (!isHoldingInfiniteChestItem(player)) {
					inst.cleanup(false);
				}
			}
			
			// More robust entity raycast handling
			if (!player.isSneaking && entityRaycast && entityRaycast.length > 0) {
				const hitEntity = entityRaycast[0].entity;
				if (hitEntity && hitEntity.isValid && hitEntity.typeId === "chest:temp_chest") {
					inst.handleEntityRaycast(hitEntity);
				}
			}
		}
		InfiniteChest.updateAdjacentLockBlocks();
	}
}

// Initialize chestManager in worldLoad
let chestManager;

world.afterEvents.worldLoad.subscribe(() => {

});

world.afterEvents.itemUse.subscribe((data) => {
  if (data.itemStack.typeId == "chest:infinite_chest") {
	const player = data.source;
	ensureChestManager();
	const inst = chestManager?.get(player);
	if (!inst) return;
	const spawnLocation = getPortableChestLocation(player);
	inst.ensureTempEntityAt(spawnLocation, true);
	return;
  }
  if (data.itemStack.typeId == "chest:settings") {
    let player = data.source;
    let actionform = new ActionFormData().title("Cài đặt rương").button("§2Mở khóa").button("§gDọn dẹp").button("§cDọn dẹp cưỡng bức");
    actionform.show(player).then((response) =>{
      if (response.canceled) return;
      let tags = player.getDynamicPropertyIds();
      let entityId;
      let entity;
      tags.forEach((element) => {
        if (element.startsWith("temp_chest:")) {
          entityId = element.replace("temp_chest:", "");
        }
      });
      try {
        entity = world.getEntity(entityId);
      }
      catch {}
      if (response.selection == 0) {
        if (entity) {
          entity.removeTag("locked");
          player.sendMessage("§aĐã mở khóa");
        }
        else {
          player.sendMessage("§6Rương đã được mở khóa");
        }
      }
      else if (response.selection == 1) {
		// Save current temp chest data and return filter item, then sweep leftovers
		chestManager.saveAndDeleteTempEntity(player);
		chestManager.sweepPlayerTempChests(player);
      }
      else if (response.selection == 2) {
        // Force Clean option - show confirmation dialog
        const confirmForm = new MessageFormData()
          .title("§cXác nhận dọn dẹp cưỡng bức")
          .body("§7Thao tác này có thể ảnh hưởng đến rương chưa lưu của người chơi khác.\n\n§cBạn chắc chắn muốn tiếp tục?")
          .button1("§cCó, dọn dẹp cưỡng bức")
          .button2("§aHủy");
        
        confirmForm.show(player).then((confirmResponse) => {
          if (confirmResponse.canceled || confirmResponse.selection !== 0) {
            player.sendMessage("§6Đã hủy dọn dẹp cưỡng bức");
            return;
          }
          
          // Perform force clean
          chestManager.forceCleanTempChests();
          player.sendMessage("§aHoàn tất dọn dẹp cưỡng bức - đã xóa các rương tạm bị bỏ lại");
        }).catch((error) => {
          player.sendMessage("§cLỗi hiển thị hộp thoại xác nhận: " + error);
        });
      }
    })
  }
});

world.afterEvents.playerSpawn.subscribe((data) => {
  //convert old infinitechest data to 1.3
  if (data.initialSpawn) {
    let player = data.player;
    let tags = player.getTags();
    tags.forEach((element) => {
      if (element.startsWith("entityid:page")) {
        player.setDynamicProperty(element, element);
        player.removeTag(element);
      }
    });
	// Migrate old storage to QIDB (after existing 1.3 conversion)
	migrateOldStorageToQIDB(player);

	// Initialize page counter if missing
	initPageCountIfMissing(player);

	  // Add a small delay to ensure QIDB is fully initialized
	  ensureChestManager();
	// Set tick delay for this player (5 ticks delay)
	if (chestManager) {
		chestManager.playerTickDelays.set(player.id, system.currentTick + 5);
	}
	
	// Save and delete temp entity data with 2 tick delay
	system.runTimeout(() => {
		if (chestManager) {
			chestManager.saveAndDeleteTempEntity(player);
		}
	}, 2);
  }
});

// Legacy helpers used by class methods (keep): takeItems, moveItems, clearContainer, clearItems
function takeItems (x, temp,inv,player) {
  let array = ["minecraft:air","chest:previous_page","chest:next_page","chest:lock","chest:arrow", "chest:up"];
  for (let i =66; i<69; i++){
    try {
    let tid = temp.getItem(i).typeId;
    if (!array.includes(tid)){
      player.dimension.spawnItem(temp.getItem(i), player.location);
    }
  }
  catch {}
  }
  let item = new ItemStack("chest:arrow", 5);
  item.nameTag = "§aLấy 5 vật phẩm";
  temp.setItem(66, item);
  item = new ItemStack("chest:arrow", 18);
  item.nameTag = "§aLấy 18 vật phẩm";
  temp.setItem(67, item);
  item = new ItemStack("chest:arrow", 36);
  item.nameTag = "§aLấy 36 vật phẩm";
  temp.setItem(68, item);


  let arr = [5,18,36];
  let amount = arr[x];
  let taken = 0;
  for (let i =0; (taken<amount&&i<63); i++){
    try {
    let item = temp.getItem(i);
    if (item == undefined) continue;
    item.typeId;
    let rem = inv.addItem(item);
    temp.setItem(i,rem);
    taken++;  
    }catch {
    }
  }
}

function moveItems (x, temp,inv,player) {
  let array = ["minecraft:air","chest:previous_page","chest:next_page","chest:lock","chest:arrow", "chest:up"];
  for (let i =69; i<73; i++){
    try {
    let tid = temp.getItem(i).typeId;
    if (!array.includes(tid)){
      player.dimension.spawnItem(temp.getItem(i), player.location);
    }
  }
  catch {}
  }
  let item = new ItemStack("chest:up", 9);
  item.nameTag = "§aChuyển hàng này";
  temp.setItem(69, item);
  temp.setItem(70, item);
  temp.setItem(71, item);
  temp.setItem(72, item);

  let arr = [0,9,18,27];
  let amount = arr[x];

  for (let i =amount; i<amount+9; i++){
    try {
    let item = inv.getItem(i);
    if (item == undefined) continue;
    if (item.typeId == "minecraft:air") continue;
    item.typeId;
    let rem = temp.addItem(item);
    inv.setItem(i,rem);
 
    }catch {
    }
  }
}

function clearContainer(temp, player) {
	for (let i = 0 ; i< 63 ; i++) {
		let item = temp.getItem(i);
		if (item != undefined) {
			if (item.typeId == "chest:lock" || item.typeId == "chest:unlock" || item.typeId == "chest:triple_right" || item.typeId == "chest:triple_left" || item.typeId == "chest:arrow" || item.typeId == "chest:up") {
				temp.setItem(i, undefined);
			}
		}
	}
	system.runTimeout(()=>{
		clearItems(player);
	},3)
}

function clearItems(player) {
  player.runCommand("clear @s chest:next_page");
  player.runCommand("clear @s chest:previous_page");
  player.runCommand("clear @s chest:lock");
  player.runCommand("clear @s chest:unlock");
  player.runCommand("clear @s chest:triple_right");
  player.runCommand("clear @s chest:triple_left");
  player.runCommand("clear @s chest:arrow");
  player.runCommand("clear @s chest:up");
}

function getPortableChestLocation(player){
	const headLocation = player.getHeadLocation();
	const viewDirection = player.getViewDirection();
	return {
		x: headLocation.x + viewDirection.x * 1.6,
		y: headLocation.y + viewDirection.y * 0.2,
		z: headLocation.z + viewDirection.z * 1.6
	};
}

function isHoldingInfiniteChestItem(player){
	try {
		const inv = player.getComponent("minecraft:inventory")?.container;
		if (!inv) return false;
		const item = inv.getItem(player.selectedSlot);
		return item?.typeId === "chest:infinite_chest";
	} catch {
		return false;
	}
}

function ensureChestManager(){
	if (chestManager) return;
	chestManager = new InfiniteChestManager(chestDB);
	system.runInterval(() => {
		if (chestManager) {
			chestManager.tick();
		}
	}, 1);
}
