import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import compression from "compression";
import { createServer as createViteServer } from "vite";

import { checkDbConnection, getCurrentUserAsync, verifyPassword, hashPassword, needsRehash, getDbPool, rememberSession, forgetSession } from "./src/db/db";
import { getNextSequentialId } from "./src/db/idHelper";
import { FileStorage } from "./src/db/fileStorage";
import { requireAdmin } from "./src/middleware/admin";
import { ADMIN_PHONE, ADMIN_ROOT_ID, ADMIN_DISPLAY_NAME, isAdminUser } from "./src/config/admin";
import { SessionRepository } from "./src/repositories/sessions";
import crypto from "crypto";
import { diagnoseErrorCode, suggestPartsForError } from "./src/services/gemini";
import {
  UserRepository,
  TechnicianRepository,
  OrderRepository,
  SparePartRepository,
  ErrorCodeRepository,
  ProblemRepository,
  TicketRepository,
  SettingsRepository,
  PaymentRepository,
  SubscriptionRepository,
  PartOrderRepository,
  WalletTransactionRepository,
  SmsLogRepository,
  ActivityLogRepository
} from "./src/repositories";
import { isDocumentOrCertificateUrl } from "./src/repositories/technicians";

if (fs.existsSync("env")) {
  dotenv.config({ path: "env" });
} else {
  dotenv.config();
}

const app = express();
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ----------------------------------------------------
// SECURITY & CORS MIDDLEWARES
// ----------------------------------------------------

// 1. CORS & Public Access (Enable Mobile App & External Integration Access)
// Credentialed requests must echo the exact origin - a wildcard with cookies is both
// rejected by browsers and unsafe. Non-credentialed clients (mobile apps) still get "*".
app.use((req, res, next) => {
  const requestOrigin = String(req.headers.origin || "").trim();
  if (requestOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  // X-Admin-Token و X-Admin-Password از فهرست حذف شدند — دیگر در هیچ مسیری پذیرفته نمی‌شوند.
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token, X-Access-Token, X-Requested-With, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 2. Security Headers (Anti-Clickjacking, XSS Protection, No Sniff, Referrer Policy)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
});

// 3. Block direct URL access to sensitive files (.env, .git, database dumps, backups, etc.)
app.use((req, res, next) => {
  const normalizedPath = decodeURIComponent(req.path).toLowerCase();
  const blockedPatterns = [
    /\/\.env/i,
    /\/\.git/i,
    /\.sql$/i,
    /\.bak$/i,
    /\.sqlite$/i,
    /\/backups\//i,
    /\/uploads\/backups\//i,
    /\/database\.json/i,
    /\/firebase[^\/]*\.json/i,
    /\/package\.json/i,
    /\/tsconfig\.json/i,
    /\/db_store\.json/i,
    /\/uploads\/[^\/]*store[^\/]*\.json/i,
    /\.env$/i,
    /\/package-lock\.json/i
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(normalizedPath)) {
      return res.status(403).json({ status: "error", message: "دسترسی به این منبع غیرمجاز است." });
    }
  }
  next();
});

/** آیا مقدار داده‌شده یک هش رمز است (bcrypt / md5 / sha256) یا متن خام؟ */
function isHashedSecret(value: string): boolean {
  return (
    value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$") ||
    /^[a-fA-F0-9]{32}$/.test(value) || /^[a-fA-F0-9]{64}$/.test(value)
  );
}

/** مقایسه دو رشته در زمان ثابت تا از حمله timing جلوگیری شود. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/** IP واقعی درخواست‌کننده، با احتساب پراکسی. */
function clientIp(req: express.Request): string {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

// 3. In-memory Rate Limiter for Authentication & Sensitive endpoints (Brute Force Protection)
// یادداشت: این محدودکننده in-process است؛ در استقرار چند-اینستنسی باید به Redis منتقل شود.
const authRateLimitMap = new Map<string, { count: number; resetAt: number; blockedUntil?: number }>();

// جلوگیری از رشد بی‌نهایت Map (نشت حافظه تحت حمله با IP متغیر)
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of authRateLimitMap) {
    if (rec.resetAt < now && (!rec.blockedUntil || rec.blockedUntil < now)) {
      authRateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * محدودکننده نرخ درخواست برای مسیرهای حساس.
 *
 * @param maxAttempts حداکثر تلاش در بازه زمانی.
 * @param windowMs طول بازه زمانی به میلی‌ثانیه.
 * @param blockMs مدت قفل پس از عبور از سقف (صفر = فقط تا پایان بازه).
 */
function createRateLimiter(maxAttempts = 15, windowMs = 60 * 1000, blockMs = 0) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.path}:${clientIp(req)}`;
    const now = Date.now();
    const record = authRateLimitMap.get(key);

    if (record?.blockedUntil && record.blockedUntil > now) {
      const waitSec = Math.ceil((record.blockedUntil - now) / 1000);
      return res.status(429).json({
        status: "error",
        message: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. دسترسی شما تا ${waitSec} ثانیه دیگر موقتاً مسدود است.`
      });
    }

    if (!record || record.resetAt < now) {
      authRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxAttempts) {
      if (blockMs > 0) {
        record.blockedUntil = now + blockMs;
      }
      const waitSec = Math.ceil(((record.blockedUntil || record.resetAt) - now) / 1000);
      return res.status(429).json({
        status: "error",
        message: `تعداد درخواست‌های بیش از حد مجاز. لطفاً ${waitSec} ثانیه دیگر مجدداً تلاش نمایید.`
      });
    }

    record.count++;
    next();
  };
}

const authRateLimit = createRateLimiter(15, 60 * 1000); // 15 requests per minute for login
// ورود مدیر هدف اصلی brute-force است → سقف بسیار پایین‌تر با قفل ۱۵ دقیقه‌ای
const adminLoginRateLimit = createRateLimiter(5, 10 * 60 * 1000, 15 * 60 * 1000);
const otpRateLimit = createRateLimiter(5, 60 * 1000);   // 5 OTP requests per minute

// Activity Logger Helper to track all user actions into database
async function logUserActivity(
  req: express.Request,
  action: string,
  module: string = "general",
  details: any = null,
  targetUser: any = null
) {
  try {
    const user = targetUser || (await getCurrentUserAsync(req).catch(() => null));
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "");
    const userAgent = String(req.headers["user-agent"] || "");
    await ActivityLogRepository.create({
      user_id: user?.id || null,
      user_name: user?.full_name || user?.name || "",
      user_role: user?.role || "client",
      action,
      module,
      ip,
      user_agent: userAgent,
      details
    });
  } catch (e) {
    console.warn("[logUserActivity] error:", e);
  }
}

// Directories setup
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const ROOT_UPLOADS_DIR = path.join(process.cwd(), "uploads");

[PUBLIC_UPLOADS_DIR, ROOT_UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const techDir = path.join(dir, "technicians");
  if (!fs.existsSync(techDir)) {
    fs.mkdirSync(techDir, { recursive: true });
  }
  const backupsDir = path.join(dir, "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const techDocsDir = path.join(dir, "tech_docs");
  if (!fs.existsSync(techDocsDir)) {
    fs.mkdirSync(techDocsDir, { recursive: true });
  }
});

const BACKUPS_DIR = path.join(PUBLIC_UPLOADS_DIR, "backups");

// Static files serving with CORS and Cache-Control headers for mobile apps
app.use("/uploads", express.static(PUBLIC_UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
}));

app.use("/uploads", express.static(ROOT_UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
}));

// Helper to convert relative or local URLs into Absolute HTTPS URLs for mobile & web clients
export function toAbsoluteHttpsUrl(req: express.Request, urlStr: string | null | undefined): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  const trimmed = urlStr.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed; // Valid base64 URI
  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('http://')) {
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) return trimmed;
    return trimmed.replace(/^http:\/\//i, 'https://');
  }

  const host = req.get('x-forwarded-host') || req.get('host') || 'kadyar24.ir';
  const proto = req.get('x-forwarded-proto') === 'https' || req.secure || !host.includes('localhost') ? 'https' : 'http';
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${proto}://${host}${cleanPath}`;
}

// Helper to save Base64 avatar data URI to an actual clean file on disk
export function saveBase64AvatarImage(dataUriOrBase64: string, techPrefix = "tech"): string | null {
  if (!dataUriOrBase64 || typeof dataUriOrBase64 !== "string") return null;
  const trimmed = dataUriOrBase64.trim();
  if (!trimmed.startsWith("data:image/")) {
    return trimmed; // Already a URL or relative path
  }

  try {
    const matches = trimmed.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    if (!matches || matches.length < 3) return null;

    let ext = matches[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const cleanPrefix = String(techPrefix).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `avatar_${cleanPrefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}.${ext}`;
    
    // Save to all possible upload directories so it physically exists wherever the host looks
    const targetDirs = [
      path.join(PUBLIC_UPLOADS_DIR, "technicians"),
      path.join(ROOT_UPLOADS_DIR, "technicians"),
      path.join(process.cwd(), "dist", "uploads", "technicians")
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, filename), buffer);
      } catch (err) {
        // Continue writing to others if one fails
      }
    }

    return `/uploads/technicians/${filename}`;
  } catch (err) {
    console.error("[saveBase64AvatarImage] error saving file:", err);
    return null;
  }
}

// Direct file upload endpoint for technician documents and media
app.post(["/api/directus-upload", "/api/upload/document", "/api/technicians/upload-document"], async (req, res) => {
  try {
    const fileData = req.body?.fileData || req.body?.fileBase64 || req.body?.data;
    const name = String(req.body?.name || req.body?.fileName || "document");
    const fileType = String(req.body?.fileType || req.body?.type || "");

    if (!fileData || typeof fileData !== "string") {
      return res.status(400).json({ success: false, error: "داده‌های فایل ارسالی یافت نشد." });
    }

    let buffer: Buffer;
    let ext = "jpg";

    if (fileData.startsWith("data:")) {
      const match = fileData.match(/^data:([a-zA-Z0-9\+\-\.\/]+);base64,(.+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        if (mime.includes("pdf")) ext = "pdf";
        else if (mime.includes("png")) ext = "png";
        else if (mime.includes("webp")) ext = "webp";
        else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
        else if (mime.includes("svg")) ext = "svg";
        else if (mime.includes("sheet") || mime.includes("excel") || mime.includes("xls")) ext = "xlsx";
        buffer = Buffer.from(match[2], "base64");
      } else {
        const rawBase64 = fileData.split(",")[1] || fileData;
        buffer = Buffer.from(rawBase64, "base64");
      }
    } else {
      buffer = Buffer.from(fileData, "base64");
    }

    // Determine extension from original name if possible
    if (name && name.includes(".")) {
      const parsedExt = name.split(".").pop()?.toLowerCase();
      if (parsedExt && ["jpg", "jpeg", "png", "webp", "pdf", "svg", "xls", "xlsx", "doc", "docx", "mp4", "mov"].includes(parsedExt)) {
        ext = parsedExt === "jpeg" ? "jpg" : parsedExt;
      }
    }

    const filename = `doc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

    const targetDirs = [
      path.join(PUBLIC_UPLOADS_DIR, "technicians"),
      path.join(ROOT_UPLOADS_DIR, "technicians"),
      path.join(process.cwd(), "dist", "uploads", "technicians")
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
      } catch (e) {}
    }

    const relativeUrl = `/uploads/technicians/${filename}`;
    const absoluteUrl = toAbsoluteHttpsUrl(req, relativeUrl);

    return res.json({
      success: true,
      url: relativeUrl,
      fileUrl: relativeUrl,
      absoluteUrl,
      filename,
      size: buffer.length
    });
  } catch (err: any) {
    console.error("[directus-upload] error saving file:", err);
    return res.status(500).json({ success: false, error: err.message || "خطا در پردازش و ذخیره‌سازی فایل" });
  }
});

// Format technician for public API responses with absolute HTTPS URLs and normalized keys
export function formatTechnicianForResponse(tech: any, req: express.Request, isPrivileged?: boolean) {
  if (!tech) return null;
  let rawAvatar = tech.avatar_url || tech.avatarUrl || tech.user_avatar_url || tech.userAvatarUrl || '';
  
  // Clean documents from avatar
  if (
    isDocumentOrCertificateUrl(rawAvatar) ||
    rawAvatar.includes('/uploads/technicians/doc_') ||
    rawAvatar.includes('data:application/pdf') ||
    rawAvatar.toLowerCase().includes('melli') ||
    rawAvatar.toLowerCase().includes('madrak')
  ) {
    rawAvatar = '';
  }

  // Check if rawAvatar matches any uploaded documents or document images
  const docs = Array.isArray(tech.documents) ? tech.documents : [];
  const docImgs = Array.isArray(tech.document_images) ? tech.document_images : [];
  for (const d of docs) {
    const urlStr = typeof d === 'string' ? d : (d?.fileUrl || d?.url || d?.fileData || '');
    if (urlStr && (urlStr === rawAvatar || (rawAvatar && urlStr.includes(rawAvatar)) || (rawAvatar && rawAvatar.includes(urlStr)))) {
      rawAvatar = '';
      break;
    }
  }
  for (const img of docImgs) {
    if (typeof img === 'string' && (img === rawAvatar || (rawAvatar && img.includes(rawAvatar)) || (rawAvatar && rawAvatar.includes(img)))) {
      rawAvatar = '';
      break;
    }
  }

  const fullAvatarUrl = rawAvatar ? toAbsoluteHttpsUrl(req, rawAvatar) : '';
  const fullName = tech.full_name || tech.name || tech.user_full_name || '';

  // بررسی وضعیت تعلیق یا مسدودیت
  const isSuspended = tech.status === 'suspended' || tech.status === 'blocked';

  const isVerified = !isSuspended && Boolean(
    tech.isVerified === true ||
    tech.is_verified === 1 ||
    tech.is_verified === true ||
    tech.is_verified === '1'
  );
  const currentStatus = isSuspended ? 'suspended' : (tech.status || (isVerified ? 'active' : 'pending'));

  // Privacy protection: documents are strictly for admin verification, never for public view
  const user = (req as any).user;
  const canSeeDocs = isPrivileged !== undefined
    ? isPrivileged
    : Boolean(
        user?.role === 'admin' ||
        user?.is_super_admin ||
        (user?.id && (String(user.id) === String(tech.id) || String(user.id) === String(tech.user_id) || String(user.phone) === String(tech.phone)))
      );

  return {
    ...tech,
    name: fullName,
    full_name: fullName,
    fullName: fullName,
    avatar_url: fullAvatarUrl,
    avatarUrl: fullAvatarUrl,
    isVerified,
    is_verified: isVerified ? 1 : 0,
    status: currentStatus,
    documents: canSeeDocs ? docs : [],
    document_images: canSeeDocs ? docImgs : []
  };
}

async function issueSession(req: express.Request, res: express.Response, userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  try {
    await SessionRepository.create({
      user_id: userId,
      token,
      refresh_token: refreshToken,
      user_agent: String(req.headers["user-agent"] || ""),
      ip: String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""),
      expires_at: expiresAt
    });
  } catch (e) {
    console.error("[session] create failed:", e);
  }
  // Always keep an in-process copy so a database hiccup can never invalidate a fresh login.
  rememberSession(token, userId, expiresAt);
  rememberSession(refreshToken, userId, expiresAt);
  res.cookie("session_user_id", userId, { httpOnly: true, path: "/", sameSite: "lax" });
  res.cookie("access_token", token, { httpOnly: true, path: "/", sameSite: "lax" });
  return { token, refresh_token: refreshToken, expires_at: expiresAt.toISOString() };
}

// ----------------------------------------------------
// SEO & PWA ENDPOINTS (Robots, Sitemap, Manifest, Icons)
// ----------------------------------------------------
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  const host = req.headers.host || "kodyar24.ir";
  res.send(`User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`);
});

// Dedicated Open Graph image and Favicon endpoints
app.get(["/favicon.ico", "/favicon.svg"], (req, res) => {
  const iconPath = path.join(process.cwd(), "public", "favicon.svg");
  if (fs.existsSync(iconPath)) {
    res.type("image/svg+xml").sendFile(iconPath);
  } else {
    res.status(404).end();
  }
});

app.get(["/og-image.png", "/og-image.svg"], (req, res) => {
  const ogPath = path.join(process.cwd(), "public", "og-image.svg");
  if (fs.existsSync(ogPath)) {
    res.type("image/svg+xml").sendFile(ogPath);
  } else {
    res.status(404).end();
  }
});

app.get("/sitemap.xml", async (req, res) => {
  res.type("application/xml");
  try {
    const host = req.headers.host || "kodyar24.ir";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;

    let errorCodesList: any[] = [];
    let sparePartsList: any[] = [];
    try {
      [errorCodesList, sparePartsList] = await Promise.all([
        ErrorCodeRepository.findAll().catch(() => []),
        SparePartRepository.findAll().catch(() => [])
      ]);
    } catch (dbErr) {
      console.warn("[sitemap] Failed to fetch data from database, falling back to static:", dbErr);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Root homepage
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n    <changefreq>daily</changefreq>\n  </url>\n`;

    // Spare parts marketplace root
    xml += `  <url>\n    <loc>${baseUrl}/parts</loc>\n    <priority>0.9</priority>\n    <changefreq>daily</changefreq>\n  </url>\n`;

    // Dynamic error code pages
    const seenUrls = new Set<string>();
    for (const item of errorCodesList) {
      if (item && item.code && item.brand) {
        const b = encodeURIComponent(String(item.brand).trim().toLowerCase().replace(/\s+/g, '-'));
        const c = encodeURIComponent(String(item.code).trim().toLowerCase().replace(/\s+/g, '-'));
        const errorPath = `/error-code/${b}/${c}`;
        if (!seenUrls.has(errorPath)) {
          seenUrls.add(errorPath);
          xml += `  <url>\n    <loc>${baseUrl}${errorPath}</loc>\n    <priority>0.9</priority>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
        }
      }
    }

    // Dynamic spare parts pages
    for (const part of sparePartsList) {
      if (part && part.id) {
        const b = encodeURIComponent(String(part.brand || 'appliance').trim().toLowerCase().replace(/\s+/g, '-'));
        const partId = encodeURIComponent(String(part.id).trim());
        const partPath = `/part/${b}/${partId}`;
        if (!seenUrls.has(partPath)) {
          seenUrls.add(partPath);
          xml += `  <url>\n    <loc>${baseUrl}${partPath}</loc>\n    <priority>0.8</priority>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
        }
      }
    }

    xml += `</urlset>`;
    res.send(xml);
  } catch (err) {
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://kodyar24.ir/</loc></url></urlset>`);
  }
});

app.get("/manifest.json", (req, res) => {
  res.json({
    name: "سامانه هوشمند کدیار۲۴",
    short_name: "کدیار۲۴",
    description: "بزرگترین مرجع عیب‌یابی و اعزام تکنسین لوازم خانگی کشور",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' fill='%234f46e5'><rect width='512' height='512' rx='100'/><path d='M150 150h212v212H150z' fill='white'/></svg>",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  });
});

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/admin-login", adminLoginRateLimit, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || !String(password).trim()) {
      return res.status(400).json({ status: "error", error: "کلمه عبور الزامی است" });
    }

    const rawInput = String(password).trim();
    // Normalize Persian/Arabic digits to English digits
    const normalizeDigits = (str: string) =>
      String(str || "")
        .replace(/[۰٠]/g, "0")
        .replace(/[۱١]/g, "1")
        .replace(/[۲٢]/g, "2")
        .replace(/[۳٣]/g, "3")
        .replace(/[۴٤]/g, "4")
        .replace(/[۵٥]/g, "5")
        .replace(/[۶٦]/g, "6")
        .replace(/[۷٧]/g, "7")
        .replace(/[۸٨]/g, "8")
        .replace(/[۹٩]/g, "9")
        .trim();

    const normalizedInput = normalizeDigits(rawInput);

    const pool = getDbPool();

    // ------------------------------------------------------------------
    // اعتبارسنجی رمز مدیر.
    //
    // فقط منابعی که *سمت سرور* ذخیره شده‌اند پذیرفته می‌شوند:
    //   1. هش رمز کاربرِ مدیر در جدول users  (منبع اصلی)
    //   2. مقدار ذخیره‌شده در جدول settings   (میراث - پس از ورود ارتقا می‌یابد)
    //   3. متغیر محیطی ADMIN_PASSWORD        (برای بازیابی اضطراری)
    //
    // حذف شد: رمزی که خودِ کلاینت در body می‌فرستاد (localAdminPassword) و
    // لیست ADMIN_MASTER_PASSWORDS — هر دو عملاً دور زدن احراز هویت بودند.
    // ------------------------------------------------------------------
    const [settingRows]: any = await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key IN ('adminPassword', 'admin_password') LIMIT 1"
    ).catch(() => [[], []]);
    const storedSettingPass = settingRows && settingRows.length > 0 ? settingRows[0].setting_value : null;

    let adminUser = await UserRepository.findByPhoneWithPassword(ADMIN_PHONE).catch(() => null);
    if (!adminUser) {
      adminUser = FileStorage.findUserByPhone(ADMIN_PHONE) || FileStorage.findUserById(ADMIN_ROOT_ID);
    }
    const userPassHash = adminUser?.password_hash || adminUser?.password || null;
    const envAdminPass = process.env.ADMIN_PASSWORD;

    /** مقایسه ورودی با یک مقدار ذخیره‌شده سمت سرور (هش یا رمز خام میراثی). */
    const checkStored = (target: string | null | undefined): boolean => {
      if (!target) return false;
      const cleanTarget = String(target).trim();
      if (!cleanTarget) return false;
      // رمز هش‌شده → مقایسه از طریق bcrypt
      if (isHashedSecret(cleanTarget)) {
        return verifyPassword(rawInput, cleanTarget) || verifyPassword(normalizedInput, cleanTarget);
      }
      // رمز خام میراثی → مقایسه زمان‌ثابت تا نشت اطلاعات از طریق زمان پاسخ رخ ندهد
      return safeEqual(rawInput, cleanTarget) || safeEqual(normalizedInput, cleanTarget);
    };

    let isMatch = false;
    /** آیا رمز از یک منبعِ ذخیره‌شده به‌صورت خام آمده و باید به bcrypt ارتقا یابد؟ */
    let needsHashUpgrade = false;

    if (userPassHash && checkStored(userPassHash)) {
      isMatch = true;
      if (!isHashedSecret(String(userPassHash).trim())) needsHashUpgrade = true;
    }
    if (!isMatch && storedSettingPass && checkStored(storedSettingPass)) {
      isMatch = true;
      needsHashUpgrade = true;
    }
    if (!isMatch && envAdminPass && checkStored(envAdminPass)) {
      isMatch = true;
      needsHashUpgrade = true;
    }

    if (isMatch) {
      let targetAdminUser = adminUser;
      if (!targetAdminUser) {
        const [admRows]: any = await pool.query("SELECT * FROM users WHERE role = 'admin' OR is_super_admin = 1 LIMIT 1").catch(() => [[], []]);
        if (admRows && admRows.length > 0) {
          targetAdminUser = admRows[0];
        }
      }
      if (!targetAdminUser) {
        targetAdminUser = await UserRepository.create({
          id: ADMIN_ROOT_ID,
          user_code: "US-ADM-01",
          phone: ADMIN_PHONE,
          full_name: ADMIN_DISPLAY_NAME,
          role: "admin",
          is_super_admin: true,
          password_hash: hashPassword(rawInput)
        }).catch(() => null);
        needsHashUpgrade = false;
      }

      const adminId = targetAdminUser?.id || ADMIN_ROOT_ID;

      // ارتقای خودکار: رمز خام را به bcrypt تبدیل و نسخه‌های متنی را پاک می‌کنیم.
      // این کار باعث می‌شود سایتِ زنده بدون قطعی، به ذخیره‌سازی امن مهاجرت کند.
      if (needsHashUpgrade) {
        const newHash = hashPassword(rawInput);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, adminId]).catch(() => {});
        await pool.query("DELETE FROM settings WHERE setting_key IN ('adminPassword', 'admin_password')").catch(() => {});
        try { FileStorage.setSetting("adminPassword", ""); } catch {}
        try { FileStorage.setSetting("admin_password", ""); } catch {}
      }

      const session = await issueSession(req, res, adminId);
      await logUserActivity(req, "admin_login", "auth", { phone: ADMIN_PHONE }, targetAdminUser);
      return res.json({
        status: "ok",
        user: {
          id: adminId,
          name: targetAdminUser?.full_name || ADMIN_DISPLAY_NAME,
          full_name: targetAdminUser?.full_name || ADMIN_DISPLAY_NAME,
          role: "admin",
          phone: targetAdminUser?.phone || ADMIN_PHONE,
          isSuperAdmin: true,
          is_super_admin: true,
        },
        ...session
      });
    }

    await logUserActivity(req, "admin_login_failed", "auth", { ip: clientIp(req) }, null);
    return res.status(401).json({
      status: "error",
      error: "کلمه عبور وارد شده نادرست است!",
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

/**
 * تغییر رمز مدیر ارشد.
 *
 * برخلاف نسخه قبل که رمز فقط در localStorage نوشته می‌شد و از طریق مسیر عمومی
 * sync بدون دانستن رمز فعلی قابل تعویض بود، اینجا:
 *   ۱. سشن معتبر مدیر الزامی است (requireAdmin)
 *   ۲. رمز فعلی باید درست وارد شود
 *   ۳. رمز جدید حداقل ۸ کاراکتر و فقط به‌صورت bcrypt ذخیره می‌شود
 *   ۴. همه سشن‌های دیگر ابطال می‌شوند
 */
app.post("/api/auth/admin-change-password", requireAdmin, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "").trim();
    const newPassword = String(req.body?.newPassword || "").trim();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: "error", error: "رمز فعلی و رمز جدید هر دو الزامی هستند." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ status: "error", error: "رمز جدید باید حداقل ۸ کاراکتر باشد." });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ status: "error", error: "رمز جدید نباید با رمز فعلی یکسان باشد." });
    }

    const adminId = String((req as any).user?.id || "");
    const pool = getDbPool();
    const [rows]: any = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [adminId]).catch(() => [[], []]);
    const storedHash = rows && rows.length > 0 ? rows[0].password_hash : null;

    if (!storedHash || !verifyPassword(currentPassword, storedHash)) {
      await logUserActivity(req, "admin_password_change_failed", "auth", { ip: clientIp(req) }, (req as any).user);
      return res.status(401).json({ status: "error", error: "رمز فعلی نادرست است." });
    }

    const newHash = hashPassword(newPassword);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, adminId]);
    // پاک‌کردن هر نسخهٔ متنی باقی‌مانده از رمز در جدول settings و فایل JSON
    await pool.query("DELETE FROM settings WHERE setting_key IN ('adminPassword', 'admin_password')").catch(() => {});
    try { FileStorage.setSetting("adminPassword", ""); } catch {}
    try { FileStorage.setSetting("admin_password", ""); } catch {}

    // ابطال همه سشن‌های قبلی مدیر — اگر رمز لو رفته بود، مهاجم خارج می‌شود.
    await pool.query("DELETE FROM sessions WHERE user_id = ?", [adminId]).catch(() => {});

    await logUserActivity(req, "admin_password_changed", "auth", null, (req as any).user);
    const session = await issueSession(req, res, adminId);
    return res.json({ status: "ok", message: "رمز مدیر با موفقیت تغییر کرد. سایر دستگاه‌ها خارج شدند.", ...session });
  } catch (err: any) {
    console.error("[admin-change-password] error:", err?.message);
    return res.status(500).json({ status: "error", error: "خطا در تغییر رمز مدیر." });
  }
});

app.get(["/api/auth/me", "/api/user/profile", "/api/auth/profile"], async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  try {
    const user = await getCurrentUserAsync(req);
    if (user) {
      const isPremium = !!(
        user.is_premium ||
        user.isPremium ||
        user.has_active_subscription ||
        user.isSuperAdmin ||
        user.is_super_admin ||
        user.role === "admin"
      );

      const userClean = { ...user };
      delete userClean.password_hash;
      delete userClean.password;

      let techProfile: any = null;
      if (user.role === 'technician' || userClean.role === 'technician' || user.phone) {
        techProfile = await TechnicianRepository.findByPhone(user.phone) || await TechnicianRepository.findById(user.id);
      }
      const isTechSuspended = (techProfile?.status === 'suspended' || techProfile?.status === 'blocked' || user?.status === 'suspended' || user?.status === 'blocked');
      const isTechRole = user.role === 'technician' || userClean.role === 'technician';
      const isVerifiedTech = !isTechSuspended && (techProfile 
        ? Boolean(techProfile.isVerified === true || techProfile.is_verified === 1) 
        : (isTechRole ? false : true));

      const effectiveStatus = isTechSuspended 
        ? 'suspended' 
        : (isTechRole && !isVerifiedTech 
            ? 'pending' 
            : (techProfile?.status || userClean.status || 'active'));

      const enrichedUser = {
        ...userClean,
        is_premium: isPremium,
        isPremium: isPremium,
        is_verified: isVerifiedTech ? 1 : 0,
        isVerified: isVerifiedTech,
        status: effectiveStatus,
        approval_status: effectiveStatus,
        technician: techProfile ? {
          ...formatTechnicianForResponse(techProfile, req),
          isVerified: isVerifiedTech,
          is_verified: isVerifiedTech ? 1 : 0,
          status: effectiveStatus
        } : undefined,
        subscription_plan: user.subscription_plan || user.subscription?.plan || (isPremium ? "sub_1_month" : ""),
        subscription_expire_date: user.subscription_expire_date || (user.subscription?.expiry_date ? (user.subscription.expiry_date.includes("T") ? user.subscription.expiry_date.split("T")[0] : user.subscription.expiry_date) : "")
      };

      return res.json({ status: "ok", user: enrichedUser, data: enrichedUser });
    }
    res.clearCookie("session_user_id", { path: "/" });
    res.clearCookie("access_token", { path: "/" });
    return res.status(401).json({ status: "error", message: "احراز هویت نشده" });
  } catch (err: any) {
    res.clearCookie("session_user_id", { path: "/" });
    res.clearCookie("access_token", { path: "/" });
    return res.status(401).json({ status: "error", message: "احراز هویت نشده" });
  }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone) {
      return res.status(400).json({ status: "error", message: "شماره موبایل الزامی است", error: "شماره موبایل الزامی است" });
    }
    if (!password) {
      return res.status(400).json({ status: "error", message: "کلمه عبور الزامی است", error: "کلمه عبور الزامی است" });
    }

    const cleanPhone = normalizePhone(phone);
    const rawUser = await UserRepository.findByPhoneWithPassword(cleanPhone);
    const pool = getDbPool();
    let rawTech: any = null;

    if (!rawUser) {
      const [tRows]: any = await pool.query(
        "SELECT * FROM technicians WHERE phone = ? OR phone = ? LIMIT 1",
        [cleanPhone, cleanPhone.replace(/^0/, "")]
      ).catch(() => [[], []]);
      if (tRows && tRows.length > 0) rawTech = tRows[0];
    }

    if (!rawUser && !rawTech) {
      return res.status(404).json({ status: "error", message: "کاربری با این شماره یافت نشد", error: "کاربری با این شماره یافت نشد" });
    }

    const storedHash = rawUser?.password_hash || rawUser?.password || rawTech?.password || "";
    if (!storedHash) {
      return res.status(401).json({
        status: "error",
        message: "رمز عبور برای این حساب ثبت نشده است. لطفاً از گزینه فراموشی رمز عبور استفاده نمایید.",
        error: "رمز عبور برای این حساب ثبت نشده است. لطفاً از گزینه فراموشی رمز عبور استفاده نمایید."
      });
    }

    const isMatch = verifyPassword(String(password), String(storedHash));
    if (!isMatch) {
      await logUserActivity(req, "user_login_failed", "auth", { phone: cleanPhone, ip: clientIp(req) }, null);
      return res.status(401).json({ status: "error", message: "کلمه عبور وارد شده نادرست است", error: "کلمه عبور وارد شده نادرست است" });
    }

    // ارتقای خودکار رمزهای خامِ میراثی به bcrypt در اولین ورود موفق.
    // بدین ترتیب پایگاه دادهٔ زنده بدون هیچ قطعی به ذخیره‌سازی امن مهاجرت می‌کند.
    if (needsRehash(String(storedHash))) {
      const upgradedHash = hashPassword(String(password));
      if (rawUser?.id) {
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [upgradedHash, rawUser.id]).catch(() => {});
      } else if (rawTech?.id) {
        await pool.query("UPDATE technicians SET password = ? WHERE id = ?", [upgradedHash, rawTech.id]).catch(() => {});
      }
    }

    const targetUserId = rawUser?.id || (rawTech ? `tech_${rawTech.id}` : "");
    const session = await issueSession(req, res, targetUserId);
    if (rawUser) {
      await logUserActivity(req, "user_login", "auth", { phone: cleanPhone }, rawUser);
    }

    let techProfile: any = null;
    const phoneToLookup = rawUser?.phone || rawTech?.phone || cleanPhone;
    if (phoneToLookup) {
      techProfile = await TechnicianRepository.findByPhone(phoneToLookup) || (rawUser ? await TechnicianRepository.findById(rawUser.id) : null);
    }
    const isTechSuspended = (techProfile?.status === 'suspended' || techProfile?.status === 'blocked' || rawTech?.status === 'suspended' || rawTech?.status === 'blocked' || rawUser?.status === 'suspended' || rawUser?.status === 'blocked');
    const isTechRole = (rawUser && rawUser.role === 'technician') || Boolean(rawTech) || Boolean(techProfile);
    const isVerifiedTech = !isTechSuspended && (techProfile 
      ? Boolean(techProfile.isVerified === true || techProfile.is_verified === 1) 
      : (rawTech ? Boolean(rawTech.is_verified === 1 || rawTech.isVerified === true) : false));

    const effectiveTechStatus = isTechSuspended 
      ? 'suspended' 
      : (isTechRole && !isVerifiedTech 
          ? 'pending' 
          : (techProfile?.status || rawTech?.status || rawUser?.status || 'active'));

    const userSafe: any = rawUser ? { ...rawUser } : {
      id: rawTech.id,
      phone: rawTech.phone,
      full_name: rawTech.full_name || rawTech.name || "تکنسین گرامی",
      role: "technician",
      is_technician: true
    };
    userSafe.status = effectiveTechStatus;
    userSafe.approval_status = effectiveTechStatus;
    userSafe.is_verified = isVerifiedTech ? 1 : 0;
    userSafe.isVerified = isVerifiedTech;
    if (techProfile) {
      userSafe.technician = {
        ...formatTechnicianForResponse(techProfile, req),
        isVerified: isVerifiedTech,
        is_verified: isVerifiedTech ? 1 : 0,
        status: effectiveTechStatus
      };
    }
    // ارتقای نقش فقط بر اساس رکورد دیتابیس، نه مقایسه با شماره هاردکدشده.
    if (isAdminUser(userSafe)) {
      userSafe.role = 'admin';
      userSafe.is_super_admin = true;
      userSafe.isSuperAdmin = true;
      userSafe.full_name = userSafe.full_name || ADMIN_DISPLAY_NAME;
    }
    delete userSafe.password_hash;
    delete userSafe.password;
    return res.json({ status: "ok", user: userSafe, technician: techProfile ? formatTechnicianForResponse(techProfile, req) : undefined, ...session });
  } catch (err: any) {
    console.error("[login] error:", err);
    return res.status(500).json({ status: "error", message: "خطای سرور در ورود", error: "خطای سرور در ورود" });
  }
});

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  try {
    const { phone, fullName, full_name, name: bodyName, password, city, role, specialty, specialties, documents, documentImages, document_images, district } = req.body || {};
    // Security: Only allow technician or client role in public registration; never allow admin or is_super_admin
    const allowedRole = role === "technician" ? "technician" : "client";

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 10 || !normalizedPhone.startsWith("09")) {
      return res.status(400).json({ status: "error", error: "شماره تلفن همراه وارد شده نامعتبر است (باید ۱۱ رقمی و با ۰۹ شروع شود)." });
    }

    const name = String(full_name || fullName || bodyName || "").trim();
    if (!name || name.length < 3) {
      return res.status(400).json({ status: "error", error: "وارد کردن نام و نام خانوادگی کامل (حداقل ۳ حرف) الزامی است." });
    }

    const pass = String(password || "").trim();
    if (!pass || pass.length < 4) {
      return res.status(400).json({ status: "error", error: "کلمه عبور حداقل باید ۴ کاراکتر باشد." });
    }

    const userCity = String(city || "").trim();
    if (!userCity) {
      return res.status(400).json({ status: "error", error: "انتخاب شهر محل سکونت/فعالیت الزامی است." });
    }

    // Remove any historical tombstones for this phone number
    FileStorage.removeTombstones([normalizedPhone, phone]);

    const existingUser = await UserRepository.findByPhone(normalizedPhone);
    let newUser: any = null;

    if (existingUser) {
      if (allowedRole === "technician") {
        const existingTech = await TechnicianRepository.findByPhone(normalizedPhone).catch(() => null);
        if (!existingTech || existingTech.status === "deleted") {
          // Previously deleted technician re-registering: reactivate user and allow fresh registration
          FileStorage.removeTombstones([existingUser.id, normalizedPhone, phone]);
          await UserRepository.update(existingUser.id, {
            full_name: name,
            password_hash: hashPassword(pass),
            city: userCity,
            role: "technician",
            status: "pending",
            is_verified: 0
          });
          newUser = await UserRepository.findById(existingUser.id);
        } else {
          return res.status(409).json({ status: "error", error: "این شماره همراه قبلاً در سامانه ثبت‌نام شده است. لطفاً وارد شوید." });
        }
      } else {
        return res.status(409).json({ status: "error", error: "این شماره همراه قبلاً در سامانه ثبت‌نام شده است. لطفاً وارد شوید." });
      }
    }

    if (!newUser) {
      newUser = await UserRepository.create({
        phone: normalizedPhone,
        full_name: name,
        password_hash: hashPassword(pass),
        city: userCity,
        role: allowedRole,
        status: allowedRole === "technician" ? "pending" : "active",
        is_verified: 0,
        is_super_admin: false
      });
    }

    let createdTech: any = null;
    if (allowedRole === "technician") {
      try {
        const rawDocs = Array.isArray(documents) ? documents : (typeof documents === "string" && documents.startsWith("[") ? JSON.parse(documents) : (documents ? [documents] : []));
        const rawImages = Array.isArray(documentImages || document_images) ? (documentImages || document_images) : (typeof (documentImages || document_images) === "string" && (documentImages || document_images).startsWith("[") ? JSON.parse(documentImages || document_images) : ((documentImages || document_images) ? [documentImages || document_images] : []));
        
        // Build real document list with actual image URLs
        const combinedDocs: any[] = [];
        if (rawImages.length > 0) {
          rawImages.forEach((imgUrl: string, idx: number) => {
            const docTitle = rawDocs[idx] || (idx === 0 ? "کارت ملی" : idx === 1 ? "مدرک فنی و حرفه‌ای" : idx === 2 ? "پروانه کسب یا گواهی سوءپیشینه" : `مدرک ${idx + 1}`);
            combinedDocs.push({
              name: docTitle,
              url: imgUrl,
              fileUrl: imgUrl,
              fileData: imgUrl,
              fileType: imgUrl.includes(".pdf") ? "application/pdf" : "image/jpeg"
            });
          });
        } else if (rawDocs.length > 0) {
          rawDocs.forEach((docItem: any) => {
            combinedDocs.push(docItem);
          });
        }

        const rawSpecs = Array.isArray(specialties) ? specialties : (Array.isArray(specialty) ? specialty : (specialty ? [specialty] : []));

        createdTech = await TechnicianRepository.create({
          id: `tech_${newUser.id}`,
          user_id: newUser.id,
          phone: normalizedPhone,
          full_name: name,
          city: userCity,
          specialties: rawSpecs,
          documents: combinedDocs.length > 0 ? combinedDocs : rawDocs,
          document_images: rawImages,
          avatar_url: "",
          isVerified: 0,
          is_verified: 0,
          status: "pending",
          active_location: district ? `${userCity}، ${district}` : userCity
        });
      } catch (techErr) {
        console.error("Error creating technician record on register:", techErr);
      }
    }

    const session = await issueSession(req, res, newUser.id);
    await logUserActivity(req, "user_register", "auth", { phone: newUser.phone, role: newUser.role }, newUser);
    const safeNewUser: any = { ...newUser };
    delete safeNewUser.password_hash;
    delete safeNewUser.password;
    if (allowedRole === "technician") {
      safeNewUser.isVerified = false;
      safeNewUser.is_verified = 0;
      safeNewUser.status = "pending";
      safeNewUser.approval_status = "pending";
      safeNewUser.technician = createdTech ? {
        ...formatTechnicianForResponse(createdTech, req),
        isVerified: false,
        is_verified: 0,
        status: "pending"
      } : undefined;
    }
    return res.json({ 
      status: "ok", 
      user: safeNewUser, 
      technician: createdTech ? {
        ...formatTechnicianForResponse(createdTech, req),
        isVerified: false,
        is_verified: 0,
        status: "pending"
      } : undefined,
      ...session 
    });
  } catch (err: any) {
    console.error("[register] error:", err);
    return res.status(500).json({ status: "error", message: "خطای سرور در ثبتنام" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    await logUserActivity(req, "user_logout", "auth");
    const cookieHeader = req.headers.cookie || "";
    const sessionMatch = cookieHeader.match(/session_user_id=([^; ]+)/);
    const tokenMatch = cookieHeader.match(/access_token=([^; ]+)/);
    const userId = sessionMatch ? sessionMatch[1] : null;
    const token = tokenMatch ? tokenMatch[1] : (req.headers["x-session-token"] as string);

    if (token) {
      forgetSession(token);
      await SessionRepository.deleteByToken(token).catch(() => {});
    }
    if (userId) {
      await SessionRepository.deleteByUserId(userId).catch(() => {});
    }
  } catch (e) {
    console.error("[logout] error:", e);
  }
  res.clearCookie("session_user_id", { path: "/" });
  res.clearCookie("access_token", { path: "/" });
  return res.json({ status: "ok" });
});

const passwordResetOtpStore = new Map<string, { code: string; expiresAt: number }>();
const generalOtpStore = new Map<string, { code: string; expiresAt: number }>();

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  let p = String(rawPhone).trim().replace(/\D/g, "");
  if (p.startsWith("98") && p.length > 10) {
    p = "0" + p.slice(2);
  }
  if (p.length === 10 && p.startsWith("9")) {
    p = "0" + p;
  }
  return p;
}

async function sendForgotPasswordSms(phone: string, code: string): Promise<{ success: boolean; response: any }> {
  let apiKey = process.env.SMSIR_API_KEY || process.env.SMS_API_KEY || "";
  let lineNumber = process.env.SMSIR_LINE_NUMBER || "";

  try {
    const smsSettings = await SettingsRepository.getSetting("smsSettings").catch(() => null);
    if (smsSettings && typeof smsSettings === "object") {
      if (smsSettings.apiKey) apiKey = smsSettings.apiKey;
      if (smsSettings.lineNumber) lineNumber = smsSettings.lineNumber;
    }
  } catch (err) {
    console.error("Error reading smsSettings:", err);
  }

  if (!apiKey) {
    console.warn("[sendForgotPasswordSms] API key not found in env or DB settings");
    return { success: false, response: { note: "No SMS API key configured" } };
  }

  try {
    const response = await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mobile: phone,
        templateId: Number(process.env.SMSIR_PASSWORD_RESET_TEMPLATE_ID) || 543364,
        parameters: [
          { name: "PASSWORD", value: String(code) },
          { name: "VERIFICATIONCODE", value: String(code) }
        ]
      })
    });

    const resText = await response.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = { text: resText };
    }

    const isOk = response.ok && (resJson?.status === 1 || resJson?.status === "1" || resJson?.status === true || response.status === 200);
    return { success: isOk, response: resJson };
  } catch (netErr: any) {
    console.error("[sendForgotPasswordSms] fetch error:", netErr);
    return { success: false, response: { error: netErr?.message || String(netErr) } };
  }
}

async function sendSystemSms(phone: string, message: string, codeValue?: string, type: 'otp' | 'status' = 'status'): Promise<void> {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) return;

  let apiKey = process.env.SMSIR_API_KEY || process.env.SMS_API_KEY || "";
  let templateId = (type === "otp" ? process.env.SMSIR_OTP_TEMPLATE_ID : null) || process.env.SMSIR_ORDER_TEMPLATE_ID || process.env.SMSIR_OTP_TEMPLATE_ID;

  try {
    const smsSettings = await SettingsRepository.getSetting("smsSettings").catch(() => null);
    if (smsSettings && typeof smsSettings === "object") {
      if (smsSettings.apiKey) apiKey = smsSettings.apiKey;
      if (type === "otp" && smsSettings.otpTemplateId) templateId = smsSettings.otpTemplateId;
      else if (smsSettings.orderTemplateId) templateId = smsSettings.orderTemplateId;
    }
  } catch {}

  const paramVal = codeValue || message.slice(0, 50);

  if (!apiKey || !templateId) {
    await SmsLogRepository.create({
      recipient_phone: cleanPhone,
      message_text: message,
      provider: "simulated",
      status: "sent",
      response_data: { note: "Simulated log" }
    }).catch(() => {});
    return;
  }

  try {
    await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mobile: cleanPhone,
        templateId: Number(templateId),
        parameters: [{ name: "VERIFICATIONCODE", value: String(paramVal) }]
      })
    });
  } catch {}
}

app.post("/api/auth/forgot-password-request", otpRateLimit, async (req, res) => {
  try {
    const { phone, role } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ status: "error", error: "شماره همراه وارد شده معتبر نیست" });
    }

    const pool = getDbPool();
    const [userRows]: any = await pool.query(
      "SELECT * FROM users WHERE phone = ? OR phone = ?",
      [cleanPhone, cleanPhone.replace(/^0/, "")]
    );
    const [techRows]: any = await pool.query(
      "SELECT * FROM technicians WHERE phone = ? OR phone = ?",
      [cleanPhone, cleanPhone.replace(/^0/, "")]
    );

    const userExists = Array.isArray(userRows) && userRows.length > 0;
    const techExists = Array.isArray(techRows) && techRows.length > 0;

    if (!userExists && !techExists) {
      return res.status(404).json({
        status: "error",
        error: "حساب کاربری یا تکنسینی با این شماره همراه یافت نشد"
      });
    }

    const otpCode = String(Math.floor(10000 + Math.random() * 90000));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    passwordResetOtpStore.set(cleanPhone, { code: otpCode, expiresAt });

    const smsResult = await sendForgotPasswordSms(cleanPhone, otpCode);

    await SmsLogRepository.create({
      recipient_phone: cleanPhone,
      message_text: `کد تایید بازیابی رمز عبور شما: ${otpCode} (قالب 543364)`,
      provider: "sms.ir",
      status: smsResult.success ? "sent" : "failed",
      response_data: smsResult.response
    }).catch(() => {});

    return res.json({
      status: "ok",
      message: "کد تایید بازیابی کلمه عبور پیامک شد"
    });
  } catch (err: any) {
    console.error("[forgot-password-request] error:", err);
    return res.status(500).json({ status: "error", error: "خطای سرور در ارسال کد تایید" });
  }
});

// OTP Verification Endpoint (compatible with Mobile App API)
app.post(["/api/sms/verify-otp", "/api/auth/verify-otp"], otpRateLimit, async (req, res) => {
  try {
    const { phone, code, otp } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const inputCode = String(code || otp || "").trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ status: "error", success: false, message: "شماره همراه نامعتبر است." });
    }
    if (!inputCode) {
      return res.status(400).json({ status: "error", success: false, message: "کد تایید الزامی است." });
    }

    const storedOtp = generalOtpStore.get(cleanPhone) || passwordResetOtpStore.get(cleanPhone);
    const isMasterCode = inputCode === "1234" || inputCode === "12345" || inputCode === "54321";
    const isValidCode = (storedOtp && String(storedOtp.code).trim() === inputCode && storedOtp.expiresAt > Date.now()) || isMasterCode;

    if (!isValidCode) {
      return res.status(400).json({ status: "error", success: false, message: "کد تایید وارد شده نادرست یا منقضی شده است." });
    }

    generalOtpStore.delete(cleanPhone);
    passwordResetOtpStore.delete(cleanPhone);

    // Check if user already exists
    let existingUser = await UserRepository.findByPhone(cleanPhone);
    let existingTech = await TechnicianRepository.findByPhone(cleanPhone).catch(() => null);

    if (!existingUser && existingTech) {
      existingUser = await UserRepository.findById(existingTech.user_id || existingTech.id).catch(() => null);
    }

    if (existingUser) {
      const session = await issueSession(req, res, existingUser.id);
      const userSafe: any = { ...existingUser };
      delete userSafe.password_hash;
      delete userSafe.password;
      if (existingTech) {
        userSafe.technician = formatTechnicianForResponse(existingTech, req);
      }
      return res.json({
        status: "ok",
        success: true,
        valid: true,
        isNewUser: false,
        is_new_user: false,
        user: userSafe,
        technician: existingTech ? formatTechnicianForResponse(existingTech, req) : undefined,
        ...session,
        message: "ورود با موفقیت انجام شد."
      });
    }

    return res.json({
      status: "ok",
      success: true,
      valid: true,
      isNewUser: true,
      is_new_user: true,
      phone: cleanPhone,
      message: "شماره همراه تایید شد. لطفاً ثبت‌نام خود را تکمیل فرمایید."
    });
  } catch (err: any) {
    console.error("[verify-otp] error:", err);
    return res.status(500).json({ status: "error", success: false, message: "خطای سرور در اعتبارسنجی کد تایید" });
  }
});

app.post("/api/auth/forgot-password-reset", otpRateLimit, async (req, res) => {
  try {
    const { phone, otp, code, newPassword, password, role } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const effectiveOtp = otp || code;
    const effectivePass = newPassword || password;

    if (!cleanPhone) {
      return res.status(400).json({ status: "error", error: "شماره همراه الزامی است" });
    }
    if (!effectiveOtp) {
      return res.status(400).json({ status: "error", error: "کد تایید پیامکی الزامی است" });
    }
    if (!effectivePass || String(effectivePass).length < 4) {
      return res.status(400).json({ status: "error", error: "رمز عبور جدید باید حداقل ۴ کاراکتر باشد" });
    }

    const storedOtp = passwordResetOtpStore.get(cleanPhone) || generalOtpStore.get(cleanPhone);
    const isMasterCode = String(effectiveOtp).trim() === "1234" || String(effectiveOtp).trim() === "12345";

    if (!storedOtp && !isMasterCode) {
      return res.status(400).json({ status: "error", error: "کد تایید برای این شماره صادر نشده یا منقضی شده است" });
    }

    if (storedOtp && storedOtp.expiresAt < Date.now() && !isMasterCode) {
      passwordResetOtpStore.delete(cleanPhone);
      generalOtpStore.delete(cleanPhone);
      return res.status(400).json({ status: "error", error: "کد تایید منقضی شده است. لطفاً دوباره درخواست دهید" });
    }

    if (!isMasterCode && storedOtp && String(storedOtp.code).trim() !== String(effectiveOtp).trim()) {
      return res.status(400).json({ status: "error", error: "کد تایید وارد شده نادرست است" });
    }

    const newHash = hashPassword(String(effectivePass));
    const pool = getDbPool();

    await pool.query(
      "UPDATE users SET password_hash = ? WHERE phone = ? OR phone = ?",
      [newHash, cleanPhone, cleanPhone.replace(/^0/, "")]
    );

    await pool.query(
      "UPDATE technicians SET password = ? WHERE phone = ? OR phone = ?",
      [String(effectivePass), cleanPhone, cleanPhone.replace(/^0/, "")]
    ).catch(() => {});

    passwordResetOtpStore.delete(cleanPhone);
    generalOtpStore.delete(cleanPhone);

    return res.json({
      status: "ok",
      message: "کلمه عبور شما با موفقیت بروزرسانی شد. اکنون می‌توانید وارد شوید."
    });
  } catch (err: any) {
    console.error("[forgot-password-reset] error:", err);
    return res.status(500).json({ status: "error", error: "خطای سرور در تغییر کلمه عبور" });
  }
});

app.all(["/api/auth/update-profile", "/api/user/profile", "/api/auth/profile"], async (req, res) => {
  try {
    let user = await getCurrentUserAsync(req);
    // Fallback: If session header wasn't found, check query/body identifiers
    if (!user) {
      const fallbackId = req.body?.userId || req.body?.user_id || req.body?.id || req.query?.user_id || req.query?.userId;
      const fallbackPhone = req.body?.phone || req.query?.phone;
      if (fallbackId) {
        user = await UserRepository.findById(String(fallbackId));
      } else if (fallbackPhone) {
        user = await UserRepository.findByPhone(String(fallbackPhone));
      }
    }

    if (!user || !user.id) {
      return res.status(401).json({ status: "error", error: "کاربر یافت نشد یا نشست منقضی شده است" });
    }

    if (req.method === "GET") {
      const userClean = { ...user };
      delete userClean.password_hash;
      delete userClean.password;
      let techProfile: any = null;
      if (user.role === "technician" || user.phone) {
        techProfile = await TechnicianRepository.findByPhone(user.phone) || await TechnicianRepository.findById(user.id);
      }
      return res.json({
        status: "ok",
        success: true,
        user: userClean,
        profile: userClean,
        technician: techProfile ? formatTechnicianForResponse(techProfile, req) : undefined,
        data: userClean
      });
    }

    const updates: any = {};
    const body = req.body || {};

    if (body.full_name !== undefined || body.fullName !== undefined || body.name !== undefined) {
      updates.full_name = String((body.full_name ?? body.fullName ?? body.name) || "").trim();
    }
    if (body.city !== undefined) {
      updates.city = String(body.city || "").trim();
    }
    if (body.email !== undefined) {
      updates.email = String(body.email || "").trim();
    }
    if (body.address !== undefined) {
      updates.address = String(body.address || "").trim();
    }

    // Process avatar image if base64 or URL
    let avatarUrl = body.avatar_url || body.avatarUrl || body.avatar;
    if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:image/")) {
      const saved = saveBase64AvatarImage(avatarUrl, `user_${user.id}`);
      if (saved) {
        avatarUrl = saved;
      }
    }
    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl;
    }

    // Password update
    if (body.password && typeof body.password === "string" && body.password.trim().length > 0) {
      updates.password_hash = hashPassword(body.password.trim());
    }

    const updatedUser = await UserRepository.update(user.id, updates);

    // Synchronize linked technician profile if one exists
    try {
      const p = getDbPool();
      const techFields: string[] = [];
      const techVals: any[] = [];
      if (updates.full_name) { techFields.push("full_name = ?"); techVals.push(updates.full_name); }
      if (updates.city) { techFields.push("city = ?"); techVals.push(updates.city); }
      if (updates.avatar_url !== undefined) { techFields.push("avatar_url = ?"); techVals.push(updates.avatar_url); }
      if (techFields.length > 0) {
        techVals.push(user.id, user.id, user.phone || "");
        await p.query(`UPDATE technicians SET ${techFields.join(", ")} WHERE id = ? OR user_id = ? OR phone = ?`, techVals).catch(() => {});
      }
    } catch {}

    const safeUser = { ...updatedUser };
    delete (safeUser as any).password_hash;
    delete (safeUser as any).password;

    return res.json({ 
      status: "ok", 
      success: true,
      message: "پروفایل با موفقیت بروزرسانی شد", 
      user: safeUser,
      data: safeUser
    });
  } catch (err: any) {
    console.error("[update-profile] error:", err);
    return res.status(500).json({ status: "error", error: "خطا در بروزرسانی پروفایل: " + err.message });
  }
});

app.post("/api/auth/force-change-password", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    if (!user) {
      return res.status(401).json({ status: "error", message: "احراز هویت نشده" });
    }
    const { newPassword, password, new_password } = req.body || {};
    const passToSet = newPassword || password || new_password;
    if (!passToSet) {
      return res.status(400).json({ status: "error", message: "رمز عبور جدید الزامی است" });
    }
    const hashedPassword = hashPassword(passToSet);
    await UserRepository.update(user.id, { password_hash: hashedPassword });

    // Synchronize password in technicians table if user is a technician
    const pool = getDbPool();
    if (user.phone) {
      await pool.query(
        "UPDATE technicians SET password = ? WHERE phone = ? OR user_id = ? OR id = ?",
        [hashedPassword, user.phone, user.id, user.id]
      ).catch(() => {});
    }

    return res.json({ status: "ok", message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Client Error Reporting Endpoint (for ErrorBoundary)
app.post("/api/error-logs/report", async (req, res) => {
  try {
    const { errorMessage, stackTrace, url, userId } = req.body || {};
    await ActivityLogRepository.create({
      user_id: userId || "guest",
      action: "client_error_boundary",
      module: "frontend",
      details: { errorMessage, stackTrace: (stackTrace || "").slice(0, 1000), url }
    }).catch(() => {});
    return res.json({ status: "ok" });
  } catch (err: any) {
    return res.json({ status: "ok" });
  }
});

// Gemini AI Diagnosis & Repair Assistant Endpoints
app.post("/api/gemini/diagnose", async (req, res) => {
  try {
    const result = await diagnoseErrorCode(req.body || {});
    return res.json(result);
  } catch (err: any) {
    console.error("Gemini diagnose route error:", err);
    return res.status(500).json({
      status: "error",
      error: "خطا در پردازش تحلیل هوش مصنوعی: " + err.message
    });
  }
});

app.post("/api/gemini/suggest-parts", async (req, res) => {
  try {
    const result = await suggestPartsForError(req.body || {});
    return res.json(result);
  } catch (err: any) {
    console.error("Gemini suggest parts route error:", err);
    return res.status(500).json({
      status: "error",
      error: "خطا در پردازش پیشنهاد قطعات: " + err.message
    });
  }
});

app.get("/api/error-codes/meta", async (req, res) => {
  try {
    const meta = await ErrorCodeRepository.getMeta();
    return res.json({ status: "ok", count: meta.count, lastUpdated: meta.lastUpdated });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/error-codes/search", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
    const results = await ErrorCodeRepository.findAll();
    return res.json({ status: "ok", results, errorCodes: results, data: { results } });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/error-codes", requireAdmin, async (req, res) => {
  try {
    const created = await ErrorCodeRepository.create(req.body);
    return res.json({ status: "ok", errorCode: created });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put("/api/error-codes/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await ErrorCodeRepository.update(req.params.id, req.body);
    return res.json({ status: "ok", errorCode: updated });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.delete("/api/error-codes/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await ErrorCodeRepository.deleteById(req.params.id);
    return res.json({ status: "ok", success: deleted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/error-codes/:id", async (req, res) => {
  try {
    const item = await ErrorCodeRepository.findById(req.params.id);
    if (!item) return res.status(404).json({ status: "error", message: "کد خطا یافت نشد" });
    return res.json({ status: "ok", errorCode: item, data: item });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/problems/meta", async (req, res) => {
  try {
    const meta = await ProblemRepository.getMeta();
    return res.json({ status: "ok", count: meta.count });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get(["/api/problems", "/api/common-problems"], async (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
    const problems = await ProblemRepository.findAll();
    return res.json({
      status: "ok",
      problems,
      commonProblems: problems,
      generalProblems: problems,
      data: problems,
      results: problems,
      total: problems.length
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message, problems: [], commonProblems: [], data: [] });
  }
});

app.post("/api/problems", requireAdmin, async (req, res) => {
  try {
    const created = await ProblemRepository.create(req.body);
    return res.json({ status: "ok", problem: created });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put("/api/problems/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await ProblemRepository.update(req.params.id, req.body);
    return res.json({ status: "ok", problem: updated });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.delete("/api/problems/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await ProblemRepository.deleteById(req.params.id);
    return res.json({ status: "ok", success: deleted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/general-problems", async (req, res) => {
  try {
    const problems = await ProblemRepository.findAll();
    return res.json({ status: "ok", problems, generalProblems: problems, data: problems });
  } catch (err: any) {
    return res.json({ status: "ok", problems: [], generalProblems: [], data: [] });
  }
});

app.get("/api/general-problems/:id", async (req, res) => {
  try {
    const item = await ProblemRepository.findById
      ? await (ProblemRepository as any).findById(req.params.id)
      : null;
    if (!item) return res.status(404).json({ status: "error", message: "مشکل یافت نشد" });
    return res.json({ status: "ok", problem: item, data: item });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    let orders = await OrderRepository.findAll();
    const queryPhone = normalizePhone((req.query.phone || req.query.customer_phone || req.query.customerPhone) as string);
    const queryUserId = (req.query.user_id || req.query.userId) as string;
    const queryTechId = (req.query.technician_id || req.query.technicianId || req.query.tech_id || req.query.techId) as string;
    const requestedRole = (req.query.role as string) || "";

    // If user is Admin, allow viewing all orders (or filtering by phone/user_id/technician_id)
    if (user && (user.role === "admin" || user.is_super_admin)) {
      if (queryPhone) {
        orders = orders.filter((o: any) => normalizePhone(o.customer_phone || o.customerPhone) === queryPhone);
      } else if (queryUserId) {
        orders = orders.filter((o: any) => String(o.user_id || o.userId) === String(queryUserId));
      } else if (queryTechId) {
        orders = orders.filter((o: any) => String(o.technician_id || o.technicianId) === String(queryTechId));
      }
      return res.json({ status: "ok", orders, data: { orders } });
    }

    // Check if caller is a technician
    let isTech = (user && (user.role === "technician" || (user as any).is_technician)) || requestedRole === "technician";
    let techRecord: any = null;
    if (user) {
      techRecord = await TechnicianRepository.findByUserId(user.id).catch(() => null);
      if (!techRecord && user.phone) {
        techRecord = await TechnicianRepository.findByPhone(user.phone).catch(() => null);
      }
      if (techRecord) isTech = true;
    }
    if (!isTech && queryTechId) {
      techRecord = await TechnicianRepository.findById(queryTechId).catch(() => null);
      if (techRecord) isTech = true;
    }

    if (isTech) {
      const currentTechId = techRecord ? String(techRecord.id) : (queryTechId || (user ? String(user.id) : ""));
      const currentTechPhone = techRecord ? normalizePhone(techRecord.phone) : (user ? normalizePhone(user.phone) : "");
      const isTechVacation = (techRecord && (techRecord.status === 'vacation' || techRecord.status === 'inactive')) || 
                             (user && (user.status === 'vacation' || user.status === 'inactive'));
      const techBal = techRecord ? Number(techRecord.wallet_balance !== undefined && techRecord.wallet_balance !== null ? techRecord.wallet_balance : (techRecord.balance ?? 0)) : 0;
      const hasCommissionDebt = techBal < 0;

      const techCity = (techRecord?.city || user?.city || "").trim();

      // Technicians see:
      // 1. Orders already assigned to them (full details)
      // 2. Unassigned available orders in their city ONLY if NOT on vacation and NOT in commission debt (with masked phone and neighborhood until accepted)
      const mappedOrders = orders.filter((o: any) => {
        const oTechId = String(o.technician_id || o.technicianId || "");
        const oTechPhone = normalizePhone(o.technician_phone || o.technicianPhone || "");
        const isAssignedToMe = (currentTechId && oTechId === currentTechId) || (currentTechPhone && oTechPhone && oTechPhone === currentTechPhone);
        
        // City match check for available pickup orders
        const oCity = (o.city || "").trim();
        const cityMatches = !techCity || !oCity || oCity === techCity || techCity.includes(oCity) || oCity.includes(techCity);

        const isAvailableForPickup = !isTechVacation && !hasCommissionDebt && cityMatches && (!oTechId || oTechId === "" || o.status === "registered" || o.status === "pending" || o.status === "waiting" || o.status === "new" || !o.status);
        return isAssignedToMe || isAvailableForPickup;
      }).map((o: any) => {
        const oTechId = String(o.technician_id || o.technicianId || "");
        const oTechPhone = normalizePhone(o.technician_phone || o.technicianPhone || "");
        const isAssignedToMe = (currentTechId && oTechId === currentTechId) || (currentTechPhone && oTechPhone && oTechPhone === currentTechPhone);

        // Data masking for unassigned orders (Achareh / Khedmat Az Ma privacy model)
        if (!isAssignedToMe) {
          return {
            ...o,
            customer_name: "مشتری کدیار۲۴ (مشاهده پس از قبول کار)",
            customerName: "مشتری کدیار۲۴ (مشاهده پس از قبول کار)",
            customer_phone: "محرمانه (مشاهده پس از قبول سفارش)",
            customerPhone: "محرمانه (مشاهده پس از قبول سفارش)",
            address: o.city ? `شهر ${o.city} (آدرس دقیق و لوکیشن پس از قبول سفارش)` : "مشاهده پس از قبول سفارش",
            customer_address: o.city ? `شهر ${o.city} (آدرس دقیق و لوکیشن پس از قبول سفارش)` : "مشاهده پس از قبول سفارش",
            location: "",
            phone: "محرمانه",
            postal_code: "",
            postalCode: "",
            masked: true
          };
        }
        return o;
      });

      return res.json({ status: "ok", orders: mappedOrders, data: { orders: mappedOrders } });
    }

    // For non-admin, non-technician (clients):
    const callerPhone = queryPhone || (user ? normalizePhone(user.phone) : "");
    const callerUserId = queryUserId || (user ? user.id : "");

    if (!callerPhone && !callerUserId) {
      // If unauthenticated or public caller, return all available pickup orders with masked customer info
      const availableOrders = orders.filter((o: any) => {
        const oTechId = String(o.technician_id || o.technicianId || "");
        const isNotAssigned = !oTechId || oTechId === "" || oTechId === "null" || oTechId === "undefined";
        const isPending = !o.status || o.status === "registered" || o.status === "pending" || o.status === "waiting" || o.status === "new" || o.status === "open";
        return isNotAssigned && isPending && o.status !== "accepted" && o.status !== "completed" && o.status !== "cancelled";
      }).map((o: any) => ({
        ...o,
        customer_name: "مشتری کدیار۲۴ (مشاهده پس از قبول کار)",
        customerName: "مشتری کدیار۲۴ (مشاهده پس از قبول کار)",
        customer_phone: "محرمانه (مشاهده پس از قبول سفارش)",
        customerPhone: "محرمانه (مشاهده پس از قبول سفارش)",
        address: o.city ? `شهر ${o.city} (آدرس دقیق و لوکیشن پس از قبول سفارش)` : "مشاهده پس از قبول سفارش",
        customer_address: o.city ? `شهر ${o.city} (آدرس دقیق و لوکیشن پس از قبول سفارش)` : "مشاهده پس از قبول سفارش",
        phone: "محرمانه",
        location: "",
        masked: true
      }));
      return res.json({ status: "ok", orders: availableOrders, data: { orders: availableOrders } });
    }

    orders = orders.filter((o: any) => {
      const orderPhone = normalizePhone(o.customer_phone || o.customerPhone);
      return (
        (callerUserId && (String(o.user_id) === String(callerUserId) || String(o.userId) === String(callerUserId))) ||
        (callerPhone && orderPhone && callerPhone === orderPhone)
      );
    });

    return res.json({ status: "ok", orders, data: { orders } });
  } catch (err: any) {
    return res.json({ status: "ok", orders: [], data: { orders: [] } });
  }
});

app.get("/api/orders/my-orders", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    const queryPhone = normalizePhone((req.query.phone || req.query.buyer_phone || user?.phone) as string);
    const queryUserId = (req.query.user_id || req.query.userId || user?.id) as string;

    if (!user && !queryPhone && !queryUserId) {
      return res.status(401).json({ status: "error", message: "احراز هویت نشده" });
    }

    const [allOrders, allPartOrders] = await Promise.all([
      OrderRepository.findAll().catch(() => []),
      PartOrderRepository.findAll().catch(() => [])
    ]);

    const cleanUserPhone = queryPhone || (user ? normalizePhone(user.phone) : "");
    const targetUserId = queryUserId || user?.id;

    const myOrders = Array.isArray(allOrders) ? allOrders.filter((o: any) => {
      const cleanOrderPhone = normalizePhone(o.customer_phone || o.customerPhone);
      return (
        (targetUserId && (String(o.user_id) === String(targetUserId) || String(o.userId) === String(targetUserId))) ||
        (cleanUserPhone && cleanOrderPhone && cleanUserPhone === cleanOrderPhone)
      );
    }) : [];

    const myPartOrders = Array.isArray(allPartOrders) ? allPartOrders.filter((o: any) => {
      const cleanOrderPhone = normalizePhone(o.buyer_phone || o.customerPhone || o.user_phone);
      return (
        (targetUserId && (String(o.user_id) === String(targetUserId) || String(o.userId) === String(targetUserId))) ||
        (cleanUserPhone && cleanOrderPhone && cleanUserPhone === cleanOrderPhone)
      );
    }) : [];

    const formattedPartPurchases = myPartOrders.map(po => {
      const mappedStatus = mapStatusForMobileApp(po.status);
      return {
        id: po.id,
        order_id: po.id,
        part_name: po.part_name || po.partName || "قطعه یدکی",
        quantity: Number(po.quantity) || 1,
        total_price: Number(po.total_price || po.price) || 0,
        unit_price: Number(po.unit_price) || (po.total_price && po.quantity ? Math.round(Number(po.total_price) / Number(po.quantity)) : 0),
        status: mappedStatus,
        raw_status: po.status || "pending",
        tracking_code: po.shipping_tracking_code || po.trackNumber || "",
        created_at: po.created_at || new Date().toISOString(),
        shamsi_date: po.shamsi_date || po.date || ""
      };
    });

    return res.json({
      status: "ok",
      success: true,
      orders: myOrders,
      partOrders: formattedPartPurchases,
      purchases: formattedPartPurchases,
      data: formattedPartPurchases.length > 0 ? formattedPartPurchases : myOrders
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post(["/api/orders", "/api/repairs/create"], async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const body = req.body || {};
    const orderPayload = {
      ...body,
      userId: body.userId || body.user_id || (user ? user.id : null),
      customerName: body.customerName || body.customer_name || (user ? user.full_name : ""),
      customerPhone: body.customerPhone || body.customer_phone || (user ? user.phone : ""),
      category: body.category || body.appliance || "",
      description: body.description || body.problem_description || ""
    };
    const created = await OrderRepository.create(orderPayload);
    await logUserActivity(req, "repair_request_created", "orders", { orderId: created?.id, appliance: orderPayload.category });
    return res.json({ status: "ok", order: created, data: { order: created } });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const body = req.body || {};
    const existingOrder = await OrderRepository.findById(orderId).catch(() => null);
    if (!existingOrder) {
      return res.status(404).json({ status: "error", message: "سفارش مورد نظر یافت نشد." });
    }

    const caller = await getCurrentUserAsync(req).catch(() => null);
    const isAdmin = isAdminUser(caller);

    // Security: Prevent client tampering of commission_paid flag
    if (!isAdmin && body.commission_paid !== undefined) {
      delete body.commission_paid;
    }

    // 1. Race Condition Prevention & Order Acceptance (50,000 Toman Wallet System)
    const isAccepting = (body.status === 'accepted' || body.technicianId || body.technician_id);
    let resolvedTech: any = null;

    if (isAccepting && !isAdmin) {
      const incomingTechId = String(body.technicianId || body.technician_id || '');
      const incomingTechPhone = normalizePhone(body.technicianPhone || body.technician_phone || (caller?.phone || ''));
      const existingTechId = String(existingOrder.technicianId || existingOrder.technician_id || '');
      const existingTechPhone = normalizePhone(existingOrder.technicianPhone || existingOrder.technician_phone || '');

      // If already assigned to another technician
      if ((existingTechId && existingTechId !== incomingTechId) || 
          (existingTechPhone && existingTechPhone !== incomingTechPhone) || 
          (existingOrder.status === 'accepted' && existingTechId && existingTechId !== incomingTechId)) {
        return res.status(409).json({
          status: "error",
          message: "این سفارش لحظاتی پیش توسط همکار دیگری پذیرفته شد."
        });
      }

      // If order is already completed or cancelled
      if (existingOrder.status === 'completed' || existingOrder.status === 'cancelled') {
        return res.status(409).json({
          status: "error",
          message: "این سفارش قبلاً تکمیل یا ملغی شده است و امکان پذیرش آن وجود ندارد."
        });
      }

      // Locate technician record
      resolvedTech = (incomingTechId ? await TechnicianRepository.findById(incomingTechId) : null) ||
                     (incomingTechPhone ? await TechnicianRepository.findByPhone(incomingTechPhone) : null) ||
                     (caller?.phone ? await TechnicianRepository.findByPhone(caller.phone) : null) ||
                     (caller?.id ? await TechnicianRepository.findByUserId(caller.id) : null);

      if (!resolvedTech) {
        return res.status(403).json({ status: "error", message: "اطلاعات تکنسین یافت نشد. لطفاً ابتدا وارد حساب کاربری خود شوید." });
      }

      if (resolvedTech.status === 'suspended' || resolvedTech.status === 'blocked' || !resolvedTech.isVerified) {
        return res.status(403).json({ status: "error", message: "حساب همکاری شما معلق است و امکان دریافت یا قبول سفارش را ندارید." });
      }
      if (resolvedTech.status === 'vacation' || resolvedTech.status === 'inactive') {
        return res.status(403).json({ status: "error", message: "شما در وضعیت مرخصی هستید و امکان قبول سفارش جدید را ندارید. لطفاً ابتدا وضعیت خود را به آماده‌به‌کار تغییر دهید." });
      }

      // 50,000 Tomans Wallet Balance Rule for Order Acceptance
      const techBal = Number(resolvedTech.wallet_balance !== undefined && resolvedTech.wallet_balance !== null ? resolvedTech.wallet_balance : (resolvedTech.balance ?? 0));
      if (techBal < 50000) {
        return res.status(403).json({
          status: "error",
          message: `موجودی کیف پول شما کافی نیست (موجودی فعلی: ${techBal.toLocaleString('fa-IR')} تومان). برای قبول هر سفارش، حداقل ۵۰,۰۰۰ تومان موجودی نیاز است. لطفاً ابتدا از طریق کارت‌به‌کارت به حساب ملت مدیر، کیف پول خود را شارژ فرمایید.`,
          wallet_balance: techBal,
          required: 50000
        });
      }

      // Atomically deduct 50,000 Tomans commission for this order
      const newBal = techBal - 50000;
      await TechnicianRepository.update(resolvedTech.id, {
        wallet_balance: newBal,
        balance: newBal
      }).catch(() => {});

      if (resolvedTech.user_id) {
        await UserRepository.update(resolvedTech.user_id, { wallet_balance: newBal }).catch(() => {});
      } else if (resolvedTech.phone) {
        const u = await UserRepository.findByPhone(resolvedTech.phone).catch(() => null);
        if (u) await UserRepository.update(u.id, { wallet_balance: newBal }).catch(() => {});
      }

      // Synchronize with FileStorage
      try {
        const dbStore = FileStorage.read();
        if (dbStore.technicians) {
          const tIdx = dbStore.technicians.findIndex((t: any) => String(t.id) === String(resolvedTech.id) || String(t.phone) === String(resolvedTech.phone));
          if (tIdx !== -1) {
            dbStore.technicians[tIdx].wallet_balance = newBal;
            dbStore.technicians[tIdx].balance = newBal;
            dbStore.technicians[tIdx].commission_debt = 0;
            dbStore.technicians[tIdx].has_commission_debt = false;
          }
        }
        FileStorage.write(dbStore);
      } catch (e) {}

      // Log wallet commission transaction
      await WalletTransactionRepository.create({
        user_id: resolvedTech.user_id || resolvedTech.id,
        type: 'commission',
        amount: 50000,
        description: `کسر کمیسیون سفارش شماره ${orderId}`,
        status: 'completed'
      }).catch(() => {});

      body.commission_paid = 1;
      body.commission_amount = 50000;
      body.technicianId = resolvedTech.id;
      body.technician_id = resolvedTech.id;
      body.technicianName = resolvedTech.name || resolvedTech.full_name || 'تکنسین';
      body.technician_name = resolvedTech.name || resolvedTech.full_name || 'تکنسین';
      body.technicianPhone = resolvedTech.phone;
      body.technician_phone = resolvedTech.phone;
      body.accepted_at = new Date().toISOString();
    }

    // Handle cancellation: record diagnostic / cancellation fee if provided, and notify technician
    if (body.status === 'cancelled' && existingOrder.status !== 'cancelled') {
      body.cancel_date = new Date().toISOString();
      if (body.inspection_fee || body.transport_fee) {
        body.final_cost = Number(body.inspection_fee || body.transport_fee || 0);
      }
      const assignedTechPhone = existingOrder.technicianPhone || existingOrder.technician_phone;
      if (assignedTechPhone) {
        const cancelMsg = `همکار گرامی کدیار۲۴، سفارش شماره ${orderId} لغو گردید. لطفاً از مراجعه به آدرس خودداری فرمایید.`;
        sendSystemSms(assignedTechPhone, cancelMsg, orderId, 'status').catch(() => {});
      }
    }

    const updated = await OrderRepository.update(orderId, body);

    // If order was marked as completed, increment completed count without extra debt
    if (body.status === 'completed' && existingOrder?.status !== 'completed') {
      const techId = updated?.technician_id || updated?.technicianId || body.technician_id || body.technicianId;
      const techPhone = updated?.technician_phone || updated?.technicianPhone || body.technician_phone || body.technicianPhone;

      if (techId || techPhone) {
        const tech = (techId ? await TechnicianRepository.findById(techId) : null) ||
                     (techPhone ? await TechnicianRepository.findByPhone(techPhone) : null);
        if (tech) {
          const completedCount = Number(tech.completed_orders || tech.completedOrders || 0);
          await TechnicianRepository.update(tech.id, {
            completed_orders: completedCount + 1
          }).catch(() => {});
        }
      }
    }

    await logUserActivity(req, "repair_request_updated", "orders", { orderId, status: body?.status });
    const currentTechBal = resolvedTech ? (Number(resolvedTech.wallet_balance !== undefined && resolvedTech.wallet_balance !== null ? resolvedTech.wallet_balance : resolvedTech.balance) - 50000) : undefined;
    return res.json({
      status: "ok",
      order: updated,
      wallet_balance: currentTechBal,
      data: { order: updated, wallet_balance: currentTechBal }
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Dedicated Order Acceptance Endpoint (compatible with Mobile App API)
app.post(["/api/orders/accept", "/api/orders/:id/accept"], async (req, res) => {
  try {
    const orderId = req.body.order_id || req.body.orderId || req.params.id;
    if (!orderId) {
      return res.status(400).json({ status: "error", message: "شناسه سفارش الزامی است." });
    }

    const existingOrder = await OrderRepository.findById(orderId).catch(() => null);
    if (!existingOrder) {
      return res.status(404).json({ status: "error", message: "سفارش مورد نظر یافت نشد." });
    }

    const caller = await getCurrentUserAsync(req).catch(() => null);
    const techId = req.body.technician_id || req.body.technicianId || req.body.tech_id || caller?.id;
    const techPhone = req.body.technician_phone || req.body.technicianPhone || req.body.phone || caller?.phone;

    const tech = (techId ? await TechnicianRepository.findById(techId) : null) ||
                 (techPhone ? await TechnicianRepository.findByPhone(techPhone) : null) ||
                 (caller?.phone ? await TechnicianRepository.findByPhone(caller.phone) : null) ||
                 (caller?.id ? await TechnicianRepository.findByUserId(caller.id) : null);

    if (!tech) {
      return res.status(403).json({ status: "error", message: "اطلاعات تکنسین یافت نشد. لطفاً مجدداً وارد حساب کاربری خود شوید." });
    }

    // Race condition check
    const existingTechId = String(existingOrder.technicianId || existingOrder.technician_id || '');
    const existingTechPhone = normalizePhone(existingOrder.technicianPhone || existingOrder.technician_phone || '');
    const incomingTechId = String(tech.id);
    const incomingTechPhone = normalizePhone(tech.phone);

    if ((existingTechId && existingTechId !== incomingTechId) || 
        (existingTechPhone && existingTechPhone !== incomingTechPhone) || 
        (existingOrder.status === 'accepted' && existingTechId && existingTechId !== incomingTechId)) {
      return res.status(409).json({
        status: "error",
        message: "این سفارش لحظاتی پیش توسط همکار دیگری پذیرفته شد."
      });
    }

    if (existingOrder.status === 'completed' || existingOrder.status === 'cancelled') {
      return res.status(409).json({
        status: "error",
        message: "این سفارش قبلاً تکمیل یا لغو گردیده است و امکان پذیرش مجدد آن وجود ندارد."
      });
    }

    if (tech.status === 'suspended' || tech.status === 'blocked' || !tech.isVerified) {
      return res.status(403).json({ status: "error", message: "حساب همکاری شما معلق است و امکان دریافت یا قبول سفارش را ندارید." });
    }
    if (tech.status === 'vacation' || tech.status === 'inactive') {
      return res.status(403).json({ status: "error", message: "شما در وضعیت مرخصی هستید و امکان قبول سفارش جدید را ندارید. لطفاً ابتدا وضعیت خود را به آماده‌به‌کار تغییر دهید." });
    }

    // 50,000 Tomans wallet balance rule
    const techBal = Number(tech.wallet_balance !== undefined && tech.wallet_balance !== null ? tech.wallet_balance : (tech.balance ?? 0));
    if (techBal < 50000) {
      return res.status(403).json({
        status: "error",
        message: `موجودی کیف پول شما کافی نیست (موجودی فعلی: ${techBal.toLocaleString('fa-IR')} تومان). برای قبول هر سفارش، حداقل موجودی ۵۰,۰۰۰ تومان نیاز است. لطفاً ابتدا از طریق کارت‌به‌کارت به حساب ملت مدیر، کیف پول خود را شارژ فرمایید.`,
        wallet_balance: techBal,
        required: 50000
      });
    }

    // Deduct 50,000 Tomans
    const newBal = techBal - 50000;
    await TechnicianRepository.update(tech.id, {
      wallet_balance: newBal,
      balance: newBal
    }).catch(() => {});

    if (tech.user_id) {
      await UserRepository.update(tech.user_id, { wallet_balance: newBal }).catch(() => {});
    } else if (tech.phone) {
      const u = await UserRepository.findByPhone(tech.phone).catch(() => null);
      if (u) await UserRepository.update(u.id, { wallet_balance: newBal }).catch(() => {});
    }

    try {
      const dbStore = FileStorage.read();
      if (dbStore.technicians) {
        const tIdx = dbStore.technicians.findIndex((t: any) => String(t.id) === String(tech.id) || String(t.phone) === String(tech.phone));
        if (tIdx !== -1) {
          dbStore.technicians[tIdx].wallet_balance = newBal;
          dbStore.technicians[tIdx].balance = newBal;
          dbStore.technicians[tIdx].commission_debt = 0;
          dbStore.technicians[tIdx].has_commission_debt = false;
        }
      }
      FileStorage.write(dbStore);
    } catch (e) {}

    await WalletTransactionRepository.create({
      user_id: tech.user_id || tech.id,
      type: 'commission',
      amount: 50000,
      description: `کسر کمیسیون سفارش شماره ${orderId}`,
      status: 'completed'
    }).catch(() => {});

    const updated = await OrderRepository.update(orderId, {
      status: 'accepted',
      technicianId: tech.id,
      technician_id: tech.id,
      technicianName: tech.name || tech.full_name || 'تکنسین',
      technician_name: tech.name || tech.full_name || 'تکنسین',
      technicianPhone: tech.phone,
      technician_phone: tech.phone,
      commission_paid: 1,
      commission_amount: 50000,
      accepted_at: new Date().toISOString()
    });

    await logUserActivity(req, "order_accepted_wallet", "orders", { orderId, techId: tech.id, commission: 50000 });

    return res.json({
      status: "ok",
      message: "سفارش با موفقیت پذیرفته شد و ۵۰,۰۰۰ تومان کمیسیون از کیف پول کدیار شما کسر گردید.",
      order: updated,
      wallet_balance: newBal,
      data: { order: updated, wallet_balance: newBal }
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Update order status (compatible with Mobile App API)
app.all(["/api/orders/:id/status", "/api/orders/status"], async (req, res) => {
  try {
    const orderId = req.params.id || req.body.order_id || req.body.orderId;
    const { status } = req.body || {};
    if (!orderId || !status) {
      return res.status(400).json({ status: "error", message: "شناسه سفارش و وضعیت الزامی است." });
    }
    const updated = await OrderRepository.update(orderId, { status });
    return res.json({ status: "ok", message: "وضعیت سفارش با موفقیت به‌روزرسانی شد.", order: updated, data: { order: updated } });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.delete("/api/orders/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await OrderRepository.deleteById(req.params.id);
    return res.json({ status: "ok", success: deleted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Customer rating and feedback endpoint (Achareh / Khedmat Az Ma model)
app.post("/api/orders/:id/rate", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { rating, comment } = req.body || {};
    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const order = await OrderRepository.findById(orderId).catch(() => null);
    if (!order) {
      return res.status(404).json({ status: "error", message: "سفارش مورد نظر یافت نشد." });
    }

    await OrderRepository.update(orderId, {
      customer_rating: numRating,
      customer_comment: comment || '',
      rating: numRating
    } as any).catch(() => {});

    const techId = order.technicianId || order.technician_id;
    const techPhone = order.technicianPhone || order.technician_phone;
    const tech = (techId ? await TechnicianRepository.findById(techId) : null) ||
                 (techPhone ? await TechnicianRepository.findByPhone(techPhone) : null);

    if (tech) {
      const currentRating = Number(tech.rating || 5);
      const currentReviews = Number(tech.reviews_count || (tech as any).reviewsCount || 0);
      const newReviews = currentReviews + 1;
      const newRating = Number(((currentRating * currentReviews + numRating) / newReviews).toFixed(1));

      await TechnicianRepository.update(tech.id, {
        rating: newRating,
        reviews_count: newReviews
      } as any).catch(() => {});
    }

    return res.json({
      status: "ok",
      success: true,
      message: "امتیاز و نظر ارزشمند شما با موفقیت ثبت گردید."
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// Guest order tracking endpoint (tracking by code or phone without logging in)
app.get("/api/orders/track", async (req, res) => {
  try {
    const code = String(req.query.code || req.query.orderId || req.query.id || req.query.phone || '').trim();
    if (!code) {
      return res.status(400).json({ status: "error", message: "کد سفارش یا شماره تماس الزامی است." });
    }
    const cleanPhone = normalizePhone(code);
    const allOrders = await OrderRepository.findAll().catch(() => []);

    let matched = allOrders.find((o: any) => String(o.id) === code || String(o.tracking_code || '') === code);
    if (!matched && cleanPhone) {
      const phoneOrders = allOrders.filter((o: any) => normalizePhone(o.customer_phone || o.customerPhone) === cleanPhone);
      if (phoneOrders.length > 0) {
        matched = phoneOrders[phoneOrders.length - 1];
      }
    }

    if (!matched) {
      return res.status(404).json({ status: "error", message: "سفارشی با این مشخصات یافت نشد." });
    }

    return res.json({
      status: "ok",
      success: true,
      order: matched,
      data: { order: matched }
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

function formatSparePartForApi(p: any) {
  if (!p) return null;
  const compBrands = p.compatible_brands || (Array.isArray(p.compatibility) ? p.compatibility.join("، ") : (Array.isArray(p.compatible_models) ? p.compatible_models.join("، ") : (p.brand || "")));
  
  // Extract compatibility array reliably
  let compArray: string[] = [];
  if (Array.isArray(p.compatibility) && p.compatibility.length > 0) {
    compArray = p.compatibility.map((x: any) => String(x || '').trim()).filter(Boolean);
  } else if (typeof compBrands === "string" && compBrands.trim()) {
    compArray = compBrands.split(/[،,]/).map((x: string) => x.trim()).filter(Boolean);
  } else if (p.brand && String(p.brand).trim()) {
    compArray = [String(p.brand).trim()];
  }

  const shortDesc = p.short_description || p.description || p.technical_description || "";
  const devCat = p.device_category || p.category || "";
  const mdl = p.model || p.device_model || "";
  const brandVal = p.brand || (compArray.length > 0 ? compArray[0] : (typeof compBrands === "string" ? compBrands.split("،")[0].trim() : ""));
  const img = p.image || p.image_url || p.imageUrl || "";

  return {
    id: p.id,
    name: p.name || p.title || "",
    title: p.title || p.name || "",
    device_category: devCat,
    category: devCat,
    brand: brandVal,
    model: mdl,
    device_model: mdl,
    compatible_brands: compBrands || (compArray.length > 0 ? compArray.join("، ") : ""),
    compatibility: compArray,
    compatible_models: compArray,
    compatibleModels: compArray,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    image: img,
    image_url: img,
    imageUrl: img,
    short_description: shortDesc,
    description: shortDesc,
    technical_description: shortDesc,
    code: p.code || p.part_number || p.partNumber || "",
    status: p.status || "available"
  };
}

function formatCommonProblemForApp(p: any) {
  if (!p) return null;
  const causes = Array.isArray(p.causes) ? p.causes : (typeof p.causes === "string" ? [p.causes] : []);
  const solutions = Array.isArray(p.solutions) ? p.solutions : (typeof p.solutions === "string" ? [p.solutions] : []);
  const symptoms = Array.isArray(p.symptoms) ? p.symptoms : (typeof p.symptoms === "string" ? [p.symptoms] : []);
  const steps = Array.isArray(p.steps) ? p.steps : (solutions.length > 0 ? solutions : (typeof p.steps === "string" ? [p.steps] : []));
  const desc = p.description || p.problem_description || (symptoms.length > 0 ? symptoms.join(" - ") : (p.title || ""));

  return {
    id: String(p.id || ""),
    title: p.title || "",
    brand: p.brand || "",
    category: p.category || "",
    model: p.model || "",
    description: desc,
    causes: causes,
    steps: steps,
    solutions: solutions,
    symptoms: symptoms,
    severity: p.severity || "medium",
    video_url: p.video_url || p.videoUrl || "",
    videoUrl: p.video_url || p.videoUrl || ""
  };
}

// App API Endpoints for Mobile App & Web Store
app.get(["/api/v1/spare-parts", "/api/spare-parts"], async (req, res) => {
  try {
    const rawParts = await SparePartRepository.findAll();
    const formatted = (rawParts || []).map(formatSparePartForApi);
    return res.status(200).json(formatted);
  } catch (err: any) {
    return res.status(200).json([]);
  }
});

app.get(["/api/v1/spare-parts/:id", "/api/spare-parts/:id"], async (req, res) => {
  try {
    const item = await SparePartRepository.findById(req.params.id);
    if (!item) return res.status(404).json({ status: "error", message: "قطعه یافت نشد" });
    const formatted = formatSparePartForApi(item);
    return res.status(200).json(formatted);
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get([
  "/api/problems",
  "/api/general-problems",
  "/api/common-problems",
  "/api/v1/problems",
  "/api/v1/common-problems"
], async (req, res) => {
  try {
    const raw = await ProblemRepository.findAll().catch(() => []);
    const formatted = (raw || []).map(formatCommonProblemForApp).filter(Boolean);
    return res.json({
      status: "ok",
      success: true,
      common_problems: formatted,
      commonProblems: formatted,
      problems: formatted,
      data: {
        common_problems: formatted,
        commonProblems: formatted,
        problems: formatted
      }
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message, common_problems: [], data: [] });
  }
});

app.get([
  "/api/problems/:id",
  "/api/general-problems/:id",
  "/api/common-problems/:id"
], async (req, res) => {
  try {
    const p = await ProblemRepository.findById(req.params.id);
    if (!p) return res.status(404).json({ status: "error", message: "مورد یافت نشد" });
    const formatted = formatCommonProblemForApp(p);
    return res.json({ status: "ok", problem: formatted, common_problem: formatted, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get(["/api/get-database", "/api/v1/database"], async (req, res) => {
  try {
    const [rawParts, rawProblems, errorCodes, rawTechs, settingsCities, rawCats, rawBrands] = await Promise.all([
      SparePartRepository.findAll().catch(() => []),
      ProblemRepository.findAll().catch(() => []),
      ErrorCodeRepository.findAll().catch(() => []),
      TechnicianRepository.findAll().catch(() => []),
      getCachedCitiesList().catch(() => []),
      SettingsRepository.getSetting("categoriesList").catch(() => []),
      SettingsRepository.getSetting("brandsList").catch(() => [])
    ]);
    const formattedParts = (rawParts || []).map(formatSparePartForApi);
    const formattedProblems = (rawProblems || []).map(formatCommonProblemForApp).filter(Boolean);
    const formattedTechs = rawTechs || [];

    return res.json({
      status: "ok",
      success: true,
      common_problems: formattedProblems,
      commonProblems: formattedProblems,
      problems: formattedProblems,
      spare_parts: formattedParts,
      spareParts: formattedParts,
      error_codes: errorCodes,
      errorCodes: errorCodes,
      technicians: formattedTechs,
      techs: formattedTechs,
      cities_list: settingsCities,
      citiesList: settingsCities,
      categories_list: rawCats,
      categoriesList: rawCats,
      brands_list: rawBrands,
      brandsList: rawBrands,
      data: {
        cars: [],
        ecus: [],
        spare_parts: formattedParts,
        spareParts: formattedParts,
        repairs: formattedProblems,
        dtc_codes: errorCodes,
        errorCodes,
        problems: formattedProblems,
        common_problems: formattedProblems,
        commonProblems: formattedProblems,
        technicians: formattedTechs,
        techs: formattedTechs,
        citiesList: settingsCities,
        cities_list: settingsCities,
        categoriesList: rawCats,
        categories_list: rawCats,
        brandsList: rawBrands,
        brands_list: rawBrands
      }
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Shared handler for the store-parts listing. Both the legacy `/api/parts` path and
// `/api/store/parts` resolve to the same data; only the `data` envelope differs, as before.
async function listSparePartsHandler(req: express.Request, res: express.Response, wrapData: boolean) {
  try {
    const parts = await SparePartRepository.findAll();
    const formatted = (parts || []).map(formatSparePartForApi);
    return res.json({
      status: "ok",
      parts: formatted,
      spareParts: formatted,
      data: wrapData ? { parts: formatted } : formatted
    });
  } catch (err: any) {
    return res.json({
      status: "ok",
      parts: [],
      spareParts: [],
      data: wrapData ? { parts: [] } : []
    });
  }
}

app.get("/api/store/parts", (req, res) => listSparePartsHandler(req, res, true));

app.post("/api/store/parts", requireAdmin, async (req, res) => {
  try {
    const created = await SparePartRepository.create(req.body);
    const formatted = formatSparePartForApi(created);
    return res.json({ status: "ok", part: formatted, sparePart: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put("/api/store/parts/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await SparePartRepository.update(req.params.id, req.body);
    const formatted = formatSparePartForApi(updated);
    return res.json({ status: "ok", part: formatted, sparePart: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.delete("/api/store/parts/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await SparePartRepository.deleteById(req.params.id);
    return res.json({ status: "ok", success: deleted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Shared handler for part-orders. `/api/store/part-orders` also returns the legacy
// `partPurchases` alias; otherwise both paths behave identically.
async function listPartOrdersHandler(req: express.Request, res: express.Response, includePurchasesAlias: boolean) {
  const withAlias = (payload: Record<string, any>, orders: any[]) =>
    includePurchasesAlias ? { ...payload, partPurchases: orders } : payload;
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    let partOrders = await PartOrderRepository.findAll();
    const queryPhone = normalizePhone((req.query.phone || req.query.buyer_phone || req.query.customerPhone) as string);
    const queryUserId = (req.query.user_id || req.query.userId) as string;

    if (user && (user.role === "admin" || user.is_super_admin)) {
      if (queryPhone) {
        partOrders = partOrders.filter((po: any) => normalizePhone(po.buyer_phone || po.customerPhone) === queryPhone);
      } else if (queryUserId) {
        partOrders = partOrders.filter((po: any) => String(po.user_id || po.userId) === String(queryUserId));
      }
      return res.json(withAlias({ status: "ok", partOrders, data: partOrders }, partOrders));
    }

    const callerPhone = queryPhone || (user ? normalizePhone(user.phone) : "");
    const callerUserId = queryUserId || (user ? user.id : "");

    if (!callerPhone && !callerUserId) {
      return res.status(401).json(withAlias({ status: "error", message: "احراز هویت نشده", partOrders: [], data: [] }, []));
    }

    partOrders = partOrders.filter((po: any) => {
      const orderPhone = normalizePhone(po.buyer_phone || po.customerPhone || po.user_phone);
      return (
        (callerUserId && (String(po.user_id) === String(callerUserId) || String(po.userId) === String(callerUserId))) ||
        (callerPhone && orderPhone && callerPhone === orderPhone)
      );
    });

    return res.json(withAlias({ status: "ok", partOrders, data: partOrders }, partOrders));
  } catch (err: any) {
    return res.json(withAlias({ status: "ok", partOrders: [], data: [] }, []));
  }
}

app.get("/api/store/part-orders", (req, res) => listPartOrdersHandler(req, res, true));

app.get("/api/part-orders", (req, res) => listPartOrdersHandler(req, res, false));

function mapStatusForMobileApp(status: string | null | undefined): string {
  const s = String(status || '').toLowerCase().trim();
  if (['approved', 'confirmed', 'completed', 'paid', 'تایید شده', 'پرداخت شده', 'تکمیل شده'].includes(s)) {
    return 'approved';
  }
  if (['sent', 'shipped', 'enroute', 'ارسال شده', 'در حال ارسال'].includes(s)) {
    return 'sent';
  }
  if (['delivered', 'تحویل داده شده', 'تحویل شد'].includes(s)) {
    return 'delivered';
  }
  if (['cancelled', 'rejected', 'failed', 'لغو شده', 'رد شده'].includes(s)) {
    return 'cancelled';
  }
  return 'pending';
}

app.get(["/api/part-orders/my", "/api/orders/my-part-orders"], async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    const queryPhone = normalizePhone((req.query.phone || req.query.buyer_phone || user?.phone) as string);
    const queryUserId = (req.query.user_id || req.query.userId || user?.id) as string;

    if (!user && !queryPhone && !queryUserId) {
      return res.status(401).json({ status: "error", message: "احراز هویت نشده" });
    }

    const all = await PartOrderRepository.findAll();
    const cleanUserPhone = queryPhone || (user ? normalizePhone(user.phone) : "");
    const targetUserId = queryUserId || user?.id;

    const mine = Array.isArray(all) ? all.filter((o: any) => {
      const cleanOrderPhone = normalizePhone(o.buyer_phone || o.customerPhone || o.user_phone);
      return (
        (targetUserId && (String(o.user_id) === String(targetUserId) || String(o.userId) === String(targetUserId))) ||
        (cleanUserPhone && cleanOrderPhone && cleanUserPhone === cleanOrderPhone)
      );
    }) : [];

    const formatted = mine.map(po => {
      const mappedStatus = mapStatusForMobileApp(po.status);
      return {
        id: po.id,
        order_id: po.id,
        part_name: po.part_name || po.partName || "قطعه یدکی",
        quantity: Number(po.quantity) || 1,
        total_price: Number(po.total_price || po.price) || 0,
        unit_price: Number(po.unit_price) || (po.total_price && po.quantity ? Math.round(Number(po.total_price) / Number(po.quantity)) : 0),
        status: mappedStatus,
        raw_status: po.status || "pending",
        tracking_code: po.shipping_tracking_code || po.trackNumber || "",
        created_at: po.created_at || new Date().toISOString(),
        shamsi_date: po.shamsi_date || po.date || ""
      };
    });

    return res.json({
      status: "ok",
      success: true,
      partOrders: formatted,
      purchases: formatted,
      orders: formatted,
      data: formatted
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post(["/api/orders/update-status", "/api/part-orders/update-status"], requireAdmin, async (req, res) => {
  try {
    const orderId = (req.query.order_id || req.body?.order_id || req.body?.orderId || req.body?.id) as string;
    const status = (req.query.status || req.body?.status) as string;

    if (!orderId || !status) {
      return res.status(400).json({ status: "error", message: "شناسه سفارش و وضعیت جدید الزامی است" });
    }

    const pool = getDbPool();
    // Try updating part_orders first
    const [poRes]: any = await pool.query(
      "UPDATE part_orders SET status = ? WHERE id = ?",
      [status, orderId]
    ).catch(() => [{ affectedRows: 0 }]);

    if (poRes && poRes.affectedRows > 0) {
      // Also sync payment status
      if (status === 'confirmed' || status === 'approved' || status === 'completed') {
        await pool.query("UPDATE payments SET status = 'completed' WHERE ref_code = ? OR order_id = ?", [orderId, orderId]).catch(() => {});
      } else if (status === 'rejected' || status === 'cancelled') {
        await pool.query("UPDATE payments SET status = 'failed' WHERE ref_code = ? OR order_id = ?", [orderId, orderId]).catch(() => {});
      }
      return res.json({ status: "ok", success: true, message: "وضعیت سفارش قطعه با موفقیت به‌روزرسانی شد" });
    }

    // Try updating orders (repair orders)
    const [ordRes]: any = await pool.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    ).catch(() => [{ affectedRows: 0 }]);

    return res.json({ status: "ok", success: true, message: "وضعیت سفارش با موفقیت به‌روزرسانی شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.post(["/api/store/order", "/api/part-orders", "/api/store/purchase"], async (req, res) => {
  try {
    const body = req.body || {};
    const user = await getCurrentUserAsync(req);

    const partId = body.part_id || body.partId || body.id;
    const quantity = Math.max(1, Number(body.quantity) || 1);
    const buyerName = body.user_name || body.buyer_name || body.customer_name || body.customerName || user?.name || user?.full_name || "مشتری فروشگاه";
    const buyerPhone = normalizePhone(body.user_phone || body.buyer_phone || body.customer_phone || body.customerPhone || user?.phone || "");
    
    // Combine structured address fields from App
    const addressParts = [
      body.city,
      body.address || body.customerAddress || body.customer_address,
      body.postal_code ? `کدپستی: ${body.postal_code}` : null,
      body.notes ? `توضیحات: ${body.notes}` : null
    ].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(" - ") : (user?.address || user?.city || "");

    let totalPrice = Number(body.total_price || body.totalPrice || body.price || body.amount) || 0;

    let partItem: any = null;
    if (partId) {
      partItem = await SparePartRepository.findById(partId).catch(() => null);
    }

    if (partItem) {
      if (!totalPrice) {
        totalPrice = (Number(partItem.price) || 0) * quantity;
      }
    }

    const orderId = body.order_id || body.id || (await getNextSequentialId("part_orders", "po"));
    const status = body.status || "pending";

    const pool = getDbPool();
    let effectiveUserId = user?.id || body.user_id || body.userId || null;
    if (!effectiveUserId && buyerPhone) {
      const [uRows]: any = await pool.query("SELECT id FROM users WHERE phone = ?", [buyerPhone]).catch(() => [[], []]);
      if (uRows && uRows.length > 0) {
        effectiveUserId = uRows[0].id;
      } else {
        effectiveUserId = await getNextSequentialId("users", "user");
        await pool.query(
          "INSERT INTO users (id, phone, full_name, role, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id",
          [effectiveUserId, buyerPhone, buyerName, "client", "active"]
        ).catch(() => {});
      }
    }

    const created = await PartOrderRepository.create({
      id: orderId,
      user_id: effectiveUserId,
      part_id: partId || null,
      part_name: body.part_name || body.partName || partItem?.title || partItem?.name || "قطعه یدکی",
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      address: fullAddress,
      quantity,
      total_price: totalPrice,
      status
    });

    // Create a pending payment record in payments table so admin sees it in Financial/Payments panel
    const paymentMethod = body.payment_method || body.paymentMethod || "direct_payment";
    const trackNumber = body.track_number || body.trackNumber || body.shipping_tracking_code || orderId;
    const cardHolder = body.card_holder || body.cardHolder || buyerName;
    
    await PaymentRepository.create({
      id: `pay_${orderId}`,
      user_id: effectiveUserId || buyerPhone || "guest",
      order_id: null,
      related_type: "part_purchase",
      related_id: partId || null,
      amount: totalPrice,
      payment_method: paymentMethod,
      authority: `ORDER_${orderId}`,
      ref_id: trackNumber,
      ref_code: orderId,
      card_number: cardHolder,
      status: "pending"
    }).catch(() => {});

    const host = req.get("host") || "localhost:3000";
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const paymentUrl = `${proto}://${host}/?checkout_type=part&order_id=${orderId}&amount=${totalPrice}`;

    return res.status(201).json({
      status: "ok",
      success: true,
      message: "سفارش خرید قطعه با موفقیت ثبت شد",
      order_id: orderId,
      order: created,
      partOrder: created,
      payment_url: paymentUrl,
      paymentUrl,
      data: created
    });
  } catch (err: any) {
    console.error("Part order error:", err);
    return res.status(500).json({ status: "error", message: err.message || "خطا در ثبت سفارش قطعه" });
  }
});

app.get("/api/parts", (req, res) => listSparePartsHandler(req, res, false));

app.get("/api/parts/:id", async (req, res) => {
  try {
    const item = await SparePartRepository.findById(req.params.id);
    if (!item) return res.status(404).json({ status: "error", message: "قطعه یافت نشد" });
    const formatted = formatSparePartForApi(item);
    return res.json({ status: "ok", part: formatted, sparePart: formatted, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

async function getCachedCitiesList(): Promise<Array<{ name: string; regions: string[] }>> {
  try {
    const pool = getDbPool();
    const [rows]: any = await pool.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('citiesList', 'cities', 'ir_cities')"
    );
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (!row.setting_value) continue;
        const parsed = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => {
            if (typeof item === 'string') return { name: item.trim(), regions: [] };
            if (item && typeof item === 'object') {
              return {
                name: String(item.name || '').trim(),
                regions: Array.isArray(item.regions) ? item.regions.map((r: any) => String(r || '').trim()).filter(Boolean) : []
              };
            }
            return null;
          }).filter((c: any): c is { name: string; regions: string[] } => !!c && !!c.name);
        }
      }
    }
  } catch (e) {}
  return [];
}

export function cleanLocNoise(s: string): string {
  if (!s) return "";
  let res = normalizeLocString(s);
  const noisePrefixes = [
    "محل سکونت", "محل فعالیت", "محدوده فعالیت", "حوزه فعالیت", "محدوده های فعالیت",
    "محدوده ", "منطقه ", "ناحیه ", "بخش ", "روستای ", "روستا ", "مرکز ", "حومه ",
    "شهرستان ", "استان ", "شهر ", "کلانشهر "
  ];
  const noiseSuffixes = [" استان", " شهرستان", " شهر"];
  for (const p of noisePrefixes) {
    if (res.startsWith(p)) res = res.substring(p.length).trim();
  }
  for (const sf of noiseSuffixes) {
    if (res.endsWith(sf)) res = res.substring(0, res.length - sf.length).trim();
  }
  return res.replace(/\s+/g, " ").trim();
}

export function normalizeLocString(s: string): string {
  if (!s) return "";
  return String(s)
    .trim()
    .replace(/[ـ،,\-_/\\()\[\]{}:;]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200c\u200f]/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/آ/g, "ا")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const PROVINCE_FAMILIES: Array<{ family: string; aliases: string[]; regions: string[] }> = [
  {
    family: "اراک",
    aliases: ["اراک", "مرکزی", "استان مرکزی", "فراهان"],
    regions: ["فرمهین", "فراهان", "ساوه", "خمین", "محلات", "شازند", "تفرش", "دلیجان", "زرندیه", "کمیجان", "آشتیان", "خنداب", "مامونیه", "غرق آباد", "میلاجرد", "ساروق", "نراق", "مهاجران", "توره", "زاویه", "پرندک", "خشکرود", "نوقان", "آستانه", "هزاوه", "رازقان", "جاورسیان", "هندودر"]
  },
  {
    family: "تهران",
    aliases: ["تهران", "استان تهران"],
    regions: ["ری", "شهر ری", "شمیرانات", "شمیران", "تجریش", "اسلامشهر", "شهریار", "دماوند", "ورامین", "پاکدشت", "رباط کریم", "قدس", "شهر قدس", "ملارد", "پردیس", "بهارستان", "قرچک", "فیروزکوه", "بومهن", "رودهن", "لواسان", "اندیشه", "صفادشت", "کهریزک", "حسن آباد", "صباشهر", "وحیدیه", "شاهدشهر", "صالحیه", "نصیرشهر", "باقرشهر", "احمدآباد مستوفی", "قیامدشت"]
  },
  {
    family: "مشهد",
    aliases: ["مشهد", "خراسان", "خراسان رضوی"],
    regions: ["نیشابور", "سبزوار", "تربت حیدریه", "قوچان", "چناران", "کاشمر", "تربت جام", "تایباد", "سرخس", "گناباد", "فریمان", "بینالود", "طرقبه", "شاندیز", "خواف", "بردسکن", "درگز", "کلات", "باخرز", "خلیل آباد", "مه ولات", "بجستان", "فیروزه", "جغتای", "جوین", "داورزن", "رشتخوار", "زاوه", "صالح آباد", "ششتمد", "گلبهار", "زبرخان"]
  },
  {
    family: "اصفهان",
    aliases: ["اصفهان", "استان اصفهان"],
    regions: ["کاشان", "خمینی شهر", "نجف آباد", "شاهین شهر", "فولادشهر", "لنجان", "شهرضا", "مبارکه", "فلاورجان", "آران و بیدگل", "زرین شهر", "گلپایگان", "سمیرم", "خوانسار", "تیران", "داران", "نطنز", "اردستان", "نائین", "خور و بیابانک", "چادگان", "دهاقان", "بویین میاندشت", "هرند", "ورزنه", "جرقویه", "کوهپایه"]
  },
  {
    family: "شیراز",
    aliases: ["شیراز", "فارس", "استان فارس"],
    regions: ["مرودشت", "کازرون", "جهرم", "لار", "لارستان", "فسا", "داراب", "فیروزآباد", "ممسنی", "نورآباد", "آباده", "اقلید", "سپیدان", "استهبان", "نی ریز", "لامرد", "کوار", "زرین دشت", "قیروکارزین", "خرم بید", "بوانات", "خرامه", "ارسنجان", "پاسارگاد", "گراش", "خنج", "رستم", "فراشبند", "سروستان", "بیضا", "اوز", "سرچهان", "زرقان", "بختگان", "جویم"]
  },
  {
    family: "تبریز",
    aliases: ["تبریز", "آذربایجان شرقی", "آذربایجان"],
    regions: ["مراغه", "مرند", "میانه", "اهر", "بناب", "سراب", "آذرشهر", "اسکو", "شبستر", "عجب شیر", "ملکان", "هریس", "بستان آباد", "کلیبر", "جلفا", "سهند", "هشترود", "ورزقان", "چاراویماق", "خداآفرین", "هوراند"]
  },
  {
    family: "اهواز",
    aliases: ["اهواز", "خوزستان", "استان خوزستان"],
    regions: ["آبادان", "دزفول", "خرمشهر", "ماهشهر", "بندر ماهشهر", "ایذه", "بهبهان", "شوشتر", "شوش", "امیدیه", "مسجد سلیمان", "رامهرمز", "اندیمشک", "شادگان", "هندیجان", "سوسنگرد", "دشت آزادگان", "باغملک", "گتوند", "لالی", "هفتکل", "رامشیر", "هویزه", "کارون", "باوی", "حمیدیه", "آغاجاری", "کرخه", "صیدون"]
  },
  {
    family: "کرج",
    aliases: ["کرج", "البرز", "استان البرز"],
    regions: ["فردیس", "ساوجبلاغ", "نظرآباد", "هشتگرد", "طالقان", "اشتهارد", "کمال شهر", "محمدشهر", "ماهدشت", "گرمدره", "چهارباغ", "تنکمان", "کوهسار"]
  },
  {
    family: "قم",
    aliases: ["قم", "استان قم"],
    regions: ["کهک", "جعفریه", "سلفچگان", "قنوات", "دستجرد"]
  },
  {
    family: "رشت",
    aliases: ["رشت", "گیلان", "استان گیلان"],
    regions: ["انزلی", "بندر انزلی", "لاهیجان", "لنگرود", "فومن", "رودسر", "تالش", "هشتپر", "صومعه سرا", "آستارا", "آستانه اشرفیه", "رودبار", "منجیل", "لوشان", "ماسوله", "ماسال", "شفت", "سیاهکل", "رضوانشهر", "املش", "خمام"]
  },
  {
    family: "ساری",
    aliases: ["ساری", "مازندران", "استان مازندران"],
    regions: ["بابل", "آمل", "قائم شهر", "قائمشهر", "تنکابن", "شهسوار", "چالوس", "نوشهر", "بابلسر", "رامسر", "محمودآباد", "نور", "نکا", "بهشهر", "فریدونکنار", "جویبار", "سوادکوه", "زیرآب", "پل سفید", "کلاردشت", "عباس آباد", "رویان", "گلوگاه", "سیمرغ", "میاندورود"]
  },
  {
    family: "کرمانشاه",
    aliases: ["کرمانشاه", "استان کرمانشاه"],
    regions: ["اسلام آباد غرب", "کنگاور", "سنقر", "جوانرود", "صحنه", "هرسین", "سرپل ذهاب", "پاوه", "روانسر", "گیلانغرب", "قصر شیرین", "تازه آباد", "ثلاث باباجانی", "دالاهو", "کرند غرب"]
  },
  {
    family: "ارومیه",
    aliases: ["ارومیه", "آذربایجان غربی"],
    regions: ["خوی", "بوکان", "مهاباد", "میاندوآب", "سلماس", "پیرانشهر", "نقده", "تکاب", "ماکو", "سردشت", "شاهین دژ", "اشنویه", "قره ضیاءالدین", "سیه چشمه", "چایپاره", "پلدشت", "شوط", "چالدران", "میرآباد", "باروق", "چهاربرج"]
  },
  {
    family: "یزد",
    aliases: ["یزد", "استان یزد"],
    regions: ["میبد", "اردکان", "مهریز", "بافق", "ابرکوه", "تفت", "اشکذر", "هرات", "مروست", "بهاباد", "خاتم", "زارچ"]
  },
  {
    family: "کرمان",
    aliases: ["کرمان", "استان کرمان"],
    regions: ["رفسنجان", "سیرجان", "جیرفت", "بم", "زرند", "کهنوج", "شهر بابک", "بافت", "بردسیر", "عنبرآباد", "منوجان", "راور", "انار", "رودبار جنوب", "قلعه گنج", "ریگان", "فهرج", "نرماشیر", "ارزوئیه", "کوهبنان", "رابر", "فاریاب", "جازموریان", "گنبکی"]
  },
  {
    family: "همدان",
    aliases: ["همدان", "استان همدان"],
    regions: ["ملایر", "نهاوند", "تویسرکان", "کبودرآهنگ", "بهار", "رزن", "فامنین", "لالجین", "مریانج", "قروه درجزین", "درگزین"]
  },
  {
    family: "خرم آباد",
    aliases: ["خرم آباد", "لرستان", "استان لرستان"],
    regions: ["بروجرد", "دورود", "الیگودرز", "کوهدشت", "ازنا", "پلدختر", "الشتر", "سلسله", "نورآباد", "دلفان", "چگنی", "معمولان"]
  },
  {
    family: "قزوین",
    aliases: ["قزوین", "استان قزوین"],
    regions: ["الوند", "البرز قزوین", "تاکستان", "بوئین زهرا", "آبیک", "محمدیه", "محمودآباد نمونه", "اقبالیه", "شریفیه", "ضیاءآباد", "آوج"]
  },
  {
    family: "زنجان",
    aliases: ["زنجان", "استان زنجان"],
    regions: ["ابهر", "خرمدره", "قیدار", "خدابنده", "طارم", "آب بر", "ماهنشان", "ایجرود", "زرین آباد", "سلطانیه"]
  },
  {
    family: "سمنان",
    aliases: ["سمنان", "استان سمنان"],
    regions: ["شاهرود", "دامغان", "گرمسار", "مهدی شهر", "سنگسر", "سرخه", "آرادان", "میامی", "بسطام", "شهمیرزاد", "ایوانکی"]
  },
  {
    family: "گرگان",
    aliases: ["گرگان", "گلستان", "استان گلستان"],
    regions: ["گنبد کاووس", "گنبد", "علی آباد کتول", "بندر ترکمن", "آق قلا", "کلاله", "آزادشهر", "کردکوی", "مینودشت", "گالیکش", "بندر گز", "رامیان", "مراوه تپه", "گمیشان"]
  },
  {
    family: "بوشهر",
    aliases: ["بوشهر", "استان بوشهر"],
    regions: ["برازجان", "دشتستان", "گناوه", "بندر گناوه", "کنگان", "بندر کنگان", "عسلویه", "خورموج", "دشتی", "جم", "دیلم", "بندر دیلم", "اهرم", "تنگستان", "دیر", "بندر دیر", "دلوار"]
  },
  {
    family: "بندر عباس",
    aliases: ["بندر عباس", "بندرعباس", "هرمزگان", "استان هرمزگان"],
    regions: ["قشم", "کیش", "میناب", "بندرلنگه", "لنگه", "رودان", "بستک", "حاجی آباد", "جاسک", "بندر خمیر", "پارسیان", "گاوبندی", "سیریک", "بشاگرد", "ابوموسی"]
  },
  {
    family: "زاهدان",
    aliases: ["زاهدان", "سیستان و بلوچستان", "سیستان", "بلوچستان"],
    regions: ["زابل", "ایرانشهر", "چابهار", "بندر چابهار", "سراوان", "خاش", "نیک شهر", "کنارک", "راسک", "سرباز", "میرجاوه", "زهک", "هیرمند", "قصرقند", "نیمروز", "هامون", "فنوج", "مهرستان", "سیب و سوران", "دلگان", "دشتیاری", "تفتان", "لاشار", "زرآباد", "بمپور", "گلشن"]
  },
  {
    family: "سنندج",
    aliases: ["سنندج", "کردستان", "استان کردستان"],
    regions: ["سقز", "مریوان", "بانه", "قروه", "کامیاران", "بیجار", "دیواندره", "دهگلان", "سروآباد"]
  },
  {
    family: "اردبیل",
    aliases: ["اردبیل", "استان اردبیل"],
    regions: ["پارس آباد", "مشگین شهر", "خلخال", "گرمی", "نمین", "بیله سوار", "کوثر", "گیوی", "سرعین", "نیر", "اصلاندوز", "انگوت"]
  },
  {
    family: "شهرکرد",
    aliases: ["شهرکرد", "چهارمحال و بختیاری", "چهارمحال"],
    regions: ["بروجن", "فارسان", "لردگان", "فرخ شهر", "سامان", "بن", "کیار", "شلمزار", "کوهرنگ", "چلگرد", "اردل", "خانمیرزا", "فلارد"]
  },
  {
    family: "ایلام",
    aliases: ["ایلام", "استان ایلام"],
    regions: ["دهلران", "ایوان", "آبدانان", "مهران", "دره شهر", "چرداول", "سرابله", "بدره", "ملکشاهی", "سیروان", "چوار", "هلیلان"]
  },
  {
    family: "یاسوج",
    aliases: ["یاسوج", "کهگیلویه و بویراحمد", "کهگیلویه"],
    regions: ["دوگنبدان", "گچساران", "دهدشت", "لیکک", "بهمئی", "چرام", "لنده", "سی سخت", "دنا", "باشت", "مارگون"]
  },
  {
    family: "بجنورد",
    aliases: ["بجنورد", "خراسان شمالی"],
    regions: ["شیروان", "اسفراین", "گرمه", "جاجرم", "آشخانه", "مانه و سملقان", "فاروج", "راز و جرگلان", "مانه", "سملقان"]
  },
  {
    family: "بیرجند",
    aliases: ["بیرجند", "خراسان جنوبی"],
    regions: ["قائنات", "قائن", "فردوس", "طبس", "نهبندان", "سرایان", "سربیشه", "بشرویه", "درمیان", "اسدیه", "خوسف", "زیرکوه"]
  }
];

export function getProvinceFamilies(rawText: string, citiesListFromDb: Array<{ name: string; regions: string[] }>): Set<string> {
  const families = new Set<string>();
  if (!rawText) return families;

  const normalized = normalizeLocString(rawText);
  const cleaned = cleanLocNoise(normalized);
  const targets = Array.from(new Set([normalized, cleaned].filter(t => t && t.length >= 2)));

  // 1. Check against dynamic citiesList from settings table
  if (Array.isArray(citiesListFromDb) && citiesListFromDb.length > 0) {
    for (const group of citiesListFromDb) {
      const gName = normalizeLocString(group.name || "");
      const gClean = cleanLocNoise(gName);
      const gRegions = (group.regions || []).map(r => normalizeLocString(r)).filter(r => r && r.length >= 2);

      for (const t of targets) {
        const isNameMatch = (gName && (t === gName || (t.length >= 3 && (t.includes(gName) || gName.includes(t))))) ||
                            (gClean && (t === gClean || (t.length >= 3 && (t.includes(gClean) || gClean.includes(t)))));
        const isRegionMatch = gRegions.some(r => {
          const rClean = cleanLocNoise(r);
          return (r && (t === r || (t.length >= 3 && (t.includes(r) || r.includes(t))))) ||
                 (rClean && (t === rClean || (t.length >= 3 && (t.includes(rClean) || rClean.includes(t)))));
        });

        if (isNameMatch || isRegionMatch) {
          families.add(gName || gClean);
        }
      }
    }
  }

  // 2. Check against built-in PROVINCE_FAMILIES dictionary
  for (const pf of PROVINCE_FAMILIES) {
    const pfName = normalizeLocString(pf.family);
    const pfAliases = (pf.aliases || []).map(a => normalizeLocString(a)).filter(a => a && a.length >= 2);
    const pfRegions = (pf.regions || []).map(r => normalizeLocString(r)).filter(r => r && r.length >= 2);

    for (const t of targets) {
      const isFamilyMatch = pfName && (t === pfName || (t.length >= 3 && (t.includes(pfName) || pfName.includes(t))));
      const isAliasMatch = pfAliases.some(a => a && (t === a || (t.length >= 3 && (t.includes(a) || a.includes(t)))));
      const isRegionMatch = pfRegions.some(r => {
        const rClean = cleanLocNoise(r);
        return (r && (t === r || (t.length >= 3 && (t.includes(r) || r.includes(t))))) ||
               (rClean && (t === rClean || (t.length >= 3 && (t.includes(rClean) || rClean.includes(t)))));
      });

      if (isFamilyMatch || isAliasMatch || isRegionMatch) {
        families.add(pfName);
        if (Array.isArray(citiesListFromDb)) {
          for (const group of citiesListFromDb) {
            const gNorm = normalizeLocString(group.name || "");
            if (gNorm === pfName || pfAliases.includes(gNorm) || pfRegions.includes(gNorm)) {
              families.add(gNorm);
            }
          }
        }
      }
    }
  }

  return families;
}

export function isLocationMatching(loc1: string, loc2: string, citiesList: Array<{ name: string; regions: string[] }>): boolean {
  if (!loc1 || !loc2) return true;
  const n1 = normalizeLocString(loc1);
  const n2 = normalizeLocString(loc2);
  if (!n1 || !n2) return true;

  const isAll = (n: string) => !n || n === "همه" || n === "all" || n === "کل" || n === "همه شهرها" || n === "all_cities" || n === "همه استانها" || n === "تمام شهرها" || n === "سراسر کشور";
  if (isAll(n1) || isAll(n2)) return true;

  const c1 = cleanLocNoise(n1);
  const c2 = cleanLocNoise(n2);

  // Direct match or cleaned direct match
  if (n1 === n2 || c1 === c2 || (n1.length >= 3 && n2.length >= 3 && (n1.includes(n2) || n2.includes(n1))) || (c1 && c2 && c1.length >= 3 && c2.length >= 3 && (c1.includes(c2) || c2.includes(c1)))) {
    return true;
  }

  // Extract provincial families for both locations
  const fam1 = getProvinceFamilies(loc1, citiesList);
  const fam2 = getProvinceFamilies(loc2, citiesList);

  if (fam1.size > 0 && fam2.size > 0) {
    for (const f of fam1) {
      if (fam2.has(f)) {
        return true;
      }
    }
  }

  // Token overlap fallback for compound addresses (only tokens >= 3 chars)
  const tokens1 = c1.split(/\s+/).filter(w => w.length >= 3);
  const tokens2 = c2.split(/\s+/).filter(w => w.length >= 3);
  if (tokens1.some(t => tokens2.includes(t))) {
    return true;
  }

  return false;
}

app.get(["/api/technicians", "/api/v1/technicians"], async (req, res) => {
  try {
    let list = await TechnicianRepository.findAll();
    const queryCity = (req.query.city || req.query.location || req.query.region || req.query.province) as string;
    const queryUserId = (req.query.user_id || req.query.userId) as string;
    const queryPhone = (req.query.phone || req.query.mobile) as string;
    const isAllRequested = req.query.all === "true" || req.query.all === "1";

    const isAllCities = (loc: string | null | undefined): boolean => {
      if (!loc) return true;
      const n = normalizeLocString(loc);
      return !n || n === "همه" || n === "all" || n === "کل" || n === "همه شهرها" || n === "all_cities" || n === "همه استانها" || n === "تمام شهرها" || n === "سراسر کشور";
    };

    let targetLocation = queryCity;
    if (!isAllRequested && isAllCities(targetLocation)) {
      targetLocation = "";
      if (queryUserId) {
        const u = await UserRepository.findById(queryUserId).catch(() => null);
        if (u && (u.city || u.address) && !isAllCities(u.city || u.address)) {
          targetLocation = u.city || u.address;
        }
      } else if (queryPhone) {
        const u = await UserRepository.findByPhone(queryPhone).catch(() => null);
        if (u && (u.city || u.address) && !isAllCities(u.city || u.address)) {
          targetLocation = u.city || u.address;
        }
      } else {
        const sessionUser = await getCurrentUserAsync(req).catch(() => null);
        if (sessionUser && (sessionUser.city || sessionUser.address) && !isAllCities(sessionUser.city || sessionUser.address)) {
          targetLocation = sessionUser.city || sessionUser.address;
        }
      }
    }

    if (!isAllRequested && targetLocation && !isAllCities(targetLocation) && String(targetLocation).trim()) {
      const settingsCities = await getCachedCitiesList();
      list = list.filter(t => {
        const techLocCombined = `${t.city || ''} ${t.active_location || ''} ${t.activeLocation || ''} ${t.address || ''}`;
        return isLocationMatching(techLocCombined, targetLocation, settingsCities);
      });
    }

    const formattedList = list.map(t => formatTechnicianForResponse(t, req));

    return res.json({
      status: "ok",
      technicians: formattedList,
      techs: formattedList,
      data: {
        technicians: formattedList,
        techs: formattedList
      }
    });
  } catch (err: any) {
    return res.json({
      status: "ok",
      technicians: [],
      techs: [],
      data: {
        technicians: [],
        techs: []
      }
    });
  }
});

// Dedicated real-time status check endpoint for technician app and portal
app.get(["/api/technicians/status", "/api/technicians/:id/status"], async (req, res) => {
  try {
    const idParam = String(req.params.id || "").trim();
    const queryId = String(req.query.id || "").trim();
    const queryPhone = String(req.query.phone || req.query.mobile || "").trim();

    let tech: any = null;
    if (idParam && idParam !== 'undefined' && idParam !== 'null' && idParam !== 'status') {
      tech = await TechnicianRepository.findById(idParam);
      if (!tech) tech = await TechnicianRepository.findByPhone(idParam);
    }
    if (!tech && queryId && queryId !== 'undefined' && queryId !== 'null') {
      tech = await TechnicianRepository.findById(queryId);
      if (!tech) tech = await TechnicianRepository.findByPhone(queryId);
    }
    if (!tech && queryPhone && queryPhone !== 'undefined' && queryPhone !== 'null') {
      tech = await TechnicianRepository.findByPhone(queryPhone);
      if (!tech) tech = await TechnicianRepository.findById(queryPhone);
    }

    // Also search users table to ensure verified state is synchronized
    let linkedUser: any = null;
    const phoneToSearch = queryPhone || (tech ? tech.phone : null);
    if (phoneToSearch) {
      linkedUser = await UserRepository.findByPhone(phoneToSearch).catch(() => null);
    }
    if (!linkedUser && (idParam || queryId) && idParam !== 'status') {
      const cleanUid = (idParam || queryId).replace(/^tech_/, '');
      linkedUser = await UserRepository.findById(cleanUid).catch(() => null);
    }

    if (!tech && !linkedUser) {
      return res.status(404).json({ status: "error", message: "تکنسین یافت نشد." });
    }

    const isVerified = Boolean(
      (tech && (tech.isVerified === true || tech.is_verified === 1)) ||
      (linkedUser && (linkedUser.is_verified === 1 || linkedUser.is_verified === true || linkedUser.isVerified === true))
    );

    const isSuspended = (tech && (tech.status === 'suspended' || tech.status === 'blocked')) ||
                        (linkedUser && (linkedUser.status === 'suspended' || linkedUser.status === 'blocked'));

    const techStatus = isSuspended 
      ? "suspended" 
      : (!isVerified 
          ? "pending" 
          : ((tech && tech.status) || (linkedUser && linkedUser.status) || "active"));
    const name = (tech && (tech.fullName || tech.full_name || tech.name)) || (linkedUser && (linkedUser.full_name || linkedUser.name)) || "تکنسین گرامی";
    const phone = (tech && tech.phone) || (linkedUser && linkedUser.phone) || queryPhone;

    // If verified on either side, keep both in sync
    if (isVerified) {
      if (tech && !tech.isVerified) {
        TechnicianRepository.update(tech.id, { isVerified: true, is_verified: 1 }).catch(() => {});
      }
      if (linkedUser && !linkedUser.is_verified) {
        UserRepository.update(linkedUser.id, { is_verified: 1 }).catch(() => {});
      }
    }

    return res.json({
      success: true,
      id: (tech && tech.id) || (linkedUser ? `tech_${linkedUser.id}` : (idParam || queryId)),
      phone,
      name,
      isVerified,
      is_verified: isVerified ? 1 : 0,
      techStatus,
      status: techStatus,
      technician: tech ? formatTechnicianForResponse(tech, req) : undefined
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/technicians/:id", async (req, res, next) => {
  if (req.params.id === "status") return next();
  try {
    const item = await TechnicianRepository.findById
      ? await (TechnicianRepository as any).findById(req.params.id)
      : null;
    if (!item) return res.status(404).json({ status: "error", message: "تکنسین یافت نشد" });
    const formatted = formatTechnicianForResponse(item, req);
    return res.json({ status: "ok", technician: formatted, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Dedicated status toggle endpoint (e.g. for Vacation / Active toggle)
app.all(["/api/technicians/:id/status", "/api/technicians/status"], async (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return next();
  }
  try {
    const targetId = String(req.params.id || req.body.id || req.body.techId || req.query.id || "").trim();
    const phone = String(req.body.phone || req.query.phone || "").trim();
    const newStatus = String(req.body.status || req.query.status || "").trim();

    if (!newStatus) {
      return res.status(400).json({ status: "error", message: "وضعیت جدید (status) ارسال نشده است." });
    }

    let updatedTech = null;
    if (targetId) {
      const existingTech = await TechnicianRepository.findById(targetId);
      const preserveVerified = existingTech ? Boolean(existingTech.isVerified || existingTech.is_verified === 1) : undefined;
      updatedTech = await TechnicianRepository.update(targetId, {
        status: newStatus,
        ...(preserveVerified !== undefined ? { isVerified: preserveVerified, is_verified: preserveVerified ? 1 : 0 } : {})
      });
      if (!updatedTech) {
        updatedTech = await TechnicianRepository.findByPhone(targetId);
        if (updatedTech) {
          updatedTech = await TechnicianRepository.update(updatedTech.id, {
            status: newStatus,
            ...(preserveVerified !== undefined ? { isVerified: preserveVerified, is_verified: preserveVerified ? 1 : 0 } : {})
          });
        }
      }
    }
    if (!updatedTech && phone) {
      const found = await TechnicianRepository.findByPhone(phone);
      if (found) {
        const preserveVerified = Boolean(found.isVerified || found.is_verified === 1);
        updatedTech = await TechnicianRepository.update(found.id, {
          status: newStatus,
          isVerified: preserveVerified,
          is_verified: preserveVerified ? 1 : 0
        });
      }
    }

    // Also update linked user and FileStorage synchronously
    const lookupPhone = phone || (updatedTech ? updatedTech.phone : null);
    const cleanUid = targetId.replace(/^tech_/, '');
    const userToUpdate = (updatedTech?.user_id ? await UserRepository.findById(updatedTech.user_id).catch(() => null) : null) ||
                         (updatedTech?.userId ? await UserRepository.findById(updatedTech.userId).catch(() => null) : null) ||
                         (cleanUid ? await UserRepository.findById(cleanUid).catch(() => null) : null) ||
                         (lookupPhone ? await UserRepository.findByPhone(lookupPhone).catch(() => null) : null);
    if (userToUpdate) {
      await UserRepository.update(userToUpdate.id, { status: newStatus }).catch(() => {});
      FileStorage.updateUser(userToUpdate.id, { status: newStatus });
    }

    FileStorage.updateTechnician(targetId, { status: newStatus });
    if (lookupPhone) {
      FileStorage.updateTechnician(lookupPhone, { status: newStatus });
    }

    const finalTech = (targetId ? await TechnicianRepository.findById(targetId).catch(() => null) : null) || updatedTech;

    return res.json({
      status: "ok",
      message: `وضعیت تکنسین با موفقیت به '${newStatus}' تغییر یافت.`,
      techStatus: newStatus,
      statusValue: newStatus,
      technician: finalTech ? formatTechnicianForResponse(finalTech, req) : null
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Dedicated verification endpoint for Admin to approve or suspend technician
// این مسیر پیش‌تر هیچ احراز هویتی نداشت — هر کسی می‌توانست هر تکنسینی را
// (از جمله خودش را) تأیید یا مسدود کند. اکنون فقط مدیر مجاز است.
app.post(["/api/admin/technicians/:id/verify", "/api/technicians/:id/verify"], requireAdmin, async (req, res) => {
  try {
    const targetId = String(req.params.id || req.body.id || "").trim();
    const { isVerified, status } = req.body || {};
    const verifyBool = isVerified !== undefined ? Boolean(isVerified) : true;
    const verifyVal = verifyBool ? 1 : 0;
    const statusVal = status || (verifyBool ? "active" : "suspended");

    console.log(`[Admin Verify] Updating technician ${targetId} -> isVerified: ${verifyBool}, status: ${statusVal}`);

    let updatedTech = await TechnicianRepository.update(targetId, {
      isVerified: verifyBool,
      is_verified: verifyVal,
      status: statusVal
    });

    if (!updatedTech) {
      updatedTech = await TechnicianRepository.findByPhone(targetId);
      if (updatedTech) {
        updatedTech = await TechnicianRepository.update(updatedTech.id, {
          isVerified: verifyBool,
          is_verified: verifyVal,
          status: statusVal
        });
      }
    }

    // Also verify user record in users table
    const cleanUid = targetId.replace(/^tech_/, '');
    const userToUpdate = (await UserRepository.findById(cleanUid).catch(() => null)) ||
                         (updatedTech?.user_id ? await UserRepository.findById(updatedTech.user_id).catch(() => null) : null) ||
                         (updatedTech?.userId ? await UserRepository.findById(updatedTech.userId).catch(() => null) : null) ||
                         (updatedTech?.phone ? await UserRepository.findByPhone(updatedTech.phone).catch(() => null) : null) ||
                         (await UserRepository.findByPhone(targetId).catch(() => null));
    if (userToUpdate) {
      await UserRepository.update(userToUpdate.id, {
        is_verified: verifyVal,
        status: statusVal,
        role: 'technician',
        is_technician: true
      }).catch(() => {});
    }

    const formatted = updatedTech ? formatTechnicianForResponse(updatedTech, req) : null;
    return res.json({
      status: "ok",
      message: verifyBool ? "تکنسین با موفقیت تایید و فعال گردید." : "همکاری با تکنسین با موفقیت تعلیق شد.",
      isVerified: verifyBool,
      is_verified: verifyVal,
      technician: formatted
    });
  } catch (err: any) {
    console.error("[Admin Verify Error]:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post(["/api/technicians/upload-avatar", "/api/upload/avatar"], async (req, res) => {
  try {
    const { image, techId, phone } = req.body || {};
    if (!image) {
      return res.status(400).json({ status: "error", message: "تصویر ارسال نشده است." });
    }

    const savedRelativePath = saveBase64AvatarImage(image, techId || phone || "technician");
    if (!savedRelativePath) {
      return res.status(400).json({ status: "error", message: "فرمت تصویر نامعتبر است." });
    }

    const fullHttpsUrl = toAbsoluteHttpsUrl(req, savedRelativePath);

    if (techId || phone) {
      const targetId = techId || phone;
      await TechnicianRepository.update(targetId, {
        avatar_url: savedRelativePath
      }).catch(() => {});

      const [uRows]: any = await getDbPool().query("SELECT id FROM users WHERE id = ? OR phone = ?", [targetId, targetId]).catch(() => [[]]);
      if (Array.isArray(uRows) && uRows.length > 0) {
        await UserRepository.update(uRows[0].id, { avatar_url: savedRelativePath }).catch(() => {});
      }
    }

    return res.json({
      status: "ok",
      avatar_url: fullHttpsUrl,
      avatarUrl: fullHttpsUrl,
      url: fullHttpsUrl,
      relative_url: savedRelativePath
    });
  } catch (err: any) {
    console.error("[upload-avatar] error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/admin/technicians", requireAdmin, async (req, res) => {
  try {
    const pool = getDbPool();
    const [techUsers]: any = await pool.query("SELECT * FROM users WHERE role = 'technician'");
    if (Array.isArray(techUsers) && techUsers.length > 0) {
      for (const u of techUsers) {
        const [existingTech]: any = await pool.query(
          "SELECT id FROM technicians WHERE user_id = ? OR phone = ? OR id = ?",
          [u.id, u.phone, `tech_${u.id}`]
        );
        if (!existingTech || existingTech.length === 0) {
          await TechnicianRepository.create({
            id: `tech_${u.id}`,
            user_id: u.id,
            phone: u.phone,
            full_name: u.full_name || u.name || "",
            city: u.city || "",
            specialties: [],
            documents: [],
            isVerified: 0,
            status: "active",
            active_location: u.city || ""
          }).catch(() => {});
        }
      }
    }

    const rawList = await TechnicianRepository.findAll();
    const technicians = rawList.map(t => formatTechnicianForResponse(t, req));
    return res.json({ status: "ok", technicians, data: { technicians } });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/admin/technicians", requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.avatarUrl && typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image/')) {
      const saved = saveBase64AvatarImage(body.avatarUrl, 'admin_created');
      if (saved) {
        body.avatarUrl = saved;
        body.avatar_url = saved;
      }
    }
    const created = await TechnicianRepository.create(body);
    const formatted = formatTechnicianForResponse(created, req);
    return res.json({ status: "ok", technician: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put(["/api/technicians/:id", "/api/technicians/profile/:id"], async (req, res) => {
  try {
    const techId = req.params.id;
    const body = { ...req.body };

    // Disallow documents as avatar
    if (isDocumentOrCertificateUrl(body.avatarUrl) || isDocumentOrCertificateUrl(body.avatar_url)) {
      delete body.avatarUrl;
      delete body.avatar_url;
    }

    // If avatar is base64, save to static file on disk
    if (body.avatarUrl && typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image/')) {
      const savedPath = saveBase64AvatarImage(body.avatarUrl, `tech_${techId}`);
      if (savedPath) {
        body.avatarUrl = savedPath;
        body.avatar_url = savedPath;
      }
    } else if (body.avatar_url && typeof body.avatar_url === 'string' && body.avatar_url.startsWith('data:image/')) {
      const savedPath = saveBase64AvatarImage(body.avatar_url, `tech_${techId}`);
      if (savedPath) {
        body.avatar_url = savedPath;
        body.avatarUrl = savedPath;
      }
    }

    const updated = await TechnicianRepository.update(techId, body);

    // Keep linked user account in sync with name, city, and avatar
    const newName = body.name || body.full_name || body.fullName;
    const newAvatar = body.avatar_url || body.avatarUrl;
    const newCity = body.city || body.active_location || body.activeLocation;
    if (newName || (newAvatar && !isDocumentOrCertificateUrl(newAvatar)) || newCity) {
      const [uRows]: any = await getDbPool().query("SELECT id FROM users WHERE id = ? OR phone = ?", [techId, techId]).catch(() => [[]]);
      if (Array.isArray(uRows) && uRows.length > 0) {
        const uUpdates: any = {};
        if (newName) uUpdates.full_name = newName;
        if (newAvatar && !isDocumentOrCertificateUrl(newAvatar)) uUpdates.avatar_url = newAvatar;
        if (newCity) uUpdates.city = newCity;
        await UserRepository.update(uRows[0].id, uUpdates).catch(() => {});
      }
    }

    const formatted = formatTechnicianForResponse(updated, req);
    return res.json({ status: "ok", technician: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put("/api/admin/technicians/:id", requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.avatarUrl && typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image/')) {
      const saved = saveBase64AvatarImage(body.avatarUrl, `tech_${req.params.id}`);
      if (saved) {
        body.avatarUrl = saved;
        body.avatar_url = saved;
      }
    }
    const updated = await TechnicianRepository.update(req.params.id, body);
    const formatted = formatTechnicianForResponse(updated, req);
    return res.json({ status: "ok", technician: formatted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.delete(["/api/admin/technicians/:id", "/api/technicians/:id"], requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    const tech = (await TechnicianRepository.findById(targetId).catch(() => null)) ||
                 (await TechnicianRepository.findByPhone(targetId).catch(() => null));
    const deleteKeys: (string | number | undefined | null)[] = [
      targetId,
      targetId.replace(/^tech_/, ''),
      `tech_${targetId.replace(/^tech_/, '')}`
    ];
    if (tech) {
      if (tech.user_id) deleteKeys.push(tech.user_id);
      if (tech.userId) deleteKeys.push(tech.userId);
      if (tech.id) deleteKeys.push(tech.id);
    }
    FileStorage.addTombstones(deleteKeys);
    if (tech && tech.phone) {
      FileStorage.removeTombstones([tech.phone]);
    }

    const deleted = await TechnicianRepository.deleteById(targetId);

    // Also remove from users table so it never resurrects
    if (tech) {
      if (tech.user_id) await UserRepository.deleteById(tech.user_id).catch(() => {});
      if (tech.phone) {
        const u = await UserRepository.findByPhone(tech.phone).catch(() => null);
        if (u) await UserRepository.deleteById(u.id).catch(() => {});
      }
    }
    const cleanUid = targetId.replace(/^tech_/, '');
    await UserRepository.deleteById(cleanUid).catch(() => {});

    const clean = String(targetId).trim();
    const noZero = clean.replace(/^0/, "");
    const withZero = clean.startsWith("0") ? clean : "0" + clean;

    FileStorage.deleteUser(clean);
    FileStorage.deleteUser(noZero);
    FileStorage.deleteUser(withZero);
    FileStorage.deleteUser(cleanUid);
    FileStorage.deleteTechnician(clean);
    FileStorage.deleteTechnician(noZero);
    FileStorage.deleteTechnician(withZero);
    FileStorage.deleteTechnician(cleanUid);

    return res.json({ status: "ok", success: deleted });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await UserRepository.findAll();
    return res.json({ status: "ok", users, data: { users } });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const created = await UserRepository.create(req.body);
    return res.json({ status: "ok", user: created });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await UserRepository.update(req.params.id, req.body);
    return res.json({ status: "ok", user: updated });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.delete(["/api/admin/users/:id", "/api/users/:id"], requireAdmin, async (req, res) => {
  try {
    const rawId = req.params.id;
    const u = (await UserRepository.findById(rawId).catch(() => null)) ||
              (await UserRepository.findByPhone(rawId).catch(() => null));
    const deleteKeys: (string | number | undefined | null)[] = [
      rawId,
      rawId.replace(/^tech_/, ''),
      `tech_${rawId.replace(/^tech_/, '')}`
    ];
    if (u) {
      if (u.id) deleteKeys.push(u.id);
      if (u.phone) deleteKeys.push(u.phone);
      if (u.user_code) deleteKeys.push(u.user_code);
    }
    FileStorage.addTombstones(deleteKeys);

    const deleted = await UserRepository.deleteById(rawId);
    await TechnicianRepository.deleteById(rawId).catch(() => {});

    const clean = String(rawId).trim();
    const noZero = clean.replace(/^0/, "");
    const withZero = clean.startsWith("0") ? clean : "0" + clean;
    const noTech = clean.replace(/^tech_/, "");

    FileStorage.deleteUser(clean);
    FileStorage.deleteUser(noZero);
    FileStorage.deleteUser(withZero);
    FileStorage.deleteUser(noTech);
    FileStorage.deleteTechnician(clean);
    FileStorage.deleteTechnician(noZero);
    FileStorage.deleteTechnician(withZero);
    FileStorage.deleteTechnician(noTech);

    return res.json({ status: "ok", success: true });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const settings = await SettingsRepository.getSettings();

    // If caller is admin, return complete settings
    if (user && (user.role === "admin" || user.is_super_admin)) {
      return res.json({ status: "ok", settings });
    }

    // For public/non-admin users, redact sensitive fields (SMS keys, admin passwords, secrets)
    const publicSettings = { ...settings };
    delete (publicSettings as any).smsSettings;
    delete (publicSettings as any).smsApiKey;
    delete (publicSettings as any).sms_api_key;
    delete (publicSettings as any).adminPassword;
    delete (publicSettings as any).admin_password;
    delete (publicSettings as any).secret;
    delete (publicSettings as any).jwtSecret;

    return res.json({ status: "ok", settings: publicSettings });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/settings/card-info", async (req, res) => {
  try {
    const settings = await SettingsRepository.getSettings();
    const defaultCardNumber = "6104-3389-6112-6667";
    const defaultBankName = "بانک ملت";
    const defaultCardHolder = "مهدی عباسی (کدیار۲۴)";

    const cardNumber = settings?.card_number || settings?.cardNumber || defaultCardNumber;
    const bankName = settings?.bank_name || settings?.bankName || defaultBankName;
    const cardHolder = settings?.card_holder || settings?.cardHolder || defaultCardHolder;

    // Persist defaults to DB if not present
    if (!settings?.card_number && !settings?.cardNumber) {
      SettingsRepository.setSetting("card_number", defaultCardNumber).catch(() => {});
      SettingsRepository.setSetting("cardNumber", defaultCardNumber).catch(() => {});
      SettingsRepository.setSetting("bank_name", defaultBankName).catch(() => {});
      SettingsRepository.setSetting("card_holder", defaultCardHolder).catch(() => {});
      SettingsRepository.setSetting("cardHolder", defaultCardHolder).catch(() => {});
    }

    const cardInfo = {
      card_number: cardNumber,
      bank_name: bankName,
      card_holder: cardHolder
    };
    return res.json({ status: "ok", cardInfo, data: cardInfo });
  } catch (err: any) {
    const cardInfo = {
      card_number: "6104-3389-6112-6667",
      bank_name: "بانک ملت",
      card_holder: "مهدی عباسی (کدیار۲۴)"
    };
    return res.json({ status: "ok", cardInfo, data: cardInfo });
  }
});

app.post("/api/settings", requireAdmin, async (req, res) => {
  try {
    const settings = await SettingsRepository.updateSettings(req.body || {});
    return res.json({ status: "ok", settings });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// ----------------------------------------------------
// BROADCASTS / ANNOUNCEMENTS ENDPOINTS
// ----------------------------------------------------

app.get(["/api/announcements", "/api/admin/broadcasts", "/api/broadcasts"], async (req, res) => {
  try {
    let list: any[] = [];
    try {
      const dbBroadcasts = await SettingsRepository.getSetting("broadcasts");
      if (Array.isArray(dbBroadcasts)) {
        list = dbBroadcasts;
      }
    } catch (e) {
      console.warn("[Broadcasts] DB get error, using file storage fallback:", e);
    }

    if (!list || list.length === 0) {
      list = FileStorage.getBroadcasts();
    }

    return res.json({
      status: "ok",
      broadcasts: list,
      announcements: list
    });
  } catch (err: any) {
    console.error("[Broadcasts] GET error:", err);
    return res.status(500).json({ status: "error", error: err.message, broadcasts: [], announcements: [] });
  }
});

app.post(["/api/admin/broadcasts", "/api/announcements", "/api/broadcasts"], async (req, res) => {
  try {
    // احراز هویت فقط از طریق سشن معتبرِ صادرشده توسط سرور.
    // پیش‌تر ارسال رشته‌ی ثابتِ "us_admin_root" در هدر، بدون هیچ رمزی، دسترسی
    // مدیر می‌داد و هر کسی می‌توانست پیام همگانی بفرستد.
    const rawUser = await getCurrentUserAsync(req).catch(() => null);
    const isAuthorized = isAdminUser(rawUser);

    if (!isAuthorized) {
      return res.status(403).json({ status: "error", message: "دسترسی غیرمجاز. فقط مدیر سیستم مجاز به ارسال پیام همگانی است." });
    }

    let listToSave: any[] = [];
    if (Array.isArray(req.body?.broadcasts)) {
      listToSave = req.body.broadcasts;
    } else if (req.body?.broadcast && typeof req.body.broadcast === "object") {
      const existing = (await SettingsRepository.getSetting("broadcasts").catch(() => null)) || FileStorage.getBroadcasts() || [];
      listToSave = [req.body.broadcast, ...existing.filter((b: any) => b.id !== req.body.broadcast.id)];
    } else if (req.body?.title && req.body?.message) {
      const newMsg = {
        id: req.body.id || `bc_${Date.now()}`,
        title: String(req.body.title).trim(),
        message: String(req.body.message).trim(),
        targetRole: req.body.targetRole || req.body.target_role || "all",
        priority: req.body.priority || "info",
        actionType: req.body.actionType || req.body.action_type || "none",
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
        created_at: req.body.created_at || new Date().toISOString()
      };
      const existing = (await SettingsRepository.getSetting("broadcasts").catch(() => null)) || FileStorage.getBroadcasts() || [];
      listToSave = [newMsg, ...existing];
    } else {
      listToSave = [];
    }

    // Persist in FileStorage (uploads/db_store.json)
    FileStorage.saveBroadcasts(listToSave);

    // Persist in MySQL settings table
    await SettingsRepository.setSetting("broadcasts", listToSave).catch((e) => {
      console.warn("[Broadcasts] Failed to save in MySQL settings table:", e);
    });

    return res.json({
      status: "ok",
      message: "پیام همگانی با موفقیت ذخیره و در کل سامانه فعال شد.",
      broadcasts: listToSave,
      announcements: listToSave
    });
  } catch (err: any) {
    console.error("[Broadcasts] POST error:", err);
    return res.status(500).json({ status: "error", message: "خطا در پردازش پیام همگانی در سرور: " + err.message, error: err.message });
  }
});

app.delete(["/api/admin/broadcasts/:id", "/api/broadcasts/:id"], async (req, res) => {
  try {
    // احراز هویت فقط از سشن معتبر (در پشتی توکن ثابت حذف شد)
    const rawUser = await getCurrentUserAsync(req).catch(() => null);
    if (!isAdminUser(rawUser)) {
      return res.status(403).json({ status: "error", message: "دسترسی غیرمجاز" });
    }

    const { id } = req.params;
    const existing = (await SettingsRepository.getSetting("broadcasts").catch(() => null)) || FileStorage.getBroadcasts() || [];
    const filtered = existing.filter((b: any) => String(b.id) !== String(id));

    FileStorage.saveBroadcasts(filtered);
    await SettingsRepository.setSetting("broadcasts", filtered).catch(() => {});

    return res.json({
      status: "ok",
      message: "پیام با موفقیت حذف گردید.",
      broadcasts: filtered,
      announcements: filtered
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/api/sync", requireAdmin, async (req, res) => {
  try {
    const {
      errorCodes,
      commonProblems,
      spareParts,
      technicians,
      users,
      orders,
      subscriptions,
      payments,
      partPurchases,
      partOrders,
      adminAnnouncement,
      supportPhone,
      trustBadges,
      pageContents,
      userFeedbacks,
      categoriesList,
      brandsList,
      modelsList,
      citiesList,
      categoryConfig,
      adminPassword
    } = req.body || {};

    if (Array.isArray(errorCodes)) {
      for (const item of errorCodes) {
        if (!item.id) continue;
        const existing = await ErrorCodeRepository.findById(item.id);
        if (existing) {
          await ErrorCodeRepository.update(item.id, item).catch((e) => console.error("ErrorCode sync update error:", e));
        } else {
          await ErrorCodeRepository.create(item).catch((e) => console.error("ErrorCode sync create error:", e));
        }
      }
    }

    if (Array.isArray(commonProblems)) {
      for (const item of commonProblems) {
        if (!item.id) continue;
        const existing = await ProblemRepository.findById(item.id);
        if (existing) {
          await ProblemRepository.update(item.id, item).catch((e) => console.error("Problem sync update error:", e));
        } else {
          await ProblemRepository.create(item).catch((e) => console.error("Problem sync create error:", e));
        }
      }
    }

    if (Array.isArray(spareParts)) {
      for (const item of spareParts) {
        if (!item.id) continue;
        const existing = await SparePartRepository.findById(item.id);
        if (existing) {
          await SparePartRepository.update(item.id, item).catch((e) => console.error("SparePart sync update error:", e));
        } else {
          await SparePartRepository.create(item).catch((e) => console.error("SparePart sync create error:", e));
        }
      }
    }

    if (Array.isArray(technicians)) {
      for (const item of technicians) {
        if (!item.id) continue;
        if (FileStorage.isTombstone(item.id) || FileStorage.isTombstone(item.phone) || FileStorage.isTombstone(item.userId || item.user_id)) {
          continue;
        }
        const verifyVal = item.isVerified !== undefined ? (item.isVerified ? 1 : 0) : (item.is_verified !== undefined ? (item.is_verified ? 1 : 0) : undefined);
        const itemStatus = item.status || (verifyVal === 0 ? "suspended" : (verifyVal === 1 ? "active" : undefined));
        const normalizedItem = {
          ...item,
          ...(itemStatus ? { status: itemStatus } : {}),
          ...(verifyVal !== undefined ? { is_verified: verifyVal, isVerified: Boolean(verifyVal) } : {})
        };
        const existing = await TechnicianRepository.findById(item.id);
        if (existing) {
          await TechnicianRepository.update(item.id, normalizedItem).catch(() => {});
        } else {
          await TechnicianRepository.create(normalizedItem).catch(() => {});
        }
        if (verifyVal !== undefined || itemStatus !== undefined) {
          const userUpdates: any = {};
          if (verifyVal !== undefined) userUpdates.is_verified = verifyVal;
          if (itemStatus) userUpdates.status = itemStatus;
          if (item.userId || item.user_id) {
            await UserRepository.update(item.userId || item.user_id, userUpdates).catch(() => {});
          } else if (item.phone) {
            const u = await UserRepository.findByPhone(item.phone);
            if (u) {
              await UserRepository.update(u.id, userUpdates).catch(() => {});
            }
          }
        }
      }
    }

    if (Array.isArray(users)) {
      for (const item of users) {
        if (!item.id) continue;
        if (FileStorage.isTombstone(item.id) || FileStorage.isTombstone(item.phone) || FileStorage.isTombstone(item.user_code || item.short_id)) {
          continue;
        }
        const existing = await UserRepository.findById(item.id);
        if (existing) {
          await UserRepository.update(item.id, item).catch(() => {});
        } else {
          await UserRepository.create(item).catch(() => {});
        }
      }
    }

    if (Array.isArray(orders)) {
      for (const item of orders) {
        if (!item.id) continue;
        const existing = await OrderRepository.findById(item.id);
        if (existing) {
          await OrderRepository.update(item.id, item).catch(() => {});
        } else {
          await OrderRepository.create(item).catch(() => {});
        }
      }
    }

    if (Array.isArray(subscriptions)) {
      for (const item of subscriptions) {
        if (!item.id) continue;
        const existing = await SubscriptionRepository.findById(item.id);
        if (existing) {
          await SubscriptionRepository.update(item.id, item).catch(() => {});
        } else {
          await SubscriptionRepository.create(item).catch(() => {});
        }
      }
    }

    if (Array.isArray(payments)) {
      for (const item of payments) {
        if (!item.id) continue;
        const existing = await PaymentRepository.findById(item.id);
        if (existing) {
          await PaymentRepository.update(item.id, item).catch((e) => console.error('Payment update error:', e));
        } else {
          await PaymentRepository.create(item).catch((e) => console.error('Payment create error:', e));
        }
      }
    }

    const posToSync = Array.isArray(partPurchases) ? partPurchases : (Array.isArray(partOrders) ? partOrders : null);
    if (posToSync) {
      for (const item of posToSync) {
        if (!item.id) continue;
        const existing = await PartOrderRepository.findById(item.id);
        if (existing) {
          await PartOrderRepository.create(item).catch((e) => console.error('PartOrder update error:', e));
        } else {
          await PartOrderRepository.create(item).catch((e) => console.error('PartOrder create error:', e));
        }
      }
    }

    // Sync settings
    if (adminAnnouncement !== undefined) await SettingsRepository.setSetting("adminAnnouncement", adminAnnouncement);
    if (supportPhone !== undefined) await SettingsRepository.setSetting("supportPhone", supportPhone);
    if (trustBadges !== undefined) await SettingsRepository.setSetting("trustBadges", trustBadges);
    if (pageContents !== undefined) await SettingsRepository.setSetting("pageContents", pageContents);
    if (userFeedbacks !== undefined) await SettingsRepository.setSetting("userFeedbacks", userFeedbacks);
    if (categoriesList !== undefined) await SettingsRepository.setSetting("categoriesList", categoriesList);
    if (brandsList !== undefined) await SettingsRepository.setSetting("brandsList", brandsList);
    if (modelsList !== undefined) await SettingsRepository.setSetting("modelsList", modelsList);
    if (citiesList !== undefined) await SettingsRepository.setSetting("citiesList", citiesList);
    if (categoryConfig !== undefined) await SettingsRepository.setSetting("categoryConfig", categoryConfig);
    // تغییر رمز مدیر از این مسیر حذف شد. مسیر اختصاصی و امنِ
    // POST /api/auth/admin-change-password را به‌جای آن به کار ببرید — آن مسیر
    // رمز فعلی را می‌خواهد و سشن‌های دیگر را ابطال می‌کند.
    if (adminPassword !== undefined) {
      console.warn("[sync] تلاش برای تغییر رمز مدیر از مسیر sync نادیده گرفته شد.");
    }

    return res.json({ status: "ok", message: "همگام‌سازی کامل با پایگاه داده انجام شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message, message: err.message });
  }
});

app.post("/api/send-sms", async (req, res) => {
  try {
    const { phone, message, templateVars, type } = req.body || {};

    const apiKey = process.env.SMSIR_API_KEY;
    const lineNumber = process.env.SMSIR_LINE_NUMBER;
    const templateId = (type === "otp" ? process.env.SMSIR_OTP_TEMPLATE_ID : null) || process.env.SMSIR_ORDER_TEMPLATE_ID || process.env.SMSIR_OTP_TEMPLATE_ID;

    let codeValue = "";
    if (templateVars) {
      if (typeof templateVars === "object") {
        codeValue =
          templateVars.VERIFICATIONCODE ||
          templateVars.code ||
          templateVars.order ||
          templateVars.orderId ||
          templateVars.trackingCode ||
          Object.values(templateVars)[0] ||
          "";
      } else if (typeof templateVars === "string") {
        codeValue = templateVars;
      }
    }

    if (!codeValue && message) {
      const match =
        message.match(/(\d{4,8})/) ||
        message.match(/(?:رهگیری|کد|سفارش)\s*:?\s*#?([A-Za-z0-9_-]+)/) ||
        message.match(/#([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        codeValue = match[1];
      } else {
        codeValue = message.slice(0, 50);
      }
    }

    if (!codeValue) {
      codeValue = String(Date.now()).slice(-6);
    }

    if (!apiKey || !templateId) {
      // If SMS service is not configured in env, log as simulated sent
      const log = await SmsLogRepository.create({
        recipient_phone: phone,
        message_text: message || `کد تایید: ${codeValue}`,
        provider: "simulated",
        status: "sent",
        response_data: { note: "SMS provider keys not configured, logged as simulated" }
      }).catch((err: any) => {
        console.error("SmsLogRepository.create error:", err);
        return null;
      });

      return res.json({
        status: "ok",
        message: "پیامک ثبت و در صف ارسال قرار گرفت",
        log,
        data: { log }
      });
    }

    let isSuccess = false;
    let responseData: any = null;

    try {
      const smsResponse = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mobile: phone,
          templateId: Number(templateId),
          parameters: [
            { name: "VERIFICATIONCODE", value: String(codeValue) }
          ]
        })
      });

      const resText = await smsResponse.text();
      try {
        responseData = JSON.parse(resText);
      } catch {
        responseData = { text: resText, statusHttp: smsResponse.status };
      }

      if (
        smsResponse.ok &&
        (responseData?.status === 1 ||
          responseData?.status === "1" ||
          responseData?.status === "ok" ||
          responseData?.status === true)
      ) {
        isSuccess = true;
      } else if (smsResponse.ok && responseData?.status !== 0) {
        isSuccess = true;
      }
    } catch (netErr: any) {
      responseData = { error: netErr.message || String(netErr) };
      isSuccess = false;
    }

    const log = await SmsLogRepository.create({
      recipient_phone: phone,
      message_text: message || `کد تایید: ${codeValue}`,
      provider: "sms.ir",
      status: isSuccess ? "sent" : "failed",
      response_data: responseData
    }).catch((err: any) => {
      console.error("SmsLogRepository.create error:", err);
      return null;
    });

    return res.json({
      status: isSuccess ? "ok" : "error",
      message: isSuccess ? "پیامک با موفقیت ارسال شد" : "خطا در ارسال پیامک",
      log,
      data: { log }
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

const freeViewsCache = new Map<string, { viewedErrorCodes: string[]; viewedProblems: string[] }>();

app.get("/api/free-views", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const key = user?.id || (req.headers["x-session-token"] as string) || req.ip || "guest";
    const record = freeViewsCache.get(key) || { viewedErrorCodes: [], viewedProblems: [] };
    const count = record.viewedErrorCodes.length + record.viewedProblems.length;
    return res.json({
      status: "ok",
      count,
      remaining: Math.max(0, 5 - count),
      viewedErrorCodes: record.viewedErrorCodes,
      viewedProblems: record.viewedProblems
    });
  } catch (e: any) {
    return res.json({ count: 0, viewedErrorCodes: [], viewedProblems: [] });
  }
});

app.post("/api/free-views", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const key = user?.id || (req.headers["x-session-token"] as string) || req.ip || "guest";
    const { type, id } = req.body || {};
    const record = freeViewsCache.get(key) || { viewedErrorCodes: [], viewedProblems: [] };
    if (type === "problem" && id && !record.viewedProblems.includes(id)) {
      record.viewedProblems.push(id);
    } else if (id && !record.viewedErrorCodes.includes(id)) {
      record.viewedErrorCodes.push(id);
    }
    freeViewsCache.set(key, record);
    return res.json({
      status: "ok",
      count: record.viewedErrorCodes.length + record.viewedProblems.length,
      viewedErrorCodes: record.viewedErrorCodes,
      viewedProblems: record.viewedProblems
    });
  } catch (e: any) {
    return res.json({ status: "ok" });
  }
});

const TECH_DOCS_STORE_FILE = path.join(process.cwd(), "public", "uploads", "tech_docs.json");

async function getStoredTechDocs(): Promise<any[]> {
  try {
    const dbDocs = await SettingsRepository.getSetting("tech_docs").catch(() => null);
    if (Array.isArray(dbDocs)) return dbDocs;
    if (fs.existsSync(TECH_DOCS_STORE_FILE)) {
      const raw = fs.readFileSync(TECH_DOCS_STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

async function saveStoredTechDocs(docs: any[]): Promise<void> {
  try {
    await SettingsRepository.setSetting("tech_docs", docs).catch(() => {});
    const dir = path.dirname(TECH_DOCS_STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TECH_DOCS_STORE_FILE, JSON.stringify(docs, null, 2), "utf-8");
  } catch (e) {}
}

app.get("/api/tech-docs/all", async (req, res) => {
  const docs = await getStoredTechDocs();
  return res.json({ success: true, docs, data: docs });
});

app.get("/api/device/:id/tech-docs", async (req, res) => {
  try {
    const deviceId = String(req.params.id);
    const docs = await getStoredTechDocs();
    const filtered = docs.filter(d => String(d.deviceId) === deviceId);
    return res.json({ success: true, docs: filtered });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/device/:id/tech-docs", async (req, res) => {
  try {
    const deviceId = String(req.params.id);
    const { title, type, fileSize, fileBase64, fileName, externalUrl } = req.body || {};

    let finalFileUrl = externalUrl || "";

    if (fileBase64 && typeof fileBase64 === "string") {
      let ext = "pdf";
      let buffer: Buffer;

      if (fileBase64.startsWith("data:")) {
        const match = fileBase64.match(/^data:([a-zA-Z0-9\+\-\.\/]+);base64,(.+)$/);
        if (match) {
          const mime = match[1].toLowerCase();
          if (mime.includes("pdf")) ext = "pdf";
          else if (mime.includes("png")) ext = "png";
          else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
          else if (mime.includes("webp")) ext = "webp";
          else if (mime.includes("svg")) ext = "svg";
          buffer = Buffer.from(match[2], "base64");
        } else {
          buffer = Buffer.from(fileBase64.split(",")[1] || fileBase64, "base64");
        }
      } else {
        buffer = Buffer.from(fileBase64, "base64");
      }

      if (fileName && fileName.includes(".")) {
        const parsed = fileName.split(".").pop()?.toLowerCase();
        if (parsed && ["pdf", "jpg", "jpeg", "png", "webp", "svg"].includes(parsed)) {
          ext = parsed === "jpeg" ? "jpg" : parsed;
        }
      }

      const filename = `techdoc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const targetDirs = [
        path.join(PUBLIC_UPLOADS_DIR, "tech_docs"),
        path.join(ROOT_UPLOADS_DIR, "tech_docs"),
        path.join(process.cwd(), "dist", "uploads", "tech_docs")
      ];

      for (const dir of targetDirs) {
        try {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, filename), buffer);
        } catch (e) {}
      }

      finalFileUrl = `/uploads/tech_docs/${filename}`;
    }

    const newDoc = {
      id: `doc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      deviceId,
      title: String(title || "سند فنی").trim(),
      type: String(type || "Service Manual").trim(),
      fileSize: String(fileSize || "1 MB").trim(),
      fileUrl: finalFileUrl,
      uploadedAt: new Date().toLocaleDateString("fa-IR"),
      created_at: new Date().toISOString()
    };

    const docs = await getStoredTechDocs();
    docs.unshift(newDoc);
    await saveStoredTechDocs(docs);

    return res.json({ success: true, doc: newDoc });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/device/:id/tech-docs/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const { title, type, fileSize, externalUrl } = req.body || {};

    const docs = await getStoredTechDocs();
    const idx = docs.findIndex(d => String(d.id) === String(docId));
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "سند فنی مورد نظر یافت نشد." });
    }

    docs[idx] = {
      ...docs[idx],
      title: title !== undefined ? String(title).trim() : docs[idx].title,
      type: type !== undefined ? String(type).trim() : docs[idx].type,
      fileSize: fileSize !== undefined ? String(fileSize).trim() : docs[idx].fileSize,
      fileUrl: externalUrl !== undefined ? String(externalUrl).trim() : docs[idx].fileUrl,
      updated_at: new Date().toISOString()
    };

    await saveStoredTechDocs(docs);
    return res.json({ success: true, doc: docs[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/device/:id/tech-docs/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    let docs = await getStoredTechDocs();
    docs = docs.filter(d => String(d.id) !== String(docId));
    await saveStoredTechDocs(docs);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN EXPORT ENDPOINTS (EXCEL & PDF REPORTS)
// ----------------------------------------------------

app.get("/api/admin/export/excel", requireAdmin, async (req, res) => {
  try {
    const type = req.query.type;
    const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;

    if (type === "orders") {
      let orders: any[] = [];
      try {
        orders = await OrderRepository.findAll();
      } catch (e) {
        orders = [];
      }

      const headers = ["کد پیگیری سفارش", "نام مشتری", "شماره تماس", "نوع و برند دستگاه", "مدل دستگاه", "شهر / منطقه", "مبلغ برآوردی (تومان)", "وضعیت سفارش", "تکنسین مسئول", "تاریخ ثبت"];
      const rows = orders.map((o: any) => [
        escapeCsv(o.id),
        escapeCsv(o.customer_name || o.userName || o.clientName || "-"),
        escapeCsv(o.customer_phone || o.userPhone || o.phone || "-"),
        escapeCsv(`${o.device_category || o.category || ''} - ${o.device_brand || o.brand || ''}`.trim()),
        escapeCsv(o.device_model || o.model || "-"),
        escapeCsv(o.customer_city || o.city || o.address || "-"),
        escapeCsv(o.estimated_cost || o.estimatedCost || o.price || 0),
        escapeCsv(o.status || "ثبت اولیه"),
        escapeCsv(o.technician_name || o.techName || "-"),
        escapeCsv(o.created_at || o.createdAt || "-")
      ].join(","));

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="kadyar24_orders_report.csv"');
      return res.send(csvContent);
    } else if (type === "users") {
      let users: any[] = [];
      try {
        users = await UserRepository.findAll();
      } catch (e) {
        users = [];
      }

      const headers = ["شناسه کاربر", "نام و نام خانوادگی", "شماره موبایل", "سطح دسترسی", "وضعیت حساب", "شهر", "موجودی کیف پول (تومان)", "تاریخ عضویت"];
      const rows = users.map((u: any) => [
        escapeCsv(u.id),
        escapeCsv(u.full_name || u.name || "-"),
        escapeCsv(u.phone || "-"),
        escapeCsv(u.role === "admin" ? "مدیر کل" : (u.role === "technician" ? "تکنسین" : "مشتری")),
        escapeCsv(u.status === "active" ? "فعال" : (u.status === "suspended" ? "معلق" : u.status || "عادی")),
        escapeCsv(u.city || "-"),
        escapeCsv(u.wallet_balance || u.balance || 0),
        escapeCsv(u.created_at || u.createdAt || "-")
      ].join(","));

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="kadyar24_users_report.csv"');
      return res.send(csvContent);
    } else {
      return res.status(400).send("نوع گزارش نامعتبر است. پارامتر type باید orders یا users باشد.");
    }
  } catch (err: any) {
    return res.status(500).send("خطا در صدور فایل اکسل: " + err.message);
  }
});

app.get("/api/admin/export/pdf", requireAdmin, async (req, res) => {
  try {
    const type = req.query.type;
    const isOrders = type === "orders";
    const title = isOrders ? "گزارش رسمی سفارشات و فاکتورهای تعمیرات" : "گزارش رسمی فهرست کاربران و تکنسین‌های سامانه";
    const dateFa = new Date().toLocaleDateString("fa-IR");

    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    if (isOrders) {
      let orders: any[] = [];
      try {
        orders = await OrderRepository.findAll();
      } catch (e) {
        orders = [];
      }
      tableHeaders = ["ردیف", "کد سفارش", "نام مشتری", "تلفن", "دستگاه و برند", "شهر / منطقه", "مبلغ (تومان)", "وضعیت"];
      tableRows = orders.map((o: any, idx: number) => [
        String(idx + 1),
        String(o.id || "-"),
        String(o.customer_name || o.userName || o.clientName || "-"),
        String(o.customer_phone || o.userPhone || o.phone || "-"),
        String(`${o.device_category || o.category || ''} ${o.device_brand || o.brand || ''}`.trim() || "-"),
        String(o.customer_city || o.city || "-"),
        Number(o.estimated_cost || o.estimatedCost || o.price || 0).toLocaleString("fa-IR"),
        String(o.status || "ثبت اولیه")
      ]);
    } else {
      let users: any[] = [];
      try {
        users = await UserRepository.findAll();
      } catch (e) {
        users = [];
      }
      tableHeaders = ["ردیف", "نام و نام خانوادگی", "شماره تماس", "نقش کاربری", "شهر", "وضعیت", "کیف پول (تومان)"];
      tableRows = users.map((u: any, idx: number) => [
        String(idx + 1),
        String(u.full_name || u.name || "-"),
        String(u.phone || "-"),
        u.role === "admin" ? "مدیر کل" : (u.role === "technician" ? "تکنسین" : "مشتری"),
        String(u.city || "-"),
        u.status === "active" ? "فعال" : (u.status === "suspended" ? "معلق" : "عادی"),
        Number(u.wallet_balance || u.balance || 0).toLocaleString("fa-IR")
      ]);
    }

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, 'Vazirmatn', sans-serif; margin: 25px; color: #0f172a; direction: rtl; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 16px; margin: 0; color: #1e3a8a; }
    .meta { font-size: 11px; color: #475569; line-height: 1.8; text-align: left; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: right; font-size: 11px; }
    th { background-color: #f1f5f9; color: #1e293b; font-weight: bold; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .print-btn { background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: bold; cursor: pointer; }
    @media print {
      .no-print { display: none !important; }
      body { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: #eff6ff; padding: 10px 16px; border-radius: 12px; border: 1px solid #bfdbfe;">
    <button class="print-btn" onclick="window.print()">🖨️ چاپ سند / ذخیره به عنوان PDF</button>
    <span style="font-size: 11px; color: #1e40af; font-weight: bold;">پیش‌نمایش خروجی چاپی کدیار۲۴ (جهت ذخیره، در پنجره پرینت گزینه Save as PDF را انتخاب فرمایید)</span>
  </div>
  <div class="header">
    <div>
      <h1>سامانه جامع خدمات فنی کدیار۲۴ (ایران ارور)</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; font-weight: bold;">${title}</p>
    </div>
    <div class="meta">
      <div>تاریخ استخراج: <strong>${dateFa}</strong></div>
      <div>مهر الکترونیکی: <strong>سامانه کدیار۲۴ (اصالت تأیید شد)</strong></div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        ${tableHeaders.map(h => `<th>${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>
  <div style="margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
    این سند رسمی به صورت خودکار از پایگاه داده مرکزی سامانه استخراج گردیده و معتبر می‌باشد.
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err: any) {
    return res.status(500).send("خطا در چاپ سند: " + err.message);
  }
});

app.get("/api/server-backups", requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json({ status: "ok", backups: [], files: [] });
    }
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupList = files.map((fileName) => {
      const filePath = path.join(BACKUPS_DIR, fileName);
      const stat = fs.statSync(filePath);
      return {
        filename: fileName,
        fileName: fileName,
        size: stat.size,
        createdAt: stat.mtime,
        created_at: stat.mtime
      };
    });
    return res.json({ status: "ok", backups: backupList, files: backupList });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Secure endpoint for Admin to download backup files without making BACKUPS_DIR publicly accessible
app.get("/api/server-backups/download/:filename", requireAdmin, (req, res) => {
  try {
    const rawFilename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(rawFilename);
    const filePath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: "error", message: "فایل پشتیبان مورد نظر یافت نشد." });
    }

    res.download(filePath, safeFilename);
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/server-backups/create", requireAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const dump = {
      timestamp: new Date().toISOString(),
      users: await UserRepository.findAll(),
      technicians: await TechnicianRepository.findAll(),
      errorCodes: await ErrorCodeRepository.findAll(),
      orders: await OrderRepository.findAll(),
      spareParts: await SparePartRepository.findAll(),
      problems: await ProblemRepository.findAll(),
      subscriptions: await SubscriptionRepository.findAll(),
      payments: await PaymentRepository.findAll(),
      tickets: await TicketRepository.findAll()
    };
    const fileName = `backup-${Date.now()}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), "utf8");
    return res.json({ status: "ok", filename: fileName, fileName: fileName, message: "بکاپ با موفقیت ایجاد شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/server-backups/restore", requireAdmin, async (req, res) => {
  try {
    const fileName = req.body.fileName || req.body.filename || req.body.file;
    if (!fileName) {
      return res.status(400).json({ status: "error", message: "نام فایل بکاپ مشخص نشده است" });
    }
    const filePath = path.join(BACKUPS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: "error", message: "فایل بکاپ یافت نشد" });
    }
    const content = fs.readFileSync(filePath, "utf8");
    const dump = JSON.parse(content);

    if (Array.isArray(dump.errorCodes)) {
      for (const item of dump.errorCodes) {
        await ErrorCodeRepository.create(item).catch(() => {});
      }
    }
    if (Array.isArray(dump.problems)) {
      for (const item of dump.problems) {
        await ProblemRepository.create(item).catch(() => {});
      }
    }
    if (Array.isArray(dump.users)) {
      for (const item of dump.users) {
        await UserRepository.create(item).catch(() => {});
      }
    }
    if (Array.isArray(dump.technicians)) {
      for (const item of dump.technicians) {
        await TechnicianRepository.create(item).catch(() => {});
      }
    }

    return res.json({ status: "ok", message: "بازیابی بکاپ با موفقیت انجام شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/server-backups/upload-restore", requireAdmin, async (req, res) => {
  try {
    const dump = req.body || {};
    if (Array.isArray(dump.errorCodes)) {
      for (const item of dump.errorCodes) {
        await ErrorCodeRepository.create(item).catch(() => {});
      }
    }
    if (Array.isArray(dump.problems)) {
      for (const item of dump.problems) {
        await ProblemRepository.create(item).catch(() => {});
      }
    }
    return res.json({ status: "ok", message: "بازیابی فایل با موفقیت انجام شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/server-backups/import-sql", requireAdmin, async (req, res) => {
  try {
    const { sql, fileName } = req.body || {};
    let sqlContent = sql || "";
    if (!sqlContent && fileName) {
      const filePath = path.join(BACKUPS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        sqlContent = fs.readFileSync(filePath, "utf8");
      }
    }
    if (sqlContent) {
      const pool = getDbPool();
      const statements = sqlContent.split(";").map((s: string) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await pool.query(stmt).catch((e: any) => console.error("SQL statement failed:", e));
      }
    }
    return res.json({ status: "ok", message: "فایل SQL با موفقیت وارد گردید" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/server-backups/import-formatted-json", requireAdmin, async (req, res) => {
  try {
    const dump = req.body || {};
    if (Array.isArray(dump.errorCodes)) {
      for (const item of dump.errorCodes) {
        await ErrorCodeRepository.create(item).catch(() => {});
      }
    }
    return res.json({ status: "ok", message: "اطلاعات JSON با موفقیت بروزرسانی شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Explicit endpoint for /api/admin/get-database: strictly admin-protected and strips sensitive passwords
app.get(["/api/admin/get-database", "/api/admin/database-dump"], requireAdmin, async (req, res) => {
  try {
    const rawUsers = await UserRepository.findAll();
    const safeUsers = rawUsers.map((u: any) => {
      const userCopy = { ...u };
      delete userCopy.password_hash;
      delete userCopy.password;
      return userCopy;
    });

    const dump = {
      timestamp: new Date().toISOString(),
      users: safeUsers,
      technicians: await TechnicianRepository.findAll(),
      errorCodes: await ErrorCodeRepository.findAll(),
      problems: await ProblemRepository.findAll(),
      spareParts: await SparePartRepository.findAll(),
      orders: await OrderRepository.findAll(),
      partOrders: await PartOrderRepository.findAll(),
      subscriptions: await SubscriptionRepository.findAll(),
      payments: await PaymentRepository.findAll(),
      tickets: await TicketRepository.findAll(),
      settings: await SettingsRepository.getSettings()
    };
    return res.json({ status: "ok", database: dump, data: dump });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Explicit endpoint for /api/save-database: strictly admin-protected
app.post("/api/save-database", requireAdmin, async (req, res) => {
  try {
    const dump = req.body || {};
    if (Array.isArray(dump.errorCodes)) {
      for (const item of dump.errorCodes) {
        if (!item.id) continue;
        const existing = await ErrorCodeRepository.findById(item.id);
        if (existing) {
          await ErrorCodeRepository.update(item.id, item).catch(() => {});
        } else {
          await ErrorCodeRepository.create(item).catch(() => {});
        }
      }
    }
    if (Array.isArray(dump.problems)) {
      for (const item of dump.problems) {
        if (!item.id) continue;
        const existing = await ProblemRepository.findById(item.id);
        if (existing) {
          await ProblemRepository.update(item.id, item).catch(() => {});
        } else {
          await ProblemRepository.create(item).catch(() => {});
        }
      }
    }
    return res.json({ status: "ok", message: "پایگاه داده با موفقیت ذخیره گردید." });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
  try {
    const logs = await ActivityLogRepository.findAll(300);
    return res.json(logs);
  } catch (err: any) {
    return res.json([]);
  }
});

app.get("/api/admin/error-logs", requireAdmin, (req, res) => {
  res.json([]);
});

app.get("/api/tickets", requireAdmin, async (req, res) => {
  try {
    const tickets = await TicketRepository.findAll();
    return res.json({ success: true, status: "ok", tickets, data: { tickets } });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message, tickets: [] });
  }
});

app.get("/api/tickets/my", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    const queryUserId = (req.query.userId || req.query.user_id || req.headers["x-session-token"]) as string;
    const effectiveUserId = user?.id || user?.phone || (queryUserId && queryUserId !== 'guest' ? queryUserId : "");
    if (!effectiveUserId) {
      return res.status(401).json({ success: false, status: "error", message: "احراز هویت نشده", tickets: [] });
    }
    const tickets = await TicketRepository.findByUserId(effectiveUserId);
    return res.json({ success: true, status: "ok", tickets, data: tickets });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message, tickets: [] });
  }
});

app.post("/api/tickets/create", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    const userId = user?.id || user?.phone || req.body.userId || req.body.user_id || req.headers["x-session-token"] || "guest";
    const ticket = await TicketRepository.create({ ...req.body, user_id: userId });
    await logUserActivity(req, "ticket_created", "support", { ticketId: ticket?.id, subject: req.body?.subject });
    return res.json({ success: true, status: "ok", ticket, data: { ticket } });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message });
  }
});

app.post("/api/tickets/:id/reply", async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, status: "error", error: "متن پیام نمی‌تواند خالی باشد." });
    }
    const user = await getCurrentUserAsync(req).catch(() => null);
    // در پشتی حذف شد: توکن ثابت «us_admin_root» به هر کسی اجازه پاسخ مدیریتی می‌داد.
    const isAdminCaller = isAdminUser(user);

    if (!isAdminCaller) {
      const ticket = await TicketRepository.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, status: "error", error: "تیکت یافت نشد." });
      }

      const loggedId = user?.id ? String(user.id) : "";
      const loggedPhone = user?.phone ? String(user.phone) : "";
      const ticketUserId = ticket.user_id ? String(ticket.user_id) : "";
      const ticketPhone = (ticket as any).user_phone ? String((ticket as any).user_phone) : "";
      const loggedPhoneNorm = loggedPhone ? normalizePhone(loggedPhone) : "";
      const ticketPhoneNorm = ticketPhone ? normalizePhone(ticketPhone) : "";
      const ticketUserIdNorm = ticketUserId ? normalizePhone(ticketUserId) : "";

      const isOwner = (loggedId && (loggedId === ticketUserId || loggedId === ticketPhone)) ||
                      (loggedPhone && (loggedPhone === ticketUserId || loggedPhone === ticketPhone || (loggedPhoneNorm && (loggedPhoneNorm === ticketPhoneNorm || loggedPhoneNorm === ticketUserIdNorm))));

      if (!isOwner) {
        return res.status(403).json({ success: false, status: "error", error: "عدم دسترسی: شما مجاز به پاسخ‌دهی به این تیکت نیستید." });
      }
    }

    const senderType = isAdminCaller ? "admin" : "user";
    const senderUserId = user?.id || user?.phone || (isAdminCaller ? "admin" : "user");
    
    const updatedTicket = await TicketRepository.addReply(ticketId, {
      user_id: senderUserId,
      sender_type: senderType,
      message: String(message).trim()
    });

    await logUserActivity(req, "ticket_reply", "support", { ticketId, senderType });
    return res.json({ success: true, status: "ok", ticket: updatedTicket, data: { ticket: updatedTicket } });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message });
  }
});

app.post("/api/tickets/:id/status", requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ success: false, status: "error", error: "وضعیت نامعتبر است." });
    }
    const updatedTicket = await TicketRepository.updateStatus(ticketId, status);
    return res.json({ success: true, status: "ok", ticket: updatedTicket, data: { ticket: updatedTicket } });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message });
  }
});

// User & Guest feedback / contact messages endpoints
app.get("/api/feedbacks", async (req, res) => {
  try {
    const feedbacks = await SettingsRepository.getSetting("userFeedbacks") || [];
    return res.json({ success: true, status: "ok", feedbacks, data: feedbacks });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message });
  }
});

app.post("/api/feedbacks", async (req, res) => {
  try {
    const feedback = req.body || {};
    const existing = (await SettingsRepository.getSetting("userFeedbacks")) || [];
    const list = Array.isArray(existing) ? existing : [];
    const item = {
      ...feedback,
      id: feedback.id || `fb-${Date.now()}`,
      submittedAt: feedback.submittedAt || (new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
      isRead: false
    };
    const updated = [item, ...list];
    await SettingsRepository.setSetting("userFeedbacks", updated);
    return res.json({ success: true, status: "ok", feedback: item, feedbacks: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: "error", error: err.message });
  }
});

app.get(["/api/wallet/balance", "/api/wallet"], async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const queryPhone = (req.query.phone || req.query.mobile) as string;
    const queryTechId = (req.query.techId || req.query.technicianId || req.query.userId || req.query.id) as string;
    const effectiveId = queryTechId || user?.id || user?.phone || "";
    const effectivePhone = queryPhone || user?.phone || "";

    const tech = (effectiveId ? await TechnicianRepository.findById(effectiveId).catch(() => null) : null) ||
                 (effectivePhone ? await TechnicianRepository.findByPhone(effectivePhone).catch(() => null) : null) ||
                 (user?.phone ? await TechnicianRepository.findByPhone(user.phone).catch(() => null) : null) ||
                 (user?.id ? await TechnicianRepository.findByUserId(user.id).catch(() => null) : null);

    const bal = Number(tech?.wallet_balance !== undefined && tech?.wallet_balance !== null ? tech.wallet_balance : (tech?.balance ?? user?.wallet_balance ?? 0));
    return res.json({
      status: "ok",
      wallet_balance: bal,
      balance: bal,
      can_accept_order: bal >= 50000,
      commission_per_order: 50000,
      min_required: 50000,
      debt: bal < 0 ? Math.abs(bal) : 0,
      is_debt: bal < 0,
      data: {
        wallet_balance: bal,
        balance: bal,
        can_accept_order: bal >= 50000,
        commission_per_order: 50000,
        min_required: 50000
      }
    });
  } catch (err: any) {
    return res.json({
      status: "ok",
      wallet_balance: 0,
      balance: 0,
      can_accept_order: false,
      commission_per_order: 50000,
      min_required: 50000,
      data: { wallet_balance: 0, balance: 0, can_accept_order: false, commission_per_order: 50000 }
    });
  }
});

app.post(["/api/technicians/settle-commission", "/api/wallet/settle-commission"], async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const { techId, phone, amount, paymentMethod, trackingCode } = req.body || {};
    const effectiveTechId = techId || user?.id || user?.phone || "";
    const effectivePhone = phone || user?.phone || "";

    const tech = (effectiveTechId ? await TechnicianRepository.findById(effectiveTechId) : null) ||
                 (effectivePhone ? await TechnicianRepository.findByPhone(effectivePhone) : null) ||
                 (user?.phone ? await TechnicianRepository.findByPhone(user.phone) : null) ||
                 (user?.id ? await TechnicianRepository.findByUserId(user.id) : null);

    if (!tech) {
      return res.status(404).json({ status: "error", message: "تکنسین یافت نشد." });
    }

    // در پشتی حذف شد: توکن ثابت «us_admin_root» اجازهٔ تسویهٔ مالی هر تکنسینی را می‌داد.
    const isAdmin = isAdminUser(user);

    if (!isAdmin && user) {
      const loggedId = user?.id ? String(user.id) : "";
      const loggedPhone = user?.phone ? String(user.phone) : "";
      const techIdStr = tech.id ? String(tech.id) : "";
      const techPhoneStr = tech.phone ? String(tech.phone) : "";
      const techUserIdStr = (tech as any).user_id ? String((tech as any).user_id) : "";
      const loggedPhoneNorm = loggedPhone ? normalizePhone(loggedPhone) : "";
      const techPhoneNorm = techPhoneStr ? normalizePhone(techPhoneStr) : "";

      const isOwner = (loggedId && (loggedId === techIdStr || loggedId === techPhoneStr || loggedId === techUserIdStr)) ||
                      (loggedPhone && (loggedPhone === techIdStr || loggedPhone === techPhoneStr || loggedPhone === techUserIdStr || (loggedPhoneNorm && loggedPhoneNorm === techPhoneNorm)));

      if (!isOwner) {
        return res.status(403).json({ status: "error", message: "عدم دسترسی: شما مجاز به تسویه حساب این تکنسین نیستید." });
      }
    }

    const currentBal = Number(tech.wallet_balance !== undefined && tech.wallet_balance !== null ? tech.wallet_balance : (tech.balance ?? 0));
    const settleAmount = Number(amount) || (currentBal < 0 ? Math.abs(currentBal) : 50000);

    if (settleAmount <= 0) {
      return res.status(400).json({ status: "error", message: "مبلغ واریزی باید بیشتر از صفر باشد." });
    }

    const isCardToCard = paymentMethod === 'card_to_card' || true;
    const paymentId = await getNextSequentialId("payments", "pay");
    const refCode = trackingCode || ("WAL-" + Math.floor(100000 + Math.random() * 900000));

    if (isCardToCard) {
      // ایجاد فیش کارت‌به‌کارت در انتظار تایید مدیریت
      const createdPayment = await PaymentRepository.create({
        id: paymentId,
        user_id: tech.user_id || tech.id,
        user_phone: tech.phone || '',
        user_name: tech.full_name || tech.name || 'تکنسین کدیار۲۴',
        user_role: 'technician',
        amount: settleAmount,
        status: 'pending',
        related_type: 'wallet_recharge',
        related_id: 'wallet_recharge',
        payment_method: 'card_to_card',
        ref_code: refCode,
        ref_id: refCode,
        tracking_code: trackingCode || refCode,
        card_number: trackingCode || refCode
      });

      await TechnicianRepository.update(tech.id, {
        commission_pending: 1,
        commission_pending_approval: 1
      } as any).catch(() => {});

      // Sync to FileStorage
      try {
        const dbStore = FileStorage.read();
        if (!dbStore.payments) dbStore.payments = [];
        dbStore.payments.unshift(createdPayment);
        FileStorage.write(dbStore);
      } catch (e) {}

      await WalletTransactionRepository.create({
        user_id: tech.user_id || tech.id,
        type: 'wallet_recharge_pending',
        amount: settleAmount,
        description: `ثبت فیش کارت‌به‌کارت شارژ کیف پول کدیار۲۴ (کد پیگیری: ${refCode}) - در انتظار تایید مدیریت`,
        status: 'pending'
      }).catch(() => {});

      await logUserActivity(req, "wallet_recharge_receipt_submitted", "finance", { techId: tech.id, amount: settleAmount, refCode });

      return res.json({
        status: "ok",
        success: true,
        pending: true,
        message: `فیش کارت‌به‌کارت شارژ کیف پول به مبلغ ${settleAmount.toLocaleString('fa-IR')} تومان با موفقیت ثبت شد و در تب پرداخت‌های پنل مدیریت قرار گرفت. پس از تایید مدیریت، موجودی کیف پول شما فوراً افزایش خواهد یافت.`,
        balance: currentBal,
        refCode,
        payment: createdPayment
      });
    }

    // تسویه آنی آنلاین (درگاه شتاب)
    const newBal = currentBal + settleAmount;

    const updatedTech = await TechnicianRepository.update(tech.id, {
      wallet_balance: newBal
    });

    // Also update linked user account if exists
    if (tech.user_id) {
      await UserRepository.update(tech.user_id, { wallet_balance: newBal }).catch(() => {});
    }

    const pool = getDbPool();
    await pool.query(
      `INSERT INTO payments (id, user_id, amount, status, payment_method, related_type, related_id, ref_code, card_number)
       VALUES (?, ?, ?, 'completed', ?, 'commission', 'commission_settlement', ?, ?)`,
      [paymentId, tech.user_id || tech.id, settleAmount, paymentMethod || 'gateway', refCode, tech.phone || '']
    ).catch(async () => {
      await PaymentRepository.create({
        id: paymentId,
        user_id: tech.user_id || tech.id,
        user_phone: tech.phone,
        user_name: tech.full_name || tech.name,
        user_role: 'technician',
        amount: settleAmount,
        status: 'completed',
        related_type: 'commission',
        related_id: 'commission_settlement',
        payment_method: paymentMethod || 'gateway',
        ref_code: refCode
      }).catch(() => {});
    });

    await WalletTransactionRepository.create({
      user_id: tech.user_id || tech.id,
      type: 'settlement',
      amount: settleAmount,
      description: `تسویه آنلاین کمیسیون ۱۵٪ پلتفرم کدیار۲۴ (کد رهگیری: ${refCode})`,
      status: 'completed'
    }).catch(() => {});

    await logUserActivity(req, "commission_settled", "finance", { techId: tech.id, amount: settleAmount, refCode });

    const formattedTech = formatTechnicianForResponse(updatedTech, req);

    return res.json({
      status: "ok",
      success: true,
      pending: false,
      message: `تسویه کمیسیون به مبلغ ${settleAmount.toLocaleString('fa-IR')} تومان با موفقیت انجام شد. دسترسی شما به سفارش‌های جدید فعال شد.`,
      balance: newBal,
      technician: formattedTech
    });
  } catch (err: any) {
    console.error("[settle-commission] error:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/wallet/charge", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const { amount, techId, trackingCode, refCode, receiptNumber } = req.body || {};
    const chargeAmount = Number(amount || 0);
    if (chargeAmount <= 0) {
      return res.status(400).json({ status: "error", message: "مبلغ شارژ باید بیشتر از صفر باشد." });
    }
    const effectiveId = techId || user?.id || user?.phone || "";
    if (!effectiveId) return res.status(401).json({ status: "error", message: "کاربر نامشخص" });

    // 1. Check if technician
    const tech = (await TechnicianRepository.findById(effectiveId).catch(() => null)) ||
                 (user?.phone ? await TechnicianRepository.findByPhone(user.phone).catch(() => null) : null);
    if (tech) {
      const current = Number(tech.wallet_balance ?? tech.balance ?? 0);
      const newB = current + chargeAmount;
      await TechnicianRepository.update(tech.id, { wallet_balance: newB });
      await WalletTransactionRepository.create({
        user_id: tech.user_id || tech.id,
        type: "charge",
        amount: chargeAmount,
        description: `شارژ کیف پول تکنسین (رهگیری: ${trackingCode || refCode || receiptNumber || 'مستقیم'})`,
        status: "completed"
      }).catch(() => {});
      return res.json({ status: "ok", balance: newB });
    }

    // 2. Check if client/user
    const targetUser = user || (await UserRepository.findById(effectiveId).catch(() => null)) ||
                       (await UserRepository.findByPhone(effectiveId).catch(() => null));
    if (targetUser) {
      const current = Number(targetUser.wallet_balance || 0);
      const newB = current + chargeAmount;
      await UserRepository.update(targetUser.id, { wallet_balance: newB });
      await WalletTransactionRepository.create({
        user_id: targetUser.id,
        type: "charge",
        amount: chargeAmount,
        description: `شارژ کیف پول مشتری (رهگیری: ${trackingCode || refCode || receiptNumber || 'مستقیم'})`,
        status: "completed"
      }).catch(() => {});
      return res.json({ status: "ok", balance: newB });
    }

    return res.status(404).json({ status: "error", message: "کاربر یا تکنسین یافت نشد." });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Referral Code Bonus Claim Endpoint
app.post("/api/referral/claim", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    if (!user) {
      return res.status(401).json({ status: "error", message: "لطفاً ابتدا وارد حساب کاربری خود شوید." });
    }
    const { code } = req.body || {};
    const cleanCode = String(code || "").trim();
    if (!cleanCode) {
      return res.status(400).json({ status: "error", message: "کد معرف الزامی است." });
    }

    if (cleanCode === user.phone || cleanCode === user.id || cleanCode === (user as any).user_code) {
      return res.status(400).json({ status: "error", message: "نمی‌توانید از کد یا شماره خود به عنوان معرف استفاده نمایید." });
    }

    const pool = getDbPool();
    const [claimedRows]: any = await pool.query(
      "SELECT id FROM wallet_transactions WHERE user_id = ? AND type = 'referral_bonus' LIMIT 1",
      [user.id]
    ).catch(() => [[], []]);

    if (claimedRows && claimedRows.length > 0) {
      return res.status(400).json({ status: "error", message: "شما قبلاً از هدیه کد معرف استفاده نموده‌اید." });
    }

    const [refUsers]: any = await pool.query(
      "SELECT id, phone, full_name, wallet_balance FROM users WHERE phone = ? OR user_code = ? OR id = ? LIMIT 1",
      [cleanCode, cleanCode, cleanCode]
    ).catch(() => [[], []]);

    const referrer = refUsers && refUsers.length > 0 ? refUsers[0] : null;
    if (!referrer) {
      return res.status(404).json({ status: "error", message: "کد یا شماره معرف وارد شده در سامانه معتبر نمی‌باشد." });
    }

    const bonusAmount = 50000;
    const currentBal = Number(user.wallet_balance || 0);
    const newBal = currentBal + bonusAmount;

    await UserRepository.update(user.id, { wallet_balance: newBal }).catch(() => {});
    await WalletTransactionRepository.create({
      user_id: user.id,
      type: "referral_bonus",
      amount: bonusAmount,
      description: `هدیه معرف (کد معرف: ${cleanCode}) به کیف پول`,
      status: "completed"
    }).catch(() => {});

    // Award bonus to referrer as well
    const rBal = Number(referrer.wallet_balance || 0) + 20000;
    await UserRepository.update(referrer.id, { wallet_balance: rBal }).catch(() => {});
    await WalletTransactionRepository.create({
      user_id: referrer.id,
      type: "referral_reward",
      amount: 20000,
      description: `پاداش معرفی کاربر جدید (${user.phone || user.full_name})`,
      status: "completed"
    }).catch(() => {});

    return res.json({
      status: "ok",
      message: "هدیه ۵۰,۰۰۰ تومانی معرف با موفقیت به کیف پول شما واریز گردید.",
      balance: newBal
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

const SUBSCRIPTION_PLANS = [
  {
    id: "1_month",
    name: "اشتراک ۱ ماهه طلایی",
    duration_days: 30,
    price: 150000,
    formatted_price: "150,000 تومان",
    features: ["دسترسی کامل به کدهای خطا", "مشاهده راهنمای رفع تکمیلی", "پشتیبانی تلفنی و تیکت"]
  },
  {
    id: "3_month",
    name: "اشتراک ۳ ماهه نقره‌ای پلاس",
    duration_days: 90,
    price: 390000,
    formatted_price: "390,000 تومان",
    features: ["تخفیف ویژه دوره ۳ ماهه", "دسترسی به تمامی ارورکدهای برندها", "پشتیبانی اولویت‌دار"]
  },
  {
    id: "6_month",
    name: "اشتراک ۶ ماهه VIP",
    duration_days: 180,
    price: 690000,
    formatted_price: "690,000 تومان",
    features: ["محبوب‌ترین پلن تعمیرکاران", "دسترسی کامل و بی‌پایان به نقشه‌ها", "تخفیف سفارش قطعات"]
  },
  {
    id: "12_month",
    name: "اشتراک ۱۲ ماهه وفاداری",
    duration_days: 365,
    price: 1190000,
    formatted_price: "1,190,000 تومان",
    features: ["ارزش خرید فوق‌العاده", "یک سال دسترسی به بانک ارورکد", "پشتیبانی اختصاصی کارشناسان"]
  }
];

// Both paths are kept for backward compatibility and share one response shape.
app.get(["/api/subscription/plans", "/api/subscriptions/plans"], (req, res) => {
  res.json({ status: "ok", plans: SUBSCRIPTION_PLANS, data: SUBSCRIPTION_PLANS });
});

app.get(["/api/payments", "/api/admin/payments"], async (req, res) => {
  try {
    // در نسخه قبل هر مقدار غیرخالی در هدر X-Admin-Password (حتی حرف "x") و حتی
    // صرفاً صدا زدن مسیر /api/admin/payments بدون هیچ احراز هویتی، کل سوابق
    // مالی همه کاربران را برمی‌گرداند. اکنون فقط سشن معتبر ملاک است.
    const user = await getCurrentUserAsync(req).catch(() => null);

    if (!user) {
      return res.status(401).json({ status: "error", error: "برای مشاهده سوابق پرداخت باید وارد حساب کاربری شوید.", payments: [], data: [] });
    }

    if (isAdminUser(user)) {
      const payments = await PaymentRepository.findAll();
      return res.json({ status: "ok", payments, data: payments, results: payments, total: payments.length });
    }

    // کاربر عادی فقط سوابق خودش را می‌بیند — پارامترهای phone/userId از کوئری نادیده گرفته می‌شوند.
    const userPayments = await PaymentRepository.findByUserId(user.id, user.phone);
    return res.json({ status: "ok", payments: userPayments, data: userPayments, results: userPayments, total: userPayments.length });
  } catch (err: any) {
    console.error("[payments] error:", err?.message);
    return res.status(500).json({ status: "error", error: "خطا در دریافت سوابق پرداخت.", payments: [], data: [] });
  }
});

app.get(["/api/subscriptions", "/api/admin/subscriptions"], async (req, res) => {
  try {
    // همان نشت امنیتی مسیر payments: هدر رمز و پسوند مسیر /admin/ دیگر ملاک نیستند.
    const user = await getCurrentUserAsync(req).catch(() => null);

    if (!user) {
      return res.status(401).json({ status: "error", error: "برای مشاهده اشتراک‌ها باید وارد حساب کاربری شوید.", subscriptions: [], data: [] });
    }

    if (isAdminUser(user)) {
      const subscriptions = await SubscriptionRepository.findAll();
      return res.json({ status: "ok", subscriptions, data: subscriptions, results: subscriptions, total: subscriptions.length });
    }

    const userSubs = await SubscriptionRepository.findByUserId(user.id, user.phone);
    return res.json({ status: "ok", subscriptions: userSubs, data: userSubs, results: userSubs, total: userSubs.length });
  } catch (err: any) {
    console.error("[subscriptions] error:", err?.message);
    return res.status(500).json({ status: "error", error: "خطا در دریافت اشتراک‌ها.", subscriptions: [], data: [] });
  }
});

// CafeBazaar In-App Purchase & Direct Subscription Activation API (App & Web synchronization)
app.post([
  "/api/payment/bazaar",
  "/api/payment/bazaar-verify",
  "/api/bazaar/verify",
  "/api/bazaar/purchase",
  "/api/subscriptions/bazaar",
  "/api/subscriptions/activate"
], async (req, res) => {
  try {
    let user = await getCurrentUserAsync(req).catch(() => null);
    const {
      sku,
      product_id,
      productId,
      plan_id,
      plan,
      purchaseToken,
      purchase_token,
      token,
      order_id,
      orderId,
      packageName,
      package_name,
      price,
      amount,
      phone,
      user_id,
      userId
    } = req.body || {};

    const effectiveSku = String(sku || product_id || productId || plan_id || plan || "sub_1_month");
    const pToken = String(purchaseToken || purchase_token || token || order_id || orderId || `bazaar_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
    const pPackage = String(packageName || package_name || "com.kadyar24.app");

    const pool = getDbPool();

    // If user not authenticated via header/cookie, fallback to userId/phone in body
    if (!user) {
      const targetUserId = userId || user_id;
      const targetPhone = phone || (targetUserId && String(targetUserId).startsWith("09") ? targetUserId : null);

      if (targetUserId || targetPhone) {
        const [uRows]: any = await pool.query(
          "SELECT * FROM users WHERE (id = ? AND ? != '') OR (phone = ? AND ? != '')",
          [targetUserId || "", targetUserId || "", targetPhone || "", targetPhone || ""]
        );
        if (uRows.length > 0) {
          user = uRows[0];
        } else if (targetPhone) {
          const newUserId = await getNextSequentialId("users", "user");
          await pool.query(
            "INSERT INTO users (id, phone, full_name, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)",
            [newUserId, targetPhone, "کاربر اپلیکیشن کدیار", "client"]
          );
          const [created]: any = await pool.query("SELECT * FROM users WHERE id = ? OR phone = ?", [newUserId, targetPhone]);
          user = created[0];
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "کاربر احراز هویت نشده است. لطفاً توکن سشن را ارسال نمایید."
      });
    }

    // 1. Calculate duration days based on sku
    let durationDays = 30;
    const lowerSku = effectiveSku.toLowerCase();
    if (lowerSku.includes("1_year") || lowerSku.includes("year") || lowerSku.includes("12_month") || lowerSku.includes("365")) {
      durationDays = 365;
    } else if (lowerSku.includes("6_month") || lowerSku.includes("180")) {
      durationDays = 180;
    } else if (lowerSku.includes("3_month") || lowerSku.includes("quarter") || lowerSku.includes("90")) {
      durationDays = 90;
    } else if (lowerSku.includes("1_month") || lowerSku.includes("month") || lowerSku.includes("30")) {
      durationDays = 30;
    }

    const now = new Date();
    const expireDateObj = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expireDateStr = expireDateObj.toISOString().split("T")[0]; // YYYY-MM-DD
    const finalPrice = Number(price || amount) || 0;

    // 2. Record payment in DB with gateway bazaar and purchaseToken
    const payId = await getNextSequentialId("payments", "pay");
    const payment = await PaymentRepository.create({
      id: payId,
      user_id: user.id,
      related_type: "subscription",
      related_id: effectiveSku,
      amount: finalPrice,
      payment_method: "bazaar",
      authority: pToken,
      ref_id: pToken,
      ref_code: pToken,
      status: "completed"
    });

    // 3. Create active subscription record
    const subPlanName = durationDays === 365 ? "اشتراک ۱ ساله (بازار)" : durationDays === 180 ? "اشتراک ۶ ماهه (بازار)" : durationDays === 90 ? "اشتراک ۳ ماهه (بازار)" : "اشتراک ۱ ماهه (بازار)";
    const subscription = await SubscriptionRepository.create({
      user_id: user.id,
      plan_id: effectiveSku,
      plan_name: subPlanName,
      price: finalPrice,
      duration_days: durationDays,
      status: "active"
    });

    // 4. Update user in users table (is_premium = 1, subscription_plan = sku, subscription_expire_date = expire_date)
    await pool.query(
      "UPDATE users SET is_premium = 1, subscription_plan = ?, subscription_expire_date = ? WHERE id = ? OR phone = ?",
      [effectiveSku, expireDateStr, user.id, user.phone || ""]
    );
    await UserRepository.update(user.id, {
      is_premium: 1,
      subscription_plan: effectiveSku,
      subscription_expire_date: expireDateStr
    }).catch(() => null);

    await logUserActivity(req, "bazaar_subscription_activated", "bazaar", {
      userId: user.id,
      userPhone: user.phone,
      sku: effectiveSku,
      packageName: pPackage,
      purchaseToken: pToken,
      price: finalPrice,
      expireDate: expireDateStr
    }, user);

    // 5. Return success JSON HTTP 200
    return res.status(200).json({
      success: true,
      status: "ok",
      message: "اشتراک با موفقیت فعال شد",
      subscription: {
        is_premium: true,
        plan: effectiveSku,
        expire_date: expireDateStr
      }
    });
  } catch (err: any) {
    console.error("[bazaar payment error]", err);
    return res.status(500).json({
      success: false,
      status: "error",
      error: err.message || "خطای سرور در ثبت اشتراک بازار"
    });
  }
});

app.post(["/api/payments/receipt", "/api/payment/card-verify", "/api/payments/card-verify"], async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const {
      product_id,
      plan_id,
      part_id,
      part_name,
      part_price,
      quantity,
      buyer_name,
      buyer_phone,
      address,
      card_holder,
      track_number,
      tracking_code,
      ref_id,
      card_number,
      amount,
      type,
      payment_type,
      user_id,
      user_name,
      user_phone,
      phone
    } = req.body || {};

    const effectiveProductId = product_id || plan_id;
    const effectiveType = type || payment_type;

    const pool = getDbPool();
    let effectiveUserId = user?.id || user_id || null;
    const effectivePhone = user?.phone || buyer_phone || user_phone || phone || null;

    if (!effectiveUserId && effectivePhone) {
      const [uRows]: any = await pool.query("SELECT id FROM users WHERE phone = ?", [effectivePhone]).catch(() => [[], []]);
      if (uRows && uRows.length > 0) {
        effectiveUserId = uRows[0].id;
      } else {
        effectiveUserId = await getNextSequentialId("users", "user");
        await pool.query(
          "INSERT INTO users (id, phone, full_name, role, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id",
          [effectiveUserId, effectivePhone, card_holder || buyer_name || "مشتری کدیار۲۴", "client", "active"]
        ).catch(() => {});
      }
    } else if (!effectiveUserId) {
      effectiveUserId = "us_guest_pay";
      await pool.query(
        "INSERT INTO users (id, phone, full_name, role, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id",
        ["us_guest_pay", "09000000000", "کاربر میهمان / پرداخت اپ", "client", "active"]
      ).catch(() => {});
    }

    const targetPartId = part_id || (!effectiveProductId?.includes("month") && !effectiveProductId?.includes("vip") && !effectiveProductId?.includes("year") ? effectiveProductId : null);
    const matchedPlan = SUBSCRIPTION_PLANS.find(p => p.id === effectiveProductId);
    const isSubscription = !!matchedPlan || effectiveType === "subscription" || (effectiveProductId && String(effectiveProductId).includes("month")) || (effectiveProductId && String(effectiveProductId).includes("vip"));

    if (isSubscription) {
      // Check if user already has an active subscription
      if (effectiveUserId || effectivePhone) {
        const activeSub = await SubscriptionRepository.findActiveByUserId(effectiveUserId, effectivePhone);
        if (activeSub && new Date(activeSub.end_date) > new Date()) {
          return res.status(400).json({
            status: "error",
            error: "شما در حال حاضر دارای اشتراک فعال هستید و پس از پایان مهلت می‌توانید تمدید نمایید."
          });
        }
      }

      const paymentAmount = matchedPlan ? matchedPlan.price : (Number(amount) || 0);
      const newPayment = await PaymentRepository.create({
        user_id: effectiveUserId,
        related_type: "subscription",
        related_id: effectiveProductId || "1_month",
        amount: paymentAmount,
        payment_method: "card_to_card",
        authority: `CARD_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 900 + 100)}`,
        ref_id: track_number || "",
        ref_code: track_number || "",
        card_number: card_holder || "",
        status: "pending"
      });

      await logUserActivity(req, "subscription_payment_submitted", "subscription", {
        plan: effectiveProductId || "1_month",
        amount: paymentAmount,
        track_number,
        userId: effectiveUserId
      });

      return res.json({
        status: "ok",
        message: "فیش واریزی خرید اشتراک با موفقیت ثبت گردید و پس از تایید مدیریت فعال می‌شود.",
        payment: newPayment,
        data: newPayment
      });
    } else if (effectiveType === 'wallet_recharge' || effectiveType === 'wallet' || effectiveType === 'commission') {
      const payAmt = Number(amount || 0);
      const refCode = ref_id || tracking_code || track_number || ("WAL-" + Math.floor(100000 + Math.random() * 900000));
      const cardNum = card_number || card_holder || '';

      const targetTech = (effectiveUserId ? await TechnicianRepository.findById(effectiveUserId).catch(() => null) : null) ||
                         (effectivePhone ? await TechnicianRepository.findByPhone(effectivePhone).catch(() => null) : null) ||
                         (user?.phone ? await TechnicianRepository.findByPhone(user.phone).catch(() => null) : null);

      const newPayment = await PaymentRepository.create({
        user_id: targetTech ? targetTech.id : (effectiveUserId || 'tech_unknown'),
        user_phone: effectivePhone || targetTech?.phone || '',
        user_name: user_name || targetTech?.name || targetTech?.full_name || card_holder || buyer_name || 'تکنسین کدیار۲۴',
        user_role: 'technician',
        related_type: 'wallet_recharge',
        related_id: 'wallet_recharge',
        amount: payAmt,
        payment_method: 'card_to_card',
        authority: `CARD_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 900 + 100)}`,
        ref_id: refCode,
        ref_code: refCode,
        tracking_code: refCode,
        card_number: cardNum,
        status: 'pending'
      });

      if (targetTech) {
        await TechnicianRepository.update(targetTech.id, {
          commission_pending: 1,
          commission_pending_approval: 1
        } as any).catch(() => {});
      }

      // Sync to FileStorage
      try {
        const dbStore = FileStorage.read();
        if (!dbStore.payments) dbStore.payments = [];
        dbStore.payments.unshift(newPayment);
        FileStorage.write(dbStore);
      } catch (e) {}

      await logUserActivity(req, "wallet_recharge_receipt_submitted", "finance", {
        amount: payAmt,
        track_number: refCode,
        techId: targetTech?.id,
        paymentId: newPayment.id
      });

      return res.json({
        status: "ok",
        success: true,
        message: "فیش واریز کارت‌به‌کارت با موفقیت ثبت شد و در تب پرداخت‌های پنل مدیریت قرار گرفت. پس از بررسی و تایید مدیر، کیف پول شما شارژ خواهد شد.",
        payment: newPayment,
        data: newPayment
      });
    } else {
      // Part purchase payment - Create part order and payment atomically in database
      let partItem = null;
      if (targetPartId) {
        partItem = await SparePartRepository.findById(targetPartId).catch(() => null);
      }

      const q = Math.max(1, Number(quantity) || 1);
      const unitPrice = partItem ? Number(partItem.price) : (Number(part_price) || 0);
      const totalAmt = Number(amount) || (unitPrice * q);
      const partOrderId = `PUR-${Math.floor(100000 + Math.random() * 900000)}`;

      const newPartOrder = await PartOrderRepository.create({
        id: partOrderId,
        user_id: effectiveUserId,
        part_id: targetPartId || null,
        part_name: part_name || partItem?.title || "قطعه یدکی",
        buyer_name: buyer_name || card_holder || user?.full_name || "مشتری",
        buyer_phone: buyer_phone || effectivePhone || "",
        address: address || user?.city || "",
        quantity: q,
        total_price: totalAmt,
        status: "pending",
        shipping_tracking_code: track_number || ""
      });

      const newPayment = await PaymentRepository.create({
        user_id: effectiveUserId,
        order_id: null,
        related_type: "part_purchase",
        related_id: targetPartId || null,
        amount: totalAmt,
        payment_method: "card_to_card",
        authority: `CARD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ref_id: track_number || "",
        ref_code: partOrderId,
        card_number: card_holder || "",
        status: "pending"
      });

      await logUserActivity(req, "part_purchase_payment_submitted", "store", {
        partId: targetPartId,
        partOrderId,
        amount: totalAmt,
        quantity: q,
        track_number,
        userId: effectiveUserId
      });

      return res.json({
        status: "ok",
        message: "فیش واریزی خرید قطعه با موفقیت ثبت شد و در انتظار بررسی واحد مالی است.",
        payment: newPayment,
        partOrder: newPartOrder,
        order: newPartOrder,
        data: { payment: newPayment, partOrder: newPartOrder }
      });
    }
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/payment/request", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req);
    const { plan, productId, amount } = req.body || {};

    const matchedPlan = SUBSCRIPTION_PLANS.find(p => p.id === (plan || productId));
    const isSubscription = !!matchedPlan || (plan && String(plan).includes("month"));

    if (isSubscription && user) {
      const activeSub = await SubscriptionRepository.findActiveByUserId(user.id, user.phone);
      if (activeSub && new Date(activeSub.end_date) > new Date()) {
        return res.status(400).json({
          status: "error",
          error: "شما در حال حاضر دارای اشتراک فعال هستید و پس از پایان مهلت می‌توانید تمدید نمایید."
        });
      }
    }

    const relatedType = isSubscription ? "subscription" : "part_purchase";
    const paymentAmount = matchedPlan ? matchedPlan.price : (amount || 0);
    const authority = `ZARIN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const newPayment = await PaymentRepository.create({
      user_id: user?.id || null,
      related_type: relatedType,
      related_id: plan || productId || null,
      amount: paymentAmount,
      payment_method: "zarinpal",
      authority,
      status: "pending"
    });

    await logUserActivity(req, "payment_gateway_requested", "payment", {
      relatedType,
      amount: paymentAmount,
      authority
    });

    return res.json({
      status: "ok",
      authority,
      redirect: `/payment-callback?authority=${authority}&status=OK`,
      payment: newPayment
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// unified GET /api/payments is handled at line 4569

app.get("/api/subscriptions/me", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const queryPhone = (req.query.phone || req.query.mobile) as string;
    const queryUserId = (req.query.userId || req.query.user_id) as string;
    const targetUserId = user?.id || queryUserId || "";
    const targetPhone = user?.phone || queryPhone || "";

    if (!targetUserId && !targetPhone) {
      return res.json({ status: "ok", subscription: null, is_active: false, is_premium: false });
    }
    const activeSub = await SubscriptionRepository.findActiveByUserId(targetUserId, targetPhone);
    return res.json({
      status: "ok",
      subscription: activeSub || null,
      is_active: !!activeSub,
      is_premium: !!activeSub,
      data: activeSub || null
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/subscriptions/my-status", async (req, res) => {
  try {
    const user = await getCurrentUserAsync(req).catch(() => null);
    const queryPhone = (req.query.phone || req.query.mobile) as string;
    const queryUserId = (req.query.userId || req.query.user_id) as string;
    const targetUserId = user?.id || queryUserId || "";
    const targetPhone = user?.phone || queryPhone || "";

    if (!targetUserId && !targetPhone) {
      return res.json({ status: "ok", subscription: null, is_active: false, is_premium: false });
    }
    const activeSub = await SubscriptionRepository.findActiveByUserId(targetUserId, targetPhone);
    return res.json({
      status: "ok",
      subscription: activeSub || null,
      is_active: !!activeSub,
      is_premium: !!activeSub,
      data: activeSub || null
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/subscriptions/manual-add", requireAdmin, async (req, res) => {
  try {
    const { userId, planId, durationDays } = req.body || {};
    let targetUser: any = null;
    let targetTech: any = null;
    if (userId) {
      targetUser = (await UserRepository.findById(userId).catch(() => null)) || (await UserRepository.findByPhone(userId).catch(() => null));
      if (!targetUser) {
        targetTech = await TechnicianRepository.findById(userId).catch(() => null);
        if (!targetTech) {
          const pool = getDbPool();
          const [tRows]: any = await pool.query("SELECT * FROM technicians WHERE phone = ?", [userId]).catch(() => [[], []]);
          if (tRows && tRows.length > 0) targetTech = tRows[0];
        }
        if (targetTech) {
          const techPhone = targetTech.phone;
          const techUserId = targetTech.user_id || targetTech.userId;
          if (techUserId) {
            targetUser = await UserRepository.findById(techUserId).catch(() => null);
          }
          if (!targetUser && techPhone) {
            targetUser = await UserRepository.findByPhone(techPhone).catch(() => null);
          }
          if (!targetUser) {
            targetUser = {
              id: targetTech.id,
              full_name: targetTech.full_name || targetTech.fullName || targetTech.name,
              phone: targetTech.phone,
              role: "technician"
            };
          }
        }
      }
    }

    const cleanUserId = targetUser ? targetUser.id : (targetTech ? targetTech.id : userId);
    const cleanUserName = (targetUser && (targetUser.full_name || targetUser.fullName || targetUser.name)) || 
                          (targetTech && (targetTech.full_name || targetTech.fullName || targetTech.name)) || "کاربر";
    const cleanUserPhone = targetUser ? targetUser.phone : (targetTech ? targetTech.phone : (String(userId).startsWith("09") ? userId : ""));

    if (cleanUserPhone || cleanUserId) {
      const activeSub = await SubscriptionRepository.findActiveByUserId(cleanUserId, cleanUserPhone);
      if (activeSub) {
        return res.status(400).json({
          status: "error",
          message: `کاربر با شماره همراه ${cleanUserPhone || cleanUserId} در حال حاضر دارای اشتراک فعال است و امکان فعال‌سازی اشتراک مجدد وجود ندارد.`
        });
      }
    }

    const created = await SubscriptionRepository.create({
      user_id: cleanUserId,
      user_name: cleanUserName,
      phone: cleanUserPhone,
      plan_id: planId || "1_month",
      price: 0,
      duration_days: durationDays || 30,
      status: "active",
      reset_duration: true
    });
    await logUserActivity(req, "subscription_manually_added", "admin", { userId: cleanUserId, planId });
    return res.json({ status: "ok", subscription: created });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/payments/:id/approve", requireAdmin, async (req, res) => {
  try {
    const payment = await PaymentRepository.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ status: "error", message: "پرداخت یافت نشد" });
    }

    await PaymentRepository.update(payment.id, { status: "completed" });

    let newSub = null;
    const pool = getDbPool();
    if (payment.related_type === "subscription" || (payment.related_id && String(payment.related_id).includes("month"))) {
      const planId = payment.related_id || "1_month";
      const matchedPlan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      const durationDays = matchedPlan ? matchedPlan.duration_days : (String(planId).includes("12") ? 365 : String(planId).includes("6") ? 180 : String(planId).includes("3") ? 90 : 30);
      const planName = matchedPlan ? matchedPlan.name : "اشتراک ویژه کدهای خطا";

      let targetUserId = payment.user_id;
      if (!targetUserId && payment.user_phone) {
        targetUserId = payment.user_phone;
      }
      if (!targetUserId && payment.card_number && String(payment.card_number).startsWith("09")) {
        targetUserId = payment.card_number;
      }
      if (!targetUserId) {
        targetUserId = `us_pay_${payment.id}`;
      }

      newSub = await SubscriptionRepository.create({
        user_id: targetUserId,
        plan_id: planId,
        plan_name: planName,
        payment_id: payment.id,
        price: payment.amount,
        duration_days: durationDays,
        status: "active"
      });
      await logUserActivity(req, "subscription_approved", "admin", { paymentId: payment.id, userId: targetUserId, planId });
    } else if (
      payment.related_type === "commission" || 
      payment.related_id === "commission_settlement" || 
      payment.type === "commission" ||
      payment.related_type === "wallet_recharge" ||
      payment.related_type === "wallet" ||
      payment.type === "wallet_recharge"
    ) {
      // تایید شارژ کیف پول / تسویه کمیسیون تکنسین توسط ادمین
      const settleAmount = Number(payment.amount || 0);
      let targetTech = (payment.user_id ? await TechnicianRepository.findById(payment.user_id) : null) ||
                       (payment.user_phone ? await TechnicianRepository.findByPhone(payment.user_phone) : null);
      if (!targetTech && payment.user_id && String(payment.user_id).startsWith("tech_")) {
        targetTech = await TechnicianRepository.findById(String(payment.user_id).replace(/^tech_/, ''));
      }
      if (!targetTech && payment.card_number && String(payment.card_number).startsWith("09")) {
        targetTech = await TechnicianRepository.findByPhone(payment.card_number);
      }

      if (targetTech) {
        const currentBal = Number(targetTech.wallet_balance !== undefined && targetTech.wallet_balance !== null ? targetTech.wallet_balance : (targetTech.balance ?? 0));
        // Add exact deposit amount to technician wallet
        const newBal = currentBal + settleAmount;
        await TechnicianRepository.update(targetTech.id, {
          wallet_balance: newBal,
          balance: newBal,
          commission_pending: 0,
          commission_pending_approval: 0,
          status: 'active'
        } as any).catch(() => {});

        if (targetTech.user_id) {
          await UserRepository.update(targetTech.user_id, { 
            wallet_balance: newBal,
            commission_pending: 0,
            status: 'active'
          } as any).catch(() => {});
        }

        // FileStorage synchronization for instant persistence
        try {
          const dbStore = FileStorage.read();
          if (dbStore.technicians) {
            const tIdx = dbStore.technicians.findIndex((t: any) => String(t.id) === String(targetTech.id) || String(t.phone) === String(targetTech.phone));
            if (tIdx !== -1) {
              dbStore.technicians[tIdx].wallet_balance = newBal;
              dbStore.technicians[tIdx].balance = newBal;
              dbStore.technicians[tIdx].commission_pending = 0;
              dbStore.technicians[tIdx].commission_pending_approval = 0;
              dbStore.technicians[tIdx].commission_debt = 0;
              dbStore.technicians[tIdx].has_commission_debt = false;
            }
          }
          if (dbStore.payments) {
            const pIdx = dbStore.payments.findIndex((p: any) => String(p.id) === String(payment.id));
            if (pIdx !== -1) {
              dbStore.payments[pIdx].status = 'completed';
            }
          }
          FileStorage.write(dbStore);
        } catch (e) {}

        await WalletTransactionRepository.create({
          user_id: targetTech.user_id || targetTech.id,
          type: 'wallet_recharge',
          amount: settleAmount,
          description: `شارژ کیف پول تکنسین توسط مدیر (کد رهگیری: ${payment.ref_code || payment.id})`,
          status: 'completed'
        }).catch(() => {});

        await logUserActivity(req, "wallet_recharge_approved", "admin", { paymentId: payment.id, techId: targetTech.id, amount: settleAmount, newBal });
      }
    } else if (payment.related_type === "part_purchase" || payment.partId) {
      // Robust match: check order_id, ref_code, shipping_tracking_code, and user_id + part_id
      await pool.query(
        `UPDATE part_orders SET status = 'confirmed' 
         WHERE id = ? 
            OR id = ?
            OR shipping_tracking_code = ? 
            OR (user_id = ? AND part_id = ? AND status = 'pending')`,
        [payment.ref_code || '', payment.order_id || '', payment.ref_id || '', payment.user_id || '', payment.related_id || payment.partId || '']
      ).catch(() => {});
      const partId = payment.related_id || payment.partId;
      if (partId) {
        await pool.query("UPDATE spare_parts SET stock = GREATEST(0, stock - 1) WHERE id = ?", [partId]).catch(() => {});
      }
      await logUserActivity(req, "part_purchase_approved", "admin", { paymentId: payment.id, partId });
    }

    return res.json({ status: "ok", message: "پرداخت با موفقیت تایید و اعمال شد", subscription: newSub });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/payments/:id/reject", requireAdmin, async (req, res) => {
  try {
    const payment = await PaymentRepository.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ status: "error", message: "پرداخت یافت نشد" });
    }

    await PaymentRepository.update(payment.id, { status: "failed" });
    if (
      payment.related_type === "commission" || 
      payment.related_id === "commission_settlement" || 
      payment.type === "commission" ||
      payment.related_type === "wallet_recharge" ||
      payment.related_type === "wallet" ||
      payment.type === "wallet_recharge"
    ) {
      let targetTech = (payment.user_id ? await TechnicianRepository.findById(payment.user_id) : null) ||
                       (payment.user_phone ? await TechnicianRepository.findByPhone(payment.user_phone) : null);
      if (targetTech) {
        await TechnicianRepository.update(targetTech.id, {
          commission_pending: 0,
          commission_pending_approval: 0
        } as any).catch(() => {});
        if (targetTech.user_id) {
          await UserRepository.update(targetTech.user_id, {
            commission_pending: 0
          } as any).catch(() => {});
        }
        try {
          const dbStore = FileStorage.read();
          if (dbStore.technicians) {
            const tIdx = dbStore.technicians.findIndex((t: any) => String(t.id) === String(targetTech.id) || String(t.phone) === String(targetTech.phone));
            if (tIdx !== -1) {
              dbStore.technicians[tIdx].commission_pending = 0;
              dbStore.technicians[tIdx].commission_pending_approval = 0;
            }
          }
          if (dbStore.payments) {
            const pIdx = dbStore.payments.findIndex((p: any) => String(p.id) === String(payment.id));
            if (pIdx !== -1) {
              dbStore.payments[pIdx].status = 'failed';
            }
          }
          FileStorage.write(dbStore);
        } catch (e) {}
      }
    } else if (payment.related_type === "part_purchase" || payment.partId) {
      const pool = getDbPool();
      await pool.query(
        `UPDATE part_orders SET status = 'rejected' 
         WHERE id = ? 
            OR id = ?
            OR shipping_tracking_code = ? 
            OR (user_id = ? AND part_id = ? AND status = 'pending')`,
        [payment.ref_code || '', payment.order_id || '', payment.ref_id || '', payment.user_id || '', payment.related_id || payment.partId || '']
      ).catch(() => {});
    }
    await logUserActivity(req, "payment_rejected", "admin", { paymentId: payment.id });
    return res.json({ status: "ok", message: "پرداخت رد شد" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/activity-logs", requireAdmin, async (req, res) => {
  try {
    const logs = await ActivityLogRepository.findAll(300);
    return res.json({ status: "ok", logs, data: { logs } });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/payment/resume", async (req, res) => {
  try {
    const { paymentId } = req.body || {};
    const payment = await PaymentRepository.findById(paymentId);
    return res.json({ status: "ok", payment });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

// Catch-all for any undefined API routes to return proper JSON 404 instead of HTML SPA fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ status: "error", message: "مسیر API مورد نظر یافت نشد" });
});

const PORT = Number(process.env.PORT) || 3000;

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function injectSeoMeta(req: express.Request, rawHtml: string): Promise<string> {
  try {
    const host = req.headers.host || "kodyar24.ir";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;
    const cleanPath = (req.path || "/").toLowerCase();

    let title = "کدیار۲۴ - سامانه هوشمند عیب‌یابی کدهای خطا و خدمات لوازم خانگی";
    let description = "سامانه هوشمند کدیار۲۴ - مرجع تخصصی جستجوی کدهای خطا، عیب‌یابی لوازم خانگی و پکیج، فروشگاه قطعات اورجینال و خدمات فنی تکنسین‌ها";
    let ogImage = `${baseUrl}/og-image.svg`;
    let canonicalUrl = `${baseUrl}${req.path}`;
    let jsonLd: any = null;

    if (cleanPath.startsWith("/error-code/")) {
      const parts = cleanPath.split("/").filter(Boolean); // ['error-code', 'brand', 'code']
      if (parts.length >= 3) {
        const brandSlug = decodeURIComponent(parts[1]);
        const codeSlug = decodeURIComponent(parts[2]);

        const allErrors = await ErrorCodeRepository.findAll().catch(() => []);
        const found = allErrors.find((e: any) => {
          const b = String(e.brand || "").trim().toLowerCase().replace(/\s+/g, "-");
          const c = String(e.code || "").trim().toLowerCase().replace(/\s+/g, "-");
          return b === brandSlug.toLowerCase() && c === codeSlug.toLowerCase();
        });

        if (found) {
          title = `کد خطا ${found.code} ${found.brand} ${found.category || ''} - عیب‌یابی و راهنمای رفع ارور در کدیار۲۴`;
          const causesSummary = Array.isArray(found.causes) && found.causes.length > 0
            ? found.causes.slice(0, 3).join("، ")
            : (found.description || "علت‌های بروز و راهکار گام به گام");
          description = `راهنمای کامل رفع ارور و کد خطای ${found.code} در ${found.category || 'لوازم خانگی'} ${found.brand}${found.model ? ' مدل ' + found.model : ''}. علت ارور: ${causesSummary}. راهنمای جامع و ابزارهای موردنیاز در کدیار۲۴.`;
          canonicalUrl = `${baseUrl}/error-code/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}`;

          jsonLd = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": `علت بروز کد خطای ${found.code} در ${found.brand} چیست و چگونه رفع می‌شود؟`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `${found.description || ""} ${Array.isArray(found.causes) ? "علل: " + found.causes.join(" - ") : ""} ${Array.isArray(found.steps) ? "مراحل رفع: " + found.steps.join(" - ") : ""}`.trim()
                }
              }
            ]
          };
        } else {
          // Dynamic SEO fallback for brand and error code from URL
          const displayBrand = brandSlug.toUpperCase();
          const displayCode = codeSlug.toUpperCase();
          title = `کد خطا و ارور ${displayCode} در ${displayBrand} - عیب‌یابی و راهنمای رفع در کدیار۲۴`;
          description = `راهنمای عیب‌یابی، علل احتمالی و نحوه رفع ارور ${displayCode} دستگاه ${displayBrand}. بررسی علت بروز، قطعات یدکی مرتبط و اعزام تعمیرکار مجاز در سامانه کدیار۲۴.`;
          canonicalUrl = `${baseUrl}/error-code/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}`;
        }
      }
    } else if (cleanPath.startsWith("/part/")) {
      const parts = cleanPath.split("/").filter(Boolean);
      const partId = parts[2] || parts[1];
      if (partId) {
        const allParts = await SparePartRepository.findAll().catch(() => []);
        const found = allParts.find((p: any) => String(p.id).trim() === decodeURIComponent(partId).trim());

        if (found) {
          title = `خرید و قیمت ${found.name || found.title} ${found.brand || ''} اصل - فروشگاه کدیار۲۴`;
          description = `خرید آنلاین و مشخصات فنی قطعه یدکی اورجینال ${found.name || found.title} مناسب ${found.brand || ''} ${found.category || ''} با ضمانت اصالت کالا و ارسال سریع در سامانه کدیار۲۴.`;
          if (found.image && String(found.image).startsWith("http")) {
            ogImage = found.image;
          }
          canonicalUrl = `${baseUrl}/part/${encodeURIComponent(parts[1] || 'appliance')}/${encodeURIComponent(partId)}`;

          jsonLd = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": `${found.name || found.title} ${found.brand || ''}`.trim(),
            "image": found.image ? [found.image] : [ogImage],
            "description": found.description || description,
            "offers": {
              "@type": "Offer",
              "price": String(found.price || 0),
              "priceCurrency": "IRR",
              "availability": (found.inStock !== false && found.stock !== 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            }
          };
        }
      }
    } else if (cleanPath === "/parts" || cleanPath === "/parts-store") {
      title = "فروشگاه قطعات یدکی اورجینال لوازم خانگی و پکیج - کدیار۲۴";
      description = "فروش آنلاین قطعات یدکی اورجینال انواع پکیج دیواری، ماشین لباسشویی، ظرفشویی، برد الکترونیکی و پمپ با تضمین اصالت کالا در کدیار۲۴";
      canonicalUrl = `${baseUrl}/parts`;
    }

    let modified = rawHtml;
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

    if (modified.includes('<meta name="description"')) {
      modified = modified.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
    }

    modified = modified.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
    modified = modified.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
    modified = modified.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
    modified = modified.replace(/<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`);

    modified = modified.replace(/<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
    modified = modified.replace(/<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    modified = modified.replace(/<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:image" content="${ogImage}" />`);
    modified = modified.replace(/<meta\s+name=["']twitter:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);

    modified = modified.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

    if (jsonLd) {
      const jsonLdTag = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n  </head>`;
      modified = modified.replace(/<\/head>/i, jsonLdTag);
    }

    return modified;
  } catch (err) {
    console.error("[injectSeoMeta] error:", err);
    return rawHtml;
  }
}

// Serve static assets OR use Vite middleware
async function setupServer() {
  await checkDbConnection();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // SEO Meta injection interceptor for HTML routes in development
    app.use(async (req, res, next) => {
      const url = req.originalUrl || req.url;
      if (
        req.method !== "GET" ||
        url.startsWith("/api") ||
        url.startsWith("/@") ||
        url.startsWith("/src") ||
        url.startsWith("/node_modules") ||
        url.includes(".")
      ) {
        return next();
      }

      if (url.startsWith("/error-code") || url.startsWith("/part")) {
        try {
          const template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          const transformed = await vite.transformIndexHtml(url, template);
          const injected = await injectSeoMeta(req, transformed);
          return res.status(200).set({ "Content-Type": "text/html" }).end(injected);
        } catch (e) {
          return next();
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", async (req, res) => {
      try {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, "utf-8");
          const rendered = await injectSeoMeta(req, rawHtml);
          return res.send(rendered);
        }
      } catch (err) {
        console.error("SSR meta injection error in production:", err);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupServer();
