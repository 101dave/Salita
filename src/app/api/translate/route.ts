import { NextRequest } from "next/server";
import { db } from "@/db";
import { translations } from "@/db/schema";
import { getViewer } from "@/lib/workspace";
import { findLocalTranslation, languages, getLanguage } from "@/lib/languages";
import { findLessonTranslation } from "@/lib/lessons";

export const runtime = "nodejs";
const limits = new Map<string, { count: number; reset: number }>();

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await request.json();
    if (typeof text !== "string" || !text.trim() || Buffer.byteLength(text, "utf8") > 500) return Response.json({ error: "Enter some text, up to 500 UTF-8 bytes." }, { status: 400 });
    if (!languages.some((item) => item.code === sourceLang) || !languages.some((item) => item.code === targetLang)) return Response.json({ error: "Please choose a supported language pair." }, { status: 400 });
    const user = await getViewer();
    const limit = limits.get(user.id);
    if (limit && limit.reset > Date.now() && limit.count >= 35) return Response.json({ error: "You’re translating quickly! Please wait a minute and try again." }, { status: 429 });
    if (!limit || limit.reset < Date.now()) limits.set(user.id, { count: 1, reset: Date.now() + 60000 });
    else limit.count++;
    let translatedText = sourceLang === targetLang ? text.trim() : findLocalTranslation(text, sourceLang, targetLang) || findLessonTranslation(text, sourceLang, targetLang);
    let provider = "Salita phrase library";
    if (!translatedText) {
      provider = "MyMemory";
      const params = new URLSearchParams({ q: text.trim(), langpair: `${sourceLang}|${targetLang}` });
      if (process.env.MYMEMORY_API_KEY) params.set("key", process.env.MYMEMORY_API_KEY);
      let result;
      try {
        const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: AbortSignal.timeout(12000), cache: "no-store" });
        if (!response.ok) throw new Error("Provider unavailable");
        result = await response.json();
      } catch {
        return Response.json({ error: "The translation service is taking a break. Try again shortly, or use an everyday phrase like ‘Good morning’ or ‘Thank you’." }, { status: 503 });
      }
      if (result.quotaFinished || Number(result.responseStatus) !== 200 || typeof result.responseData?.translatedText !== "string") {
        const regional = getLanguage(targetLang).philippine || getLanguage(sourceLang).philippine;
        return Response.json({ error: regional ? "This language pair has limited live translation support. Try an everyday phrase: ‘Hello’, ‘Good morning’, ‘Thank you’, or ‘How much is this?’." : "The translation service is currently unavailable or has reached its daily limit. Please try again later." }, { status: 503 });
      }
      translatedText = result.responseData.translatedText.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    }
    const [translation] = await db.insert(translations).values({ userId: user.id, sourceText: text.trim(), translatedText: translatedText!, sourceLang, targetLang }).returning();
    return Response.json({ translation, provider });
  } catch (error) {
    console.error("Translation failed", error);
    return Response.json({ error: "We couldn’t translate that just now. Please try again." }, { status: 500 });
  }
}
