import { getDbPool } from "./db";

/**
 * Generates short, clean sequential IDs like user_1, user_2, pay_1, po_1, order_1, sub_1
 */
export async function getNextSequentialId(tableName: string, prefix: string): Promise<string> {
  try {
    const pool = getDbPool();
    const [rows]: any = await pool.query(
      `SELECT id FROM ${tableName} WHERE id LIKE ? ORDER BY LENGTH(id) DESC, id DESC LIMIT 50`,
      [`${prefix}_%`]
    );

    let maxNum = 0;
    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        const match = String(r.id).match(new RegExp(`^${prefix}_(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    if (maxNum === 0) {
      const [countRows]: any = await pool.query(`SELECT COUNT(*) as c FROM ${tableName}`).catch(() => [[{ c: 0 }]]);
      const count = Number(countRows?.[0]?.c || 0);
      maxNum = count;
    }

    return `${prefix}_${maxNum + 1}`;
  } catch {
    return `${prefix}_${Math.floor(100 + Math.random() * 900)}`;
  }
}

/**
 * Generates a clean, short, human-friendly user code (e.g. USR-1001 for users/admins, TC-1001 for technicians)
 */
export async function getNextUserCode(role: string = "user"): Promise<string> {
  const isTech = role === "technician";
  const prefix = isTech ? "TC" : "USR";
  try {
    const pool = getDbPool();
    const [rows]: any = await pool.query(
      `SELECT user_code, short_id FROM users WHERE user_code LIKE ? OR short_id LIKE ? ORDER BY LENGTH(COALESCE(user_code, short_id)) DESC, COALESCE(user_code, short_id) DESC LIMIT 100`,
      [`${prefix}-%`, `${prefix}-%`]
    );

    let maxNum = 1000;
    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        const val = r.user_code || r.short_id || "";
        const match = String(val).match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    if (maxNum === 1000) {
      const [countRows]: any = await pool.query(`SELECT COUNT(*) as c FROM users WHERE role = ?`, [role]).catch(() => [[{ c: 0 }]]);
      const count = Number(countRows?.[0]?.c || 0);
      maxNum = 1000 + count;
    }

    return `${prefix}-${maxNum + 1}`;
  } catch {
    return `${prefix}-${1000 + Math.floor(1 + Math.random() * 900)}`;
  }
}

/**
 * Fallback code generator for any user row if user_code is missing in memory
 */
export function formatFallbackUserCode(id: any, role: any): string {
  if (!id) return "USR-1001";
  const strId = String(id);
  if (strId.includes("admin") || strId === "1") return "ADM-1000";
  const isTech = role === "technician" || strId.startsWith("tech_") || strId.startsWith("tc_");
  const prefix = isTech ? "TC" : "USR";

  // Try extracting numeric portion
  const numMatch = strId.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    const codeNum = num < 1000 ? 1000 + num : num;
    return `${prefix}-${codeNum}`;
  }

  // Hash string into 4-digit number
  let hash = 0;
  for (let i = 0; i < strId.length; i++) {
    hash = (hash << 5) - hash + strId.charCodeAt(i);
    hash |= 0;
  }
  const codeNum = 1000 + (Math.abs(hash) % 9000);
  return `${prefix}-${codeNum}`;
}
