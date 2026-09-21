import { getDbPool } from "../db/db";

export const TicketMessageRepository = {
  async findByTicketId(ticketId: string): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC", [ticketId]);
      if (rows && rows.length > 0) return rows;
    } catch (e) {}
    return [];
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `tm_${Date.now()}`;
    try {
      await pool.query(
        `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_name, sender_role, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, data.ticket_id, data.sender_id, data.sender_name || "", data.sender_role || "user", data.message]
      );
    } catch (e) {}
    return { ...data, id };
  }
};
