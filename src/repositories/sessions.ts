import { getDbPool } from "../db/db";

type SessionInput = {
  user_id?: string;
  token?: string;
  refresh_token?: string;
  user_agent?: string;
  ip?: string;
  expires_at?: Date | string;
};

function toMysqlDateTime(value: Date | string | undefined | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export const SessionRepository = {
  async findByToken(token: string): Promise<any | null> {
    if (!token) return null;
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM sessions WHERE token = ? LIMIT 1", [token]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {}
    return null;
  },

  // Accepts create({ user_id, token, ... }) as used in server.ts,
  // and also create(userId, token) for backward compatibility.
  async create(input: SessionInput | string, maybeToken?: string): Promise<any> {
    const data: SessionInput = typeof input === "string" ? { user_id: input, token: maybeToken } : (input || {});
    const userId = String(data.user_id ?? "").trim();
    const token = String(data.token ?? maybeToken ?? "").trim();

    if (!userId || !token) return { user_id: userId, token };

    const expiresAt = toMysqlDateTime(data.expires_at) ?? toMysqlDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const pool = getDbPool();
    try {
      await pool.query(
        "INSERT INTO sessions (id, user_id, token, refresh_token, user_agent, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
        [`sess_${Date.now()}`, userId, token, data.refresh_token || null, data.user_agent || null, data.ip || null, expiresAt]
      );
    } catch (e) {}
    return { user_id: userId, token, refresh_token: data.refresh_token, expires_at: expiresAt };
  },

  async deleteByToken(token: string): Promise<boolean> {
    const pool = getDbPool();
    try {
      await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
    } catch (e) {}
    return true;
  },

  // Was missing entirely - server.ts calls this on logout, which threw before.
  async deleteByUserId(userId: string): Promise<boolean> {
    if (!userId) return false;
    const pool = getDbPool();
    try {
      await pool.query("DELETE FROM sessions WHERE user_id = ?", [userId]);
    } catch (e) {}
    return true;
  }
};