import { Request, Response, NextFunction } from "express";
import { getCurrentUserAsync } from "../db/db";
import { isAdminUser } from "../config/admin";

/**
 * محافظ مسیرهای مدیریتی.
 *
 * تنها راه پذیرفته‌شده، یک سشن معتبرِ صادرشده توسط سرور است (کوکی `access_token`
 * یا هدر `X-Session-Token` که در جدول `sessions` وجود دارد).
 *
 * مسیرهای حذف‌شده نسبت به نسخه قبل — هر کدام یک دور زدن کامل احراز هویت بودند:
 *  - `ALLOW_LEGACY_ID_AUTH`: ارسال شناسه `us_admin_root` به‌عنوان توکن.
 *  - هدرهای `X-Admin-Password` / `X-Admin-Token`: رمز مدیر در هر درخواست روی شبکه
 *    و در لاگ پراکسی‌ها می‌نشست و عملاً یک رمز ثابت بی‌نهایت‌بار قابل امتحان بود.
 *  - هدر `X-Admin-Role: admin` که کلاینت خودش تعیین می‌کرد.
 *  - تطبیق با شماره موبایل هاردکدشده.
 *
 * @param req درخواست ورودی.
 * @param res پاسخ.
 * @param next ادامه زنجیره میدل‌ورها.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // اگر میدل‌ور قبلی کاربر را از روی سشن معتبر ست کرده باشد
    if (isAdminUser((req as any).user)) {
      return next();
    }

    const user = await getCurrentUserAsync(req).catch(() => null);

    if (!user) {
      return res.status(401).json({
        status: "error",
        error: "جهت دسترسی به این بخش باید وارد حساب کاربری شوید."
      });
    }

    if (!isAdminUser(user)) {
      return res.status(403).json({
        status: "error",
        error: "دسترسی غیرمجاز. فقط مدیر ارشد سیستم مجاز است."
      });
    }

    (req as any).user = user;
    return next();
  } catch (err: any) {
    console.error("[requireAdmin] authorization error:", err?.message);
    return res.status(500).json({
      status: "error",
      error: "خطا در اعتبارسنجی سطح دسترسی مدیر."
    });
  }
}
