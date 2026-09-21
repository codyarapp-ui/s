/**
 * Single source of truth for super-admin identity.
 *
 * پیش از این شماره موبایل مدیر و شناسه `us_admin_root` در ده‌ها نقطه از کد
 * هاردکد شده بود و هر کدام یک مسیر مستقل برای دور زدن احراز هویت می‌ساخت.
 * از این پس فقط همین فایل مرجع است و مقادیر از متغیرهای محیطی خوانده می‌شوند.
 */

/** شماره موبایل مدیر ارشد. در سرور از طریق ADMIN_PHONE قابل تغییر است. */
export const ADMIN_PHONE = String(process.env.ADMIN_PHONE || "09120947304").trim();

/** شناسه کاربری مدیر ارشد در دیتابیس. */
export const ADMIN_ROOT_ID = String(process.env.ADMIN_ROOT_ID || "us_admin_root").trim();

/** شماره پشتیبانی که در رابط کاربری نمایش داده می‌شود. */
export const SUPPORT_PHONE = String(process.env.SUPPORT_PHONE || ADMIN_PHONE).trim();

/** نام نمایشی پیش‌فرض مدیر. */
export const ADMIN_DISPLAY_NAME = "مدیر کل پلتفرم";

/**
 * تشخیص می‌دهد که آیا یک رکورد کاربرِ *احراز هویت‌شده* مدیر است یا نه.
 *
 * نکته امنیتی: این تابع فقط روی رکوردی صدا زده می‌شود که قبلاً از طریق یک
 * سشن معتبر سمت سرور تأیید شده است. هرگز آن را روی داده‌ی خام ورودی کاربر
 * (هدر، کوکی، body) صدا نزنید.
 *
 * @param user رکورد کاربر خوانده‌شده از دیتابیس.
 * @returns true اگر کاربر نقش مدیر داشته باشد.
 */
export function isAdminUser(user: any): boolean {
  if (!user) return false;
  return user.role === "admin" || Boolean(user.is_super_admin) || Boolean(user.isSuperAdmin);
}

/**
 * آیا مقدار داده‌شده یک «شناسه شبیه‌مدیر» است؟
 * برای مسدود کردن تلاش‌هایی مثل ارسال `us_admin_root` به‌عنوان توکن استفاده می‌شود.
 *
 * @param value مقدار خام دریافتی از کلاینت.
 */
export function isAdminLikeId(value: string | null | undefined): boolean {
  const v = String(value || "").trim();
  if (!v) return false;
  return v === "admin" || v === ADMIN_ROOT_ID || v.startsWith("us_admin") || v === ADMIN_PHONE;
}
