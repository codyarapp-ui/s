import { getDbPool } from "../db/db";

export const UsageCounterRepository = {
  async increment(key: string): Promise<number> {
    const pool = getDbPool();
    try {
      await pool.query(
        "INSERT INTO usage_counters (`key`, `count`, updated_at) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE `count` = `count` + 1, updated_at = NOW()",
        [key]
      );
      const [rows]: any = await pool.query("SELECT `count` FROM usage_counters WHERE `key` = ? LIMIT 1", [key]);
      if (rows && rows.length > 0) return rows[0].count;
    } catch (e) {}
    return 1;
  },

  async get(key: string): Promise<number> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT `count` FROM usage_counters WHERE `key` = ? LIMIT 1", [key]);
      if (rows && rows.length > 0) return rows[0].count;
    } catch (e) {}
    return 0;
  }
};
