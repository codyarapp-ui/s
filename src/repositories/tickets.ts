import { getDbPool } from "../db/db";
import { FileStorage } from "../db/fileStorage";

export const TicketRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM tickets ORDER BY id DESC");
      if (rows && rows.length > 0) return rows;
    } catch (e) {}
    return FileStorage.getTickets?.() || [];
  },

  async findById(id: string): Promise<any | null> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM tickets WHERE id = ? LIMIT 1", [id]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {}
    return null;
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `tick_${Date.now()}`;
    try {
      await pool.query(
        `INSERT INTO tickets (id, user_id, user_name, user_phone, subject, status, priority, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, data.user_id, data.user_name || "", data.user_phone || "", data.subject, data.status || "open", data.priority || "normal"]
      );
    } catch (e) {}
    return { ...data, id };
  },

  async update(id: string, data: any): Promise<any> {
    const pool = getDbPool();
    try {
      if (data.status) {
        await pool.query("UPDATE tickets SET status = ? WHERE id = ?", [data.status, id]);
      }
    } catch (e) {}
    return { id, ...data };
  }
};
