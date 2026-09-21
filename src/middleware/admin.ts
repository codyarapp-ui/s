import { Request, Response, NextFunction } from "express";
import { getCurrentUserAsync, getDbPool, verifyPassword } from "../db/db";
import { FileStorage } from "../db/fileStorage";

/**
 * Legacy escape hatch: set ALLOW_LEGACY_ID_AUTH=true in the server .env
 * to temporarily restore the previous (insecure) behaviour where a plain
 * user-id header was enough to gain admin access. Only use it if something
 * unexpected breaks in production, then turn it off again.
 */
const allowLegacyIdAuth = String(process.env.ALLOW_LEGACY_ID_AUTH || "").toLowerCase() === "true";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // 0. If user is already set on request
    if ((req as any).user && ((req as any).user.role === "admin" || (req as any).user.is_super_admin)) {
      return next();
    }

    const sessionTokenHeader = String(req.headers["x-session-token"] || req.headers["x-access-token"] || "").trim();
    const userIdHeader = String(req.headers["x-user-id"] || "").trim();
    const cookieUserId = String((req as any).cookies?.session_user_id || "").trim();
    const adminRoleHeader = String(req.headers["x-admin-role"] || req.headers["x-role"] || "").trim();

    // 1. Legacy id-only admin access (disabled by default, see ALLOW_LEGACY_ID_AUTH above)
    if (allowLegacyIdAuth) {
      const authHeader = String(req.headers.authorization || "").trim();
      const isDirectAdminToken =
        sessionTokenHeader === "us_admin_root" ||
        userIdHeader === "us_admin_root" ||
        cookieUserId === "us_admin_root" ||
        authHeader === "Bearer us_admin_root" ||
        authHeader === "us_admin_root";

      if (isDirectAdminToken) {
        (req as any).user = {
          id: "us_admin_root",
          phone: "09120947304",
          full_name: "مدیر عالی پلتفرم",
          name: "مدیر عالی پلتفرم",
          role: "admin",
          is_super_admin: 1,
          isSuperAdmin: true
        };
        return next();
      }
    }

    // 2. Check X-Admin-Password or X-Admin-Token headers against the stored admin password
    const adminPassHeader = String(req.headers["x-admin-password"] || req.headers["x-admin-token"] || "").trim();
    if (adminPassHeader) {
      let isMatch = false;
      const envAdminPass = process.env.ADMIN_PASSWORD;
      if (envAdminPass && adminPassHeader === envAdminPass) {
        isMatch = true;
      }

      if (!isMatch) {
        try {
          const fileSettings = FileStorage.getSettings ? FileStorage.getSettings() : {};
          const fileAdminPass = fileSettings?.adminPassword || fileSettings?.admin_password;
          if (fileAdminPass && (adminPassHeader === fileAdminPass || verifyPassword(adminPassHeader, fileAdminPass))) {
            isMatch = true;
          }
        } catch {}
      }

      if (!isMatch) {
        try {
          const pool = getDbPool();
          const [settingRows]: any = await pool.query(
            "SELECT setting_value FROM settings WHERE setting_key IN ('adminPassword', 'admin_password') LIMIT 1"
          ).catch(() => [[], []]);
          const storedSettingPass = settingRows && settingRows.length > 0 ? settingRows[0].setting_value : null;
          if (storedSettingPass && (adminPassHeader === storedSettingPass || verifyPassword(adminPassHeader, storedSettingPass))) {
            isMatch = true;
          }
        } catch {}
      }

      if (isMatch) {
        (req as any).user = {
          id: "us_admin_root",
          phone: "09120947304",
          full_name: "مدیر عالی پلتفرم",
          name: "مدیر عالی پلتفرم",
          role: "admin",
          is_super_admin: 1,
          isSuperAdmin: true
        };
        return next();
      }
    }

    // 3. Check current user via a real, server-issued session
    let user = await getCurrentUserAsync(req).catch(() => null);

    // Legacy FileStorage lookup by raw id (disabled by default)
    if (!user && allowLegacyIdAuth) {
      const candidateId = userIdHeader || sessionTokenHeader || cookieUserId;
      if (candidateId) {
        const fsUser = FileStorage.findUserById(candidateId) || FileStorage.findUserByPhone(candidateId);
        if (fsUser && (fsUser.role === "admin" || fsUser.is_super_admin || fsUser.phone === "09120947304")) {
          user = { ...fsUser, role: "admin", is_super_admin: 1, isSuperAdmin: true };
        }
      }
    }

    if (user && (user.role === "admin" || user.is_super_admin || user.phone === "09120947304")) {
      (req as any).user = user;
      return next();
    }

    if (user && adminRoleHeader.toLowerCase() === "admin" && allowLegacyIdAuth) {
      (req as any).user = user;
      return next();
    }

    if (!user) {
      return res.status(401).json({ status: "error", error: "جهت دسترسی به این بخش باید وارد حساب کاربری شوید." });
    }

    if (user.role !== "admin" && !user.is_super_admin) {
      return res.status(403).json({ status: "error", error: "دسترسی غیرمجاز. فقط مدیر ارشد سیستم مجاز است." });
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: "خطا در اعتبارسنجی سطح دسترسی مدیر: " + err.message });
  }
}
