import { normalizeText } from "./languages";

export interface MachineTranslation {
  text: string;
  provider: "MyMemory" | "LibreTranslate";
  quality: "machine";
  note: string;
}

export class TranslationProviderError extends Error {
  constructor(message = "No translation provider returned a usable result.") {
    super(message);
    this.name = "TranslationProviderError";
  }
}

const entities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  nbsp: " ",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

/** Decode the entities MyMemory returns without requiring a browser DOM. */
export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
      const number = Number.parseInt(code.slice(radix === 16 ? 2 : 1), radix);
      if (Number.isFinite(number) && number >= 0 && number <= 0x10ffff) {
        try { return String.fromCodePoint(number); } catch { return entity; }
      }
      return entity;
    }
    return entities[code.toLowerCase()] ?? entity;
  });
}

export function cleanProviderText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = decodeHtmlEntities(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!text || text.length > 4000) return null;
  if (/my memory warning|mymemory warning|query length limit|invalid language pair|quota finished/i.test(text)) return null;
  return text;
}

/**
 * An unchanged multi-word response is commonly an unsupported language pair,
 * not a translation. Single-word cognates are left alone.
 */
export function isPlausibleTranslation(source: string, translated: string) {
  if (!cleanProviderText(translated)) return false;
  const sourceWords = source.trim().split(/\s+/).filter(Boolean);
  return !(sourceWords.length > 1 && normalizeText(source) === normalizeText(translated));
}

interface MyMemoryMatch {
  segment?: unknown;
  translation?: unknown;
  match?: unknown;
  quality?: unknown;
}

interface MyMemoryPayload {
  quotaFinished?: boolean;
  responseStatus?: number | string;
  responseData?: { translatedText?: unknown; match?: unknown };
  matches?: MyMemoryMatch[];
}

const numberValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/**
 * Prefer an exact, well-rated translation-memory match when it is better than
 * the primary response. Never choose a fuzzy match for a different sentence.
 */
export function selectMyMemoryTranslation(payload: MyMemoryPayload, source: string): string | null {
  const primary = cleanProviderText(payload.responseData?.translatedText);
  let best = primary && isPlausibleTranslation(source, primary) ? primary : null;
  let bestScore = best ? numberValue(payload.responseData?.match) : -1;
  let bestQuality = best ? 0 : -1;

  for (const match of (payload.matches || []).slice(0, 30)) {
    if (typeof match.segment !== "string" || normalizeText(match.segment) !== normalizeText(source)) continue;
    const candidate = cleanProviderText(match.translation);
    if (!candidate || !isPlausibleTranslation(source, candidate)) continue;
    const quality = numberValue(match.quality);
    const score = numberValue(match.match);
    // A rated exact match can improve the primary answer; an unrated fuzzy
    // match cannot replace a perfectly usable primary response.
    if (best && quality < 50) continue;
    if (!best || score > bestScore || (score === bestScore && quality > bestQuality)) {
      best = candidate;
      bestScore = score;
      bestQuality = quality;
    }
  }
  return best;
}

export interface ProtectedTranslationText {
  text: string;
  tokens: string[];
}

/**
 * Keep identifiers and values out of the language model's vocabulary. This is
 * especially useful for travel messages containing a link, email, price, or
 * date. Unknown wording around the tokens is still translated normally.
 */
export function protectTranslationTokens(text: string): ProtectedTranslationText {
  const tokens: string[] = [];
  const protectedText = text.replace(/(?:https?:\/\/|www\.)[^\s<>"']+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b\d+(?:[.,]\d+)*\b/g, (match) => {
    const trailing = match.match(/[.,!?;:]+$/)?.[0] || "";
    const token = trailing ? match.slice(0, -trailing.length) : match;
    const index = tokens.push(token) - 1;
    return `__SALITA_${index}__${trailing}`;
  });
  return { text: protectedText, tokens };
}

export function restoreTranslationTokens(text: string, protectedText: ProtectedTranslationText): string | null {
  let restored = text;
  for (const [index, token] of protectedText.tokens.entries()) {
    const marker = new RegExp(`__\\s*SALITA[_\\s-]*${index}\\s*__`, "gi");
    if (!marker.test(restored)) {
      // A provider may have preserved the original token itself. Losing both
      // the marker and the value would silently corrupt the translation.
      if (!restored.includes(token)) return null;
      continue;
    }
    marker.lastIndex = 0;
    restored = restored.replace(marker, token);
  }
  return restored;
}

const providerNote = "Machine translation. Review names, tone, and regional wording before relying on it.";
async function translateWithLibreTranslate(text: string, source: string, target: string): Promise<MachineTranslation> {
  const base = process.env.LIBRETRANSLATE_URL;
  if (!base) throw new TranslationProviderError("LibreTranslate is not configured.");
  const protectedInput = protectTranslationTokens(text);
  const endpoint = `${base.replace(/\/$/, "")}/translate`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.LIBRETRANSLATE_API_KEY ? { Authorization: `Bearer ${process.env.LIBRETRANSLATE_API_KEY}` } : {}) },
    body: JSON.stringify({ q: protectedInput.text, source, target, format: "text", ...(process.env.LIBRETRANSLATE_API_KEY ? { api_key: process.env.LIBRETRANSLATE_API_KEY } : {}) }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok) throw new TranslationProviderError("LibreTranslate unavailable.");
  const result = await response.json() as { translatedText?: unknown };
  const translated = cleanProviderText(result.translatedText);
  if (!translated || !isPlausibleTranslation(protectedInput.text, translated)) throw new TranslationProviderError("LibreTranslate returned an unusable result.");
  const restored = restoreTranslationTokens(translated, protectedInput);
  if (!restored) throw new TranslationProviderError("LibreTranslate dropped a protected value.");
  return { text: restored, provider: "LibreTranslate", quality: "machine", note: providerNote };
}

async function translateWithMyMemory(text: string, source: string, target: string): Promise<MachineTranslation> {
  const protectedInput = protectTranslationTokens(text);
  const params = new URLSearchParams({ q: protectedInput.text, langpair: `${source}|${target}` });
  if (process.env.MYMEMORY_API_KEY) params.set("key", process.env.MYMEMORY_API_KEY);
  if (process.env.MYMEMORY_EMAIL) params.set("de", process.env.MYMEMORY_EMAIL);
  const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!response.ok) throw new TranslationProviderError("MyMemory unavailable.");
  const result = await response.json() as MyMemoryPayload;
  if (result.quotaFinished || Number(result.responseStatus) !== 200) throw new TranslationProviderError("MyMemory quota or language-pair error.");
  const translated = selectMyMemoryTranslation(result, protectedInput.text);
  if (!translated) throw new TranslationProviderError("MyMemory returned an unusable result.");
  const restored = restoreTranslationTokens(translated, protectedInput);
  if (!restored) throw new TranslationProviderError("MyMemory dropped a protected value.");
  return { text: restored, provider: "MyMemory", quality: "machine", note: providerNote };
}

/** Use a configured neural/self-hosted provider first, with MyMemory as a fallback. */
export async function translateWithProvider(text: string, source: string, target: string): Promise<MachineTranslation> {
  let lastError: unknown;
  if (process.env.LIBRETRANSLATE_URL) {
    try { return await translateWithLibreTranslate(text, source, target); }
    catch (error) { lastError = error; }
  }
  try { return await translateWithMyMemory(text, source, target); }
  catch (error) {
    lastError = error;
    throw new TranslationProviderError(lastError instanceof Error ? lastError.message : undefined);
  }
}
