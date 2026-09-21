import { getDbPool } from "../db/db";
import { FileStorage } from "../db/fileStorage";

export const WalletTransactionRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM wallet_transactions ORDER BY id DESC");
      if (rows && rows.length > 0) return rows;
    } catch (e) {}
    return FileStorage.getWalletTransactions?.() || [];
  },

  async findByUserId(userId: string): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC", [userId]);
      if (rows && rows.length > 0) return rows;
    } catch (e) {}
    return [];
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `wt_${Date.now()}`;
    try {
      await pool.query(
        `INSERT INTO wallet_transactions (id, user_id, user_phone, amount, type, description, balance_after, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, data.user_id, data.user_phone, data.amount || 0, data.type || "deposit", data.description || "", data.balance_after || 0]
      );
    } catch (e) {}
    return { ...data, id };
  }
};
