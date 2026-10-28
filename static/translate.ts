/**
 * Browser translation pipeline for the static build. It follows the same order
 * as the server route: your saved wording, the curated phrase library, then the
 * AI translator, and only then the classic machine providers.
 */
import { findLocalTranslationDetails, getLanguage, normalizeText } from "@/lib/languages";
import { translateWithAI } from "@/lib/ai";
import {
  cleanProviderText,
  isPlausibleTranslation,
  protectTranslationTokens,
  restoreTranslationTokens,
  selectMyMemoryTranslation,
} from "@/lib/translation";
import type { TranslationQuality } from "@/lib/types";
import { store } from "./core";

export interface TranslateResult {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  quality: TranslationQuality;
  note?: string;
}

export const BYTE_LIMIT = 500;
const RATE_LIMIT = 35;
const machineNote = "Machine translation. Review names, tone, and regional wording before relying on it.";

const rate = { count: 0, reset: 0 };

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

interface MachineTranslation {
  text: string;
  provider: string;
  quality: TranslationQuality;
  note: string;
}

class ProviderError extends Error {
  constructor(message = "No translation provider returned a usable result.") {
    super(message);
    this.name = "ProviderError";
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...init, cache: "no-store", signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

/** Keep links, emails, prices, and dates out of the model's vocabulary. */
function finalize(protectedText: string, translated: string, tokens: ReturnType<typeof protectTranslationTokens>, provider: string): MachineTranslation {
  const restored = restoreTranslationTokens(translated, tokens);
  if (!restored) throw new ProviderError(`${provider} dropped a protected value.`);
  return { text: restored, provider, quality: "machine", note: machineNote };
}

async function translateWithLibreTranslate(text: string, source: string, target: string): Promise<MachineTranslation> {
  const base = store.prefs.libreUrl.trim().replace(/\/$/, "");
  if (!base) throw new ProviderError("LibreTranslate is not configured.");
  const protectedInput = protectTranslationTokens(text);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (store.prefs.libreKey) headers.Authorization = `Bearer ${store.prefs.libreKey}`;
  const response = await fetchWithTimeout(`${base}/translate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ q: protectedInput.text, source, target, format: "text", ...(store.prefs.libreKey ? { api_key: store.prefs.libreKey } : {}) }),
  }, 10000);
  if (!response.ok) throw new ProviderError("LibreTranslate unavailable.");
  const result = await response.json() as { translatedText?: unknown };
  const translated = cleanProviderText(result.translatedText);
  if (!translated || !isPlausibleTranslation(protectedInput.text, translated)) throw new ProviderError("LibreTranslate returned an unusable result.");
  return finalize(protectedInput.text, translated, protectedInput, "LibreTranslate");
}

async function translateWithMyMemory(text: string, source: string, target: string): Promise<MachineTranslation> {
  const protectedInput = protectTranslationTokens(text);
  const params = new URLSearchParams({ q: protectedInput.text, langpair: `${source}|${target}` });
  const response = await fetchWithTimeout(`https://api.mymemory.translated.net/get?${params}`, {}, 12000);
  if (!response.ok) throw new ProviderError("MyMemory unavailable.");
  const result = await response.json() as {
    quotaFinished?: boolean;
    responseStatus?: number | string;
    responseData?: { translatedText?: unknown; match?: unknown };
    matches?: { segment?: unknown; translation?: unknown; match?: unknown; quality?: unknown }[];
  };
  if (result.quotaFinished || Number(result.responseStatus) !== 200) throw new ProviderError("MyMemory quota or language-pair error.");
  const translated = selectMyMemoryTranslation(result, protectedInput.text);
  if (!translated) throw new ProviderError("MyMemory returned an unusable result.");
  return finalize(protectedInput.text, translated, protectedInput, "MyMemory");
}

/** Keyless web endpoint with broad coverage, including Philippine regional languages. */
async function translateWithGoogle(text: string, source: string, target: string): Promise<MachineTranslation> {
  const protectedInput = protectTranslationTokens(text);
  const params = new URLSearchParams({ client: "gtx", sl: source, tl: target, dt: "t", q: protectedInput.text });
  const response = await fetchWithTimeout(`https://translate.googleapis.com/translate_a/single?${params}`, {}, 12000);
  if (!response.ok) throw new ProviderError("Google Translate unavailable.");
  const payload = await response.json() as unknown[];
  const segments = Array.isArray(payload?.[0]) ? payload[0] as unknown[] : [];
  const joined = segments.map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "")).join("");
  const translated = cleanProviderText(joined);
  if (!translated || !isPlausibleTranslation(protectedInput.text, translated)) throw new ProviderError("Google Translate returned an unusable result.");
  return finalize(protectedInput.text, translated, protectedInput, "Google Translate");
}

function findRemembered(text: string, sourceLang: string, targetLang: string): string | null {
  const normalized = normalizeText(text);
  const match = store.data.translations
    .filter((item) => item.saved && item.sourceLang === sourceLang && item.targetLang === targetLang)
    .slice(0, 200)
    .find((item) => normalizeText(item.sourceText) === normalized && item.translatedText.trim());
  return match?.translatedText || null;
}

export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<TranslateResult> {
  const sourceText = text.trim();
  if (!sourceText) throw new Error("Enter something you’d like to translate.");
  if (byteLength(sourceText) > BYTE_LIMIT) throw new Error(`Please keep your text under ${BYTE_LIMIT} UTF-8 bytes.`);
  if (!languagesInclude(sourceLang) || !languagesInclude(targetLang)) throw new Error("Please choose a supported language pair.");

  if (rate.reset > Date.now() && rate.count >= RATE_LIMIT) throw new Error("You’re translating quickly! Please wait a minute and try again.");
  if (rate.reset < Date.now()) { rate.count = 1; rate.reset = Date.now() + 60000; }
  else rate.count += 1;

  if (sourceLang === targetLang) {
    return { sourceText, translatedText: sourceText, sourceLang, targetLang, provider: "Original text", quality: "direct" };
  }

  // An explicit saved correction is more specific to you than the shared library.
  const remembered = findRemembered(sourceText, sourceLang, targetLang);
  const local = remembered ? null : findLocalTranslationDetails(sourceText, sourceLang, targetLang);

  if (remembered) {
    return { sourceText, translatedText: remembered, sourceLang, targetLang, provider: "Your phrasebook", quality: "remembered", note: "Using your saved wording for this phrase." };
  }
  if (local) {
    return { sourceText, translatedText: local.text, sourceLang, targetLang, provider: "Salita phrase library", quality: "curated", ...(local.note ? { note: local.note } : {}) };
  }

  const attempts: (() => Promise<MachineTranslation>)[] = [];
  // A language model handles Philippine regional languages far better than
  // generic machine translation, so it is tried first when the learner wants it.
  if (store.prefs.aiEnabled) {
    attempts.push(async () => {
      const ai = await translateWithAI(sourceText, sourceLang, targetLang);
      return { text: ai.text, provider: ai.provider, quality: ai.quality, note: ai.note };
    });
  }
  if (store.prefs.libreUrl.trim()) attempts.push(() => translateWithLibreTranslate(sourceText, sourceLang, targetLang));
  attempts.push(() => translateWithMyMemory(sourceText, sourceLang, targetLang), () => translateWithGoogle(sourceText, sourceLang, targetLang));

  for (const attempt of attempts) {
    try {
      const machine = await attempt();
      return { sourceText, translatedText: machine.text, sourceLang, targetLang, provider: machine.provider, quality: machine.quality, note: machine.note };
    } catch { /* try the next provider */ }
  }

  const regional = getLanguage(targetLang).philippine || getLanguage(sourceLang).philippine;
  throw new Error(regional
    ? "We couldn’t find a reliable live translation for this regional language pair. Try an everyday phrase such as ‘Good morning’, ‘Thank you’, or ‘How much is this?’."
    : "The live translation service is unavailable or returned a low-quality result. Curated phrases still work offline — please try again later.");
}

function languagesInclude(code: string): boolean {
  return Boolean(getLanguage(code)) && code === getLanguage(code).code;
}

export { ProviderError };
export type { MachineTranslation };
