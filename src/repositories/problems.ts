import { getDbPool, parseJsonColumn } from "../db/db";
import { FileStorage } from "../db/fileStorage";

export const ProblemRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM problems ORDER BY id DESC");
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          ...r,
          id: String(r.id),
          symptoms: parseJsonColumn(r.symptoms) || [],
          solutions: parseJsonColumn(r.solutions) || [],
          likelyCauses: parseJsonColumn(r.likely_causes) || []
        }));
      }
    } catch (e) {}
    return FileStorage.getProblems?.() || [];
  },

  async findById(id: string): Promise<any | null> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM problems WHERE id = ? LIMIT 1", [id]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {}
    return null;
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `prob_${Date.now()}`;
    try {
      await pool.query(
        `INSERT INTO problems (id, title, category, brand, description, symptoms, solutions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, data.title, data.category || "", data.brand || "", data.description || "", JSON.stringify(data.symptoms || []), JSON.stringify(data.solutions || [])]
      );
    } catch (e) {}
    return { ...data, id };
  }
};
