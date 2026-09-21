import { getDbPool } from "../db/db";
import { getNextSequentialId, getNextUserCode, formatFallbackUserCode } from "../db/idHelper";
import { FileStorage } from "../db/fileStorage";

function formatUserRow(row: any): any {
  if (!row) return null;
  const userCode = row.user_code || row.short_id || row.userCode || formatFallbackUserCode(row.id, row.role);
  const user = {
    ...row,
    id: row.id,
    user_code: userCode,
    short_id: userCode,
    userCode: userCode,
    phone: row.phone || "",
    fullName: row.full_name || row.fullName || row.name || "",
    full_name: row.full_name || row.fullName || row.name || "",
    name: row.full_name || row.fullName || row.name || "",
    role: row.role || "user",
    isSuperAdmin: row.is_super_admin !== 0 && row.is_super_admin !== false && row.is_super_admin !== "0" && row.is_super_admin !== undefined,
    is_super_admin: row.is_super_admin !== 0 && row.is_super_admin !== false && row.is_super_admin !== "0" && row.is_super_admin !== undefined ? 1 : 0,
    is_premium: row.is_premium === 1 || row.is_premium === true || row.is_premium === "1" || false,
    is_verified: row.is_verified === 1 || row.is_verified === true || row.isVerified ? 1 : 0,
    isVerified: Boolean(row.is_verified === 1 || row.is_verified === true || row.isVerified),
    subscription_plan: row.subscription_plan || "",
    subscription_expire_date: row.subscription_expire_date || "",
    city: row.city || "",
    address: row.address || "",
    avatar_url: row.avatar_url || row.avatarUrl || "",
    avatarUrl: row.avatar_url || row.avatarUrl || "",
    walletBalance: Number(row.wallet_balance || row.walletBalance || 0),
    wallet_balance: Number(row.wallet_balance || row.walletBalance || 0),
    status: row.status || (row.role === "technician" && !(row.is_verified || row.isVerified) ? "pending" : "active")
  };
  delete user.password_hash;
  delete user.password;
  return user;
}

export const UserRepository = {
  async findAll(): Promise<any[]> {
    let dbUsers: any[] = [];
    const pool = getDbPool();
    try {
      const [rows] = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
      if (Array.isArray(rows) && rows.length > 0) {
        dbUsers = (rows as any[])
          .filter(r => !FileStorage.isTombstone(r.id) && !FileStorage.isTombstone(r.phone) && !FileStorage.isTombstone(r.user_code))
          .map(formatUserRow)
          .filter(Boolean);
      }
    } catch (err) {
      console.error("[UserRepository.findAll] Live MySQL query error:", err);
    }

    // Also merge clients_v2 from MySQL (used by Android/Kotlin app)
    try {
      const [cRows]: any = await pool.query("SELECT * FROM clients_v2 ORDER BY created_at DESC");
      if (Array.isArray(cRows) && cRows.length > 0) {
        cRows.forEach((r: any) => {
          if (!FileStorage.isTombstone(r.id) && !FileStorage.isTombstone(r.phone)) {
            const formatted = formatUserRow({
              ...r,
              role: r.role || 'client'
            });
            if (formatted) dbUsers.push(formatted);
          }
        });
      }
    } catch (err) {}

    const fileUsers = (FileStorage.getUsers() || [])
      .filter(u => !FileStorage.isTombstone(u.id) && !FileStorage.isTombstone(u.phone) && !FileStorage.isTombstone(u.user_code))
      .map(formatUserRow)
      .filter(Boolean);

    const userMap = new Map<string, any>();
    // Prioritize DB users
    dbUsers.forEach(u => {
      const idKey = String(u.id || '').trim();
      const phoneKey = String(u.phone || '').trim();
      if (idKey) userMap.set(idKey, u);
      if (phoneKey) userMap.set(phoneKey, u);
    });

    // Merge file storage users if not already present
    fileUsers.forEach(u => {
      const idKey = String(u.id || '').trim();
      const phoneKey = String(u.phone || '').trim();
      if ((idKey && !userMap.has(idKey)) && (!phoneKey || !userMap.has(phoneKey))) {
        if (idKey) userMap.set(idKey, u);
        if (phoneKey) userMap.set(phoneKey, u);
      }
    });

    const uniqueUsers = Array.from(new Set(userMap.values()));
    return uniqueUsers.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
  },

  async findById(id: string): Promise<any | null> {
    if (!id || typeof id !== 'string' || !id.trim() || id === 'undefined' || id === 'null' || id === '0' || id === 'guest') {
      return null;
    }
    const cleanId = id.trim();
    if (FileStorage.isTombstone(cleanId)) {
      return null;
    }
    try {
      const pool = getDbPool();
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ? OR user_code = ? LIMIT 1", [cleanId, cleanId]);
      const arr = rows as any[];
      if (arr.length > 0) {
        const u = formatUserRow(arr[0]);
        if (u && !FileStorage.isTombstone(u.id) && !FileStorage.isTombstone(u.phone)) {
          return u;
        }
        return null;
      }
      // Fallback check on clients_v2
      const [cRows]: any = await pool.query("SELECT * FROM clients_v2 WHERE id = ? LIMIT 1", [cleanId]);
      if (cRows && cRows.length > 0) {
        const u = formatUserRow({ ...cRows[0], role: cRows[0].role || 'client' });
        if (u && !FileStorage.isTombstone(u.id) && !FileStorage.isTombstone(u.phone)) {
          return u;
        }
      }
    } catch (err) {
      console.error("[UserRepository.findById] Live MySQL query error:", err);
    }
    const fu = FileStorage.findUserById(cleanId);
    return fu ? formatUserRow(fu) : null;
  },

  async findByPhone(phone: string): Promise<any | null> {
    if (!phone || typeof phone !== 'string' || !phone.trim() || phone === 'undefined' || phone === 'null' || phone === '0') {
      return null;
    }
    const raw = phone.trim();
    if (FileStorage.isTombstone(raw)) {
      return null;
    }
    const cleanPhoneNoZero = raw.replace(/^0/, '');
    const cleanPhoneWithZero = raw.startsWith('0') ? raw : ('0' + raw);
    try {
      const pool = getDbPool();
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE phone = ? OR phone = ? OR phone = ? LIMIT 1",
        [raw, cleanPhoneNoZero, cleanPhoneWithZero]
      );
      const arr = rows as any[];
      if (arr.length > 0) {
        const u = formatUserRow(arr[0]);
        if (u && !FileStorage.isTombstone(u.id) && !FileStorage.isTombstone(u.phone)) {
          return u;
        }
        return null;
      }
      // Fallback check on clients_v2
      const [cRows]: any = await pool.query(
        "SELECT * FROM clients_v2 WHERE phone = ? OR phone = ? OR phone = ? LIMIT 1",
        [raw, cleanPhoneNoZero, cleanPhoneWithZero]
      );
      if (cRows && cRows.length > 0) {
        const u = formatUserRow({ ...cRows[0], role: cRows[0].role || 'client' });
        if (u && !FileStorage.isTombstone(u.id) && !FileStorage.isTombstone(u.phone)) {
          return u;
        }
      }
    } catch (err) {
      console.error("[UserRepository.findByPhone] Live MySQL query error:", err);
    }
    const fu = FileStorage.findUserByPhone(raw);
    return fu ? formatUserRow(fu) : null;
  },

  async findByPhoneWithPassword(phone: string): Promise<any | null> {
    if (!phone || typeof phone !== 'string' || !phone.trim() || phone === 'undefined' || phone === 'null' || phone === '0') {
      return null;
    }
    const raw = phone.trim();
    const cleanPhoneNoZero = raw.replace(/^0/, '');
    const cleanPhoneWithZero = raw.startsWith('0') ? raw : ('0' + raw);
    try {
      const pool = getDbPool();
      const [rows]: any = await pool.query(
        "SELECT * FROM users WHERE phone = ? OR phone = ? OR phone = ? LIMIT 1",
        [raw, cleanPhoneNoZero, cleanPhoneWithZero]
      );
      if (rows && rows.length > 0) {
        return rows[0];
      }
      // Fallback check on clients_v2
      const [cRows]: any = await pool.query(
        "SELECT * FROM clients_v2 WHERE phone = ? OR phone = ? OR phone = ? LIMIT 1",
        [raw, cleanPhoneNoZero, cleanPhoneWithZero]
      );
      if (cRows && cRows.length > 0) {
        return cRows[0];
      }
    } catch (err) {
      console.error("[UserRepository.findByPhoneWithPassword] Live MySQL query error:", err);
    }
    const fsUser = FileStorage.findUserByPhone(raw);
    if (fsUser) return fsUser;
    return null;
  },

  async findByIdWithPassword(id: string): Promise<any | null> {
    if (!id || typeof id !== 'string' || !id.trim() || id === 'undefined' || id === 'null' || id === '0' || id === 'guest') {
      return null;
    }
    const cleanId = id.trim();
    try {
      const pool = getDbPool();
      const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ? OR user_code = ? LIMIT 1", [cleanId, cleanId]);
      if (rows && rows.length > 0) {
        return rows[0];
      }
      const [cRows]: any = await pool.query("SELECT * FROM clients_v2 WHERE id = ? LIMIT 1", [cleanId]);
      if (cRows && cRows.length > 0) {
        return cRows[0];
      }
    } catch (err) {
      console.error("[UserRepository.findByIdWithPassword] Live MySQL query error:", err);
    }
    const fsUser = FileStorage.findUserById(cleanId);
    if (fsUser) return fsUser;
    return null;
  },

  async create(userData: any): Promise<any> {
    if (!userData) return null;
    if (userData.phone) {
      FileStorage.removeTombstones([userData.phone]);
    }
    let id = userData.id;
    if (!id || FileStorage.isTombstone(id)) {
      id = await getNextSequentialId("users", "user");
    }
    const role = userData.role || "user";
    const userCode = userData.user_code || userData.short_id || (await getNextUserCode(role));
    const phone = userData.phone || "";
    const fullName = userData.full_name || userData.fullName || userData.name || "";
    const isSuperAdmin = (userData.is_super_admin || userData.isSuperAdmin) ? 1 : 0;
    const city = userData.city || "";
    const address = userData.address || "";
    const avatarUrl = userData.avatar_url || userData.avatarUrl || "";
    const passwordHash = userData.password_hash || userData.passwordHash || "";
    const walletBalance = userData.wallet_balance ?? userData.walletBalance ?? 0;
    const isVerified = (userData.is_verified || userData.isVerified) ? 1 : 0;
    const isTechnician = (role === "technician" || userData.is_technician) ? 1 : 0;
    const status = userData.status || (role === "technician" ? "pending" : "active");

    const record = {
      id,
      user_code: userCode,
      short_id: userCode,
      phone,
      full_name: fullName,
      fullName,
      role,
      is_super_admin: isSuperAdmin,
      isSuperAdmin: Boolean(isSuperAdmin),
      is_verified: isVerified,
      isVerified: Boolean(isVerified),
      is_technician: isTechnician,
      city,
      address,
      avatar_url: avatarUrl,
      avatarUrl,
      password_hash: passwordHash,
      wallet_balance: walletBalance,
      walletBalance,
      status,
      created_at: new Date().toISOString()
    };

    try {
      FileStorage.saveUser(record);
    } catch {}

    const pool = getDbPool();
    await pool.query(
      `INSERT INTO users (id, user_code, short_id, phone, full_name, role, is_super_admin, city, address, avatar_url, password_hash, wallet_balance, status, is_verified, is_technician)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         user_code = VALUES(user_code),
         short_id = VALUES(short_id),
         full_name = VALUES(full_name),
         role = VALUES(role),
         city = VALUES(city),
         is_verified = VALUES(is_verified),
         is_technician = VALUES(is_technician)`,
      [id, userCode, userCode, phone, fullName, role, isSuperAdmin, city, address, avatarUrl, passwordHash, walletBalance, status, isVerified, isTechnician]
    );

    // Dual-sync to clients_v2 for Android app compatibility
    try {
      await pool.query(
        `INSERT INTO clients_v2 (id, phone, full_name, password_hash, role, city, wallet_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), city = VALUES(city), wallet_balance = VALUES(wallet_balance)`,
        [id, phone, fullName, passwordHash, role === 'admin' ? 'admin' : (role === 'technician' ? 'technician' : 'client'), city, walletBalance]
      );
    } catch (e) {}

    return (await UserRepository.findById(id)) || formatUserRow(record);
  },

  async update(id: string, updates: any): Promise<any | null> {
    const pool = getDbPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.user_code !== undefined || updates.short_id !== undefined || updates.userCode !== undefined) {
      const uCode = updates.user_code ?? updates.short_id ?? updates.userCode;
      fields.push("user_code = ?");
      values.push(uCode);
      fields.push("short_id = ?");
      values.push(uCode);
    }
    if (updates.full_name !== undefined || updates.fullName !== undefined || updates.name !== undefined) {
      fields.push("full_name = ?");
      values.push(updates.full_name ?? updates.fullName ?? updates.name);
    }
    if (updates.phone !== undefined) { fields.push("phone = ?"); values.push(updates.phone); }
    if (updates.role !== undefined) { fields.push("role = ?"); values.push(updates.role); }
    if (updates.is_super_admin !== undefined || updates.isSuperAdmin !== undefined) {
      fields.push("is_super_admin = ?");
      const isa = updates.is_super_admin ?? updates.isSuperAdmin;
      values.push(isa ? 1 : 0);
    }
    if (updates.city !== undefined) { fields.push("city = ?"); values.push(updates.city); }
    if (updates.address !== undefined) { fields.push("address = ?"); values.push(updates.address); }
    if (updates.avatar_url !== undefined || updates.avatarUrl !== undefined) {
      fields.push("avatar_url = ?");
      values.push(updates.avatar_url ?? updates.avatarUrl);
    }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.password_hash !== undefined || updates.passwordHash !== undefined) {
      fields.push("password_hash = ?");
      values.push(updates.password_hash ?? updates.passwordHash);
    }
    if (updates.wallet_balance !== undefined || updates.walletBalance !== undefined) {
      fields.push("wallet_balance = ?");
      values.push(updates.wallet_balance ?? updates.walletBalance);
    }
    if (updates.is_premium !== undefined || updates.isPremium !== undefined) {
      fields.push("is_premium = ?");
      const ip = updates.is_premium ?? updates.isPremium;
      values.push(ip ? 1 : 0);
    }
    if (updates.subscription_plan !== undefined || updates.subscriptionPlan !== undefined) {
      fields.push("subscription_plan = ?");
      values.push(updates.subscription_plan ?? updates.subscriptionPlan);
    }
    if (updates.subscription_expire_date !== undefined || updates.subscriptionExpireDate !== undefined) {
      fields.push("subscription_expire_date = ?");
      values.push(updates.subscription_expire_date ?? updates.subscriptionExpireDate);
    }

    if (fields.length > 0) {
      const cleanId = String(id).trim();
      const noTechId = cleanId.replace(/^tech_/, "");
      const cleanNoZero = cleanId.replace(/^0/, "");
      const cleanWithZero = cleanId.startsWith("0") ? cleanId : ("0" + cleanId);

      values.push(cleanId, noTechId, cleanNoZero, cleanWithZero, cleanId, noTechId, cleanNoZero, cleanWithZero);
      await pool.query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ? OR id = ? OR id = ? OR id = ? OR phone = ? OR phone = ? OR phone = ? OR phone = ?`,
        values
      ).catch(() => {});

      if (updates.status !== undefined) {
        await pool.query(
          `UPDATE technicians SET status = ? WHERE id = ? OR id = ? OR user_id = ? OR user_id = ? OR phone = ? OR phone = ?`,
          [updates.status, cleanId, noTechId, cleanId, noTechId, cleanNoZero, cleanWithZero]
        ).catch(() => {});
      }
    }

    try {
      FileStorage.updateUser(id, updates);
      FileStorage.updateTechnician(id, updates);
    } catch {}

    return (await UserRepository.findById(id));
  },

  async deleteById(id: string): Promise<boolean> {
    if (!id) return false;
    const pool = getDbPool();
    const cleanId = String(id).trim();
    const noTechId = cleanId.replace(/^tech_/, "");
    const cleanNoZero = cleanId.replace(/^0/, "");
    const cleanWithZero = cleanId.startsWith("0") ? cleanId : ("0" + cleanId);
    
    // Find phone, user_code, id before deletion to purge everywhere
    let targetDbId = "";
    let targetPhone = "";
    let targetUserCode = "";
    try {
      const [rows]: any = await pool.query(
        "SELECT id, phone, user_code FROM users WHERE id = ? OR id = ? OR phone = ? OR phone = ? OR phone = ? OR user_code = ? LIMIT 1",
        [cleanId, noTechId, cleanId, cleanNoZero, cleanWithZero, cleanId]
      );
      if (rows && rows.length > 0) {
        targetDbId = rows[0].id || "";
        targetPhone = rows[0].phone || "";
        targetUserCode = rows[0].user_code || "";
      }
    } catch {}

    if (!targetPhone || !targetDbId) {
      const fileUser = FileStorage.findUserById(cleanId) || FileStorage.findUserByPhone(cleanId) || FileStorage.findUserById(noTechId);
      if (fileUser) {
        targetDbId = fileUser.id || targetDbId;
        targetPhone = fileUser.phone || targetPhone;
        targetUserCode = fileUser.user_code || fileUser.short_id || targetUserCode;
      }
    }

    // Register ID tombstones so deleted entities are not resurrected by stale file sync,
    // but NEVER tombstone phone numbers so users/technicians can re-register!
    const tombstoneKeys = Array.from(new Set([
      cleanId,
      noTechId,
      `tech_${cleanId.replace(/^tech_/, '')}`,
      targetDbId,
      targetDbId.replace(/^tech_/, ''),
      `tech_${targetDbId.replace(/^tech_/, '')}`
    ].filter(Boolean)));

    FileStorage.addTombstones(tombstoneKeys);

    try {
      await pool.query("SET FOREIGN_KEY_CHECKS = 0").catch(() => {});
      for (const k of tombstoneKeys) {
        await pool.query("DELETE FROM technician_specialties WHERE technician_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM technician_services WHERE technician_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM technicians WHERE id = ? OR user_id = ? OR phone = ?", [k, k, k]).catch(() => {});
        await pool.query("DELETE FROM subscriptions WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM subscriptions WHERE user_phone = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM payments WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM payments WHERE user_phone = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM wallet_transactions WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM wallet_transactions WHERE user_phone = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM user_roles WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM part_orders WHERE user_id = ? OR buyer_phone = ?", [k, k]).catch(() => {});
        await pool.query("DELETE FROM orders WHERE user_id = ? OR customer_phone = ?", [k, k]).catch(() => {});
        await pool.query("UPDATE orders SET technician_id = NULL, technician_name = NULL, technician_phone = NULL, status = 'waiting' WHERE technician_id = ? OR technician_phone = ?", [k, k]).catch(() => {});
        await pool.query("DELETE FROM tickets WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM sessions WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM notifications WHERE user_id = ?", [k]).catch(() => {});
        await pool.query("DELETE FROM users WHERE id = ? OR phone = ? OR user_code = ?", [k, k, k]).catch(() => {});

        try {
          FileStorage.deleteUser(k);
          FileStorage.deleteTechnician(k);
        } catch {}
      }
      await pool.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    } catch {}

    return true;
  }
};
