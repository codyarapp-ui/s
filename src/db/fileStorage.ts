import fs from "fs";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "public", "uploads", "db_store.json");

interface DbStoreSchema {
  technicians: any[];
  users: any[];
  orders: any[];
  broadcasts: any[];
  settings: Record<string, any>;
  deletedTombstones: string[];
  updatedAt: string;
}

let memoryStore: DbStoreSchema = {
  technicians: [],
  users: [],
  orders: [],
  broadcasts: [],
  settings: {},
  deletedTombstones: [],
  updatedAt: new Date().toISOString()
};

let isLoaded = false;

let lastMtimeMs = 0;

function loadStore(): DbStoreSchema {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      if (isLoaded && stats.mtimeMs === lastMtimeMs) {
        return memoryStore;
      }
      const raw = fs.readFileSync(STORAGE_FILE, "utf8");
      const content = (raw || "").trim();
      if (content && content.startsWith("{") && content.endsWith("}")) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed === "object") {
            memoryStore = {
              technicians: Array.isArray(parsed.technicians) ? parsed.technicians : [],
              users: Array.isArray(parsed.users) ? parsed.users : [],
              orders: Array.isArray(parsed.orders) ? parsed.orders : [],
              broadcasts: Array.isArray(parsed.broadcasts) ? parsed.broadcasts : [],
              settings: parsed.settings || {},
              deletedTombstones: Array.isArray(parsed.deletedTombstones) ? parsed.deletedTombstones : [],
              updatedAt: parsed.updatedAt || new Date().toISOString()
            };
            lastMtimeMs = stats.mtimeMs;
          }
        } catch (jsonErr) {
          console.warn("[FileStorage] Malformed db_store.json detected, resetting to initial memory state:", jsonErr);
          saveStore();
        }
      } else {
        // Empty or incomplete file, rewrite valid schema
        saveStore();
      }
    } else {
      saveStore();
    }
  } catch (err) {
    console.warn("[FileStorage] Error reading db_store.json (using memoryStore):", err);
  }
  isLoaded = true;
  return memoryStore;
}

function saveStore(): void {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    memoryStore.updatedAt = new Date().toISOString();
    const dataString = JSON.stringify(memoryStore, null, 2);
    const tempFile = `${STORAGE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, dataString, "utf8");
    fs.renameSync(tempFile, STORAGE_FILE);
  } catch (err) {
    console.error("[FileStorage] Error writing db_store.json:", err);
  }
}

export const FileStorage = {
  addTombstones(keys: (string | number | undefined | null)[]): void {
    const store = loadStore();
    if (!store.deletedTombstones) store.deletedTombstones = [];
    const set = new Set(store.deletedTombstones);
    for (const k of keys) {
      if (!k) continue;
      const str = String(k).trim();
      if (!str) continue;
      // Do not tombstone phone numbers! Real users/technicians must always be able to re-register with their phone number.
      if (/^(?:0|\+?98)?9\d{9}$/.test(str) || (str.length >= 10 && /^\d+$/.test(str) && str.includes('9'))) {
        continue;
      }
      set.add(str);
      const noTech = str.replace(/^tech_/, "");
      set.add(noTech);
      set.add(`tech_${noTech}`);
    }
    store.deletedTombstones = Array.from(set);
    saveStore();
  },

  removeTombstones(keys: (string | number | undefined | null)[]): void {
    const store = loadStore();
    if (!store.deletedTombstones || store.deletedTombstones.length === 0) return;
    const toRemove = new Set<string>();
    for (const k of keys) {
      if (!k) continue;
      const str = String(k).trim();
      if (!str) continue;
      toRemove.add(str);
      toRemove.add(str.replace(/^tech_/, ""));
      toRemove.add(`tech_${str.replace(/^tech_/, "")}`);
      toRemove.add(str.replace(/^0/, ""));
      if (!str.startsWith("0") && /^\d+$/.test(str)) {
        toRemove.add("0" + str);
      }
    }
    store.deletedTombstones = store.deletedTombstones.filter(t => !toRemove.has(String(t).trim()));
    saveStore();
  },

  isTombstone(key: string | number | undefined | null): boolean {
    if (!key) return false;
    const str = String(key).trim();
    if (!str) return false;
    // Phone numbers are never tombstones
    if (/^(?:0|\+?98)?9\d{9}$/.test(str) || (str.length >= 10 && /^\d+$/.test(str) && str.includes('9'))) {
      return false;
    }
    const store = loadStore();
    if (!store.deletedTombstones || store.deletedTombstones.length === 0) return false;
    const cleanNoTech = str.replace(/^tech_/, "");
    return store.deletedTombstones.some(t => {
      const tClean = String(t || "").trim();
      const tNoTech = tClean.replace(/^tech_/, "");
      return (
        tClean === str ||
        tNoTech === cleanNoTech
      );
    });
  },

  getTombstones(): string[] {
    const store = loadStore();
    return Array.isArray(store.deletedTombstones) ? [...store.deletedTombstones] : [];
  },

  getTechnicians(): any[] {
    const store = loadStore();
    if (!Array.isArray(store.technicians)) return [];
    return store.technicians.filter(t => 
      !this.isTombstone(t.id) && 
      !this.isTombstone(t.phone) && 
      !this.isTombstone(t.user_id || t.userId)
    );
  },

  findTechnicianById(id: string): any | null {
    if (!id || this.isTombstone(id)) return null;
    const store = loadStore();
    const cleanId = String(id).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const withTech = cleanId.startsWith("tech_") ? cleanId : `tech_${cleanId}`;
    const found = store.technicians.find(
      t => String(t.id) === cleanId ||
           String(t.id) === withoutTech ||
           String(t.id) === withTech ||
           String(t.user_id) === cleanId ||
           String(t.user_id) === withoutTech ||
           String(t.userId) === cleanId ||
           String(t.userId) === withoutTech ||
           String(t.phone) === cleanId ||
           String(t.user_code) === cleanId
    );
    if (!found || this.isTombstone(found.id) || this.isTombstone(found.phone) || this.isTombstone(found.user_id || found.userId)) {
      return null;
    }
    return found;
  },

  findTechnicianByPhone(phone: string): any | null {
    if (!phone || this.isTombstone(phone)) return null;
    const store = loadStore();
    const clean = String(phone).trim().replace(/^0/, "");
    const found = store.technicians.find(
      t => {
        const tPhone = String(t.phone || "").trim().replace(/^0/, "");
        return tPhone && tPhone === clean;
      }
    );
    if (!found || this.isTombstone(found.id) || this.isTombstone(found.phone) || this.isTombstone(found.user_id || found.userId)) {
      return null;
    }
    return found;
  },

  saveTechnician(tech: any): any {
    if (!tech) return null;
    if (this.isTombstone(tech.id) || this.isTombstone(tech.phone) || this.isTombstone(tech.user_id || tech.userId)) {
      return null;
    }
    const store = loadStore();
    if (!tech.id) return tech;
    const cleanId = String(tech.id).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const techPhone = tech.phone ? String(tech.phone).trim().replace(/^0/, "") : "";
    const index = store.technicians.findIndex(
      t => String(t.id) === cleanId ||
           String(t.id) === withoutTech ||
           String(t.user_id) === cleanId ||
           String(t.user_id) === withoutTech ||
           (techPhone && String(t.phone || "").trim().replace(/^0/, "") === techPhone)
    );
    if (index >= 0) {
      store.technicians[index] = { ...store.technicians[index], ...tech };
    } else {
      store.technicians.unshift(tech);
    }
    saveStore();
    return tech;
  },

  updateTechnician(idOrPhone: string, updates: any): any | null {
    const store = loadStore();
    const target = this.findTechnicianById(idOrPhone) || this.findTechnicianByPhone(idOrPhone);
    if (!target) {
      if (updates && (updates.id || idOrPhone)) {
        const newTech = { id: idOrPhone, ...updates };
        this.saveTechnician(newTech);
        return newTech;
      }
      return null;
    }
    const index = store.technicians.findIndex(t => String(t.id) === String(target.id));
    if (index >= 0) {
      store.technicians[index] = { ...store.technicians[index], ...updates };
      // Also sync is_verified / status with linked user if present
      const phone = store.technicians[index].phone;
      const userId = store.technicians[index].user_id || store.technicians[index].userId;
      if (phone || userId) {
        const userIdx = store.users.findIndex(u => (userId && String(u.id) === String(userId)) || (phone && String(u.phone).trim().replace(/^0/, "") === String(phone).trim().replace(/^0/, "")));
        if (userIdx >= 0) {
          if (updates.isVerified !== undefined || updates.is_verified !== undefined) {
            const vVal = updates.isVerified !== undefined ? (updates.isVerified ? 1 : 0) : updates.is_verified;
            store.users[userIdx].is_verified = vVal;
            store.users[userIdx].isVerified = Boolean(vVal);
          }
          if (updates.status !== undefined) {
            store.users[userIdx].status = updates.status;
          }
        }
      }
      saveStore();
      return store.technicians[index];
    }
    return null;
  },

  deleteTechnician(idOrPhone: string): boolean {
    if (!idOrPhone) return false;
    this.addTombstones([idOrPhone]);
    const store = loadStore();
    const cleanId = String(idOrPhone).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const cleanPhone = cleanId.replace(/^0/, "");
    const initialLen = store.technicians.length;
    store.technicians = store.technicians.filter(t => {
      const tId = String(t.id || "");
      const tUserId = String(t.user_id || t.userId || "");
      const tPhone = String(t.phone || "").replace(/^0/, "");
      if (tId === cleanId || tId === withoutTech || tId.replace(/^tech_/, "") === withoutTech) return false;
      if (tUserId === cleanId || tUserId === withoutTech || tUserId.replace(/^tech_/, "") === withoutTech) return false;
      if (cleanPhone && (tPhone === cleanPhone || tPhone === cleanId)) return false;
      if (this.isTombstone(t.id) || this.isTombstone(t.phone) || this.isTombstone(t.user_id || t.userId)) return false;
      return true;
    });
    if (store.technicians.length !== initialLen) {
      saveStore();
      return true;
    }
    return false;
  },

  getUsers(): any[] {
    const store = loadStore();
    if (!Array.isArray(store.users)) return [];
    return store.users.filter(u => 
      !this.isTombstone(u.id) && 
      !this.isTombstone(u.phone) && 
      !this.isTombstone(u.user_code || u.short_id)
    );
  },

  findUserById(id: string): any | null {
    if (!id || this.isTombstone(id)) return null;
    const store = loadStore();
    const clean = String(id).trim();
    const found = store.users.find(u => String(u.id) === clean || String(u.user_code) === clean);
    if (!found || this.isTombstone(found.id) || this.isTombstone(found.phone) || this.isTombstone(found.user_code)) {
      return null;
    }
    return found;
  },

  findUserByPhone(phone: string): any | null {
    if (!phone || this.isTombstone(phone)) return null;
    const store = loadStore();
    const clean = String(phone).trim();
    const cleanNoZero = clean.replace(/^0/, "");
    const cleanWithZero = clean.startsWith("0") ? clean : `0${clean}`;
    const found = store.users.find(
      u => String(u.phone) === clean ||
           String(u.phone) === cleanNoZero ||
           String(u.phone) === cleanWithZero
    );
    if (!found || this.isTombstone(found.id) || this.isTombstone(found.phone) || this.isTombstone(found.user_code)) {
      return null;
    }
    return found;
  },

  saveUser(user: any): any {
    if (this.isTombstone(user.id) || this.isTombstone(user.phone) || this.isTombstone(user.user_code)) {
      return null;
    }
    const store = loadStore();
    if (!user.id) return user;
    const index = store.users.findIndex(
      u => String(u.id) === String(user.id) ||
           (user.phone && String(u.phone) === String(user.phone))
    );
    if (index >= 0) {
      store.users[index] = { ...store.users[index], ...user };
    } else {
      store.users.unshift(user);
    }
    saveStore();
    return user;
  },

  updateUser(idOrPhone: string, updates: any): any | null {
    if (this.isTombstone(idOrPhone)) return null;
    const store = loadStore();
    const target = this.findUserById(idOrPhone) || this.findUserByPhone(idOrPhone);
    if (!target) return null;
    const index = store.users.findIndex(u => String(u.id) === String(target.id));
    if (index >= 0) {
      store.users[index] = { ...store.users[index], ...updates };
      // Also synchronize technician status if this user is a technician
      if (updates.status !== undefined || updates.is_verified !== undefined || updates.isVerified !== undefined) {
        const phone = store.users[index].phone;
        const uId = store.users[index].id;
        const techIdx = store.technicians.findIndex(t => 
          String(t.id) === String(uId) || 
          String(t.id) === `tech_${uId}` ||
          String(t.user_id) === String(uId) ||
          String(t.userId) === String(uId) ||
          (phone && String(t.phone || '').trim().replace(/^0/, '') === String(phone).trim().replace(/^0/, ''))
        );
        if (techIdx >= 0) {
          if (updates.status !== undefined) {
            store.technicians[techIdx].status = updates.status;
          }
          if (updates.isVerified !== undefined || updates.is_verified !== undefined) {
            const vVal = updates.isVerified !== undefined ? (updates.isVerified ? 1 : 0) : updates.is_verified;
            store.technicians[techIdx].is_verified = vVal;
            store.technicians[techIdx].isVerified = Boolean(vVal);
          }
        }
      }
      saveStore();
      return store.users[index];
    }
    return null;
  },

  deleteUser(idOrPhone: string): boolean {
    if (!idOrPhone) return false;
    this.addTombstones([idOrPhone]);
    const store = loadStore();
    const clean = String(idOrPhone).trim();
    const cleanNoZero = clean.replace(/^0/, "");
    const withoutTech = clean.replace(/^tech_/, "");
    const initialLen = store.users.length;
    store.users = store.users.filter(u => {
      const uId = String(u.id || "");
      const uPhone = String(u.phone || "").replace(/^0/, "");
      const uCode = String(u.user_code || u.short_id || "");
      if (uId === clean || uId === cleanNoZero || uId === withoutTech || uId.replace(/^tech_/, "") === withoutTech) return false;
      if (uPhone && (uPhone === clean || uPhone === cleanNoZero)) return false;
      if (uCode && (uCode === clean || uCode === cleanNoZero || uCode === withoutTech)) return false;
      if (this.isTombstone(u.id) || this.isTombstone(u.phone) || this.isTombstone(u.user_code || u.short_id)) return false;
      return true;
    });
    if (store.users.length !== initialLen) {
      saveStore();
      return true;
    }
    return false;
  },

  getBroadcasts(): any[] {
    const store = loadStore();
    return Array.isArray(store.broadcasts) ? [...store.broadcasts] : [];
  },

  saveBroadcasts(broadcasts: any[]): any[] {
    const store = loadStore();
    store.broadcasts = Array.isArray(broadcasts) ? broadcasts : [];
    saveStore();
    return store.broadcasts;
  },

  addBroadcast(msg: any): any {
    const store = loadStore();
    if (!store.broadcasts) store.broadcasts = [];
    if (!msg.id) msg.id = `bc_${Date.now()}`;
    if (!msg.created_at) msg.created_at = new Date().toISOString();
    store.broadcasts.unshift(msg);
    saveStore();
    return msg;
  },

  getOrders(): any[] {
    const store = loadStore();
    return Array.isArray(store.orders) ? [...store.orders] : [];
  },

  findOrderById(id: string): any | null {
    if (!id) return null;
    const store = loadStore();
    const cleanId = String(id).trim();
    return (store.orders || []).find(o => String(o.id) === cleanId) || null;
  },

  saveOrder(order: any): any {
    const store = loadStore();
    if (!store.orders) store.orders = [];
    if (!order.id) return order;
    const cleanId = String(order.id).trim();
    const index = store.orders.findIndex(o => String(o.id) === cleanId);
    if (index >= 0) {
      store.orders[index] = { ...store.orders[index], ...order };
    } else {
      store.orders.unshift(order);
    }
    saveStore();
    return order;
  },

  updateOrder(id: string, updates: any): any | null {
    if (!id) return null;
    const store = loadStore();
    if (!store.orders) store.orders = [];
    const cleanId = String(id).trim();
    const index = store.orders.findIndex(o => String(o.id) === cleanId);
    if (index >= 0) {
      store.orders[index] = { ...store.orders[index], ...updates };
      saveStore();
      return store.orders[index];
    } else if (updates) {
      const newOrder = { id: cleanId, ...updates };
      store.orders.unshift(newOrder);
      saveStore();
      return newOrder;
    }
    return null;
  },

  deleteOrder(id: string): boolean {
    if (!id) return false;
    const store = loadStore();
    if (!store.orders) return false;
    const cleanId = String(id).trim();
    const initialLen = store.orders.length;
    store.orders = store.orders.filter(o => String(o.id) !== cleanId);
    if (store.orders.length !== initialLen) {
      saveStore();
      return true;
    }
    return false;
  },

  saveTechnicians(techs: any[]): void {
    const store = loadStore();
    store.technicians = Array.isArray(techs) ? [...techs] : [];
    saveStore();
  },

  saveUsers(users: any[]): void {
    const store = loadStore();
    store.users = Array.isArray(users) ? [...users] : [];
    saveStore();
  },

  getSettings(): Record<string, any> {
    const store = loadStore();
    return store.settings || {};
  },

  setSetting(key: string, value: any): void {
    const store = loadStore();
    if (!store.settings) store.settings = {};
    store.settings[key] = value;
    saveStore();
  },

  saveSettings(settings: Record<string, any>): void {
    const store = loadStore();
    store.settings = { ...(store.settings || {}), ...settings };
    saveStore();
  },

  getPayments(): any[] {
    const store: any = loadStore();
    return Array.isArray(store.payments) ? [...store.payments] : [];
  },

  getProblems(): any[] {
    const store: any = loadStore();
    return Array.isArray(store.problems) ? [...store.problems] : [];
  },

  getSpareParts(): any[] {
    const store: any = loadStore();
    return Array.isArray(store.spare_parts) ? [...store.spare_parts] : [];
  },

  findSparePartById(id: string): any | null {
    const store: any = loadStore();
    return (store.spare_parts || []).find((p: any) => String(p.id) === String(id)) || null;
  },

  saveSparePart(part: any): any {
    const store: any = loadStore();
    if (!store.spare_parts) store.spare_parts = [];
    store.spare_parts.push(part);
    saveStore();
    return part;
  },

  updateSparePart(id: string, updates: any): any | null {
    const store: any = loadStore();
    if (!store.spare_parts) return null;
    const idx = store.spare_parts.findIndex((p: any) => String(p.id) === String(id));
    if (idx >= 0) {
      store.spare_parts[idx] = { ...store.spare_parts[idx], ...updates };
      saveStore();
      return store.spare_parts[idx];
    }
    return null;
  },

  deleteSparePart(id: string): boolean {
    const store: any = loadStore();
    if (!store.spare_parts) return false;
    const initialLen = store.spare_parts.length;
    store.spare_parts = store.spare_parts.filter((p: any) => String(p.id) !== String(id));
    if (store.spare_parts.length !== initialLen) {
      saveStore();
      return true;
    }
    return false;
  },

  getSubscriptions(): any[] {
    const store: any = loadStore();
    return Array.isArray(store.subscriptions) ? [...store.subscriptions] : [];
  },

  getTickets(): any[] {
    const store: any = loadStore();
    return Array.isArray(store.tickets) ? [...store.tickets] : [];
  },

  getWalletTransactions(): any[] {
    const store: any = loadStore();
    return Array.isArray(store.wallet_transactions) ? [...store.wallet_transactions] : [];
  },

  read(): any {
    return loadStore();
  },

  write(data: any): void {
    if (data && typeof data === 'object') {
      memoryStore = { ...memoryStore, ...data };
      saveStore();
    }
  }
};
