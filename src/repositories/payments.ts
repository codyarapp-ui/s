import { getDbPool } from "../db/db";
import { FileStorage } from "../db/fileStorage";

export const PaymentRepository = {
  async findAll(): Promise<any[]> {
    const pool = getDbPool();
    const paymentsList: any[] = [];
    const seenIds = new Set<string>();

    try {
      const [rows]: any = await pool.query("SELECT * FROM payments ORDER BY created_at DESC");
      if (rows && rows.length > 0) {
        rows.forEach((r: any) => {
          paymentsList.push(r);
          seenIds.add(String(r.id));
        });
      }
    } catch (e) {}

    // Merge subscription_payments_v2 (used by Kotlin app / Bazaar)
    try {
      const [sRows]: any = await pool.query("SELECT * FROM subscription_payments_v2 ORDER BY created_at DESC");
      if (sRows && sRows.length > 0) {
        sRows.forEach((r: any) => {
          const sid = String(r.id);
          if (!seenIds.has(sid)) {
            seenIds.add(sid);
            paymentsList.push({
              id: r.id,
              user_id: r.user_id,
              amount: Number(r.amount) || 0,
              gateway: r.gateway || "bazaar",
              payment_method: r.gateway || "bazaar",
              status: r.status || "completed",
              related_type: "subscription",
              related_id: r.plan || "sub",
              authority: r.authority || "",
              ref_id: r.ref_id || "",
              ref_code: r.ref_id || "",
              created_at: r.created_at
            });
          }
        });
      }
    } catch (e) {}

    // Merge part_payments_v2 (used by Kotlin app / Store)
    try {
      const [pRows]: any = await pool.query("SELECT * FROM part_payments_v2 ORDER BY created_at DESC");
      if (pRows && pRows.length > 0) {
        pRows.forEach((r: any) => {
          const pid = String(r.id);
          if (!seenIds.has(pid)) {
            seenIds.add(pid);
            paymentsList.push({
              id: r.id,
              user_id: r.user_id,
              user_phone: r.user_phone,
              amount: Number(r.total_price || r.amount) || 0,
              gateway: r.gateway || "card_to_card",
              payment_method: r.gateway || "card_to_card",
              status: r.status || "pending",
              related_type: "part_order",
              related_id: r.part_id || "part",
              ref_id: r.ref_id || "",
              ref_code: r.ref_id || "",
              admin_note: r.notes || "",
              created_at: r.created_at
            });
          }
        });
      }
    } catch (e) {}

    if (paymentsList.length > 0) {
      return paymentsList.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    return FileStorage.getPayments?.() || [];
  },

  async findById(id: string): Promise<any | null> {
    const pool = getDbPool();
    try {
      const [rows]: any = await pool.query("SELECT * FROM payments WHERE id = ? LIMIT 1", [id]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {}
    const payments = FileStorage.getPayments?.() || [];
    return payments.find((p: any) => String(p.id) === String(id)) || null;
  },

  async findByUserId(userId: string, userPhone?: string): Promise<any[]> {
    const pool = getDbPool();
    try {
      const cleanPhone = userPhone ? String(userPhone).trim() : "";
      const [rows]: any = await pool.query(
        "SELECT * FROM payments WHERE user_id = ? OR (user_phone != '' AND user_phone = ?) ORDER BY created_at DESC",
        [userId, cleanPhone]
      );
      if (rows && rows.length > 0) return rows;
    } catch (e) {}
    const payments = FileStorage.getPayments?.() || [];
    return payments.filter((p: any) => {
      const uid = String(p.user_id || p.userId || '');
      const uphone = String(p.user_phone || p.userPhone || p.phone || '');
      return (userId && uid === String(userId)) || (userPhone && uphone === String(userPhone));
    });
  },

  async create(data: any): Promise<any> {
    const pool = getDbPool();
    const id = data.id || `pay_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
    const paymentRecord = {
      id,
      user_id: data.user_id || "",
      order_id: data.order_id || null,
      related_type: data.related_type || data.type || "wallet_recharge",
      related_id: data.related_id || "wallet_recharge",
      amount: Number(data.amount) || 0,
      payment_method: data.payment_method || "card_to_card",
      authority: data.authority || "",
      ref_id: data.ref_id || data.tracking_code || "",
      ref_code: data.ref_code || data.ref_id || data.tracking_code || "",
      card_number: data.card_number || "",
      tracking_code: data.tracking_code || data.ref_id || "",
      receipt_img: data.receipt_img || data.receipt_image || "",
      admin_note: data.admin_note || "",
      status: data.status || "pending",
      gateway: data.gateway || "card_to_card",
      user_name: data.user_name || "",
      user_phone: data.user_phone || "",
      user_code: data.user_code || "",
      created_at: new Date().toISOString()
    };

    try {
      await pool.query(
        `INSERT INTO payments (
          id, user_id, order_id, related_type, related_id, amount,
          payment_method, authority, ref_id, ref_code, card_number,
          tracking_code, receipt_img, admin_note, status, gateway,
          user_name, user_phone, user_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          paymentRecord.id,
          paymentRecord.user_id,
          paymentRecord.order_id,
          paymentRecord.related_type,
          paymentRecord.related_id,
          paymentRecord.amount,
          paymentRecord.payment_method,
          paymentRecord.authority,
          paymentRecord.ref_id,
          paymentRecord.ref_code,
          paymentRecord.card_number,
          paymentRecord.tracking_code,
          paymentRecord.receipt_img,
          paymentRecord.admin_note,
          paymentRecord.status,
          paymentRecord.gateway,
          paymentRecord.user_name,
          paymentRecord.user_phone,
          paymentRecord.user_code
        ]
      );
    } catch (e) {}

    // Dual sync to subscription_payments_v2 or part_payments_v2 for Android app compatibility
    try {
      if (paymentRecord.related_type === "subscription") {
        await pool.query(
          `INSERT INTO subscription_payments_v2 (id, user_id, amount, gateway, status, plan, authority, ref_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE status = VALUES(status), ref_id = VALUES(ref_id)`,
          [paymentRecord.id, paymentRecord.user_id, paymentRecord.amount, paymentRecord.gateway, paymentRecord.status, paymentRecord.related_id, paymentRecord.authority, paymentRecord.ref_id]
        );
      } else if (paymentRecord.related_type === "part_order") {
        await pool.query(
          `INSERT INTO part_payments_v2 (id, user_id, user_phone, part_id, part_name, total_price, gateway, status, ref_id, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE status = VALUES(status), ref_id = VALUES(ref_id)`,
          [paymentRecord.id, paymentRecord.user_id, paymentRecord.user_phone, paymentRecord.related_id, paymentRecord.related_id, paymentRecord.amount, paymentRecord.gateway, paymentRecord.status, paymentRecord.ref_id, paymentRecord.admin_note]
        );
      }
    } catch (e) {}

    // FileStorage persistence fallback
    try {
      const store = FileStorage.read();
      if (!Array.isArray(store.payments)) store.payments = [];
      store.payments.unshift(paymentRecord);
      FileStorage.write(store);
    } catch (e) {}

    return paymentRecord;
  },

  async update(id: string, data: any): Promise<any> {
    const pool = getDbPool();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.status) { fields.push("status = ?"); values.push(data.status); }
      if (data.tracking_code) { fields.push("tracking_code = ?"); values.push(data.tracking_code); }
      if (data.admin_note !== undefined) { fields.push("admin_note = ?"); values.push(data.admin_note); }
      if (fields.length > 0) {
        values.push(id);
        await pool.query(`UPDATE payments SET ${fields.join(", ")} WHERE id = ?`, values);
      }
    } catch (e) {}

    try {
      const store = FileStorage.read();
      if (Array.isArray(store.payments)) {
        const idx = store.payments.findIndex((p: any) => String(p.id) === String(id));
        if (idx !== -1) {
          store.payments[idx] = { ...store.payments[idx], ...data };
          FileStorage.write(store);
        }
      }
    } catch (e) {}

    return { id, ...data };
  }
};
