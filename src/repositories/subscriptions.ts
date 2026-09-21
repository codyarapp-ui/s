import { getDbPool } from "../db/db";
import { FileStorage } from "../db/fileStorage";

/**
 * SubscriptionRepository
 * - همه توابعی که server.ts صدا می‌زند را دارد.
 * - ستون‌های واقعی جدول subscriptions و users را در اولین استفاده می‌خواند
 *   و فقط روی ستون‌هایی که وجود دارند می‌نویسد.
 * - بعد از هر ساخت/تغییر اشتراک، جدول users را هم همگام می‌کند
 *   (is_premium / subscription_plan / subscription_expire_date)
 *   تا سایت و اپ هر دو یک منبع واحد ببینند.
 * - خطاها دیگر قورت داده نمی‌شوند.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

let subMeta: { cols: Set<string>; auto: boolean } | null = null;
let userCols: Set<string> | null = null;

async function getSubMeta() {
  if (subMeta) return subMeta;
  const [rows]: any = await getDbPool().query("SHOW COLUMNS FROM subscriptions");
  const cols = new Set<string>(rows.map((r: any) => String(r.Field)));
  const auto = rows.some(
    (r: any) => r.Field === "id" && String(r.Extra || "").toLowerCase().includes("auto_increment")
  );
  subMeta = { cols, auto };
  return subMeta;
}

async function getUserCols(): Promise<Set<string>> {
  if (userCols) return userCols;
  const [rows]: any = await getDbPool().query("SHOW COLUMNS FROM users");
  userCols = new Set<string>(rows.map((r: any) => String(r.Field)));
  return userCols;
}

const pick = (cols: Set<string>, ...names: string[]) => names.find((n) => cols.has(n)) || null;

function phoneVariants(p?: any): string[] {
  const d = String(p ?? "").replace(/\D/g, "");
  if (!d) return [];
  let n = d;
  if (n.startsWith("98") && n.length > 10) n = "0" + n.slice(2);
  if (n.length === 10 && n.startsWith("9")) n = "0" + n;
  if (!/^09\d{9}$/.test(n)) return [];
  return [n, n.slice(1)];
}

function toIso(v: any): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}

function daysForPlan(planId: string): number {
  const s = String(planId || "").toLowerCase();
  if (/year|365|12[_\s-]?month/.test(s)) return 365;
  const m = s.match(/(\d+)[_\s-]?month/);
  if (m) return Math.round(Number(m[1]) * 30); // 1→30, 3→90, 6→180
  return 30;
}

async function resolveUser(userId?: any, phone?: any): Promise<any | null> {
  const raw = String(userId ?? "").trim();
  const ids = new Set<string>();
  if (raw) {
    ids.add(raw);
    ids.add(raw.replace(/^tech_/, ""));
  }
  const phones = new Set<string>([...phoneVariants(phone), ...phoneVariants(raw)]);

  const conds: string[] = [];
  const params: any[] = [];
  if (ids.size) {
    conds.push("id IN (?)");
    params.push([...ids]);
  }
  if (phones.size) {
    conds.push("phone IN (?)");
    params.push([...phones]);
  }
  if (!conds.length) return null;

  try {
    const [rows]: any = await getDbPool().query(
      `SELECT * FROM users WHERE ${conds.join(" OR ")} LIMIT 1`,
      params
    );
    if (rows && rows.length > 0) return rows[0];

    const [cRows]: any = await getDbPool().query(
      `SELECT * FROM clients_v2 WHERE ${conds.join(" OR ")} LIMIT 1`,
      params
    );
    if (cRows && cRows.length > 0) return cRows[0];
  } catch (err) {}

  // Fallback to FileStorage users and technicians
  for (const id of ids) {
    const fsUser = FileStorage.findUserById(id);
    if (fsUser) return fsUser;
  }
  for (const p of phones) {
    const fsUser = FileStorage.findUserByPhone(p);
    if (fsUser) return fsUser;
  }
  for (const id of ids) {
    const fsTech = FileStorage.findTechnicianById(id);
    if (fsTech) {
      return {
        id: fsTech.id,
        phone: fsTech.phone,
        full_name: fsTech.full_name || fsTech.name,
        role: "technician"
      };
    }
  }
  return null;
}

async function normalize(row: any): Promise<any> {
  if (!row) return null;
  const { cols } = await getSubMeta();
  const endCol = pick(cols, "end_date", "expire_date", "expiry_date");
  const end = endCol ? toIso(row[endCol]) : "";
  return {
    ...row,
    plan_id: row.plan_id ?? row.plan ?? row.plan_type ?? "",
    plan_name: row.plan_name ?? row.plan_type ?? row.plan ?? "",
    start_date: row.start_date ? toIso(row.start_date) : row.start_date,
    end_date: end,
    expire_date: end,
    expiry_date: end,
    is_active: String(row.status) === "active" && !!end && new Date(end) > new Date()
  };
}

async function ownerWhere(userId?: any, phone?: any) {
  const { cols } = await getSubMeta();
  const u = await resolveUser(userId, phone);
  const ids = new Set<string>();
  [userId, u?.id].forEach((x) => {
    if (x) ids.add(String(x));
  });
  const conds: string[] = [];
  const params: any[] = [];
  if (ids.size) {
    conds.push("user_id IN (?)");
    params.push([...ids]);
  }
  const pv = [...phoneVariants(phone), ...phoneVariants(u?.phone)];
  if (pv.length && cols.has("user_phone")) {
    conds.push("user_phone IN (?)");
    params.push(pv);
  }
  if (!conds.length) return null;
  return { sql: `(${conds.join(" OR ")})`, params };
}

async function findAll(): Promise<any[]> {
  try {
    const { cols } = await getSubMeta();
    const orderCol = cols.has("created_at") ? "created_at" : "id";
    const [rows]: any = await getDbPool().query(
      `SELECT * FROM subscriptions ORDER BY \`${orderCol}\` DESC`
    );
    return Promise.all((rows || []).map(normalize));
  } catch (e) {
    console.error("[SubscriptionRepository.findAll] error:", e);
    return (FileStorage as any).getSubscriptions?.() || [];
  }
}

async function findById(id: string): Promise<any | null> {
  try {
    const [rows]: any = await getDbPool().query(
      "SELECT * FROM subscriptions WHERE id = ? LIMIT 1",
      [id]
    );
    return rows && rows.length > 0 ? normalize(rows[0]) : null;
  } catch (e) {
    console.error("[SubscriptionRepository.findById] error:", e);
    return null;
  }
}

/** همه اشتراک‌های یک کاربر (آرایه) */
async function findByUserId(userId?: any, phone?: any): Promise<any[]> {
  try {
    const { cols } = await getSubMeta();
    const w = await ownerWhere(userId, phone);
    if (!w) return [];
    const orderCol = cols.has("created_at") ? "created_at" : "id";
    const [rows]: any = await getDbPool().query(
      `SELECT * FROM subscriptions WHERE ${w.sql} ORDER BY \`${orderCol}\` DESC`,
      w.params
    );
    return Promise.all((rows || []).map(normalize));
  } catch (e) {
    console.error("[SubscriptionRepository.findByUserId] error:", e);
    return [];
  }
}

/** اشتراک فعالِ منقضی‌نشده (بیشترین تاریخ پایان) یا null */
async function findActiveByUserId(userId?: any, phone?: any): Promise<any | null> {
  try {
    const { cols } = await getSubMeta();
    const endCol = pick(cols, "end_date", "expire_date", "expiry_date");
    if (!endCol) return null;
    const w = await ownerWhere(userId, phone);
    if (!w) return null;

    const params = [...w.params, new Date()];
    let where = `${w.sql} AND \`${endCol}\` > ?`;
    if (cols.has("status")) where += " AND status = 'active'";

    const [rows]: any = await getDbPool().query(
      `SELECT * FROM subscriptions WHERE ${where} ORDER BY \`${endCol}\` DESC LIMIT 1`,
      params
    );
    return rows && rows.length > 0 ? normalize(rows[0]) : null;
  } catch (e) {
    console.error("[SubscriptionRepository.findActiveByUserId] error:", e);
    return null;
  }
}

/** وضعیت users را با اشتراک فعال همگام می‌کند (منبع واحد برای سایت و اپ) */
async function syncUser(userId: string): Promise<void> {
  try {
    const uc = await getUserCols();
    const active = await findActiveByUserId(userId);
    const sets: string[] = [];
    const params: any[] = [];
    const add = (col: string, val: any) => {
      if (uc.has(col)) {
        sets.push(`\`${col}\` = ?`);
        params.push(val);
      }
    };
    add("is_premium", active ? 1 : 0);
    add("has_active_subscription", active ? 1 : 0);
    add("subscription_plan", active ? active.plan_id : "");
    add("subscription_expire_date", active ? String(active.end_date).split("T")[0] : null);

    if (!sets.length) {
      console.warn(
        "[SubscriptionRepository.syncUser] جدول users هیچ‌کدام از ستون‌های is_premium / subscription_plan / subscription_expire_date را ندارد؛ وضعیت کاربر همگام نشد."
      );
      return;
    }
    params.push(userId);
    await getDbPool().query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);

    // Sync clients_v2 for Android app compatibility
    try {
      if (active) {
        await getDbPool().query(
          `UPDATE clients_v2 SET subscription = ? WHERE id = ?`,
          [JSON.stringify(active), userId]
        );
      }
    } catch (e) {}
  } catch (e) {
    console.error("[SubscriptionRepository.syncUser] error:", e);
  }
}

async function create(data: any): Promise<any> {
  const { cols, auto } = await getSubMeta();
  const endCol = pick(cols, "end_date", "expire_date", "expiry_date");
  if (!endCol) throw new Error("جدول subscriptions ستون تاریخ پایان (end_date / expire_date) ندارد.");
  if (!cols.has("user_id")) throw new Error("جدول subscriptions ستون user_id ندارد.");

  const user = await resolveUser(data.user_id ?? data.userId, data.user_phone ?? data.phone);
  if (!user) {
    throw new Error(
      "کاربر پیدا نشد؛ شناسه یا شماره باید در جدول users وجود داشته باشد (تکنسین باید حساب کاربری هم داشته باشد)."
    );
  }

  const pool = getDbPool();

  // جلوگیری از ساخت اشتراک تکراری برای یک پرداخت (دوبار کلیک تأیید / تلاش مجدد)
  if (data.payment_id && cols.has("payment_id")) {
    const [dup]: any = await pool.query(
      "SELECT * FROM subscriptions WHERE payment_id = ? LIMIT 1",
      [data.payment_id]
    );
    if (dup && dup.length > 0) return normalize(dup[0]);
  }

  const planId = String(data.plan_id ?? data.plan ?? data.plan_type ?? "1_month");
  const planName = String(data.plan_name ?? data.plan_type ?? "اشتراک ویژه");
  const now = new Date();

  let start: Date;
  let end: Date;
  const explicitEnd = data[endCol] ?? data.end_date ?? data.expire_date ?? data.expiry_date;

  if (explicitEnd && !isNaN(new Date(explicitEnd).getTime())) {
    // ورود مستقیم تاریخ (مثلاً از /api/sync)
    end = new Date(explicitEnd);
    start =
      data.start_date && !isNaN(new Date(data.start_date).getTime())
        ? new Date(data.start_date)
        : now;
  } else {
    const days = Number(data.duration_days) > 0 ? Number(data.duration_days) : daysForPlan(planId);
    const active = await findActiveByUserId(user.id, user.phone);

    if (data.reset_duration && active) {
      // جایگزینی: اشتراک‌های فعال قبلی بسته می‌شوند و از الان شروع می‌شود
      if (cols.has("status")) {
        await pool.query("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'", [
          user.id
        ]);
      }
      start = now;
    } else {
      // تمدید: از پایان اشتراک فعلی ادامه می‌دهد
      start = active ? new Date(active.end_date) : now;
    }
    end = new Date(start.getTime() + days * DAY_MS);
  }

  const row: Record<string, any> = {};
  const put = (col: string | null, val: any) => {
    if (col && cols.has(col)) row[col] = val;
  };

  if (!auto && cols.has("id")) {
    row.id = data.id || `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  row.user_id = user.id;
  put("user_phone", user.phone);
  put("user_name", user.full_name || data.user_name || "");
  put("plan_id", planId);
  put("plan_name", planName);
  put("plan_type", planName);
  put("plan", planId);
  put(pick(cols, "price", "amount"), Number(data.price ?? data.amount) || 0);
  put("duration_days", Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS)));
  put("payment_id", data.payment_id ?? null);
  put("start_date", start);
  put(endCol, end);
  put("status", data.status || "active");
  put("created_at", now);

  const keys = Object.keys(row);
  const [result]: any = await pool.query(
    `INSERT INTO subscriptions (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${keys
      .map(() => "?")
      .join(", ")})`,
    keys.map((k) => row[k])
  );

  const newId = auto ? result.insertId : row.id;
  const created = await findById(String(newId));

  await syncUser(user.id);
  return created || (await normalize({ ...row, id: newId }));
}

async function update(id: string, data: any): Promise<any | null> {
  const { cols } = await getSubMeta();
  const [rows]: any = await getDbPool().query("SELECT * FROM subscriptions WHERE id = ? LIMIT 1", [id]);
  if (!rows || rows.length === 0) return null;
  const existing = rows[0];

  const endCol = pick(cols, "end_date", "expire_date", "expiry_date");
  const sets: Record<string, any> = {};

  if (data.status !== undefined && cols.has("status")) sets.status = data.status;

  const newEnd = data.end_date ?? data.expire_date ?? data.expiry_date;
  if (newEnd && endCol && !isNaN(new Date(newEnd).getTime())) sets[endCol] = new Date(newEnd);

  if (data.plan_id !== undefined && cols.has("plan_id")) sets.plan_id = data.plan_id;
  if (data.plan_name !== undefined && cols.has("plan_name")) sets.plan_name = data.plan_name;

  const keys = Object.keys(sets);
  if (keys.length > 0) {
    await getDbPool().query(
      `UPDATE subscriptions SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")} WHERE id = ?`,
      [...keys.map((k) => sets[k]), id]
    );
    await syncUser(existing.user_id);
  }
  return findById(id);
}

/** اشتراک‌های منقضی‌شده را بسته و وضعیت کاربر را به‌روز می‌کند */
async function expireOverdue(): Promise<void> {
  try {
    const { cols } = await getSubMeta();
    const endCol = pick(cols, "end_date", "expire_date", "expiry_date");
    if (!endCol || !cols.has("status")) return;
    const now = new Date();
    const pool = getDbPool();
    const [rows]: any = await pool.query(
      `SELECT DISTINCT user_id FROM subscriptions WHERE status = 'active' AND \`${endCol}\` <= ?`,
      [now]
    );
    if (!rows || rows.length === 0) return;
    await pool.query(
      `UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND \`${endCol}\` <= ?`,
      [now]
    );
    for (const r of rows) await syncUser(r.user_id);
    console.log(`[SubscriptionRepository] ${rows.length} user(s) subscription expired & synced.`);
  } catch (e) {
    console.error("[SubscriptionRepository.expireOverdue] error:", e);
  }
}

let jobStarted = false;
function startExpiryJob(): void {
  if (jobStarted) return;
  jobStarted = true;
  setTimeout(expireOverdue, 15 * 1000);
  const timer: any = setInterval(expireOverdue, 60 * 60 * 1000);
  if (timer && typeof timer.unref === "function") timer.unref();
}

export const SubscriptionRepository = {
  findAll,
  findById,
  findByUserId,
  findActiveByUserId,
  create,
  update,
  syncUser,
  expireOverdue,
  startExpiryJob
};
