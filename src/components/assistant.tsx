"use client";

import { useRef, useState } from "react";
import { MessageCircleQuestion, RotateCcw, Send, Sparkles, Volume2, X } from "lucide-react";
import { assistantModes, assistantStarters } from "@/lib/ai";
import type { AssistantMode } from "@/lib/ai";
import { getLanguage } from "@/lib/languages";
import { request } from "@/lib/client";
import { IconButton, Spinner } from "./ui";
import { speak } from "./translator";
import { useWorkspace } from "./workspace-provider";

export interface AssistantContext {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  note?: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

/** Blank-line paragraphs become separate elements so replies stay readable. */
function Reply({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean).map((block, index) => (
    <p key={index}>{block.split("\n").flatMap((line, position, lines) =>
      position < lines.length - 1 ? [line, <br key={position} />] : [line])}</p>
  ))}</>;
}

export function AssistantPanel({ context }: { context: AssistantContext }) {
  const { notify } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(0);

  async function submit(mode?: AssistantMode, asked?: string) {
    if (loading) return;
    const prompt = (asked ?? question).trim();
    const resolvedMode: AssistantMode = mode ?? (prompt ? "chat" : "explain");
    if (resolvedMode === "chat" && !prompt) { setError("Type a question, or pick one of the suggestions."); return; }

    const label = prompt || assistantModes.find((item) => item.id === resolvedMode)?.label || "Tell me more";
    const version = ++inFlight.current;
    setMessages((previous) => [...previous, { role: "user", text: label }]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const { reply } = await request<{ reply: string }>("/api/assistant", "POST", {
        mode: resolvedMode,
        ...(prompt ? { question: prompt } : {}),
        ...(context.sourceText ? { sourceText: context.sourceText } : {}),
        ...(context.translatedText ? { translatedText: context.translatedText } : {}),
        sourceLang: context.sourceLang,
        targetLang: context.targetLang,
        ...(context.note ? { note: context.note } : {}),
      });
      if (version !== inFlight.current) return;
      setMessages((previous) => [...previous, { role: "assistant", text: reply }]);
    } catch (err) {
      if (version !== inFlight.current) return;
      // Surface only messages we wrote for the learner; raw network and
      // provider errors are noise, so they get the friendly offline wording.
      const message = err instanceof Error ? err.message : "";
      setError(/wait a minute|turned off|choose a supported|ask a question/i.test(message)
        ? message
        : "The assistant couldn’t reach the AI service just now. Your curated phrasebook still works offline.");
    } finally {
      if (version === inFlight.current) setLoading(false);
    }
  }

  const target = getLanguage(context.targetLang);

  return <section className="assistant-card card">
    <div className="assistant-heading">
      <h2><MessageCircleQuestion size={19} />Ask about this phrase</h2>
      <span className="assistant-language"><span className="tiny-dot" />{context.translatedText ? `${target.name} · ready to explain` : `Ask in ${target.name}`}</span>
    </div>

    <div className="assistant-transcript" aria-live="polite">
      {!messages.length && !loading
        ? assistantStarters.map((starter) => <button className="assistant-starter" key={starter.label} onClick={() => submit(starter.mode, starter.prompt)}><Sparkles size={14} />{starter.label}</button>)
        : <>{messages.map((message, index) => message.role === "user"
          ? <div className="assistant-message user" key={index}><div className="assistant-bubble">{message.text}</div></div>
          : <div className="assistant-message assistant" key={index}>
            <div className="assistant-bubble"><Reply text={message.text} /></div>
            <IconButton label="Listen to the reply" className="assistant-listen" onClick={() => speak(message.text, context.targetLang === "en" ? context.sourceLang : context.targetLang, notify)}><Volume2 size={15} /></IconButton>
          </div>)}
        {loading && <div className="assistant-message assistant"><div className="assistant-bubble assistant-thinking"><Spinner size={15} />Thinking…</div></div>}</>}
    </div>

    {error && <p className="assistant-error" role="alert">{error}</p>}

    {messages.length > 0 && <div className="assistant-chips">
      {assistantModes.map((mode) => <button className="assistant-chip" key={mode.id} disabled={loading} onClick={() => submit(mode.id)}>{mode.label}</button>)}
      <IconButton label="Clear conversation" className="assistant-clear" onClick={() => { inFlight.current += 1; setMessages([]); setError(""); setLoading(false); }}><X size={14} /></IconButton>
      <button className="assistant-chip assistant-chip-again" disabled={loading} onClick={() => submit("chat", messages.filter((message) => message.role === "user").pop()?.text)}><RotateCcw size={13} />Ask again</button>
    </div>}

    <div className="assistant-composer">
      <input type="text" aria-label="Ask the assistant" placeholder={context.translatedText ? "Ask about this phrase…" : "Ask anything about Philippine languages…"} autoComplete="off" maxLength={600} value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} />
      <button className="button primary assistant-send" onClick={() => submit()} disabled={loading}>{loading ? <Spinner size={15} /> : <Send size={15} />}{loading ? "Asking" : "Ask"}</button>
    </div>
  </section>;
}
