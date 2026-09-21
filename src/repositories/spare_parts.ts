import { getDbPool, parseJsonColumn } from "../db/db";
import { FileStorage } from "../db/fileStorage";

export const SparePartRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM spare_parts ORDER BY id DESC");
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          ...r,
          id: String(r.id),
          price: Number(r.price || 0),
          stock: Number(r.stock || 0),
          compatibility: parseJsonColumn(r.compatibility) || []
        }));
      }
    } catch (e) {}
    return FileStorage.getSpareParts() || [];
  },

  async findById(id: string): Promise<any | null> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM spare_parts WHERE id = ? LIMIT 1", [id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          id: String(r.id),
          price: Number(r.price || 0),
          stock: Number(r.stock || 0),
          compatibility: parseJsonColumn(r.compatibility) || []
        };
      }
    } catch (e) {}
    return FileStorage.findSparePartById(id);
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `part_${Date.now()}`;
    const compat = Array.isArray(data.compatibility) ? JSON.stringify(data.compatibility) : (data.compatibility || "[]");
    try {
      await pool.query(
        `INSERT INTO spare_parts (id, name, brand, category, price, stock, description, image_url, part_number, compatibility, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, data.name || "", data.brand || "", data.category || "", data.price || 0, data.stock || 0, data.description || "", data.image_url || data.imageUrl || "", data.part_number || data.partNumber || "", compat]
      );
    } catch (e) {}
    FileStorage.saveSparePart({ ...data, id });
    return this.findById(id);
  },

  async update(id: string, data: any): Promise<any> {
    const pool = getDbPool();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.price !== undefined) { fields.push("price = ?"); values.push(data.price); }
    if (data.stock !== undefined) { fields.push("stock = ?"); values.push(data.stock); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
    if (data.image_url !== undefined || data.imageUrl !== undefined) { fields.push("image_url = ?"); values.push(data.image_url ?? data.imageUrl); }
    if (fields.length > 0) {
      values.push(id);
      try {
        await pool.query(`UPDATE spare_parts SET ${fields.join(", ")} WHERE id = ?`, values);
      } catch (e) {}
    }
    FileStorage.updateSparePart(id, data);
    return this.findById(id);
  },

  async deleteById(id: string): Promise<boolean> {
    const pool = getDbPool();
    try {
      await pool.query("DELETE FROM spare_parts WHERE id = ?", [id]);
    } catch (e) {}
    FileStorage.deleteSparePart(id);
    return true;
  }
};
