import { getDbPool, parseJsonColumn } from "../db/db";
import { FileStorage } from "../db/fileStorage";

export function isDocumentOrCertificateUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const s = String(url).toLowerCase();
  return (
    s.includes("doc_") ||
    s.includes("upload_doc") ||
    s.includes("document") ||
    s.includes("cert") ||
    s.includes("melli") ||
    s.includes("shenasnameh") ||
    s.includes("parvaneh") ||
    s.includes("madrak") ||
    s.includes("govahi") ||
    s.includes("technical") ||
    s.includes("kart") ||
    s.includes("technician_doc") ||
    s.includes("identity") ||
    s.includes("license")
  );
}

export function sanitizeAvatarUrl(avatarUrl: any, documents?: any[], documentImages?: any[]): string {
  if (!avatarUrl || typeof avatarUrl !== "string") return "";
  const trimmed = avatarUrl.trim();
  if (!trimmed) return "";
  if (isDocumentOrCertificateUrl(trimmed)) return "";

  // Check against uploaded docs list
  const docList = Array.isArray(documents) ? documents : [];
  const imgList = Array.isArray(documentImages) ? documentImages : [];
  for (const d of [...docList, ...imgList]) {
    if (!d) continue;
    const dStr = typeof d === "string" ? d : (d.fileData || d.fileUrl || d.url || "");
    if (dStr && (dStr === trimmed || trimmed.includes(dStr) || dStr.includes(trimmed))) {
      return "";
    }
  }
  return trimmed;
}

function formatTechnicianRow(row: any): any {
  if (!row) return null;
  const specialties = Array.isArray(row.specialties)
    ? row.specialties
    : (Array.isArray(row.specialty) ? row.specialty : (parseJsonColumn(row.specialties || row.specialty) || []));

  const documents = Array.isArray(row.documents)
    ? row.documents
    : (parseJsonColumn(row.documents) || []);

  const documentImages = Array.isArray(row.document_images || row.documentImages)
    ? (row.document_images || row.documentImages)
    : (parseJsonColumn(row.document_images || row.documentImages) || []);

  const rawAvatar = row.avatar_url || row.avatarUrl || "";
  const cleanAvatar = sanitizeAvatarUrl(rawAvatar, documents, documentImages);

  const isVerified = Boolean(
    row.is_verified === 1 ||
    row.is_verified === true ||
    row.isVerified === true ||
    row.status === "active"
  );

  return {
    ...row,
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    name: row.full_name || row.name || "",
    full_name: row.full_name || row.name || "",
    fullName: row.full_name || row.name || "",
    phone: row.phone || "",
    city: row.city || "",
    activeLocation: row.active_location || row.activeLocation || row.city || "",
    active_location: row.active_location || row.activeLocation || row.city || "",
    specialty: specialties,
    specialties: specialties,
    documents,
    document_images: documentImages,
    avatarUrl: cleanAvatar,
    avatar_url: cleanAvatar,
    isVerified,
    is_verified: isVerified ? 1 : 0,
    status: row.status || "pending",
    rating: Number(row.rating || 5.0),
    ratingCount: Number(row.rating_count || row.ratingCount || 0),
    wallet_balance: Number(row.wallet_balance || row.walletBalance || 0),
    walletBalance: Number(row.wallet_balance || row.walletBalance || 0),
    commission_balance: Number(row.commission_balance || row.commissionBalance || 0),
    debt_amount: Number(row.debt_amount || row.debtAmount || 0),
    created_at: row.created_at || row.createdAt || new Date().toISOString()
  };
}

export const TechnicianRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    let dbTechs: any[] = [];
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM technicians WHERE status != 'deleted' ORDER BY id DESC"
      );
      if (rows && rows.length > 0) {
        dbTechs = rows.map(formatTechnicianRow).filter((t: any) => !FileStorage.isTombstone(t.id));
      }
    } catch (e) {
      // fallback to FileStorage
    }

    // Also merge technicians_v2 from MySQL (used by Android/Kotlin app)
    try {
      const [v2Rows]: any = await pool.query(
        "SELECT * FROM technicians_v2 WHERE status != 'deleted' ORDER BY id DESC"
      );
      if (v2Rows && v2Rows.length > 0) {
        v2Rows.forEach((r: any) => {
          if (!FileStorage.isTombstone(r.id)) {
            const formatted = formatTechnicianRow(r);
            if (formatted) dbTechs.push(formatted);
          }
        });
      }
    } catch (e) {}

    const fileTechs = (FileStorage.getTechnicians() || []).map(formatTechnicianRow).filter((t: any) => !FileStorage.isTombstone(t.id));

    const techMap = new Map<string, any>();
    dbTechs.forEach(t => {
      const idKey = String(t.id || '').trim();
      const phoneKey = String(t.phone || '').trim();
      if (idKey) techMap.set(idKey, t);
      if (phoneKey) techMap.set(phoneKey, t);
    });

    fileTechs.forEach(t => {
      const idKey = String(t.id || '').trim();
      const phoneKey = String(t.phone || '').trim();
      if ((idKey && !techMap.has(idKey)) && (!phoneKey || !techMap.has(phoneKey))) {
        if (idKey) techMap.set(idKey, t);
        if (phoneKey) techMap.set(phoneKey, t);
      }
    });

    return Array.from(new Set(techMap.values()));
  },

  async findById(id: string): Promise<any | null> {
    if (!id || FileStorage.isTombstone(id)) return null;
    const cleanId = String(id).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const withTech = cleanId.startsWith("tech_") ? cleanId : `tech_${cleanId}`;

    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM technicians WHERE id = ? OR id = ? OR id = ? OR user_id = ? OR user_id = ? LIMIT 1",
        [cleanId, withoutTech, withTech, cleanId, withoutTech]
      );
      if (rows && rows.length > 0) {
        return formatTechnicianRow(rows[0]);
      }
      const [v2Rows]: any = await pool.query(
        "SELECT * FROM technicians_v2 WHERE id = ? OR id = ? OR id = ? LIMIT 1",
        [cleanId, withoutTech, withTech]
      );
      if (v2Rows && v2Rows.length > 0) {
        return formatTechnicianRow(v2Rows[0]);
      }
    } catch (e) {
      // fallback
    }
    const fromFile = FileStorage.findTechnicianById(cleanId);
    return fromFile ? formatTechnicianRow(fromFile) : null;
  },

  async findByPhone(phone: string): Promise<any | null> {
    if (!phone) return null;
    const cleanPhone = String(phone).trim();
    const withoutZero = cleanPhone.replace(/^0/, "");
    const withZero = cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}`;

    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM technicians WHERE phone = ? OR phone = ? LIMIT 1",
        [withZero, withoutZero]
      );
      if (rows && rows.length > 0) {
        return formatTechnicianRow(rows[0]);
      }
      const [v2Rows]: any = await pool.query(
        "SELECT * FROM technicians_v2 WHERE phone = ? OR phone = ? LIMIT 1",
        [withZero, withoutZero]
      );
      if (v2Rows && v2Rows.length > 0) {
        return formatTechnicianRow(v2Rows[0]);
      }
    } catch (e) {
      // fallback
    }
    const fromFile = FileStorage.findTechnicianByPhone(cleanPhone);
    return fromFile ? formatTechnicianRow(fromFile) : null;
  },

  async findByUserId(userId: string): Promise<any | null> {
    if (!userId || FileStorage.isTombstone(userId)) return null;
    const cleanId = String(userId).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const withTech = cleanId.startsWith("tech_") ? cleanId : `tech_${cleanId}`;

    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM technicians WHERE user_id = ? OR user_id = ? OR id = ? OR id = ? LIMIT 1",
        [cleanId, withoutTech, cleanId, withTech]
      );
      if (rows && rows.length > 0) {
        return formatTechnicianRow(rows[0]);
      }
    } catch (e) {
      // fallback
    }
    return this.findById(userId);
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `tech_${Date.now()}`;
    const cleanId = String(id).trim();

    // Clean avatar: NEVER allow identity documents to be set as avatar
    const documents = Array.isArray(data.documents) ? data.documents : [];
    const documentImages = Array.isArray(data.document_images || data.documentImages) ? (data.document_images || data.documentImages) : [];
    const cleanAvatar = sanitizeAvatarUrl(data.avatar_url || data.avatarUrl || "", documents, documentImages);

    const specialties = Array.isArray(data.specialties) ? data.specialties : (Array.isArray(data.specialty) ? data.specialty : []);

    const newRecord = {
      id: cleanId,
      user_id: data.user_id ? String(data.user_id) : cleanId.replace(/^tech_/, ""),
      full_name: data.full_name || data.fullName || data.name || "",
      phone: data.phone || "",
      city: data.city || "",
      active_location: data.active_location || data.activeLocation || data.city || "",
      specialties: JSON.stringify(specialties),
      documents: JSON.stringify(documents),
      document_images: JSON.stringify(documentImages),
      avatar_url: cleanAvatar,
      is_verified: data.is_verified || data.isVerified ? 1 : 0,
      status: data.status || "pending",
      rating: data.rating || 5.0,
      rating_count: data.rating_count || data.ratingCount || 0,
      wallet_balance: data.wallet_balance || data.walletBalance || 0,
      commission_balance: data.commission_balance || data.commissionBalance || 0,
      debt_amount: data.debt_amount || data.debtAmount || 0,
      created_at: new Date().toISOString()
    };

    try {
      await pool.query(
        `INSERT INTO technicians (
          id, user_id, full_name, phone, city, active_location, specialties, 
          documents, document_images, avatar_url, is_verified, status, rating, wallet_balance, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          full_name = VALUES(full_name),
          phone = VALUES(phone),
          city = VALUES(city),
          active_location = VALUES(active_location),
          specialties = VALUES(specialties),
          documents = VALUES(documents),
          document_images = VALUES(document_images),
          avatar_url = VALUES(avatar_url),
          is_verified = VALUES(is_verified),
          status = VALUES(status),
          wallet_balance = VALUES(wallet_balance)`,
        [
          newRecord.id, newRecord.user_id, newRecord.full_name, newRecord.phone, newRecord.city,
          newRecord.active_location, newRecord.specialties, newRecord.documents,
          newRecord.document_images, newRecord.avatar_url, newRecord.is_verified,
          newRecord.status, newRecord.rating, newRecord.wallet_balance, newRecord.created_at
        ]
      );
    } catch (e) {
      // fallback to FileStorage
    }

    // Dual-sync to technicians_v2 for Android app compatibility
    try {
      await pool.query(
        `INSERT INTO technicians_v2 (
          id, phone, full_name, role, status, rating, specialties, city, documents, balance, avatar_url
        ) VALUES (?, ?, ?, 'technician', ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          full_name = VALUES(full_name),
          phone = VALUES(phone),
          city = VALUES(city),
          specialties = VALUES(specialties),
          documents = VALUES(documents),
          avatar_url = VALUES(avatar_url),
          status = VALUES(status),
          balance = VALUES(balance)`,
        [
          newRecord.id, newRecord.phone, newRecord.full_name, newRecord.status,
          newRecord.rating, newRecord.specialties, newRecord.city,
          newRecord.documents, newRecord.wallet_balance, newRecord.avatar_url
        ]
      );
    } catch (e) {}

    FileStorage.saveTechnician({
      ...newRecord,
      specialties,
      specialty: specialties,
      documents,
      document_images: documentImages
    });

    return formatTechnicianRow(newRecord);
  },

  async update(id: string, updates: any): Promise<any> {
    if (!id) return null;
    const cleanId = String(id).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const withTech = cleanId.startsWith("tech_") ? cleanId : `tech_${cleanId}`;

    const pool = getDbPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined || updates.full_name !== undefined || updates.fullName !== undefined) {
      fields.push("full_name = ?");
      values.push(updates.name || updates.full_name || updates.fullName);
    }
    if (updates.phone !== undefined) {
      fields.push("phone = ?");
      values.push(updates.phone);
    }
    if (updates.city !== undefined) {
      fields.push("city = ?");
      values.push(updates.city);
    }
    if (updates.activeLocation !== undefined || updates.active_location !== undefined) {
      fields.push("active_location = ?");
      values.push(updates.activeLocation ?? updates.active_location);
    }
    if (updates.specialty !== undefined || updates.specialties !== undefined) {
      const specs = Array.isArray(updates.specialties) ? updates.specialties : (Array.isArray(updates.specialty) ? updates.specialty : [updates.specialty]);
      fields.push("specialties = ?");
      values.push(JSON.stringify(specs));
    }
    if (updates.documents !== undefined) {
      const docs = Array.isArray(updates.documents) ? updates.documents : [];
      fields.push("documents = ?");
      values.push(JSON.stringify(docs));
    }
    if (updates.document_images !== undefined || updates.documentImages !== undefined) {
      const imgs = Array.isArray(updates.document_images || updates.documentImages) ? (updates.document_images || updates.documentImages) : [];
      fields.push("document_images = ?");
      values.push(JSON.stringify(imgs));
    }
    if (updates.avatarUrl !== undefined || updates.avatar_url !== undefined) {
      const av = sanitizeAvatarUrl(updates.avatarUrl ?? updates.avatar_url, updates.documents, updates.document_images);
      fields.push("avatar_url = ?");
      values.push(av);
    }
    if (updates.isVerified !== undefined || updates.is_verified !== undefined) {
      const v = updates.isVerified ?? updates.is_verified;
      fields.push("is_verified = ?");
      values.push(v ? 1 : 0);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.wallet_balance !== undefined || updates.walletBalance !== undefined) {
      fields.push("wallet_balance = ?");
      values.push(updates.wallet_balance ?? updates.walletBalance);
    }
    if (updates.rating !== undefined) {
      fields.push("rating = ?");
      values.push(updates.rating);
    }

    if (fields.length > 0) {
      values.push(cleanId, withoutTech, withTech, cleanId, withoutTech);
      try {
        await pool.query(
          `UPDATE technicians SET ${fields.join(", ")} WHERE id = ? OR id = ? OR id = ? OR user_id = ? OR user_id = ?`,
          values
        );
      } catch (e) {}
    }

    FileStorage.updateTechnician(cleanId, updates);
    return this.findById(cleanId);
  },

  async deleteById(id: string): Promise<boolean> {
    if (!id) return false;
    const cleanId = String(id).trim();
    const withoutTech = cleanId.replace(/^tech_/, "");
    const withTech = cleanId.startsWith("tech_") ? cleanId : `tech_${cleanId}`;

    const pool = getDbPool();
    try {
      await pool.query("SET FOREIGN_KEY_CHECKS = 0").catch(() => {});
      await pool.query("DELETE FROM technician_specialties WHERE technician_id = ? OR technician_id = ?", [cleanId, withoutTech]).catch(() => {});
      await pool.query("DELETE FROM technician_services WHERE technician_id = ? OR technician_id = ?", [cleanId, withoutTech]).catch(() => {});
      await pool.query("DELETE FROM technicians WHERE id = ? OR id = ? OR id = ? OR user_id = ? OR user_id = ?", [cleanId, withoutTech, withTech, cleanId, withoutTech]).catch(() => {});
      await pool.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    } catch (e) {}

    FileStorage.deleteTechnician(cleanId);
    FileStorage.deleteTechnician(withoutTech);
    return true;
  }
};