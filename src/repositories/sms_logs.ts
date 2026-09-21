import { getDbPool } from "../db/db";

export const SmsLogRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM sms_logs ORDER BY id DESC LIMIT 200");
      if (rows && rows.length > 0) return rows;
    } catch (e) {}
    return [];
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `sms_${Date.now()}`;
    try {
      await pool.query(
        `INSERT INTO sms_logs (id, recipient, message, type, status, response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, data.recipient, data.message, data.type || "otp", data.status || "sent", data.response || "ok"]
      );
    } catch (e) {}
    return { ...data, id };
  }
};
