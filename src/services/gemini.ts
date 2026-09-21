import { GoogleGenAI } from "@google/genai";

/**
 * Static guidance used whenever no Gemini API key is configured, or when the
 * AI call fails. This keeps the endpoints responding exactly as before.
 */
const FALLBACK_DIAGNOSIS = {
  status: "ok",
  diagnosis: "راهنمای عیب‌یابی هوشمند کدیار۲۴ بر اساس کد خطای ارسالی:",
  steps: [
    "ابتدا دستگاه را از برق بکشید و پس از ۵ دقیقه مجدداً وصل نمایید.",
    "سنسورها، سیم‌کشی‌ها و اتصالات مربوط به این خطا را با دقت بررسی کنید.",
    "در صورت رفع نشدن مشکل، قطعه مرتبط یا برد الکترونیکی نیازمند تست تخصصی توسط تکنسین مجاز است."
  ],
  precautions: [
    "رعایت کامل نکات ایمنی برق و قطع جریان گاز الزامی است.",
    "از دستکاری قطعات حساس بدون ابزار استاندارد خودداری فرمایید."
  ],
  difficulty: "medium",
  estimatedDifficulty: "medium"
};

const FALLBACK_PARTS = {
  status: "ok",
  parts: [] as any[],
  suggestion: "قطعات پیشنهادی بر اساس برند و کد خطای دستگاه"
};

let client: GoogleGenAI | null = null;

/** Returns a Gemini client, or null when no API key is configured. */
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Extracts the first JSON object found in a model response. */
function parseJsonResponse(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function askGemini(prompt: string): Promise<any | null> {
  const ai = getClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      contents: prompt
    });
    const text = (response as any)?.text
      || (response as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("")
      || "";
    return parseJsonResponse(String(text));
  } catch (err: any) {
    console.warn("[gemini] request failed, using fallback:", err?.message || err);
    return null;
  }
}

/**
 * Diagnoses an appliance error code.
 *
 * @param body Request payload containing at least the error code, and optionally brand/category/model.
 * @returns Diagnosis with steps, precautions and difficulty. Falls back to static guidance when AI is unavailable.
 */
export async function diagnoseErrorCode(body: any): Promise<any> {
  const code = String(body?.code || body?.errorCode || body?.error_code || "").trim();
  const brand = String(body?.brand || "").trim();
  const category = String(body?.category || body?.appliance || "").trim();
  const model = String(body?.model || "").trim();
  const description = String(body?.description || body?.problem || "").trim();

  const prompt = `تو یک متخصص ارشد تعمیر لوازم خانگی و پکیج در ایران هستی.
برای اطلاعات زیر یک راهنمای عیب‌یابی فارسی و کاربردی بنویس.
کد خطا: ${code || "نامشخص"}
برند: ${brand || "نامشخص"}
دسته دستگاه: ${category || "نامشخص"}
مدل: ${model || "نامشخص"}
شرح مشکل: ${description || "ندارد"}

فقط و فقط یک JSON معتبر با این ساختار برگردان، بدون هیچ متن اضافه:
{
  "diagnosis": "توضیح کوتاه علت خطا به فارسی",
  "steps": ["مرحله ۱", "مرحله ۲", "مرحله ۳"],
  "precautions": ["نکته ایمنی ۱", "نکته ایمنی ۲"],
  "difficulty": "easy یا medium یا hard"
}`;

  const ai = await askGemini(prompt);
  if (!ai || !ai.diagnosis) return FALLBACK_DIAGNOSIS;

  const steps = Array.isArray(ai.steps) && ai.steps.length ? ai.steps.map(String) : FALLBACK_DIAGNOSIS.steps;
  const precautions = Array.isArray(ai.precautions) && ai.precautions.length
    ? ai.precautions.map(String)
    : FALLBACK_DIAGNOSIS.precautions;
  const difficulty = ["easy", "medium", "hard"].includes(String(ai.difficulty)) ? String(ai.difficulty) : "medium";

  return {
    status: "ok",
    diagnosis: String(ai.diagnosis),
    steps,
    precautions,
    difficulty,
    estimatedDifficulty: difficulty
  };
}

/**
 * Suggests spare parts likely responsible for a given error code.
 *
 * @param body Request payload containing the error code and optionally brand/category.
 * @returns A list of suggested part names. Falls back to an empty list when AI is unavailable.
 */
export async function suggestPartsForError(body: any): Promise<any> {
  const code = String(body?.code || body?.errorCode || body?.error_code || "").trim();
  const brand = String(body?.brand || "").trim();
  const category = String(body?.category || body?.appliance || "").trim();

  const prompt = `تو یک متخصص قطعات یدکی لوازم خانگی و پکیج در ایران هستی.
برای کد خطای «${code || "نامشخص"}» از برند «${brand || "نامشخص"}» و دسته «${category || "نامشخص"}»
محتمل‌ترین قطعات معیوب را فهرست کن.

فقط و فقط یک JSON معتبر با این ساختار برگردان، بدون هیچ متن اضافه:
{
  "parts": [{ "name": "نام قطعه", "reason": "دلیل احتمال خرابی" }],
  "suggestion": "یک جمله جمع‌بندی"
}`;

  const ai = await askGemini(prompt);
  if (!ai || !Array.isArray(ai.parts)) return FALLBACK_PARTS;

  return {
    status: "ok",
    parts: ai.parts.map((p: any) => ({
      name: String(p?.name || "").trim(),
      reason: String(p?.reason || "").trim()
    })).filter((p: any) => p.name),
    suggestion: String(ai.suggestion || FALLBACK_PARTS.suggestion)
  };
}
