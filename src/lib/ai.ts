/**
 * Keyless AI layer shared by the Next.js app and the static build.
 *
 * Salita uses a free, key-less text endpoint (Pollinations.ai) so that the
 * published GitHub Pages build can call it straight from the browser with no
 * server and no API key for the user to manage. Every function degrades
 * gracefully: if the endpoint is unreachable, blocked, or returns something
 * unusable, it throws and the caller falls back to the next provider. The
 * curated phrase library never depends on this module, so offline use is safe.
 *
 * The prompt builders and response cleaners are pure and exported separately so
 * they can be unit-tested without any network access.
 */
import { getLanguage, languages, normalizeText } from "./languages";
import { cleanProviderText, isPlausibleTranslation } from "./translation";

export const AI_ENDPOINT = "https://text.pollinations.ai/";
export const AI_MODEL = "openai";
export const AI_PROVIDER_LABEL = "Salita AI";
export const AI_TIMEOUT_MS = 20000;
export const ASSISTANT_TIMEOUT_MS = 30000;

export const aiNote =
  "AI translation. Usually stronger than generic machine translation for Philippine regional languages, but still check names, tone, and courtesy before you rely on it.";

export class AIError extends Error {
  constructor(message = "The AI service did not return a usable result.") {
    super(message);
    this.name = "AIError";
  }
}

export interface DescribedLanguage {
  label: string;
  hint?: string;
}

/** Name a language the way a linguist would, so the model cannot guess wrong. */
export function describeLanguage(code: string): DescribedLanguage {
  const language = getLanguage(code);
  if (language.code !== code) return { label: code || "the source language" };
  return { label: language.name, ...(language.aiHint ? { hint: language.aiHint } : {}) };
}

/* ------------------------------------------------------------------ *
 * Translation
 * ------------------------------------------------------------------ */

export function buildTranslationPrompt(text: string, sourceLang: string, targetLang: string): string {
  const source = describeLanguage(sourceLang);
  const target = describeLanguage(targetLang);
  return [
    "You are a professional translator specialising in the languages of the Philippines.",
    `Translate the text below from ${source.label} into ${target.label}.`,
    source.hint ? `About the source language: ${source.hint}.` : "",
    target.hint ? `About the target language: ${target.hint}.` : "",
    "",
    "Rules:",
    "- Reply with ONLY the translated text. No quotation marks, no label, no explanation, no romanisation, no English gloss.",
    "- Sound like a native speaker in everyday conversation, not like a textbook.",
    "- Keep the original meaning, tone, and sentence type (question stays a question, command stays a command).",
    "- Keep any placeholder such as __SALITA_0__ exactly as written; never translate or reorder it.",
    "- If the text is already in the target language, return it unchanged.",
    "- If you cannot translate it confidently, reply with exactly: UNKNOWN",
    "",
    "Text to translate:",
    `"""${text}"""`,
  ].filter(Boolean).join("\n");
}

const genericLabel = /^(?:translation|translated text|translated|output|answer|result|response|here (?:is|'s) (?:the|your) translation|in\s+.+)$/i;

/** Language names the model may use to label its own answer. */
const knownLabels = new Set(
  languages.flatMap((language) => [language.name.toLowerCase(), language.native.toLowerCase()]),
);

/** True when a leading “Cebuano:” / “Translation -” style tag is a label, not content. */
function isLabelPrefix(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (genericLabel.test(trimmed)) return true;
  const bare = trimmed.toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return knownLabels.has(bare) || knownLabels.has(trimmed.toLowerCase());
}

const leadingLabel = /^([A-Za-z][\w\s()/.-]{1,40})\s*[:\-–—]\s*/;
const refusal = /(?:^|\b)(?:i (?:cannot|can't|am unable)|as an ai|sorry,? (?:but )?i|no translation (?:is )?(?:available|possible)|unknown language)\b/i;

/**
 * Models often add a wrapper around the answer. Strip the wrapper, keep the
 * translation, and reject anything that is clearly not one.
 */
export function cleanAITranslation(raw: string): string | null {
  let text = raw
    .replace(/^\uFEFF/, "")
    .replace(/```[a-z]*\n?/gi, "")
    .trim();
  if (!text) return null;
  if (/^UNKNOWN\.?$/i.test(text)) return null;

  // Drop any trailing commentary the model appended after the answer.
  const cut = text.split(/\r?\n/).findIndex((line) =>
    /^\s*(?:alternative|alternatively|note|notes|explanation|literal(?:ly)?|in english|english|breakdown|other (?:ways|options))\s*[:\-–]\s*/i.test(line));
  if (cut > 0) text = text.split(/\r?\n/).slice(0, cut).join("\n").trim();
  if (cut === 0) return null;

  // Keep the first block only: models like to offer a list of options.
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length > 1) text = blocks[0];

  let previous = "";
  while (text !== previous) {
    previous = text;
    const labelled = text.match(leadingLabel);
    if (labelled && isLabelPrefix(labelled[1])) text = text.slice(labelled[0].length).trim();
    const quotes = text.match(/^([“”"«»‘’'`*]+)([\s\S]*?)\1$/);
    if (quotes?.[2]) text = quotes[2].trim();
    text = text.replace(/^[“”"«»‘’'`*]+|[“”"«»‘’'`*]+$/g, "").trim();
  }

  if (refusal.test(text)) return null;
  const cleaned = cleanProviderText(text);
  return cleaned && cleaned.length <= 4000 ? cleaned : null;
}

export interface AITranslation {
  text: string;
  provider: typeof AI_PROVIDER_LABEL;
  quality: "ai";
  note: string;
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

/** Accept whichever shape a text endpoint replies with. */
export function extractAIText(raw: string): string | null {
  const body = raw.trim();
  if (!body) return null;
  if (body.startsWith("{") || body.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(body);
      const value = readContent(parsed);
      if (value) return value;
    } catch { /* fall through to plain text */ }
  }
  return body;
}

function readContent(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = readContent(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["content", "text", "message", "response", "choices", "output", "result"]) {
    if (key in record) {
      const found = readContent(record[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  seed?: number;
  /** Optional override, e.g. a same-origin proxy in the Next.js deployment. */
  endpoint?: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AIError("The AI service timed out.")), ms);
    const onAbort = () => { clearTimeout(timer); reject(new AIError("The AI request was cancelled.")); };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); resolve(value); },
      (error) => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); reject(error); },
    );
  });
}

/**
 * POST first (handles long prompts and keeps them out of logs), then fall back
 * to the documented GET form. Both are key-less and CORS-enabled.
 */
export async function requestAI(prompt: string, options: RequestOptions = {}): Promise<string> {
  const { timeoutMs = AI_TIMEOUT_MS, signal, endpoint = AI_ENDPOINT } = options;
  const base = endpoint.replace(/\/$/, "");
  const seed = options.seed ?? Math.floor(Math.random() * 1e6);

  const attempts: (() => Promise<Response>)[] = [
    () => fetch(`${base}/openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        private: true,
        seed,
        referrer: "salita",
      }),
      cache: "no-store",
    }),
    () => fetch(`${base}/${encodeURIComponent(prompt)}?model=${AI_MODEL}&private=true&seed=${seed}&referrer=salita`, {
      cache: "no-store",
    }),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const response = await withTimeout(attempt(), timeoutMs, signal);
      if (!response.ok) { lastError = new AIError(`The AI service replied ${response.status}.`); continue; }
      const raw = await withTimeout(response.text(), timeoutMs, signal);
      const text = extractAIText(raw);
      if (!text) { lastError = new AIError("The AI service returned an empty response."); continue; }
      return text;
    } catch (error) {
      if (error instanceof AIError && /cancelled/i.test(error.message)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof AIError ? lastError : new AIError();
}

export async function translateWithAI(
  text: string,
  sourceLang: string,
  targetLang: string,
  options: RequestOptions = {},
): Promise<AITranslation> {
  if (!text.trim()) throw new AIError("Nothing to translate.");
  const raw = await requestAI(buildTranslationPrompt(text, sourceLang, targetLang), options);
  const cleaned = cleanAITranslation(raw);
  if (!cleaned) throw new AIError("The AI service returned an unusable translation.");
  if (!isPlausibleTranslation(text, cleaned)) throw new AIError("The AI service echoed the source text.");
  return { text: cleaned, provider: AI_PROVIDER_LABEL, quality: "ai", note: aiNote };
}

/* ------------------------------------------------------------------ *
 * Learning assistant
 * ------------------------------------------------------------------ */

export type AssistantMode = "explain" | "examples" | "culture" | "practice" | "chat";

export interface AssistantContext {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  /** Note attached to a curated phrase, if any. */
  note?: string;
}

export interface AssistantRequest extends Partial<AssistantContext> {
  mode: AssistantMode;
  question?: string;
}

const modeInstructions: Record<AssistantMode, string> = {
  explain: "Explain exactly why this is the right wording. Cover the literal meaning of each part, the register (formal, everyday, literary), and what a learner would get wrong if they translated it word-for-word from English.",
  examples: "Give three short, natural example sentences using this phrase or pattern. For each one, show the target-language sentence first, then the English meaning on the next line. Vary the situations (market, family, greeting someone new).",
  culture: "Explain the cultural context: when this is and is not appropriate, who says it to whom, and any courtesy convention (respect markers, elders, hospitality) a visitor should know.",
  practice: "Run a short practice conversation. Play a friendly local speaker, say one line at a time in the target language with the English meaning underneath, then wait for the learner to reply. Start with a greeting and keep each turn to one or two sentences.",
  chat: "Answer the learner's question directly and helpfully.",
};

export function buildAssistantPrompt(request: AssistantRequest): string {
  const { mode, question } = request;
  const target = describeLanguage(request.targetLang || "tl");
  const source = describeLanguage(request.sourceLang || "en");
  const lines: string[] = [
    "You are Salita, a warm and knowledgeable language coach for the languages of the Philippines.",
    "You are accurate, encouraging, and concrete. You never invent a word: if you are not sure of a form, say so and offer the closest wording you are confident about.",
    `You are coaching a learner whose first language is ${source.label}, learning ${target.label}.`,
    target.hint ? `About the target language: ${target.hint}.` : "",
    "",
    modeInstructions[mode] || modeInstructions.chat,
    "",
  ];

  if (request.sourceText) lines.push(`Phrase in ${source.label}: "${request.sourceText}"`);
  if (request.translatedText) lines.push(`Translation in ${target.label}: "${request.translatedText}"`);
  if (request.note) lines.push(`Note from the curated phrasebook: ${request.note}`);
  if (question?.trim()) lines.push(`The learner asks: ${question.trim()}`);

  lines.push(
    "",
    "Format your reply in short paragraphs or a compact list. Plain text only — no markdown headings, no code fences.",
    "Keep it under about 180 words so it stays readable on a phone.",
    `Write the explanation in ${source.label}, quoting ${target.label} words where useful.`,
  );
  return lines.filter(Boolean).join("\n");
}

export function cleanAssistantReply(raw: string): string | null {
  const text = raw
    .replace(/^\uFEFF/, "")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
  if (!text) return null;
  if (refusal.test(text)) return null;
  return text.length > 4000 ? `${text.slice(0, 4000).trimEnd()}…` : text;
}

export async function askAssistant(request: AssistantRequest, options: RequestOptions = {}): Promise<string> {
  const raw = await requestAI(buildAssistantPrompt(request), {
    timeoutMs: ASSISTANT_TIMEOUT_MS,
    ...options,
  });
  const reply = cleanAssistantReply(raw);
  if (!reply) throw new AIError("The assistant could not answer that just now.");
  return reply;
}

export const assistantModes: { id: AssistantMode; label: string; prompt: string }[] = [
  { id: "explain", label: "Why this wording?", prompt: "Why is this the natural way to say it?" },
  { id: "examples", label: "Example sentences", prompt: "Show me examples I can actually use." },
  { id: "culture", label: "Cultural notes", prompt: "When should I use this, and with whom?" },
  { id: "practice", label: "Practice conversation", prompt: "Let's practise a short conversation." },
];

/** Suggested starters shown when nothing has been translated yet. */
export const assistantStarters: { label: string; prompt: string; mode: AssistantMode }[] = [
  { label: "Greet someone politely", prompt: "How do I greet someone politely, and how does it change with elders?", mode: "culture" },
  { label: "Order at a market", prompt: "Teach me the phrases I need to buy food at a market.", mode: "examples" },
  { label: "Say thank you properly", prompt: "How do I thank someone, and how do I reply when they thank me?", mode: "explain" },
  { label: "Practise a conversation", prompt: "Let's practise meeting someone for the first time.", mode: "practice" },
];

/** Cheap guard so the assistant cannot be pointed at an unsupported language. */
export function isSupportedAssistantLanguage(code: string): boolean {
  return getLanguage(code).code === code && Boolean(normalizeText(code));
}
