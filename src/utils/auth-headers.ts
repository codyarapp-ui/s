/**
 * ساخت هدرهای احراز هویت برای درخواست‌های سمت کلاینت.
 *
 * تنها اعتبارِ پذیرفته‌شده، توکن سشنی است که سرور پس از ورود موفق صادر کرده است.
 *
 * موارد حذف‌شده نسبت به نسخه قبل — هر کدام یک نشت امنیتی واقعی بودند:
 *  - `X-Admin-Password`: رمز مدیر در هر درخواست روی شبکه و در لاگ پراکسی‌ها می‌نشست.
 *  - `X-Admin-Role: admin`: کلاینت خودش نقشش را اعلام می‌کرد.
 *  - `X-User-Id` و توکن ثابت `us_admin_root`: دسترسی مدیر بدون هیچ رمزی.
 *
 * @returns هدرهای آماده برای `fetch`.
 */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('access_token') || '';
  if (token) {
    headers['X-Session-Token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * هدرهای درخواست‌های مدیریتی. از نظر امنیتی دقیقاً برابرِ `authHeaders` است —
 * سطح دسترسی را همیشه سرور از روی سشن تعیین می‌کند، نه کلاینت.
 *
 * @returns هدرهای آماده برای `fetch`.
 */
export function adminHeaders(): Record<string, string> {
  return authHeaders();
}
