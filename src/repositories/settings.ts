import { getDbPool, parseJsonColumn } from "../db/db";
import { FileStorage } from "../db/fileStorage";

const defaultSettingsDefaults: Record<string, any> = {
  smsSettings: { apiKey: "", lineNumber: "", provider: "ghasedak" },
  citiesList: [],
  brandsList: [],
  categoriesList: [],
  modelsList: [],
  commonProblems: [],
  adminAnnouncement: "",
  trustBadges: [],
  supportPhone: "09120947304",
  card_number: "6104-3389-6112-6667",
  cardNumber: "6104-3389-6112-6667",
  bank_name: "بانک ملت",
  bankName: "بانک ملت",
  card_holder: "مهدی عباسی (کدیار۲۴)",
  cardHolder: "مهدی عباسی (کدیار۲۴)",
  adminPassword: process.env.ADMIN_PASSWORD || ""
};

export const SettingsRepository = {
  async getSettings(): Promise<any> {
    const fileSettings = FileStorage.getSettings ? FileStorage.getSettings() : {};
    const result: any = { ...defaultSettingsDefaults, ...fileSettings };

    try {
      const pool = getDbPool();
      const [rows] = await pool.query("SELECT * FROM settings");
      if (Array.isArray(rows)) {
        for (const row of rows as any[]) {
          result[row.setting_key] = parseJsonColumn(row.setting_value);
        }
      }
    } catch {}

    delete result.adminPassword;
    return result;
  },

  async getSetting(key: string): Promise<any> {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = ?", [key]);
      const arr = rows as any[];
      if (arr.length > 0) return parseJsonColumn(arr[0].setting_value);
    } catch {}

    const fileSettings = FileStorage.getSettings ? FileStorage.getSettings() : {};
    if (fileSettings && fileSettings[key] !== undefined) {
      return fileSettings[key];
    }

    if (key === "adminPassword" || key === "admin_password") {
      return process.env.ADMIN_PASSWORD || defaultSettingsDefaults.adminPassword;
    }

    return defaultSettingsDefaults[key] ?? null;
  },

  async setSetting(key: string, value: any): Promise<void> {
    try {
      FileStorage.setSetting(key, value);
    } catch {}

    try {
      const pool = getDbPool();
      const valStr = typeof value === "object" ? JSON.stringify(value) : String(value);
      await pool.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, valStr]
      );
    } catch {}
  },

  async updateSettings(updates: Record<string, any>): Promise<any> {
    for (const [k, v] of Object.entries(updates)) {
      await SettingsRepository.setSetting(k, v);
    }
    return SettingsRepository.getSettings();
  }
};
