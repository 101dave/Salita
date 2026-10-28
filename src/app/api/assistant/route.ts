import { NextRequest } from "next/server";
import { askAssistant, assistantModes, isSupportedAssistantLanguage } from "@/lib/ai";
import type { AssistantMode } from "@/lib/ai";
import { getViewer } from "@/lib/workspace";

export const runtime = "nodejs";
/** Set SALITA_AI_DISABLED=1 to turn the learning assistant off entirely. */
const aiEnabled = process.env.SALITA_AI_DISABLED !== "1";

const limits = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 20;

const modes = new Set<string>(assistantModes.map((mode) => mode.id).concat("chat"));

export async function POST(request: NextRequest) {
  if (!aiEnabled) return Response.json({ error: "The learning assistant is turned off on this server." }, { status: 503 });

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ error: "Please send a valid request." }, { status: 400 });

    const { mode, question, sourceText, translatedText, sourceLang, targetLang, note } = body as Record<string, unknown>;
    const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max).trim() : "");

    const resolvedMode: AssistantMode = typeof mode === "string" && modes.has(mode) ? (mode as AssistantMode) : "chat";
    const prompt = text(question, 600);
    if (resolvedMode === "chat" && !prompt) {
      return Response.json({ error: "Ask a question and the assistant will answer." }, { status: 400 });
    }
    if (typeof targetLang !== "string" || !isSupportedAssistantLanguage(targetLang)) {
      return Response.json({ error: "Please choose a supported Philippine language." }, { status: 400 });
    }

    const user = await getViewer();
    const limit = limits.get(user.id);
    if (limit && limit.reset > Date.now() && limit.count >= RATE_LIMIT) {
      return Response.json({ error: "You’re asking quickly! Please wait a minute and try again." }, { status: 429 });
    }
    if (!limit || limit.reset < Date.now()) limits.set(user.id, { count: 1, reset: Date.now() + 60000 });
    else limit.count++;
    if (limits.size > 2000) for (const [id, value] of limits) if (value.reset < Date.now()) limits.delete(id);

    const reply = await askAssistant({
      mode: resolvedMode,
      ...(prompt ? { question: prompt } : {}),
      ...(text(sourceText, 500) ? { sourceText: text(sourceText, 500) } : {}),
      ...(text(translatedText, 500) ? { translatedText: text(translatedText, 500) } : {}),
      ...(typeof sourceLang === "string" && isSupportedAssistantLanguage(sourceLang) ? { sourceLang } : {}),
      targetLang,
      ...(text(note, 400) ? { note: text(note, 400) } : {}),
    });

    return Response.json({ reply });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Please send a valid request." }, { status: 400 });
    console.error("Assistant failed", error);
    return Response.json({ error: "The assistant could not answer that just now. Please try again." }, { status: 503 });
  }
}
