import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { translations } from "@/db/schema";
import { getViewer } from "@/lib/workspace";
import { findLocalTranslationDetails, getLanguage, languages, normalizeText } from "@/lib/languages";
import { translateWithAI } from "@/lib/ai";
import { translateWithProvider } from "@/lib/translation";
import type { TranslationQuality } from "@/lib/types";

export const runtime = "nodejs";
const limits = new Map<string, { count: number; reset: number }>();
/** Set SALITA_AI_DISABLED=1 to serve only the curated library and classic providers. */
const aiEnabled = process.env.SALITA_AI_DISABLED !== "1";

async function findRememberedTranslation(userId: string, text: string, sourceLang: string, targetLang: string) {
  const rows = await db.select({ sourceText: translations.sourceText, translatedText: translations.translatedText })
    .from(translations)
    .where(and(eq(translations.userId, userId), eq(translations.sourceLang, sourceLang), eq(translations.targetLang, targetLang), eq(translations.saved, true)))
    .orderBy(desc(translations.createdAt))
    .limit(200);
  const normalized = normalizeText(text);
  return rows.find((row) => normalizeText(row.sourceText) === normalized && row.translatedText.trim())?.translatedText || null;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ error: "Please send a valid translation request." }, { status: 400 });
    const { text, sourceLang, targetLang } = body as { text?: unknown; sourceLang?: unknown; targetLang?: unknown };
    if (typeof text !== "string" || !text.trim() || Buffer.byteLength(text, "utf8") > 500) return Response.json({ error: "Enter some text, up to 500 UTF-8 bytes." }, { status: 400 });
    if (typeof sourceLang !== "string" || typeof targetLang !== "string" || !languages.some((item) => item.code === sourceLang) || !languages.some((item) => item.code === targetLang)) return Response.json({ error: "Please choose a supported language pair." }, { status: 400 });

    const user = await getViewer();
    const limit = limits.get(user.id);
    if (limit && limit.reset > Date.now() && limit.count >= 35) return Response.json({ error: "You’re translating quickly! Please wait a minute and try again." }, { status: 429 });
    if (!limit || limit.reset < Date.now()) limits.set(user.id, { count: 1, reset: Date.now() + 60000 });
    else limit.count++;
    if (limits.size > 2000) for (const [id, value] of limits) if (value.reset < Date.now()) limits.delete(id);

    const sourceText = text.trim();
    let translatedText: string | null = null;
    let provider = "Salita phrase library";
    let quality: TranslationQuality = "curated";
    let note: string | undefined;

    if (sourceLang === targetLang) {
      translatedText = sourceText;
      provider = "Original text";
      quality = "direct";
    } else {
      // An explicit saved correction is more specific to this user than the
      // generic library, so it wins for the same normalized source phrase.
      const remembered = await findRememberedTranslation(user.id, sourceText, sourceLang, targetLang);
      const local = remembered ? null : findLocalTranslationDetails(sourceText, sourceLang, targetLang);
      if (remembered) {
        translatedText = remembered;
        provider = "Your phrasebook";
        quality = "remembered";
        note = "Using your saved wording for this phrase.";
      } else if (local) {
        translatedText = local.text;
        note = local.note;
      }
    }

    if (!translatedText) {
      // A language model handles Philippine regional languages far better than
      // generic machine translation, so it is tried before the classic APIs.
      if (aiEnabled) {
        try {
          const ai = await translateWithAI(sourceText, sourceLang, targetLang);
          translatedText = ai.text;
          provider = ai.provider;
          quality = ai.quality;
          note = ai.note;
        } catch { /* fall through to the machine providers */ }
      }
    }

    if (!translatedText) {
      try {
        const machine = await translateWithProvider(sourceText, sourceLang, targetLang);
        translatedText = machine.text;
        provider = machine.provider;
        quality = machine.quality;
        note = machine.note;
      } catch {
        const regional = getLanguage(targetLang).philippine || getLanguage(sourceLang).philippine;
        return Response.json({ error: regional ? "We couldn’t find a reliable live translation for this regional language pair. Try an everyday phrase such as ‘Good morning’, ‘Thank you’, or ‘How much is this?’." : "The live translation service is unavailable or returned a low-quality result. Please try again later." }, { status: 503 });
      }
    }

    const [translation] = await db.insert(translations).values({ userId: user.id, sourceText, translatedText, sourceLang, targetLang }).returning();
    return Response.json({ translation, provider, quality, ...(note ? { note } : {}) });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Please send a valid translation request." }, { status: 400 });
    console.error("Translation failed", error);
    return Response.json({ error: "We couldn’t translate that just now. Please try again." }, { status: 500 });
  }
}
